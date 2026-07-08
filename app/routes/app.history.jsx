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

const STATUS_LABEL = {
  COMPLIANT: "Conforme",
  WARNING: "À améliorer",
  NON_COMPLIANT: "Non conforme",
  UNKNOWN: "—",
};

export const loader = async ({ request }) => {
  const { getPlanFeatures, PLAN_IDS } = await import(
    "../billing/audit-gate.server.js"
  );
  const { session } = await authenticate.admin(request);
  const profile = serializeProfile(await getShopProfile(session.shop));
  const plan = profile?.billingPlan ?? PLAN_IDS.FREE;
  const features = getPlanFeatures(plan);
  const audits = await getAuditHistory(session.shop);
  return {
    profile,
    plan,
    features,
    audits: audits.map((a) => ({
      ...a,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
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

export default function HistoryPage() {
  const { audits, features } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.shareUrl) {
      navigator.clipboard.writeText(fetcher.data.shareUrl);
      shopify.toast.show("Lien de partage copié (valide 7 jours)");
    }
  }, [fetcher.data, shopify]);

  // Le téléchargement passe par fetch (App Bridge ajoute le jeton de session)
  // puis un Blob : ouvrir la route dans un nouvel onglet perdrait
  // l'authentification embarquée et afficherait une page blanche.
  const downloadReport = async (auditId) => {
    try {
      const response = await fetch(`/app/report/${auditId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
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
    } catch (error) {
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
                    <s-badge>{audit.trigger}</s-badge>
                  </s-stack>
                  <s-paragraph color="subdued">
                    {audit.rulesPassed} conformes · {audit.rulesFailed} échecs ·{" "}
                    {audit.rulesWarning} avertissements
                  </s-paragraph>
                  <s-stack direction="inline" gap="base">
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
