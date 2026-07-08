import { normalizeText } from "./utils.js";

const COOKIE_KEYWORDS = [
  "cookie",
  "consent",
  "tarteaucitron",
  "axeptio",
  "pandectes",
  "consentmo",
  "gdpr",
  "didomi",
  "onetrust",
];

const LEGAL_LINK_KEYWORDS = [
  "mentions",
  "legal",
  "cgv",
  "conditions",
  "confidential",
  "privacy",
  "politique",
];

const THEME_SCAN_LIMITATION =
  " Analyse automatique du code du thème uniquement — vérifiez aussi visuellement sur votre boutique.";

export async function checkThemeFooterLinks(params, context) {
  const themeContent = getThemeContent(context);
  const patterns = params.requiredLinkPatterns ?? LEGAL_LINK_KEYWORDS;
  const found = patterns.filter((p) =>
    normalizeText(themeContent).includes(normalizeText(p)),
  );

  if (found.length >= (params.minimumMatches ?? 2)) {
    return {
      status: "PASS",
      message: `Liens légaux détectés dans le thème (${found.length} mot(s)-clé(s)).${THEME_SCAN_LIMITATION}`,
      details: { foundKeywords: found },
    };
  }

  return {
    status: "WARNING",
    message:
      "Peu de liens légaux détectés dans le footer/thème. Vérifiez que mentions légales, CGV et confidentialité sont accessibles." +
      THEME_SCAN_LIMITATION,
    details: { foundKeywords: found, searched: patterns },
  };
}

export async function checkThemeCookieBanner(params, context) {
  const themeContent = getThemeContent(context);
  const normalized = normalizeText(themeContent);
  const found = COOKIE_KEYWORDS.filter((k) => normalized.includes(k));

  if (found.length > 0) {
    return {
      status: "PASS",
      message: `Indicateur cookies/consentement détecté dans le thème (${found[0]}).${THEME_SCAN_LIMITATION} Les apps cookies (Axeptio, Pandectes…) ne sont pas toujours visibles dans le thème.`,
      details: { detectedKeywords: found },
    };
  }

  return {
    status: "WARNING",
    message:
      "Aucun bandeau cookies détecté dans le thème. Installez une CMP conforme (Axeptio, Pandectes, Tarteaucitron…)." +
      THEME_SCAN_LIMITATION,
    details: { hint: "Vérifiez aussi les apps cookies installées." },
  };
}

export async function checkCheckoutPaymentLabel(params, context) {
  const themeContent = getThemeContent(context);
  const normalized = normalizeText(themeContent);
  const patterns = params.requiredPatterns ?? [
    "obligation de paiement",
    "order with obligation to pay",
    "commande avec obligation",
  ];

  const found = patterns.some((p) => normalized.includes(normalizeText(p)));
  if (found) {
    return {
      status: "PASS",
      message:
        "Libellé de paiement conforme détecté dans le thème." +
        THEME_SCAN_LIMITATION +
        " Le checkout Shopify se configure dans Paramètres > Paiements.",
    };
  }

  return {
    status: "WARNING",
    message:
      "Le libellé « Commande avec obligation de paiement » n'a pas été détecté dans le thème." +
      THEME_SCAN_LIMITATION +
      " Configurez-le dans Paramètres > Checkout > Personnaliser.",
    details: {
      remediation:
        "Paramètres > Checkout > Personnaliser > Modifier le libellé du bouton de paiement.",
    },
  };
}

function getThemeContent(context) {
  const files = context.themeFiles ?? [];
  return files.map((f) => f.content ?? "").join("\n");
}
