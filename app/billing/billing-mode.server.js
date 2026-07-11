/**
 * manual — Billing API in-app (billing.request). Requis tant que l'app n'est pas
 * publiée : la page App Pricing hébergée renvoie 404 en revue.
 * app_pricing — redirection vers la page Shopify (après publication App Store).
 */
export function useShopifyAppPricing() {
  return process.env.SHOPIFY_BILLING_MODE === "app_pricing";
}
