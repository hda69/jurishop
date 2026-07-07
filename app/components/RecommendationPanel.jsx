/* eslint-disable react/prop-types */
import { useFetcher, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useCallback, useEffect, useState } from "react";

const CATEGORY_LABELS = {
  LEGAL_PAGES: "Pages légales",
  GDPR: "RGPD",
  CONSUMER_RIGHTS: "Droits des consommateurs",
  PRICING: "Prix",
  TAX: "Fiscalité",
  ACCESSIBILITY: "Accessibilité",
  OTHER: "Autre",
};

const SEVERITY_TONE = {
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info",
};

const SEVERITY_LABEL = {
  CRITICAL: "Critique",
  WARNING: "Attention",
  INFO: "Info",
};

const STATUS_LABEL = {
  PENDING: "À traiter",
  VIEWED: "Consultée",
  ACKNOWLEDGED: "Prise en compte",
  APPLIED_BY_MERCHANT: "Appliquée",
  DISMISSED: "Ignorée",
};

function openAdminPath(shopDomain, adminPath) {
  const path = adminPath.startsWith("/") ? adminPath : `/${adminPath}`;
  window.open(`https://${shopDomain}/admin${path}`, "_top");
}

function RecommendationCard({ recommendation, shopDomain, expertMode }) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [expanded, setExpanded] = useState(false);
  const isResolved =
    recommendation.status === "APPLIED_BY_MERCHANT" ||
    recommendation.status === "DISMISSED";

  useEffect(() => {
    if (
      expanded &&
      recommendation.status === "PENDING" &&
      fetcher.state === "idle"
    ) {
      fetcher.submit(
        { intent: "mark_viewed", id: recommendation.id },
        { method: "post" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok && fetcher.data?.status) {
      revalidator.revalidate();
      const messages = {
        APPLIED_BY_MERCHANT: "Correction marquée comme appliquée",
        ACKNOWLEDGED: "Recommandation prise en compte",
        DISMISSED: "Recommandation ignorée",
      };
      shopify.toast.show(messages[fetcher.data.status] ?? "Mis à jour");
    }
  }, [fetcher.state, fetcher.data, revalidator, shopify]);

  const copyTemplate = useCallback(async () => {
    if (!recommendation.textTemplateBody) return;
    try {
      await navigator.clipboard.writeText(recommendation.textTemplateBody);
      shopify.toast.show("Modèle copié dans le presse-papiers");
    } catch {
      shopify.toast.show("Impossible de copier le modèle", { isError: true });
    }
  }, [recommendation.textTemplateBody, shopify]);

  const submitStatus = (status) => {
    fetcher.submit(
      { intent: "update_status", id: recommendation.id, status },
      { method: "post" },
    );
  };

  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background={isResolved ? "subdued" : "base"}
    >
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base">
          <s-badge tone={SEVERITY_TONE[recommendation.severity]}>
            {SEVERITY_LABEL[recommendation.severity]}
          </s-badge>
          <s-badge>{CATEGORY_LABELS[recommendation.category]}</s-badge>
          <s-badge tone={isResolved ? "success" : "warning"}>
            {STATUS_LABEL[recommendation.status]}
          </s-badge>
        </s-stack>

        <s-heading>{recommendation.title}</s-heading>
        {expertMode && (
          <s-paragraph color="subdued">
            ID : {recommendation.ruleId} · {recommendation.jurisdiction} ·{" "}
            {recommendation.category}
          </s-paragraph>
        )}
        <s-paragraph>{recommendation.summary}</s-paragraph>

        <s-stack direction="inline" gap="base">
          <s-button variant="secondary" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Masquer le détail" : "Voir les actions"}
          </s-button>
          {recommendation.textTemplateBody && (
            <s-button variant="secondary" onClick={copyTemplate}>
              Copier le modèle
            </s-button>
          )}
        </s-stack>

        {expanded && (
          <s-stack direction="block" gap="base">
            <s-divider />

            <s-text type="strong">Étapes recommandées</s-text>
            <s-unordered-list>
              {recommendation.remediationSteps.map((step) => (
                <s-list-item key={step}>{step}</s-list-item>
              ))}
            </s-unordered-list>

            {recommendation.merchantActions.length > 0 && (
              <>
                <s-text type="strong">Actions dans l&apos;admin Shopify</s-text>
                <s-stack direction="inline" gap="base">
                  {recommendation.merchantActions.map((action) => (
                    <s-button
                      key={action.adminPath}
                      variant="tertiary"
                      onClick={() =>
                        openAdminPath(shopDomain, action.adminPath)
                      }
                    >
                      {action.label}
                    </s-button>
                  ))}
                </s-stack>
                {recommendation.merchantActions.some((a) => a.description) && (
                  <s-paragraph color="subdued">
                    {recommendation.merchantActions
                      .filter((a) => a.description)
                      .map((a) => a.description)
                      .join(" · ")}
                  </s-paragraph>
                )}
              </>
            )}

            {recommendation.textTemplateBody && (
              <s-section heading="Aperçu du modèle (indicatif)">
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      fontSize: "12px",
                      maxHeight: "240px",
                      overflow: "auto",
                    }}
                  >
                    <code>{recommendation.textTemplateBody}</code>
                  </pre>
                </s-box>
                <s-stack direction="inline" gap="base">
                  <s-button onClick={copyTemplate}>Copier le modèle</s-button>
                </s-stack>
              </s-section>
            )}

            <s-banner tone="info" heading="Avertissement juridique">
              <s-paragraph>{recommendation.legalDisclaimer}</s-paragraph>
            </s-banner>

            {!isResolved && (
              <s-stack direction="inline" gap="base">
                <s-button
                  variant="primary"
                  onClick={() => submitStatus("APPLIED_BY_MERCHANT")}
                  {...(fetcher.state !== "idle" ? { loading: true } : {})}
                >
                  J&apos;ai appliqué cette correction
                </s-button>
                <s-button
                  variant="secondary"
                  onClick={() => submitStatus("ACKNOWLEDGED")}
                >
                  Pris en compte
                </s-button>
                <s-button
                  variant="tertiary"
                  onClick={() => submitStatus("DISMISSED")}
                >
                  Ignorer
                </s-button>
              </s-stack>
            )}
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
}

export function RecommendationPanel({ recommendations, shopDomain, filter, expertMode }) {
  const filtered = recommendations.filter((rec) => {
    if (filter === "open") {
      return !["APPLIED_BY_MERCHANT", "DISMISSED"].includes(rec.status);
    }
    if (filter === "resolved") {
      return ["APPLIED_BY_MERCHANT", "DISMISSED"].includes(rec.status);
    }
    return true;
  });

  if (filtered.length === 0) {
    return (
      <s-banner tone="success" heading="Aucun manquement dans cette vue">
        <s-paragraph>
          {filter === "open"
            ? "Toutes les recommandations ouvertes ont été traitées."
            : "Aucune recommandation à afficher."}
        </s-paragraph>
      </s-banner>
    );
  }

  return (
    <s-stack direction="block" gap="large">
      {filtered.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          shopDomain={shopDomain}
          expertMode={expertMode}
        />
      ))}
    </s-stack>
  );
}

export function ComplianceSummary({ profile }) {
  if (!profile) return null;

  const statusTone = {
    COMPLIANT: "success",
    WARNING: "warning",
    NON_COMPLIANT: "critical",
    UNKNOWN: "info",
  };

  const statusLabel = {
    COMPLIANT: "Conforme",
    WARNING: "À améliorer",
    NON_COMPLIANT: "Non conforme",
    UNKNOWN: "Non audité",
  };

  return (
    <s-section heading="Synthèse">
      <s-stack direction="inline" gap="base">
        <s-badge tone={statusTone[profile.overallStatus]}>
          Global : {statusLabel[profile.overallStatus]}
        </s-badge>
        <s-badge>
          {profile.openIssuesCount} point
          {profile.openIssuesCount > 1 ? "s" : ""} ouvert
          {profile.openIssuesCount > 1 ? "s" : ""}
        </s-badge>
        <s-badge tone="critical">
          {profile.criticalIssuesCount} critique
          {profile.criticalIssuesCount > 1 ? "s" : ""}
        </s-badge>
      </s-stack>
    </s-section>
  );
}
