import {
  EXPERT_PLAN,
  PLAN_IDS,
  PLAN_MARKETING,
  PLAN_PRICING,
  PRO_PLAN,
} from "./plans.constants.js";

export { PRO_PLAN, EXPERT_PLAN, PLAN_IDS, PLAN_MARKETING, PLAN_PRICING };

export const BILLING_PLANS = [PRO_PLAN, EXPERT_PLAN];

const PLAN_FEATURES = {
  [PLAN_IDS.FREE]: {
    maxManualAuditsPerMonth: 1,
    scheduledAudit: false,
    webhookAudit: false,
    htmlReports: false,
    shareLinks: false,
    euPack: false,
    sirene: false,
    expertMode: false,
    multiMarkets: false,
    historyLimit: 3,
    trialDays: 0,
  },
  [PLAN_IDS.PRO]: {
    maxManualAuditsPerMonth: Infinity,
    scheduledAudit: true,
    webhookAudit: true,
    htmlReports: true,
    shareLinks: true,
    euPack: true,
    sirene: false,
    expertMode: false,
    multiMarkets: false,
    historyLimit: 15,
    trialDays: 14,
  },
  [PLAN_IDS.EXPERT]: {
    maxManualAuditsPerMonth: Infinity,
    scheduledAudit: true,
    webhookAudit: true,
    htmlReports: true,
    shareLinks: true,
    euPack: true,
    sirene: true,
    expertMode: true,
    multiMarkets: true,
    historyLimit: 50,
    trialDays: 14,
  },
};

export function getPlanFeatures(planId) {
  return PLAN_FEATURES[planId] ?? PLAN_FEATURES[PLAN_IDS.FREE];
}

export function planFromSubscriptionName(name) {
  if (name === EXPERT_PLAN) return PLAN_IDS.EXPERT;
  if (name === PRO_PLAN) return PLAN_IDS.PRO;
  return PLAN_IDS.FREE;
}

export function isBillingTestMode() {
  if (process.env.SHOPIFY_BILLING_TEST === "true") return true;
  if (process.env.SHOPIFY_BILLING_TEST === "false") return false;
  return process.env.NODE_ENV !== "production";
}
