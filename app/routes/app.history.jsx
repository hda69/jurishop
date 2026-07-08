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

function scoreColor(score) {
  if (score >= 80) return "#29845a";
  if (score >= 50) return "#b98900";
  return "#e51c00";
}

function chartAxisLabels(audits) {
  const dayCounts = new Map();
  for (const audit of audits) {
    const day = new Date(audit.startedAt).toLocaleDateString("fr-FR");
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  return audits.map((audit) => {
    const date = new Date(audit.startedAt);
    const day = date.toLocaleDateString("fr-FR");
    const label = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    if ((dayCounts.get(day) ?? 0) > 1) {
      return {
        primary: label,
        secondary: date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }
    return { primary: label, secondary: null };
  });
}

function ScoreChart({ audits }) {
  if (audits.length === 0) return null;
  const ordered = [...audits].reverse().slice(-10);
  const axisLabels = chartAxisLabels(ordered);
  const width = 400;
  const height = axisLabels.some((l) => l.secondary) ? 172 : 160;
  const pad = { top: 12, right: 16, bottom: axisLabels.some((l) => l.secondary) ? 44 : 32, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const count = ordered.length;
  const gap = 10;
  const barW = Math.min(40, (plotW - gap * (count - 1)) / count);
  const totalBarsW = count * barW + gap * (count - 1);
  const offsetX = pad.left + (plotW - totalBarsW) / 2;

  const points = ordered.map((audit, i) => {
    const x = offsetX + i * (barW + gap) + barW / 2;
    const barH = Math.max(4, (audit.score / 100) * plotH);
    const y = pad.top + plotH - barH;
    return { audit, x, y, barH, barX: offsetX + i * (barW + gap) };
  });

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-text type="strong">Évolution du score (/100)</s-text>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Graphique d'évolution du score de conformité"
        style={{ width: "100%", maxWidth: 520, height: "auto", marginTop: 12, display: "block" }}
      >
        {[0, 50, 100].map((tick) => {
          const y = pad.top + plotH - (tick / 100) * plotH;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#e3e3e3"
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#6d7175"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={width - pad.right}
          y2={pad.top + plotH}
          stroke="#8a8a8a"
          strokeWidth={1}
        />

        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="#2c6ecb"
            strokeWidth={2}
            strokeLinejoin="round"
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          />
        )}

        {points.map(({ audit, barX, y, barH, x }, i) => (
          <g key={audit.id}>
            <rect
              x={barX}
              y={y}
              width={barW}
              height={barH}
              fill={scoreColor(audit.score)}
              rx={3}
            />
            <circle cx={x} cy={y} r={3} fill="#2c6ecb" />
            <text
              x={x}
              y={height - (axisLabels[i].secondary ? 18 : 10)}
              textAnchor="middle"
              fontSize={10}
              fill="#6d7175"
            >
              {axisLabels[i].primary}
            </text>
            {axisLabels[i].secondary && (
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fill="#8a8a8a"
              >
                {axisLabels[i].secondary}
              </text>
            )}
            <text
              x={x}
              y={y - 6}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill={scoreColor(audit.score)}
            >
              {audit.score}
            </text>
          </g>
        ))}
      </svg>
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
