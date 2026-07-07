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
  const { session } = await authenticate.admin(request);
  const profile = serializeProfile(await getShopProfile(session.shop));
  const audits = await getAuditHistory(session.shop, 15);
  return {
    profile,
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
  const { audits } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.shareUrl) {
      navigator.clipboard.writeText(fetcher.data.shareUrl);
      shopify.toast.show("Lien de partage copié (valide 7 jours)");
    }
  }, [fetcher.data, shopify]);

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
                    <s-button
                      href={`/app/report/${audit.id}`}
                      target="_blank"
                      variant="secondary"
                    >
                      Télécharger le rapport
                    </s-button>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="share" />
                      <input type="hidden" name="auditId" value={audit.id} />
                      <s-button type="submit" variant="tertiary">
                        Partager avec mon conseiller
                      </s-button>
                    </fetcher.Form>
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
