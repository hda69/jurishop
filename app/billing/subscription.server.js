import prisma from "../db.server.js";
import {
  BILLING_PLANS,
  effectivePlanFromProfile,
  EXPERT_PLAN,
  getEffectivePlanFeatures,
  getPlanFeatures,
  isBillingTestMode,
  PAID_SUBSCRIPTION_STATUS,
  pickPaidPlanFromSubscriptions,
  planFromSubscriptionName,
  PLAN_IDS,
  PRO_PLAN,
} from "./plans.server.js";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
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
      activeMarkets: JSON.stringify(nextMarkets),
    },
  });
}

/**
 * Source de vérité : Billing API Shopify.
 * Met à jour le cache DB uniquement après vérification du statut ACTIVE.
 */
export async function syncBillingPlanFromShopify(shop, billing) {
  await prisma.shopComplianceProfile.upsert({
    where: { shop },
    create: {
      shop,
      primaryJurisdiction: "FR",
      activeMarkets: JSON.stringify(["FR"]),
    },
    update: {},
  });

  const { appSubscriptions } = await billing.check({
    plans: BILLING_PLANS,
    isTest: isBillingTestMode(),
  });

  const { plan, subscription } = pickPaidPlanFromSubscriptions(appSubscriptions);

  if (plan === PLAN_IDS.FREE) {
    await enforceFreePlanSettings(shop);
    return PLAN_IDS.FREE;
  }

  await prisma.shopComplianceProfile.update({
    where: { shop },
    data: {
      billingPlan: plan,
      billingSubscriptionId: subscription.id,
      billingSubscriptionStatus: subscription.status,
    },
  });

  return plan;
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

export async function resolveMerchantPlan(request, authenticate) {
  const { session, billing } = await authenticate.admin(request);
  const plan = await syncBillingPlanFromShopify(session.shop, billing);
  const { features, profile } = await getMerchantBilling(session.shop);
  return { session, billing, plan, features, profile };
}

export {
  effectivePlanFromProfile,
  getEffectivePlanFeatures,
  getPlanFeatures,
  PAID_SUBSCRIPTION_STATUS,
  planFromSubscriptionName,
  PLAN_IDS,
};
