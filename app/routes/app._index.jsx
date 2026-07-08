import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  computeComplianceScore,
  daysUntilNextAudit,
  ensureAuditCurrent,
  getAuditHistory,
  getUnreadAlerts,
  markAlertsRead,
  runAudit,
  serializeProfile,
} from "../models/compliance.server";
import { ComplianceSummary } from "../components/RecommendationPanel";
import { PLAN_IDS } from "../billing/plans.constants.js";
import { effectivePlanFromProfile } from "../billing/plans.server.js";
import { syncBillingPlanFromShopify } from "../billing/subscription.server.js";

export const loader = async ({ request }) => {
  const { getPlanFeatures } = await import("../billing/plans.server.js");
  const { PLAN_MARKETING } = await import("../billing/plans.constants.js");
  const { admin, session, billing } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing);
  const shop = session.shop;

  const profile = await ensureAuditCurrent(admin, shop);

  const serialized = serializeProfile(profile);
  const plan = effectivePlanFromProfile(serialized);
  const features = getPlanFeatures(plan);
  const alerts = await getUnreadAlerts(shop);
  const audits = await getAuditHistory(shop, 5);
  const score = computeComplianceScore(serialized);
  const nextAuditInDays = daysUntilNextAudit(profile);

  return {
    profile: serialized,
    plan,
    planName: PLAN_MARKETING.find((p) => p.id === plan)?.name ?? plan,
    features,
    score,
    nextAuditInDays,
    alerts: alerts.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    recentAudits: audits.map((a) => ({
      id: a.id,
      startedAt: a.startedAt.toISOString(),
      overallStatus: a.overallStatus,
      rulesPassed: a.rulesPassed,
      rulesFailed: a.rulesFailed,
    })),
  };
};

export const action = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing);
  const formData = await request.formData();

  if (formData.get("intent") === "run_audit") {
    try {
      await runAudit(admin, session.shop, { trigger: "MANUAL" });
      return { ok: true, message: "Audit terminé" };
    } catch (error) {
      return {
        ok: false,
        message: error.message ?? "Impossible de lancer l'audit",
        planLimit: error.code === "PLAN_LIMIT",
      };
    }
  }

  if (formData.get("intent") === "mark_alerts_read") {
    await markAlertsRead(session.shop);
    return { ok: true };
  }

  return { ok: false };
};

export default function Index() {
  const { profile, score, alerts, recentAudits, nextAuditInDays, plan, planName, features } =
    useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isAuditing =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "run_audit";

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, {
        isError: fetcher.data.ok === false,
      });
    }
  }, [fetcher.data, shopify]);

  const statusLabel = {
    COMPLIANT: "Conforme",
    WARNING: "À améliorer",
    NON_COMPLIANT: "Non conforme",
    UNKNOWN: "Non audité",
  };

  const categories = [
    { key: "legalPagesStatus", label: "Pages légales" },
    { key: "gdprStatus", label: "RGPD" },
    { key: "consumerRightsStatus", label: "Droits des consommateurs" },
    { key: "pricingStatus", label: "Prix & promotions" },
  ];

  const scoreTone =
    score >= 80 ? "success" : score >= 50 ? "warning" : "critical";

  return (
    <s-page heading="JuriShop">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({ intent: "run_audit" }, { method: "post" })}
        {...(isAuditing ? { loading: true } : {})}
      >
        Lancer un audit
      </s-button>

      {alerts.length > 0 && (
        <s-banner tone="warning" heading={`${alerts.length} alerte(s)`}>
          <s-stack direction="block" gap="base">
            {alerts.slice(0, 3).map((alert) => (
              <s-paragraph key={alert.id}>
                <s-text type="strong">{alert.title}</s-text> — {alert.message}
              </s-paragraph>
            ))}
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="mark_alerts_read" />
              <s-button type="submit" variant="tertiary">
                Marquer comme lues
              </s-button>
            </fetcher.Form>
          </s-stack>
        </s-banner>
      )}

      <s-section heading="Score de conformité">
        <s-stack direction="inline" gap="base">
          <s-badge tone={scoreTone}>{score}/100</s-badge>
          <s-badge>{planName}</s-badge>
          <s-text>
            Modèle {profile?.businessModel ?? "B2C"} ·{" "}
            {profile?.uiMode === "expert" ? "Mode expert" : "Mode débutant"}
          </s-text>
        </s-stack>
      </s-section>

      <ComplianceSummary profile={profile} />

      <s-section heading="Conformité par domaine">
        <s-stack direction="block" gap="base">
          {categories.map(({ key, label }) => (
            <s-box
              key={key}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="inline" gap="base">
                <s-text type="strong">{label}</s-text>
                <s-badge
                  tone={
                    profile?.[key] === "COMPLIANT"
                      ? "success"
                      : profile?.[key] === "WARNING"
                        ? "warning"
                        : "critical"
                  }
                >
                  {statusLabel[profile?.[key] ?? "UNKNOWN"]}
                </s-badge>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      {recentAudits.length > 1 && (
        <s-section heading="Évolution récente">
          <s-stack direction="block" gap="base">
            {recentAudits.map((audit) => (
              <s-paragraph key={audit.id} color="subdued">
                {new Date(audit.startedAt).toLocaleDateString("fr-FR")} —{" "}
                {statusLabel[audit.overallStatus] ?? audit.overallStatus} (
                {audit.rulesPassed} ✓ / {audit.rulesFailed} ✗)
              </s-paragraph>
            ))}
            <s-button href="/app/history" variant="tertiary">
              Voir tout l&apos;historique
            </s-button>
          </s-stack>
        </s-section>
      )}

      <s-section heading="Prochaine étape">
        <s-stack direction="inline" gap="base">
          <s-button href="/app/recommendations" variant="primary">
            Recommandations
            {profile?.openIssuesCount > 0
              ? ` (${profile.openIssuesCount})`
              : ""}
          </s-button>
          <s-button href="/app/settings" variant="secondary">
            Paramètres & SIRET
          </s-button>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="JuriShop">
        <s-paragraph>Audit & Advisor — lecture seule, jamais de modification automatique.</s-paragraph>
      </s-section>

      {profile?.lastAuditAt && (
        <s-section slot="aside" heading="Dernier audit">
          <s-paragraph color="subdued">
            {new Date(profile.lastAuditAt).toLocaleString("fr-FR")}
          </s-paragraph>
          {profile.scheduledAuditEnabled !== false && features.scheduledAudit && (
            <s-paragraph color="subdued">
              Prochain audit planifié dans {nextAuditInDays} jour
              {nextAuditInDays > 1 ? "s" : ""} (tous les{" "}
              {profile.auditIntervalDays ?? 7} jours)
            </s-paragraph>
          )}
          {plan === PLAN_IDS.FREE && (
            <s-paragraph color="subdued">
              Plan Gratuit : 1 audit manuel par mois.{" "}
              <s-link href="/app/plans">Voir les plans</s-link>
            </s-paragraph>
          )}
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
