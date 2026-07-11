import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  PAID_SUBSCRIPTION_STATUS,
  planFromPlanHandle,
  planFromSubscriptionName,
  PLAN_IDS,
} from "../billing/plans.server.js";
import { setBillingPlanFree } from "../billing/subscription.server.js";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[JuriShop] Webhook ${topic} pour ${shop}`);

  const subscription = payload?.app_subscription;
  if (!subscription) {
    return new Response();
  }

  const status = subscription.status?.toUpperCase?.() ?? subscription.status;
  const name = subscription.name;
  const planHandle = subscription.plan_handle ?? subscription.planHandle ?? name;

  let plan = PLAN_IDS.FREE;
  if (status === PAID_SUBSCRIPTION_STATUS) {
    const fromHandle = planFromPlanHandle(planHandle);
    plan =
      fromHandle !== PLAN_IDS.FREE ? fromHandle : planFromSubscriptionName(name);
  }

  if (plan === PLAN_IDS.FREE) {
    await setBillingPlanFree(shop);
    await prisma.shopComplianceProfile.updateMany({
      where: { shop },
      data: { billingSubscriptionStatus: status },
    });
    return new Response();
  }

  await prisma.shopComplianceProfile.updateMany({
    where: { shop },
    data: {
      billingPlan: plan,
      billingSubscriptionId: subscription.admin_graphql_api_id ?? null,
      billingSubscriptionStatus: status,
    },
  });

  return new Response();
};
