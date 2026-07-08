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

/** Seul un abonnement ACTIVE donne accès aux fonctionnalités payantes. */
export const PAID_SUBSCRIPTION_STATUS = "ACTIVE";

export function pickPaidPlanFromSubscriptions(appSubscriptions = []) {
  const paidSubs = appSubscriptions.filter(
    (sub) =>
      sub.status === PAID_SUBSCRIPTION_STATUS &&
      (sub.name === PRO_PLAN || sub.name === EXPERT_PLAN),
  );

  if (paidSubs.length === 0) {
    return { plan: PLAN_IDS.FREE, subscription: null };
  }

  const subscription =
    paidSubs.find((s) => s.name === EXPERT_PLAN) ??
    paidSubs.find((s) => s.name === PRO_PLAN) ??
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
