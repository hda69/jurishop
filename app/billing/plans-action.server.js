import {
  EXPERT_ANNUAL_PLAN,
  EXPERT_PLAN,
  PRO_ANNUAL_PLAN,
  PRO_PLAN,
} from "../shopify.server.js";
import { BILLING_PLANS, isBillingTestMode } from "./plans.server.js";
import { setBillingPlanFree } from "./subscription.server.js";
import { buildEmbeddedBillingReturnUrl } from "./return-url.server.js";
import { redirectToAppPricingPlanSelection } from "./app-pricing.server.js";
import { useShopifyAppPricing } from "./billing-mode.server.js";
import { appRedirect } from "../utils/app-redirect.server.js";

const SUBSCRIBE_INTENTS = {
  subscribe_pro: PRO_PLAN,
  subscribe_pro_annual: PRO_ANNUAL_PLAN,
  subscribe_expert: EXPERT_PLAN,
  subscribe_expert_annual: EXPERT_ANNUAL_PLAN,
};

export async function handlePlansBillingAction(request, { session, billing, redirect }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (useShopifyAppPricing()) {
    if (
      intent in SUBSCRIBE_INTENTS ||
      intent === "manage_plans" ||
      intent === "select_free"
    ) {
      return redirectToAppPricingPlanSelection(session, redirect);
    }
    return { ok: false };
  }

  const returnUrl = buildEmbeddedBillingReturnUrl(session, "/app/plans", {
    billing_return: "1",
  });
  const test = isBillingTestMode();

  const planKey = SUBSCRIBE_INTENTS[intent];
  if (planKey) {
    return billing.request({
      plan: planKey,
      isTest: test,
      returnUrl,
    });
  }

  if (intent === "select_free") {
    const check = await billing.check({
      plans: BILLING_PLANS,
      isTest: test,
    });

    for (const sub of check.appSubscriptions) {
      if (sub.status === "ACTIVE") {
        await billing.cancel({
          subscriptionId: sub.id,
          isTest: test,
          prorate: true,
        });
      }
    }

    await setBillingPlanFree(session.shop);
    return appRedirect(request, "/app/plans");
  }

  return { ok: false };
}
