import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { isPartnerBillingConfigured } from "./billing/partner-api.server.js";
import {
  EXPERT_ANNUAL_PLAN,
  EXPERT_PLAN,
  PRO_ANNUAL_PLAN,
  PRO_PLAN,
} from "./billing/plans.server.js";

export { PRO_PLAN, PRO_ANNUAL_PLAN, EXPERT_PLAN, EXPERT_ANNUAL_PLAN };

function resolveAppUrl() {
  if (process.env.SHOPIFY_APP_URL) {
    return process.env.SHOPIFY_APP_URL.replace(/\/$/, "");
  }
  // Railway expose RAILWAY_PUBLIC_DOMAIN quand le réseau public est activé
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return "";
}

const appUrl = resolveAppUrl();

if (!appUrl && process.env.NODE_ENV === "production") {
  console.error(
    "[JuriShop] SHOPIFY_APP_URL manquant. Définissez-le dans Railway " +
      "(ex: https://jurishop-production.up.railway.app) ou activez le domaine public.",
  );
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July26,
  scopes: process.env.SCOPES?.split(","),
  appUrl,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  // Fiche App Store : 3 plans (Gratuit + Pro + Expert avec option annuelle affichée).
  // Billing API in-app : 4 clés — l’annuel doit être demandé via billing.request dédié.
  billing: {
    [PRO_PLAN]: {
      trialDays: 14,
      lineItems: [
        {
          amount: 24,
          currencyCode: "EUR",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [PRO_ANNUAL_PLAN]: {
      trialDays: 14,
      lineItems: [
        {
          amount: 240,
          currencyCode: "EUR",
          interval: BillingInterval.Annual,
        },
      ],
    },
    [EXPERT_PLAN]: {
      trialDays: 14,
      lineItems: [
        {
          amount: 59,
          currencyCode: "EUR",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [EXPERT_ANNUAL_PLAN]: {
      trialDays: 14,
      lineItems: [
        {
          amount: 590,
          currencyCode: "EUR",
          interval: BillingInterval.Annual,
        },
      ],
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

if (process.env.NODE_ENV === "production") {
  if (process.env.SHOPIFY_BILLING_TEST === "true") {
    console.error(
      "[JuriShop] SHOPIFY_BILLING_TEST=true en production — " +
        "désactivez pour activer la facturation réelle.",
    );
  }
  if (!process.env.SUPPORT_EMAIL?.trim()) {
    console.warn(
      "[JuriShop] SUPPORT_EMAIL non défini — requis pour /privacy et la fiche App Store.",
    );
  }
  if (!isPartnerBillingConfigured()) {
    console.warn(
      "[JuriShop] Partner API non configurée (SHOPIFY_PARTNER_ORG_ID, " +
        "SHOPIFY_PARTNER_ACCESS_TOKEN, SHOPIFY_APP_GID) — la vérification " +
        "App Pricing après paiement peut échouer.",
    );
  }
}

export default shopify;
export const apiVersion = ApiVersion.July26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
