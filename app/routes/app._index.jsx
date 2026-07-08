import { useEffect } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  computeComplianceScore,
  computeScoreBreakdown,
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
import {
  PROFILE_KEY_TO_CATEGORY,
} from "../compliance/constants/labels.js";

function manualAuditsRemaining(profile, features) {
  if (features.maxManualAuditsPerMonth === Infinity) return null;
  const monthKey = new Date().toISOString().slice(0, 7);
  const count =
    profile?.manualAuditsMonthKey === monthKey
      ? profile.manualAuditsThisMonth
      : 0;
  return Math.max(0, features.maxManualAuditsPerMonth - count);
}

function auditScore(audit) {
  const weights = {
    COMPLIANT: 100,
    WARNING: 60,
    NON_COMPLIANT: 20,
    UNKNOWN: 0,
  };
  const fields = [
    audit.legalPagesStatus,
    audit.gdprStatus,
    audit.consumerRightsStatus,
    audit.pricingStatus,
  ];
  return Math.round(
    fields.map((s) => weights[s] ?? 0).reduce((a, b) => a + b, 0) /
      fields.length,
  );
}

export const loader = async ({ request }) => {
  const { getPlanFeatures } = await import("../billing/plans.server.js");
  const { PLAN_MARKETING } = await import("../billing/plans.constants.js");
  const { admin, session, billing } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing);
  const shop = session.shop;

  const profile = await ensureAuditCurrent(admin, shop);

  const serialized = serializeProfile(profile);
  if (!serialized.onboardingDismissed) {
    throw redirect("/app/onboarding");
  }
  const plan = effectivePlanFromProfile(serialized);
  const features = getPlanFeatures(plan);
  const alerts = await getUnreadAlerts(shop);
  const audits = await getAuditHistory(shop, 5);
  const score = computeComplianceScore(serialized);
  const nextAuditInDays = daysUntilNextAudit(profile);
  const auditsRemaining = manualAuditsRemaining(serialized, features);

  return {
    profile: serialized,
    plan,
    planName: PLAN_MARKETING.find((p) => p.id === plan)?.name ?? plan,
    features,
    auditsRemaining,
    score,
    scoreBreakdown: computeScoreBreakdown(serialized),
    nextAuditInDays,
    alerts: alerts.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    recentAudits: audits.map((a) => ({
      id: a.id,
      startedAt: a.startedAt.toISOString(),
      overallStatus: a.overallStatus,
      legalPagesStatus: a.legalPagesStatus,
      gdprStatus: a.gdprStatus,
      consumerRightsStatus: a.consumerRightsStatus,
      pricingStatus: a.pricingStatus,
      rulesPassed: a.rulesPassed,
      rulesFailed: a.rulesFailed,
      score: auditScore(a),
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
  const {
    profile,
    score,
    alerts,
    recentAudits,
    nextAuditInDays,
    plan,
    planName,
    features,
    auditsRemaining,
    scoreBreakdown,
  } = useLoaderData();
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

      {plan === PLAN_IDS.FREE && auditsRemaining !== null && (
        <s-banner tone="info">
          <s-paragraph>
            Plan Gratuit : {auditsRemaining} audit manuel restant ce mois-ci.{" "}
            <s-link href="/app/plans">Passer au plan Pro</s-link> pour des audits
            illimités.
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="Score de conformité">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-badge tone={scoreTone}>{score}/100</s-badge>
            <s-badge>{planName}</s-badge>
            <s-text>
              Modèle {profile?.businessModel ?? "B2C"} ·{" "}
              {profile?.uiMode === "expert" ? "Mode expert" : "Mode débutant"}
            </s-text>
          </s-stack>
          <s-paragraph color="subdued">
            Moyenne de 4 domaines : Conforme = 100 pts, À améliorer = 60 pts,
            Non conforme = 20 pts, Non audité = 0 pt.
          </s-paragraph>
          <s-stack direction="block" gap="small">
            {scoreBreakdown.map((domain) => (
              <s-stack key={domain.key} direction="inline" gap="base">
                <s-text>{domain.label}</s-text>
                <s-badge
                  tone={
                    domain.status === "COMPLIANT"
                      ? "success"
                      : domain.status === "WARNING"
                        ? "warning"
                        : domain.status === "NON_COMPLIANT"
                          ? "critical"
                          : "info"
                  }
                >
                  {domain.points} pts
                </s-badge>
              </s-stack>
            ))}
          </s-stack>
        </s-stack>
      </s-section>

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

      <ComplianceSummary profile={profile} />

      <s-section heading="Conformité par domaine">
        <s-paragraph color="subdued">
          Cliquez sur un domaine pour voir les recommandations associées.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          {categories.map(({ key, label }) => {
            const category = PROFILE_KEY_TO_CATEGORY[key];
            return (
              <s-link
                key={key}
                href={`/app/recommendations?category=${category}`}
              >
                <s-box padding="base" borderWidth="base" borderRadius="base">
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
              </s-link>
            );
          })}
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
