import { findMatchingPages, matchesAllPatterns, stripHtml } from "./utils.js";

export async function checkPageExists(params, context) {
  const matches = findMatchingPages(context.pages, params);

  if (matches.length === 0) {
    return {
      status: "FAIL",
      message: "Aucune page correspondante n'a été trouvée sur votre boutique.",
      details: { searchedTitles: params.titlePatterns, searchedHandles: params.handlePatterns },
    };
  }

  const published = matches.filter((p) => p.isPublished);
  if (published.length === 0) {
    return {
      status: "WARNING",
      message: `Page trouvée (« ${matches[0].title} ») mais non publiée.`,
      details: { pageId: matches[0].id, handle: matches[0].handle },
    };
  }

  return {
    status: "PASS",
    message: `Page détectée : « ${published[0].title} ».`,
    details: { pageId: published[0].id, handle: published[0].handle, url: `/pages/${published[0].handle}` },
  };
}

export async function checkPageContent(params, context) {
  const existsResult = await checkPageExists(params, context);
  if (existsResult.status === "FAIL") {
    return existsResult;
  }

  const matches = findMatchingPages(context.pages, params);
  const page = matches.find((p) => p.isPublished) ?? matches[0];
  const body = stripHtml(page.body);
  const missing = (params.requiredPatterns ?? []).filter(
    (pattern) => !matchesAllPatterns(body, [pattern]),
  );

  if (missing.length > 0) {
    return {
      status: "FAIL",
      message: `Éléments manquants dans « ${page.title} » : ${missing.join(", ")}.`,
      details: { pageId: page.id, handle: page.handle, missingPatterns: missing },
    };
  }

  return {
    status: "PASS",
    message: `Le contenu de « ${page.title} » contient les mentions requises.`,
    details: { pageId: page.id, handle: page.handle },
  };
}
