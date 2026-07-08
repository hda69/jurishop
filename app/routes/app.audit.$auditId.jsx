import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getAuditWithResults } from "../models/compliance.server";
import { loadRulesById } from "../compliance/rules/pack-loader.server.js";
import { AUDIT_TRIGGER_LABEL } from "../compliance/constants/labels.js";

const RESULT_LABEL = {
  PASS: "Conforme",
  FAIL: "Non conforme",
  WARNING: "Attention",
  SKIPPED: "Ignoré",
  ERROR: "Erreur",
};

const STATUS_LABEL = {
  COMPLIANT: "Conforme",
  WARNING: "À améliorer",
  NON_COMPLIANT: "Non conforme",
  UNKNOWN: "Non audité",
};

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const data = await getAuditWithResults(session.shop, params.auditId);
  if (!data) throw new Response("Audit introuvable", { status: 404 });

  let jurisdictions = ["FR"];
  try {
    jurisdictions = JSON.parse(data.audit.jurisdictions || '["FR"]');
  } catch {
    // défaut
  }
  const rulesById = await loadRulesById(jurisdictions);

  return {
    ...data,
    rulesById: Object.fromEntries(rulesById),
    triggerLabel:
      AUDIT_TRIGGER_LABEL[data.audit.trigger] ?? data.audit.trigger,
  };
};

export default function AuditDetailPage() {
  const { audit, ruleResults, rulesById, triggerLabel } = useLoaderData();

  return (
    <s-page heading="Détail de l'audit">
      <s-link slot="breadcrumb-actions" href="/app/history">
        Historique
      </s-link>

      <s-section heading="Synthèse">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text type="strong">Date :</s-text>{" "}
            {new Date(audit.completedAt ?? audit.startedAt).toLocaleString("fr-FR")}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Déclencheur :</s-text> {triggerLabel}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Statut global :</s-text>{" "}
            {STATUS_LABEL[audit.overallStatus] ?? audit.overallStatus}
          </s-paragraph>
          <s-paragraph color="subdued">
            {audit.rulesPassed} conformes · {audit.rulesFailed} échecs ·{" "}
            {audit.rulesWarning} avertissements
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Points vérifiés">
        <s-stack direction="block" gap="base">
          {ruleResults.map((result) => {
            const rule = rulesById[result.ruleId];
            const title = rule?.title ?? result.ruleId;
            return (
              <s-box
                key={result.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="base">
                    <s-text type="strong">{title}</s-text>
                    <s-badge
                      tone={
                        result.status === "PASS"
                          ? "success"
                          : result.status === "WARNING"
                            ? "warning"
                            : "critical"
                      }
                    >
                      {RESULT_LABEL[result.status] ?? result.status}
                    </s-badge>
                  </s-stack>
                  {result.message && (
                    <s-paragraph color="subdued">{result.message}</s-paragraph>
                  )}
                  {rule?.legalReference && (
                    <s-paragraph color="subdued">
                      Réf. : {rule.legalReference}
                    </s-paragraph>
                  )}
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
