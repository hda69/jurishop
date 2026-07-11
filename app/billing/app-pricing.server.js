/**
 * Shopify App Pricing — page de sélection hébergée par Shopify.
 * Ne pas utiliser billing.request() quand App Pricing est activé dans le Partner Dashboard.
 *
 * @see https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing/redirect-plan-selection-page
 */

function extractNumericId(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  const match = value.match(/(\d+)$/);
  return match?.[1] ?? null;
}

/** ID numérique Partner (ex. 394627055617 depuis l’URL ou SHOPIFY_APP_GID). */
export function resolvePartnerAppNumericId() {
  return (
    extractNumericId(process.env.SHOPIFY_APP_GID) ||
    extractNumericId(process.env.SHOPIFY_APP_HANDLE) ||
    null
  );
}

/** Slug handle dans shopify.app.toml (ex. jurishop). */
export function resolveAppHandleSlug() {
  return (
    process.env.SHOPIFY_APP_HANDLE?.trim() ||
    process.env.SHOPIFY_APP_NAME?.trim() ||
    "jurishop"
  );
}

/**
 * URL App Pricing — format admin.shopify.com (handle = slug ou ID numérique).
 * https://admin.shopify.com/store/{store}/charges/{handle}/pricing_plans
 */
export function buildChargesPricingPlansUrl(session, handle) {
  const storeHandle = session.shop.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${handle}/pricing_plans`;
}

/**
 * URL App Pricing — fallback managed_pricing.
 * https://{shop}.myshopify.com/admin/billing/managed_pricing/plans?app_id={id}
 */
export function buildManagedPricingUrl(session) {
  const appId = resolvePartnerAppNumericId();
  if (!appId) return null;
  return `https://${session.shop}/admin/billing/managed_pricing/plans?app_id=${appId}`;
}

/** URLs candidates — la doc officielle utilise charges/{app_handle}/pricing_plans en premier. */
export function buildAllPricingPlanUrls(session) {
  const slug = resolveAppHandleSlug();
  const numericId = resolvePartnerAppNumericId();
  const urls = [buildChargesPricingPlansUrl(session, slug)];
  if (numericId && numericId !== slug) {
    urls.push(buildChargesPricingPlansUrl(session, numericId));
  }
  const managed = buildManagedPricingUrl(session);
  if (managed) urls.push(managed);
  return [...new Set(urls)];
}

export function buildAppPricingPlanSelectionUrl(session) {
  return buildAllPricingPlanUrls(session)[0];
}

/** Redirige vers la page Shopify (hors iframe) pour choisir / approuver un plan. */
export function redirectToAppPricingPlanSelection(session, redirect) {
  const url = buildAppPricingPlanSelectionUrl(session);
  console.log(`[JuriShop] Redirection App Pricing: ${url}`);
  return redirect(url, { target: "_top" });
}
