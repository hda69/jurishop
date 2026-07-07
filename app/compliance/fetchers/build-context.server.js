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

const AUDIT_CONTEXT_QUERY = `#graphql
  query JuriShopAuditContext($productsFirst: Int!) {
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
    pages(first: 50) {
      nodes { id title handle body isPublished }
    }
    markets(first: 20) {
      nodes {
        id name enabled
        regions(first: 20) { nodes { code name } }
      }
    }
    products(first: $productsFirst, query: "compare_at_price:>0") {
      nodes {
        id title handle
        variants(first: 5) { nodes { price compareAtPrice } }
      }
    }
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

/** Charge le contexte Shopify complet en lecture seule. */
export async function buildShopAuditContext(admin, { productsFirst = 50 } = {}) {
  assertReadOnlyGraphQLOperation("query");

  const response = await admin.graphql(AUDIT_CONTEXT_QUERY, {
    variables: { productsFirst },
  });
  const { data, errors } = await response.json();

  if (errors?.length) {
    throw new Error(
      `Erreur GraphQL : ${errors.map((e) => e.message).join(", ")}`,
    );
  }

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
      enabled: market.enabled,
      regions: (market.regions?.nodes ?? []).map((r) => ({
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
