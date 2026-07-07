const CATEGORY_TO_PROFILE = {
  legal_pages: "legalPagesStatus",
  gdpr: "gdprStatus",
  consumer_rights: "consumerRightsStatus",
  pricing: "pricingStatus",
};

function worstStatus(current, next) {
  const order = { COMPLIANT: 0, WARNING: 1, NON_COMPLIANT: 2, UNKNOWN: 3 };
  return order[next] > order[current] ? next : current;
}

function resultToComplianceStatus(status) {
  if (status === "PASS") return "COMPLIANT";
  if (status === "WARNING") return "WARNING";
  if (status === "FAIL") return "NON_COMPLIANT";
  return "UNKNOWN";
}

/** Agrège les résultats par catégorie et calcule le statut global. */
export function aggregateAuditStatus(ruleResults, rulesById, internalRuleIds = new Set()) {
  const categories = {
    legal_pages: "COMPLIANT",
    gdpr: "COMPLIANT",
    consumer_rights: "COMPLIANT",
    pricing: "COMPLIANT",
  };

  for (const result of ruleResults) {
    if (internalRuleIds.has(result.ruleId)) continue;
    const rule = rulesById.get(result.ruleId);
    if (!rule) continue;

    const field = CATEGORY_TO_PROFILE[rule.category];
    if (!field) continue;

    const status = resultToComplianceStatus(result.status);
    categories[rule.category] = worstStatus(categories[rule.category], status);
  }

  let overallStatus = "COMPLIANT";
  for (const status of Object.values(categories)) {
    overallStatus = worstStatus(overallStatus, status);
  }

  return {
    overallStatus,
    legalPagesStatus: categories.legal_pages,
    gdprStatus: categories.gdpr,
    consumerRightsStatus: categories.consumer_rights,
    pricingStatus: categories.pricing,
  };
}

export function countResults(ruleResults) {
  return {
    rulesTotal: ruleResults.length,
    rulesPassed: ruleResults.filter((r) => r.status === "PASS").length,
    rulesFailed: ruleResults.filter((r) => r.status === "FAIL").length,
    rulesWarning: ruleResults.filter((r) => r.status === "WARNING").length,
    rulesSkipped: ruleResults.filter((r) => r.status === "SKIPPED").length,
  };
}
