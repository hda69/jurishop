import type { ComplianceRule } from "../rules/schema";
import type { AdvisoryRecommendation } from "../principles";
import { DEFAULT_LEGAL_DISCLAIMER } from "../principles";
import type { RuleCheckResult } from "../types";

/**
 * Transforme un échec d'audit en recommandation consultative.
 * Aucune écriture Shopify — uniquement des instructions pour le marchand.
 */
export function buildAdvisoryFromRule(
  rule: ComplianceRule,
  checkResult: RuleCheckResult,
  textTemplateBody?: string,
): AdvisoryRecommendation {
  const advisory = rule.advisory;

  return {
    ruleId: rule.id,
    title: rule.title,
    summary: checkResult.message,
    remediationSteps: advisory?.remediationSteps ?? fallbackSteps(rule),
    merchantActions: advisory?.merchantActions ?? [],
    textTemplateId: advisory?.textTemplateId,
    legalDisclaimer: DEFAULT_LEGAL_DISCLAIMER,
    ...(textTemplateBody ? {} : {}),
  };
}

function fallbackSteps(rule: ComplianceRule): string[] {
  if (rule.remediation) return [rule.remediation];
  return [
    "Consultez le détail du manquement détecté.",
    "Adaptez le contenu à votre activité.",
    "Publiez les modifications vous-même dans l'admin Shopify.",
  ];
}
