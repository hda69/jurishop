import { redirectToAppPricingPlanSelection } from "./app-pricing.server.js";

const SUBSCRIBE_INTENTS = new Set([
  "subscribe_pro",
  "subscribe_pro_annual",
  "subscribe_expert",
  "subscribe_expert_annual",
  "manage_plans",
  "select_free",
]);

/** Apps App Pricing : redirection uniquement (billing.request interdit par Shopify). */
export async function handlePlansBillingAction(
  request,
  { session, redirect },
) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (SUBSCRIBE_INTENTS.has(intent)) {
    return redirectToAppPricingPlanSelection(session, redirect);
  }

  return { ok: false };
}
