/**
 * Pré-remplit les modèles avec les données boutique + SIRENE.
 */
export function prefillTemplateBody(body, { shop, siret, companyData } = {}) {
  if (!body) return "";

  const company = companyData ? JSON.parse(companyData) : {};
  const billing = shop?.billingAddress ?? {};

  const replacements = {
    SITE_URL: shop?.primaryDomain?.url ?? `https://${shop?.myshopifyDomain ?? ""}`,
    COMPANY_NAME: company.denomination ?? billing.company ?? shop?.name ?? "",
    LEGAL_FORM: company.forme_juridique ?? "",
    CAPITAL: company.capital ?? "[à compléter]",
    ADDRESS: formatAddress(company, billing),
    SIRET: siret ?? company.siret ?? "[à compléter]",
    SIREN: company.siren ?? (siret ? siret.slice(0, 9) : "[à compléter]"),
    RCS: company.rcs ?? "[à compléter]",
    VAT_NUMBER: company.tva ?? "[à compléter]",
    CONTACT_EMAIL: shop?.contactEmail ?? shop?.email ?? "",
    PHONE: company.telephone ?? "[à compléter]",
    PUBLISHER_NAME: company.dirigeant ?? "[à compléter]",
  };

  let result = body;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

function formatAddress(company, billing) {
  if (company.adresse) return company.adresse;
  const parts = [
    billing.address1,
    billing.zip,
    billing.city,
    billing.countryCodeV2,
  ].filter(Boolean);
  return parts.join(", ") || "[à compléter]";
}
