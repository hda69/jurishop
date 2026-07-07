import { getNestedValue } from "./utils.js";

const FIELD_LABELS = {
  contactEmail: "Email de contact",
  "billingAddress.company": "Raison sociale",
  "billingAddress.address1": "Adresse",
  "billingAddress.city": "Ville",
  "billingAddress.zip": "Code postal",
  "billingAddress.countryCodeV2": "Pays",
};

export async function checkShopFieldPresent(params, context) {
  const missing = [];

  for (const field of params.fields ?? []) {
    const value = getNestedValue(context.shop, field);
    if (!value || String(value).trim() === "") {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      status: "FAIL",
      message: `Informations boutique manquantes : ${missing.map((f) => FIELD_LABELS[f] ?? f).join(", ")}.`,
      details: { missingFields: missing },
    };
  }

  return {
    status: "PASS",
    message: "Les informations boutique requises sont renseignées.",
    details: { checkedFields: params.fields },
  };
}
