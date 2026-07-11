/**
 * JuriShop est inscrit à Shopify App Pricing — billing.request() est interdit
 * par Shopify (« Managed Pricing Apps cannot use the Billing API »).
 * Seule la redirection vers la page forfaits hébergée par Shopify est possible.
 */
export function useShopifyAppPricing() {
  return true;
}
