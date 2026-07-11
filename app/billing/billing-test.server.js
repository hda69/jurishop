/**
 * Boutiques de développement Partner : isTest obligatoire (sinon « montant facturé » refusé).
 * @see https://shopify.dev/docs/apps/launch/billing/manual-pricing/subscription-billing/offer-free-trials
 */
export async function isPartnerDevelopmentStore(admin) {
  if (!admin?.graphql) return false;
  const response = await admin.graphql(`#graphql
    query ShopPlan {
      shop {
        plan {
          partnerDevelopment
        }
      }
    }
  `);
  const json = await response.json();
  return json.data?.shop?.plan?.partnerDevelopment === true;
}

/**
 * isTest pour billing.request / billing.check.
 * - SHOPIFY_BILLING_TEST=true → toujours test
 * - Boutique Partner dev → toujours test (même si env=false, revue App Store)
 * - SHOPIFY_BILLING_TEST=false → facturation réelle (boutiques live)
 */
export async function resolveBillingTestMode(admin, shop) {
  if (process.env.SHOPIFY_BILLING_TEST === "true") return true;

  if (admin) {
    const isDevStore = await isPartnerDevelopmentStore(admin);
    if (isDevStore) {
      console.log(`[JuriShop] Boutique dev ${shop} → facturation test (isTest=true)`);
      return true;
    }
  }

  if (process.env.SHOPIFY_BILLING_TEST === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Sync sans admin — préférer resolveBillingTestMode quand admin est disponible. */
export function isBillingTestModeEnvOnly() {
  if (process.env.SHOPIFY_BILLING_TEST === "true") return true;
  if (process.env.SHOPIFY_BILLING_TEST === "false") return false;
  return process.env.NODE_ENV !== "production";
}
