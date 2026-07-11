/**
 * Shopify App Pricing — page de sélection hébergée par Shopify.
 * Ne pas utiliser billing.request() quand App Pricing est activé dans le Partner Dashboard.
 *
 * @see https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing/redirect-plan-selection-page
 */
export function resolveAppHandle() {
  return (
    process.env.SHOPIFY_APP_HANDLE?.trim() ||
    process.env.SHOPIFY_APP_NAME?.trim() ||
    "jurishop"
  );
}

export function buildAppPricingPlanSelectionUrl(session) {
  const storeHandle = session.shop.replace(/\.myshopify\.com$/, "");
  const appHandle = resolveAppHandle();
  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}

/** Redirige vers la page Shopify (hors iframe) pour choisir / approuver un plan. */
export function redirectToAppPricingPlanSelection(session, redirect) {
  return redirect(buildAppPricingPlanSelectionUrl(session), { target: "_top" });
}
