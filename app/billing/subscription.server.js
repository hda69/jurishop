import prisma from "../db.server.js";
import { fetchActivePlanHandleFromPartner } from "./partner-api.server.js";
import { resolveBillingTestMode, isBillingTestModeEnvOnly } from "./billing-test.server.js";
import {
  BILLING_PLANS,
  effectivePlanFromProfile,
  getEffectivePlanFeatures,
  getPlanFeatures,
  PAID_SUBSCRIPTION_STATUS,
  pickPaidPlanFromSubscriptions,
  planFromPlanHandle,
  planFromSubscriptionName,
  PLAN_IDS,
} from "./plans.server.js";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Réinitialise les réglages Pro/Expert si l'abonnement n'est plus actif. */
async function enforceFreePlanSettings(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({ where: { shop } });
  if (!profile) return;

  const markets = JSON.parse(profile.activeMarkets || '["FR"]');
  const filteredMarkets = markets.filter((m) => m === "FR");
  const nextMarkets = filteredMarkets.length > 0 ? filteredMarkets : ["FR"];

  const needsUpdate =
    profile.scheduledAuditEnabled ||
    profile.uiMode === "expert" ||
    profile.sireneAutoPrefill ||
    markets.some((m) => m !== "FR") ||
    profile.billingPlan !== PLAN_IDS.FREE;

  if (!needsUpdate) return;

  await prisma.shopComplianceProfile.update({
    where: { shop },
    data: {
      billingPlan: PLAN_IDS.FREE,
      billingSubscriptionId: null,
      billingSubscriptionStatus: null,
      scheduledAuditEnabled: false,
      uiMode: "beginner",
      sireneAutoPrefill: false,
      activeMarkets: JSON.stringify(nextMarkets),
    },
  });
}

async function ensureShopProfile(shop) {
  await prisma.shopComplianceProfile.upsert({
    where: { shop },
    create: {
      shop,
      primaryJurisdiction: "FR",
      activeMarkets: JSON.stringify(["FR"]),
    },
    update: {},
  });
}

async function persistPaidPlan(shop, plan, { subscriptionId = null, planHandle = null } = {}) {
  await ensureShopProfile(shop);
  await prisma.shopComplianceProfile.update({
    where: { shop },
    data: {
      billingPlan: plan,
      billingSubscriptionId: subscriptionId,
      billingSubscriptionStatus: PAID_SUBSCRIPTION_STATUS,
    },
  });

  if (planHandle) {
    console.log(`[JuriShop] Abonnement actif pour ${shop}: ${planHandle} → ${plan}`);
  }
}

async function checkBillingApiPlan(billing, admin, shop) {
  const isTest = admin
    ? await resolveBillingTestMode(admin, shop)
    : isBillingTestModeEnvOnly();

  const primary = await billing.check({
    plans: BILLING_PLANS,
    isTest,
  });
  let result = pickPaidPlanFromSubscriptions(primary.appSubscriptions);

  if (result.plan === PLAN_IDS.FREE && !isTest) {
    const fallback = await billing.check({
      plans: BILLING_PLANS,
      isTest: true,
    });
    result = pickPaidPlanFromSubscriptions(fallback.appSubscriptions);
  }

  return result;
}

/**
 * Source de vérité :
 * 1. plan_handle (redirect Shopify App Pricing)
 * 2. Partner API activeSubscription (App Pricing)
 * 3. billing.check (Billing API manuelle / legacy)
 */
export async function syncBillingPlanFromShopify(
  shop,
  billing,
  { admin = null, planHandleFromUrl = null, retryOnReturn = false } = {},
) {
  await ensureShopProfile(shop);

  const planFromUrl = planFromPlanHandle(planHandleFromUrl);
  if (planFromUrl !== PLAN_IDS.FREE) {
    await persistPaidPlan(shop, planFromUrl, { planHandle: planHandleFromUrl });
    return planFromUrl;
  }

  if (admin) {
    const partnerHandle = await fetchActivePlanHandleFromPartner(admin);
    const planFromPartner = planFromPlanHandle(partnerHandle);
    if (planFromPartner !== PLAN_IDS.FREE) {
      await persistPaidPlan(shop, planFromPartner, { planHandle: partnerHandle });
      return planFromPartner;
    }
  }

  const attempts = retryOnReturn ? 5 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { plan, subscription } = await checkBillingApiPlan(billing, admin, shop);
    if (plan !== PLAN_IDS.FREE) {
      await persistPaidPlan(shop, plan, {
        subscriptionId: subscription.id,
        planHandle: subscription.name,
      });
      return plan;
    }

    if (attempt < attempts - 1) {
      await sleep(1000);
    }
  }

  await enforceFreePlanSettings(shop);
  return PLAN_IDS.FREE;
}

/** Met le plan Gratuit après annulation explicite (Billing API déjà appelée). */
export async function setBillingPlanFree(shop) {
  await enforceFreePlanSettings(shop);
}

export async function getMerchantBilling(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({ where: { shop } });
  const plan = effectivePlanFromProfile(profile);
  return {
    plan,
    features: getPlanFeatures(plan),
    profile,
  };
}

export function canRunAuditTrigger(profile, trigger) {
  const plan = effectivePlanFromProfile(profile);
  const features = getPlanFeatures(plan);

  if (trigger === "INSTALL") return { allowed: true };
  if (trigger === "MANUAL") return { allowed: true };

  if (
    trigger === "SCHEDULED" ||
    trigger === "CRON" ||
    trigger === "WEBHOOK"
  ) {
    if (!features.scheduledAudit) {
      return {
        allowed: false,
        reason:
          "Les audits automatiques nécessitent un abonnement Pro ou Expert actif.",
      };
    }
  }

  return { allowed: true };
}

export async function assertManualAuditAllowed(profile) {
  const plan = effectivePlanFromProfile(profile);
  const features = getPlanFeatures(plan);

  if (features.maxManualAuditsPerMonth === Infinity) {
    return { allowed: true };
  }

  const monthKey = currentMonthKey();
  const count =
    profile.manualAuditsMonthKey === monthKey
      ? profile.manualAuditsThisMonth
      : 0;

  if (count >= features.maxManualAuditsPerMonth) {
    return {
      allowed: false,
      reason:
        "Limite atteinte : 1 audit manuel par mois sur le plan Gratuit. Passez au plan Pro pour des audits illimités.",
    };
  }

  return { allowed: true };
}

export async function recordManualAudit(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({ where: { shop } });
  if (!profile) return;

  const plan = effectivePlanFromProfile(profile);
  if (getPlanFeatures(plan).maxManualAuditsPerMonth === Infinity) return;

  const monthKey = currentMonthKey();
  const reset = profile.manualAuditsMonthKey !== monthKey;

  await prisma.shopComplianceProfile.update({
    where: { shop },
    data: {
      manualAuditsMonthKey: monthKey,
      manualAuditsThisMonth: reset ? 1 : profile.manualAuditsThisMonth + 1,
    },
  });
}

export function assertPlanFeature(profile, feature) {
  const plan = effectivePlanFromProfile(profile);
  const features = getPlanFeatures(plan);
  if (!features[feature]) {
    const labels = {
      htmlReports: "le téléchargement de rapports HTML",
      shareLinks: "le partage avec un conseiller",
      sirene: "la recherche SIRENE",
      expertMode: "le mode expert",
      scheduledAudit: "l'audit planifié",
      euPack: "le pack de règles UE",
      multiMarkets: "le multi-marchés avancé",
    };
    return {
      allowed: false,
      reason: `${labels[feature] ?? "cette fonctionnalité"} nécessite un abonnement Pro ou Expert actif.`,
    };
  }
  return { allowed: true };
}

export async function resolveMerchantPlan(request, authenticate, options = {}) {
  const { session, billing, admin } = await authenticate.admin(request);
  const plan = await syncBillingPlanFromShopify(session.shop, billing, {
    admin,
    ...options,
  });
  const { features, profile } = await getMerchantBilling(session.shop);
  return { session, billing, admin, plan, features, profile };
}

export {
  effectivePlanFromProfile,
  getEffectivePlanFeatures,
  getPlanFeatures,
  PAID_SUBSCRIPTION_STATUS,
  planFromSubscriptionName,
  PLAN_IDS,
};
