export async function checkProductPricingStrikethrough(params, context) {
  const invalid = [];
  const sampleSize = params.sampleSize ?? 50;
  const products = context.productsWithCompareAt.slice(0, sampleSize);

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

  if (invalid.length === 0) {
    return {
      status: "PASS",
      message:
        products.length === 0
          ? "Aucun produit avec prix barré détecté."
          : "Les prix barrés sont cohérents (supérieurs au prix de vente).",
      details: { checkedCount: products.length },
    };
  }

  const severity = invalid.length >= 3 ? "FAIL" : "WARNING";
  return {
    status: severity,
    message: `${invalid.length} produit${invalid.length > 1 ? "s" : ""} avec un prix barré incohérent (≤ prix de vente).`,
    details: { invalidProducts: invalid.slice(0, 10), totalInvalid: invalid.length },
  };
}
