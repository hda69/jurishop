import { normalizeText } from "./utils.js";
import {
  CHECKOUT_VERIFICATION_CHECKLIST,
  COOKIE_VERIFICATION_CHECKLIST,
  THEME_SCAN_LIMITATION,
  detectCookieSignals,
} from "../constants/scan-signals.js";

const LEGAL_LINK_KEYWORDS = [
  "mentions",
  "legal",
  "cgv",
  "conditions",
  "confidential",
  "privacy",
  "politique",
];

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
      details: {
        foundKeywords: found,
        scanMethod: "theme_keyword",
        limitation: THEME_SCAN_LIMITATION.trim(),
      },
    };
  }

  return {
    status: "WARNING",
    message:
      "Peu de liens légaux détectés dans le footer/thème. Vérifiez que mentions légales, CGV et confidentialité sont accessibles." +
      THEME_SCAN_LIMITATION,
    details: {
      foundKeywords: found,
      searched: patterns,
      scanMethod: "theme_keyword",
      verificationChecklist: [
        "Vérifiez le footer de votre thème : liens vers mentions légales, CGV et confidentialité.",
        "Testez chaque lien depuis la boutique (pas seulement l'admin).",
      ],
    },
  };
}

export async function checkThemeCookieBanner(params, context) {
  const signals = detectCookieSignals(context);

  if (signals.hasSignal) {
    const source =
      signals.cookieApps.length > 0
        ? `app(s) cookies : ${signals.cookieApps.join(", ")}`
        : `thème (${signals.themeKeywords[0]})`;

    if (signals.trackingApps.length > 0 && signals.cookieApps.length === 0) {
      return {
        status: "WARNING",
        message:
          `Signal cookies détecté (${source}) mais ${signals.trackingApps.length} app(s) traceuse(s) installée(s).` +
          " Confirmez visuellement que le consentement bloque bien les traceurs avant acceptation." +
          THEME_SCAN_LIMITATION,
        details: {
          detectedKeywords: signals.themeKeywords,
          cookieApps: signals.cookieApps,
          trackingApps: signals.trackingApps,
          scanMethod: "theme_and_apps_heuristic",
          verificationChecklist: COOKIE_VERIFICATION_CHECKLIST,
        },
      };
    }

    return {
      status: "WARNING",
      message:
        `Indicateur cookies/consentement détecté (${source}).` +
        " JuriShop ne peut pas confirmer le blocage effectif des traceurs — vérifiez sur la boutique." +
        THEME_SCAN_LIMITATION,
      details: {
        detectedKeywords: signals.themeKeywords,
        cookieApps: signals.cookieApps,
        trackingApps: signals.trackingApps,
        scanMethod: "theme_and_apps_heuristic",
        verificationChecklist: COOKIE_VERIFICATION_CHECKLIST,
        remediation:
          "Ouvrez la boutique en navigation privée et validez le comportement du bandeau avant de marquer comme conforme.",
      },
    };
  }

  if (signals.trackingApps.length > 0) {
    return {
      status: "FAIL",
      message:
        `${signals.trackingApps.length} app(s) potentiellement traceuse(s) sans CMP détectée.` +
        " Installez et configurez un bandeau cookies conforme." +
        THEME_SCAN_LIMITATION,
      details: {
        trackingApps: signals.trackingApps,
        scanMethod: "apps_without_cmp",
        verificationChecklist: COOKIE_VERIFICATION_CHECKLIST,
        remediation:
          "Installez une CMP (Axeptio, Pandectes, Tarteaucitron…) ou configurez le consentement dans votre thème.",
      },
    };
  }

  return {
    status: "WARNING",
    message:
      "Aucun bandeau cookies détecté dans le thème ni via les apps installées." +
      THEME_SCAN_LIMITATION,
    details: {
      scanMethod: "theme_and_apps_heuristic",
      verificationChecklist: COOKIE_VERIFICATION_CHECKLIST,
      hint: "Si vous utilisez une CMP externe non détectée, vérifiez manuellement puis ignorez cette alerte si conforme.",
    },
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
      status: "WARNING",
      message:
        "Mot-clé de paiement détecté dans le thème — le libellé officiel du checkout se configure dans l'admin Shopify." +
        THEME_SCAN_LIMITATION,
      details: {
        scanMethod: "theme_keyword",
        verificationChecklist: CHECKOUT_VERIFICATION_CHECKLIST,
        remediation:
          "Paramètres → Checkout → Personnaliser → Modifier le libellé du bouton de paiement.",
      },
    };
  }

  return {
    status: "WARNING",
    message:
      "Le libellé « Commander avec obligation de paiement » n'a pas été détecté automatiquement." +
      " Configurez-le dans l'admin — JuriShop ne peut pas lire le checkout personnalisé à 100 %." +
      THEME_SCAN_LIMITATION,
    details: {
      scanMethod: "theme_keyword",
      verificationChecklist: CHECKOUT_VERIFICATION_CHECKLIST,
      remediation:
        "Paramètres → Checkout → Personnaliser → Modifier le libellé du bouton de paiement.",
    },
  };
}

function getThemeContent(context) {
  const files = context.themeFiles ?? [];
  return files.map((f) => f.content ?? "").join("\n");
}
