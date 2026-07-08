/**
 * URL de retour après confirmation de facturation Shopify.
 * Doit pointer vers l'app embarquée dans l'admin (pas l'URL Railway directe),
 * sinon le marchand atterrit hors iframe avec une page vide / « 200 ».
 *
 * @see https://shopify.dev/docs/api/shopify-app-react-router/latest/apis/billing
 */
export function buildEmbeddedBillingReturnUrl(session, pathname = "/app/plans", query = {}) {
  const shopHandle = session.shop.replace(/\.myshopify\.com$/, "");
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://admin.shopify.com/store/${shopHandle}/apps/${apiKey}${path}${qs ? `?${qs}` : ""}`;
}
