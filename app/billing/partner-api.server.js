const PARTNER_API_VERSION = "2026-07";

const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query ActiveSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      items {
        handle
      }
    }
  }
`;

function partnerConfig() {
  const orgId = process.env.SHOPIFY_PARTNER_ORG_ID?.trim();
  const token = process.env.SHOPIFY_PARTNER_ACCESS_TOKEN?.trim();
  const appId = process.env.SHOPIFY_APP_GID?.trim();
  if (!orgId || !token || !appId) return null;
  return { orgId, token, appId };
}

async function partnerGraphql(query, variables) {
  const config = partnerConfig();
  if (!config) return null;

  const url = `https://partners.shopify.com/${config.orgId}/api/${PARTNER_API_VERSION}/graphql.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    console.error(`[JuriShop] Partner API HTTP ${response.status}`);
    return null;
  }

  const json = await response.json();
  if (json.errors?.length) {
    console.error("[JuriShop] Partner API GraphQL:", json.errors);
    return null;
  }

  return json.data;
}

async function fetchShopGid(admin) {
  if (!admin?.graphql) return null;
  const response = await admin.graphql(`#graphql
    query ShopId {
      shop {
        id
      }
    }
  `);
  const json = await response.json();
  return json.data?.shop?.id ?? null;
}

/**
 * Source de vérité Shopify App Pricing (Partner Dashboard).
 * billing.check() Admin API ne voit pas ces abonnements depuis 2026-07.
 */
export async function fetchActivePlanHandleFromPartner(admin) {
  const config = partnerConfig();
  if (!config || !admin) return null;

  const shopId = await fetchShopGid(admin);
  if (!shopId) return null;

  const data = await partnerGraphql(ACTIVE_SUBSCRIPTION_QUERY, {
    appId: config.appId,
    shopId,
  });

  const items = data?.activeSubscription?.items ?? [];
  return items.find((item) => item?.handle)?.handle ?? null;
}

export function isPartnerBillingConfigured() {
  return partnerConfig() !== null;
}
