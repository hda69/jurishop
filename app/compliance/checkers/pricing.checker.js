import { normalizeText } from "./utils.js";

const OMNIBUS_PATTERNS = [
  "prix le plus bas",
  "30 jours",
  "meilleur prix",
  "prix de reference",
  "prix de référence",
  "previous price",
  "lowest price",
];

function collectLegalTexts(context) {
  const texts = [];
  for (const page of context.pages ?? []) {
    if (page.body) texts.push(page.body);
  }
  for (const policy of context.shopPolicies ?? []) {
    if (policy.body) texts.push(policy.body);
  }
  return texts.map(normalizeText);
}

function hasOmnibusMention(context) {
  const texts = collectLegalTexts(context);
  return OMNIBUS_PATTERNS.some((pattern) =>
    texts.some((text) => text.includes(normalizeText(pattern))),
  );
}

export async function checkProductPricingStrikethrough(params, context) {
  const invalid = [];
  const sampleSize = params.sampleSize ?? 50;
  const products = context.productsWithCompareAt.slice(0, sampleSize);
  const promoCount = products.filter((product) => {
    const price = parseFloat(product.price);
    const compareAt = parseFloat(product.compareAtPrice ?? "");
    return compareAt > price && !Number.isNaN(compareAt) && !Number.isNaN(price);
  }).length;

  for (const product of products) {
    const price = parseFloat(product.price);
    const compareAt = parseFloat(product.compareAtPrice ?? "");

    if (!compareAt || Number.isNaN(compareAt) || Number.isNaN(price)) continue;

    if (params.requireCompareAtGreaterThanPrice !== false && compareAt <= price) {
      invalid.push({
        id: product.id,
        title: product.title,
        handle: product.handle,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
      });
    }
  }

  const omnibusMissing =
    params.flagMissingLowestPriceMention &&
    promoCount > 0 &&
    !hasOmnibusMention(context);

  if (invalid.length === 0 && !omnibusMissing) {
    return {
      status: "PASS",
      message:
        products.length === 0
          ? "Aucun produit avec prix barré détecté."
          : "Les prix barrés sont cohérents (supérieurs au prix de vente).",
      details: { checkedCount: products.length },
    };
  }

  const messages = [];
  if (invalid.length > 0) {
    messages.push(
      `${invalid.length} produit${invalid.length > 1 ? "s" : ""} avec un prix barré incohérent (≤ prix de vente).`,
    );
  }
  if (omnibusMissing) {
    messages.push(
      `${promoCount} produit(s) en promotion sans mention du prix le plus bas sur 30 jours (directive Omnibus) dans les CGV ou pages légales.`,
    );
  }

  const severity =
    invalid.length >= 3 || omnibusMissing ? "FAIL" : "WARNING";

  return {
    status: severity,
    message: messages.join(" "),
    details: {
      invalidProducts: invalid.slice(0, 10),
      totalInvalid: invalid.length,
      omnibusMissing,
      promoProductsChecked: promoCount,
    },
  };
}
