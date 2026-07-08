import prisma from "../db.server.js";
import {
  BILLING_PLANS,
  EXPERT_PLAN,
  getPlanFeatures,
  isBillingTestMode,
  planFromSubscriptionName,
  PLAN_IDS,
  PRO_PLAN,
} from "./plans.server.js";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

/** Synchronise le plan en base depuis l'état Billing API Shopify. */
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

  const { appSubscriptions, hasActivePayment } = await billing.check({
    plans: BILLING_PLANS,
    isTest: isBillingTestMode(),
  });

  let plan = PLAN_IDS.FREE;
  let subscriptionId = null;
  let subscriptionStatus = null;

  if (hasActivePayment && appSubscriptions.length > 0) {
    const active =
      appSubscriptions.find((s) => s.name === EXPERT_PLAN) ??
      appSubscriptions.find((s) => s.name === PRO_PLAN) ??
      appSubscriptions[0];

    plan = planFromSubscriptionName(active.name);
    subscriptionId = active.id;
    subscriptionStatus = active.status;
  }

  await prisma.shopComplianceProfile.update({
    where: { shop },
    data: {
      billingPlan: plan,
      billingSubscriptionId: subscriptionId,
      billingSubscriptionStatus: subscriptionStatus,
    },
  });

  return plan;
}

export async function setBillingPlan(shop, plan) {
  await prisma.shopComplianceProfile.upsert({
    where: { shop },
    create: {
      shop,
      primaryJurisdiction: "FR",
      activeMarkets: JSON.stringify(["FR"]),
      billingPlan: plan,
    },
    update: {
      billingPlan: plan,
      ...(plan === PLAN_IDS.FREE
        ? { billingSubscriptionId: null, billingSubscriptionStatus: null }
        : {}),
    },
  });
}

export async function getMerchantBilling(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({ where: { shop } });
  const plan = profile?.billingPlan ?? PLAN_IDS.FREE;
  return {
    plan,
    features: getPlanFeatures(plan),
    profile,
  };
}

export function canRunAuditTrigger(profile, trigger) {
  const plan = profile?.billingPlan ?? PLAN_IDS.FREE;
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
          "Les audits automatiques nécessitent le plan Pro ou Expert.",
      };
    }
  }

  return { allowed: true };
}

export async function assertManualAuditAllowed(profile) {
  const plan = profile?.billingPlan ?? PLAN_IDS.FREE;
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

  const plan = profile.billingPlan ?? PLAN_IDS.FREE;
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

export function assertPlanFeature(plan, feature) {
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
      reason: `${labels[feature] ?? "cette fonctionnalité"} nécessite un plan supérieur.`,
    };
  }
  return { allowed: true };
}

export async function resolveMerchantPlan(request, authenticate) {
  const { session, billing } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing);
  const { plan, features, profile } = await getMerchantBilling(session.shop);
  return { session, billing, plan, features, profile };
}
