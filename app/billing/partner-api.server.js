/** activeSubscription attend gid://shopify/App/id et gid://shopify/Shop/id (docs Shopify). */
export function normalizePartnerGid(raw, modelName) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  if (/^gid:\/\/shopify\/\w+\/\d+$/.test(value)) return value;

  const legacyPartners = value.match(/^gid:\/\/partners\/(\w+)\/(\d+)$/);
  if (legacyPartners) {
    return `gid://shopify/${legacyPartners[1]}/${legacyPartners[2]}`;
  }

  if (/^\d+$/.test(value)) {
    return `gid://shopify/${modelName}/${value}`;
  }

  return value;
}

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
  const appId = normalizePartnerGid(process.env.SHOPIFY_APP_GID, "App");
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

export async function fetchActivePlanHandleFromPartner(admin) {
  const config = partnerConfig();
  if (!config || !admin) return null;

  const shopIdRaw = await fetchShopGid(admin);
  const shopId = normalizePartnerGid(shopIdRaw, "Shop");
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
