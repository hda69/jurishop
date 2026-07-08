import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { planFromSubscriptionName, PLAN_IDS } from "../billing/plans.server.js";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[JuriShop] Webhook ${topic} pour ${shop}`);

  const subscription = payload?.app_subscription;
  if (!subscription) {
    return new Response();
  }

  const status = subscription.status;
  const name = subscription.name;

  let plan = PLAN_IDS.FREE;
  if (status === "ACTIVE" || status === "ACCEPTED") {
    plan = planFromSubscriptionName(name);
  }

  await prisma.shopComplianceProfile.updateMany({
    where: { shop },
    data: {
      billingPlan: plan,
      billingSubscriptionId: subscription.admin_graphql_api_id ?? null,
      billingSubscriptionStatus: status,
      ...(plan === PLAN_IDS.FREE
        ? { billingSubscriptionId: null, billingSubscriptionStatus: status }
        : {}),
    },
  });

  return new Response();
};
