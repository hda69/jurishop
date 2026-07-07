/** Retire les balises HTML pour l'analyse textuelle. */
export function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(text) {
  return stripHtml(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesPattern(text, pattern) {
  const normalized = normalizeText(text);
  const alternatives = pattern.split("|").map((p) => normalizeText(p.trim()));
  return alternatives.some((alt) => alt && normalized.includes(alt));
}

export function matchesAllPatterns(text, patterns) {
  return patterns.every((pattern) => matchesPattern(text, pattern));
}

export function findMatchingPages(pages, { titlePatterns = [], handlePatterns = [] }) {
  return pages.filter((page) => {
    const title = normalizeText(page.title);
    const handle = normalizeText(page.handle);
    const titleMatch = titlePatterns.some((p) => title.includes(normalizeText(p)));
    const handleMatch = handlePatterns.some((p) =>
      handle.includes(normalizeText(p)),
    );
    return titleMatch || handleMatch;
  });
}

export function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}
