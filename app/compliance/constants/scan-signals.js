/** Mots-clés CMP / consentement détectés dans le thème ou les apps. */
export const COOKIE_CMP_KEYWORDS = [
  "cookie",
  "consent",
  "tarteaucitron",
  "axeptio",
  "pandectes",
  "consentmo",
  "gdpr",
  "didomi",
  "onetrust",
  "iubenda",
  "cookiebot",
  "osano",
];

export const COOKIE_APP_HANDLES = [
  "axeptio",
  "pandectes",
  "consentmo",
  "gdpr",
  "cookie",
  "iubenda",
  "cookiebot",
];

export const THEME_SCAN_LIMITATION =
  " Analyse automatique du code du thème et des apps installées — une vérification visuelle sur la boutique reste recommandée.";

export const COOKIE_VERIFICATION_CHECKLIST = [
  "Ouvrez votre boutique en navigation privée : un bandeau cookies s'affiche-t-il avant tout dépôt ?",
  "Les cookies non essentiels sont-ils bloqués tant que l'utilisateur n'a pas consenti ?",
  "Votre politique de confidentialité liste-t-elle les traceurs utilisés (analytics, pub, chat…) ?",
  "Si vous utilisez une CMP (Axeptio, Pandectes…), vérifiez qu'elle est bien connectée au thème.",
];

export const CHECKOUT_VERIFICATION_CHECKLIST = [
  "Admin Shopify → Paramètres → Checkout → Personnaliser.",
  "Bouton de paiement : libellé « Commander avec obligation de paiement » (FR) ou équivalent.",
  "Liens CGV et politique de confidentialité accessibles depuis le checkout.",
  "Case à cocher CGV avant paiement si votre activité l'exige.",
];

export function detectCookieSignals(context) {
  const themeContent = (context.themeFiles ?? [])
    .map((f) => f.content ?? "")
    .join("\n");
  const normalized = themeContent.toLowerCase();

  const themeKeywords = COOKIE_CMP_KEYWORDS.filter((k) => normalized.includes(k));
  const cookieApps = (context.installedApps ?? []).filter((app) => {
    const haystack = `${app.title ?? ""} ${app.handle ?? ""}`.toLowerCase();
    return COOKIE_APP_HANDLES.some((h) => haystack.includes(h));
  });

  const trackingApps = (context.installedApps ?? []).filter((app) =>
    /analytics|pixel|track|ads|marketing|chat|popup|facebook|google/i.test(
      `${app.title ?? ""} ${app.handle ?? ""}`,
    ),
  );

  return {
    themeKeywords,
    cookieApps: cookieApps.map((a) => a.title),
    trackingApps: trackingApps.map((a) => a.title),
    hasSignal: themeKeywords.length > 0 || cookieApps.length > 0,
  };
}
