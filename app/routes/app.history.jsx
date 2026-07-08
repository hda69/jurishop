import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import {
  createShareLink,
  getAuditHistory,
  getShopProfile,
  serializeProfile,
} from "../models/compliance.server";
import { AUDIT_TRIGGER_LABEL } from "../compliance/constants/labels.js";

const STATUS_LABEL = {
  COMPLIANT: "Conforme",
  WARNING: "À améliorer",
  NON_COMPLIANT: "Non conforme",
  UNKNOWN: "—",
};

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
  const { getPlanFeatures, effectivePlanFromProfile } = await import(
    "../billing/plans.server.js"
  );
  const { session, billing } = await authenticate.admin(request);
  const { syncBillingPlanFromShopify } = await import(
    "../billing/subscription.server.js"
  );
  await syncBillingPlanFromShopify(session.shop, billing);
  const profile = serializeProfile(await getShopProfile(session.shop));
  const plan = effectivePlanFromProfile(profile);
  const features = getPlanFeatures(plan);
  const audits = await getAuditHistory(session.shop);
  const scored = audits.map((a) => ({
    ...a,
    score: auditScore(a),
    startedAt: a.startedAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
    triggerLabel: AUDIT_TRIGGER_LABEL[a.trigger] ?? a.trigger,
  }));
  return { profile, plan, features, audits: scored };
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const { syncBillingPlanFromShopify } = await import(
    "../billing/subscription.server.js"
  );
  await syncBillingPlanFromShopify(session.shop, billing);
  const formData = await request.formData();
  const auditId = formData.get("auditId");

  if (formData.get("intent") === "share" && auditId) {
    const { token, expiresAt } = await createShareLink(
      session.shop,
      String(auditId),
    );
    const appUrl = process.env.SHOPIFY_APP_URL || ""; // eslint-disable-line no-undef
    return {
      ok: true,
      shareUrl: `${appUrl}/report/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  return { ok: false };
};

function ScoreChart({ audits }) {
  if (audits.length < 2) return null;
  const ordered = [...audits].reverse().slice(-10);
  const max = 100;

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-text type="strong">Évolution du score (/100)</s-text>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          height: "120px",
          marginTop: "12px",
        }}
      >
        {ordered.map((audit) => (
          <div
            key={audit.id}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
            title={`${new Date(audit.startedAt).toLocaleDateString("fr-FR")} — ${audit.score}/100`}
          >
            <div
              style={{
                width: "100%",
                height: `${Math.max(8, (audit.score / max) * 100)}%`,
                background:
                  audit.score >= 80
                    ? "#29845a"
                    : audit.score >= 50
                      ? "#b98900"
                      : "#e51c00",
                borderRadius: "4px 4px 0 0",
              }}
            />
            <span style={{ fontSize: "10px", color: "#6d7175" }}>
              {audit.score}
            </span>
          </div>
        ))}
      </div>
    </s-box>
  );
}

export default function HistoryPage() {
  const { audits, features } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.shareUrl) {
      navigator.clipboard.writeText(fetcher.data.shareUrl);
      const expiry = fetcher.data.expiresAt
        ? new Date(fetcher.data.expiresAt).toLocaleDateString("fr-FR")
        : "7 jours";
      shopify.toast.show(`Lien copié — valide jusqu'au ${expiry}`);
    }
  }, [fetcher.data, shopify]);

  const downloadReport = async (auditId) => {
    try {
      const response = await fetch(`/app/report/${auditId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jurishop-audit-${auditId}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      shopify.toast.show("Échec du téléchargement du rapport", {
        isError: true,
      });
    }
  };

  return (
    <s-page heading="Historique des audits">
      <s-section heading="Évolution de la conformité">
        {audits.length === 0 ? (
          <s-paragraph>Aucun audit complété.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            <ScoreChart audits={audits} />
            {audits.map((audit) => (
              <s-box
                key={audit.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base">
                    <s-text type="strong">
                      {new Date(audit.startedAt).toLocaleString("fr-FR")}
                    </s-text>
                    <s-badge tone="info">{audit.score}/100</s-badge>
                    <s-badge
                      tone={
                        audit.overallStatus === "COMPLIANT"
                          ? "success"
                          : audit.overallStatus === "WARNING"
                            ? "warning"
                            : "critical"
                      }
                    >
                      {STATUS_LABEL[audit.overallStatus] ?? audit.overallStatus}
                    </s-badge>
                    <s-badge>{audit.triggerLabel}</s-badge>
                  </s-stack>
                  <s-paragraph color="subdued">
                    {audit.rulesPassed} conformes · {audit.rulesFailed} échecs ·{" "}
                    {audit.rulesWarning} avertissements
                  </s-paragraph>
                  <s-stack direction="inline" gap="base">
                    <s-button href={`/app/audit/${audit.id}`} variant="primary">
                      Voir le détail
                    </s-button>
                    {features.htmlReports ? (
                      <s-button
                        onClick={() => downloadReport(audit.id)}
                        variant="secondary"
                      >
                        Télécharger le rapport
                      </s-button>
                    ) : (
                      <s-button href="/app/plans" variant="secondary">
                        Rapport HTML (plan Pro)
                      </s-button>
                    )}
                    {features.shareLinks ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="share" />
                        <input type="hidden" name="auditId" value={audit.id} />
                        <s-button type="submit" variant="tertiary">
                          Partager avec mon conseiller
                        </s-button>
                      </fetcher.Form>
                    ) : (
                      <s-button href="/app/plans" variant="tertiary">
                        Partage conseiller (plan Pro)
                      </s-button>
                    )}
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
