import {
  ALL_PAID_PLANS,
  EXPERT_ANNUAL_PLAN,
  EXPERT_PLAN,
  PLAN_IDS,
  PLAN_MARKETING,
  PLAN_PRICING,
  PRO_ANNUAL_PLAN,
  PRO_PLAN,
} from "./plans.constants.js";

export {
  PRO_PLAN,
  PRO_ANNUAL_PLAN,
  EXPERT_PLAN,
  EXPERT_ANNUAL_PLAN,
  ALL_PAID_PLANS,
  PLAN_IDS,
  PLAN_MARKETING,
  PLAN_PRICING,
};

export const BILLING_PLANS = ALL_PAID_PLANS;

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

const PLAN_HANDLE_ALIASES = {
  [PRO_PLAN]: PLAN_IDS.PRO,
  [PRO_ANNUAL_PLAN]: PLAN_IDS.PRO,
  [EXPERT_PLAN]: PLAN_IDS.EXPERT,
  [EXPERT_ANNUAL_PLAN]: PLAN_IDS.EXPERT,
};

export function planFromSubscriptionName(name) {
  if (!name) return PLAN_IDS.FREE;
  const direct = PLAN_HANDLE_ALIASES[name];
  if (direct) return direct;
  const normalized = name.trim().toLowerCase();
  return PLAN_HANDLE_ALIASES[normalized] ?? PLAN_IDS.FREE;
}

/** plan_handle renvoyé par Shopify App Pricing après approbation. */
export function planFromPlanHandle(planHandle) {
  return planFromSubscriptionName(planHandle);
}

export function isBillingTestMode() {
  if (process.env.SHOPIFY_BILLING_TEST === "true") return true;
  if (process.env.SHOPIFY_BILLING_TEST === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Seul un abonnement ACTIVE donne accès aux fonctionnalités payantes. */
export const PAID_SUBSCRIPTION_STATUS = "ACTIVE";

export function pickPaidPlanFromSubscriptions(appSubscriptions = []) {
  const paidSubs = appSubscriptions.filter(
    (sub) =>
      sub.status === PAID_SUBSCRIPTION_STATUS &&
      planFromSubscriptionName(sub.name) !== PLAN_IDS.FREE,
  );

  if (paidSubs.length === 0) {
    return { plan: PLAN_IDS.FREE, subscription: null };
  }

  const subscription =
    paidSubs.find((s) => planFromSubscriptionName(s.name) === PLAN_IDS.EXPERT) ??
    paidSubs.find((s) => planFromSubscriptionName(s.name) === PLAN_IDS.PRO) ??
    paidSubs[0];

  return {
    plan: planFromSubscriptionName(subscription.name),
    subscription,
  };
}

/**
 * Plan effectif pour une boutique — ne fait confiance au cache DB que si
 * l'abonnement est marqué ACTIVE. Sinon, traité comme Gratuit.
 */
export function effectivePlanFromProfile(profile) {
  if (!profile) return PLAN_IDS.FREE;
  const cached = profile.billingPlan ?? PLAN_IDS.FREE;
  if (cached === PLAN_IDS.FREE) return PLAN_IDS.FREE;
  if (profile.billingSubscriptionStatus !== PAID_SUBSCRIPTION_STATUS) {
    return PLAN_IDS.FREE;
  }
  return cached;
}

export function getEffectivePlanFeatures(profile) {
  return getPlanFeatures(effectivePlanFromProfile(profile));
}
