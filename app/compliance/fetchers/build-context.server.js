import { assertReadOnlyGraphQLOperation } from "../guards/read-only.server.js";
import { normalizeText } from "../checkers/utils.js";

const THEME_FILES_QUERY = `#graphql
  query JuriShopThemeFiles($themeId: ID!) {
    theme(id: $themeId) {
      id
      name
      files(filenames: [
        "layout/theme.liquid",
        "sections/footer.liquid",
        "snippets/footer.liquid",
        "config/settings_data.json"
      ]) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
      }
    }
  }
`;

const APPS_QUERY = `#graphql
  query JuriShopInstalledApps {
    appInstallations(first: 50) {
      nodes {
        id
        app {
          title
          handle
        }
      }
    }
  }
`;

const SHOP_QUERY = `#graphql
  query JuriShopShop {
    shop {
      name
      email
      contactEmail
      myshopifyDomain
      currencyCode
      primaryDomain { url }
      billingAddress {
        company address1 city zip countryCodeV2
      }
      plan { displayName }
      shopPolicies { type title body url }
    }
  }
`;

const PAGES_PAGE_QUERY = `#graphql
  query JuriShopPagesPage($cursor: String) {
    pages(first: 100, after: $cursor) {
      nodes { id title handle body isPublished }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function fetchAllPages(admin) {
  const nodes = [];
  let cursor = null;
  let hasNext = true;

  while (hasNext && nodes.length < 500) {
    const data = await runQuery(admin, "pages", PAGES_PAGE_QUERY, { cursor });
    const batch = data?.pages;
    if (!batch) break;
    nodes.push(...(batch.nodes ?? []));
    hasNext = batch.pageInfo?.hasNextPage ?? false;
    cursor = batch.pageInfo?.endCursor ?? null;
  }

  return { nodes };
}

const MARKETS_QUERY = `#graphql
  query JuriShopMarkets {
    markets(first: 20) {
      nodes {
        id
        name
        status
        regions(first: 20) {
          nodes {
            name
            ... on MarketRegionCountry { code }
          }
        }
      }
    }
  }
`;

const PRODUCTS_QUERY = `#graphql
  query JuriShopProducts($productsFirst: Int!) {
    products(first: $productsFirst) {
      nodes {
        id title handle
        variants(first: 5) { nodes { price compareAtPrice } }
      }
    }
  }
`;

const THEMES_QUERY = `#graphql
  query JuriShopThemes {
    themes(first: 1, roles: [MAIN]) {
      nodes { id name role }
    }
  }
`;

function flattenProducts(productNodes) {
  const products = [];
  for (const product of productNodes ?? []) {
    for (const variant of product.variants?.nodes ?? []) {
      if (!variant.compareAtPrice) continue;
      products.push({
        id: product.id,
        title: product.title,
        handle: product.handle,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
      });
    }
  }
  return products;
}

async function fetchThemeFiles(admin, themeId) {
  assertReadOnlyGraphQLOperation("query");
  try {
    const response = await admin.graphql(THEME_FILES_QUERY, {
      variables: { themeId },
    });
    const { data } = await response.json();
    return (data?.theme?.files?.nodes ?? []).map((node) => ({
      filename: node.filename,
      content: node.body?.content ?? "",
    }));
  } catch {
    return [];
  }
}

async function fetchInstalledApps(admin) {
  assertReadOnlyGraphQLOperation("query");
  try {
    const response = await admin.graphql(APPS_QUERY);
    const { data, errors } = await response.json();
    if (errors?.length) return [];
    return (data?.appInstallations?.nodes ?? []).map((node) => ({
      id: node.id,
      title: node.app?.title ?? "App inconnue",
      handle: node.app?.handle,
    }));
  } catch {
    return [];
  }
}

/**
 * Exécute une requête GraphQL isolée en lecture seule.
 * En cas d'erreur (champ invalide, 5xx Shopify…), on journalise et on
 * renvoie `null` pour que l'audit continue avec les autres sections.
 */
async function runQuery(admin, label, query, variables) {
  assertReadOnlyGraphQLOperation("query");
  try {
    const response = await admin.graphql(query, variables ? { variables } : undefined);
    const { data, errors } = await response.json();
    if (errors?.length) {
      console.warn(
        `[JuriShop] GraphQL "${label}" : ${errors.map((e) => e.message).join(", ")}`,
      );
      return data ?? null;
    }
    return data ?? null;
  } catch (error) {
    console.warn(`[JuriShop] GraphQL "${label}" a échoué :`, error?.message ?? error);
    return null;
  }
}

/** Charge le contexte Shopify complet en lecture seule. */
export async function buildShopAuditContext(admin, { productsFirst = 50 } = {}) {
  assertReadOnlyGraphQLOperation("query");

  const [shopData, pagesData, marketsData, productsData, themesData] =
    await Promise.all([
      runQuery(admin, "shop", SHOP_QUERY),
      fetchAllPages(admin),
      runQuery(admin, "markets", MARKETS_QUERY),
      runQuery(admin, "products", PRODUCTS_QUERY, { productsFirst }),
      runQuery(admin, "themes", THEMES_QUERY),
    ]);

  if (!shopData?.shop) {
    throw new Error(
      "Impossible de charger les informations de la boutique (requête shop en échec).",
    );
  }

  const data = {
    shop: shopData.shop,
    pages: pagesData?.pages,
    markets: marketsData?.markets,
    products: productsData?.products,
    themes: themesData?.themes,
  };

  const shop = data.shop;
  const mainTheme = data.themes?.nodes?.[0];

  const [themeFiles, installedApps] = await Promise.all([
    mainTheme ? fetchThemeFiles(admin, mainTheme.id) : [],
    fetchInstalledApps(admin),
  ]);

  const themeContent = themeFiles.map((f) => f.content).join("\n");
  const hasCookieBanner = [
    "cookie", "consent", "tarteaucitron", "axeptio", "pandectes",
  ].some((k) => normalizeText(themeContent).includes(k));

  return {
    shop: {
      name: shop.name,
      email: shop.email,
      contactEmail: shop.contactEmail,
      myshopifyDomain: shop.myshopifyDomain,
      primaryDomain: shop.primaryDomain,
      billingAddress: shop.billingAddress,
      currencyCode: shop.currencyCode,
      plan: shop.plan,
    },
    pages: (data.pages?.nodes ?? []).map((page) => ({
      id: page.id,
      title: page.title,
      handle: page.handle,
      body: page.body ?? "",
      isPublished: page.isPublished,
    })),
    shopPolicies: (shop.shopPolicies ?? []).map((policy) => ({
      type: policy.type,
      title: policy.title,
      body: policy.body ?? "",
      url: policy.url,
    })),
    markets: (data.markets?.nodes ?? []).map((market) => ({
      id: market.id,
      name: market.name,
      enabled: market.status === "ACTIVE",
      regions: (market.regions?.nodes ?? [])
        .filter((r) => r.code)
        .map((r) => ({
          code: r.code,
          name: r.name,
        })),
    })),
    productsWithCompareAt: flattenProducts(data.products?.nodes),
    themeFiles,
    installedApps,
    hasCookieBanner,
    mainTheme: mainTheme
      ? { id: mainTheme.id, name: mainTheme.name }
      : null,
  };
}
