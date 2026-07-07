import { matchesAllPatterns, stripHtml } from "./utils.js";

function findPolicy(context, policyType) {
  return context.shopPolicies.find((p) => p.type === policyType);
}

export async function checkShopPolicyExists(params, context) {
  const policy = findPolicy(context, params.policyType);

  if (!policy || !stripHtml(policy.body)) {
    const labels = {
      PRIVACY_POLICY: "Politique de confidentialité",
      REFUND_POLICY: "Politique de retour",
      TERMS_OF_SERVICE: "Conditions de vente",
      SHIPPING_POLICY: "Politique d'expédition",
      CONTACT_INFORMATION: "Coordonnées de contact",
    };
    return {
      status: "FAIL",
      message: `${labels[params.policyType] ?? params.policyType} non configurée ou vide.`,
      details: { policyType: params.policyType },
    };
  }

  return {
    status: "PASS",
    message: `${policy.title || params.policyType} configurée.`,
    details: { policyType: params.policyType, url: policy.url },
  };
}

export async function checkShopPolicyContent(params, context) {
  const existsResult = await checkShopPolicyExists(params, context);
  if (existsResult.status === "FAIL") {
    return existsResult;
  }

  const policy = findPolicy(context, params.policyType);
  const body = stripHtml(policy.body);
  const missing = (params.requiredPatterns ?? []).filter(
    (pattern) => !matchesAllPatterns(body, [pattern]),
  );

  if (missing.length > 0) {
    return {
      status: "FAIL",
      message: `Mentions manquantes dans la politique : ${missing.join(", ")}.`,
      details: { policyType: params.policyType, missingPatterns: missing },
    };
  }

  return {
    status: "PASS",
    message: "La politique contient les mentions requises.",
    details: { policyType: params.policyType },
  };
}
