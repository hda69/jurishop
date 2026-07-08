import { redirect, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import {
  authenticate,
  EXPERT_PLAN,
  PRO_PLAN,
} from "../shopify.server";
import { PLAN_IDS, PLAN_MARKETING } from "../billing/plans.constants.js";
import { isBillingTestMode } from "../billing/plans.server.js";
import {
  resolveMerchantPlan,
  setBillingPlanFree,
} from "../billing/subscription.server.js";
import { buildEmbeddedBillingReturnUrl } from "../billing/return-url.server.js";

export const loader = async ({ request }) => {
  const { plan, features, profile } = await resolveMerchantPlan(request, authenticate);
  const url = new URL(request.url);
  const billingReturn = url.searchParams.get("billing_return") === "1";

  return {
    plan,
    features,
    plans: PLAN_MARKETING,
    billingReturn,
    billingSucceeded: billingReturn && plan !== PLAN_IDS.FREE,
    billingCancelled: billingReturn && plan === PLAN_IDS.FREE,
    manualAuditsRemaining:
      features.maxManualAuditsPerMonth === Infinity
        ? null
        : Math.max(
            0,
            features.maxManualAuditsPerMonth -
              (profile?.manualAuditsMonthKey ===
              new Date().toISOString().slice(0, 7)
                ? profile.manualAuditsThisMonth
                : 0),
          ),
  };
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const returnUrl = buildEmbeddedBillingReturnUrl(session, "/app/plans", {
    billing_return: "1",
  });
  const test = isBillingTestMode();

  if (intent === "subscribe_pro") {
    return billing.request({
      plan: PRO_PLAN,
      isTest: test,
      returnUrl,
    });
  }

  if (intent === "subscribe_expert") {
    return billing.request({
      plan: EXPERT_PLAN,
      isTest: test,
      returnUrl,
    });
  }

  if (intent === "select_free") {
    const check = await billing.check({
      plans: [PRO_PLAN, EXPERT_PLAN],
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
    return redirect("/app/plans");
  }

  return { ok: false };
};

export default function PlansPage() {
  const { plan, plans, billingSucceeded, billingCancelled, manualAuditsRemaining } =
    useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (billingSucceeded) {
      shopify.toast.show("Abonnement activé avec succès");
    } else if (billingCancelled) {
      shopify.toast.show(
        "Abonnement non activé — vous restez sur le plan Gratuit",
        { isError: true },
      );
    }
  }, [billingSucceeded, billingCancelled, shopify]);

  return (
    <s-page heading="Abonnement JuriShop">
      <s-section heading="Votre plan actuel">
        <s-stack direction="inline" gap="base">
          <s-badge tone={plan === PLAN_IDS.FREE ? "info" : "success"}>
            {plans.find((p) => p.id === plan)?.name ?? plan}
          </s-badge>
          {plan === PLAN_IDS.FREE && manualAuditsRemaining !== null && (
            <s-text color="subdued">
              {manualAuditsRemaining} audit manuel restant ce mois-ci
            </s-text>
          )}
        </s-stack>
        <s-paragraph color="subdued">
          La facturation passe par votre facture Shopify — aucun paiement externe.
        </s-paragraph>
      </s-section>

      <s-section heading="Choisir un plan">
        <s-stack direction="block" gap="base">
          {plans.map((item) => {
            const isCurrent = item.id === plan;
            return (
              <s-box
                key={item.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background={item.highlighted ? "subdued" : undefined}
              >
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base">
                    <s-text type="strong">{item.name}</s-text>
                    <s-badge>{item.price}</s-badge>
                    {isCurrent && <s-badge tone="success">Actuel</s-badge>}
                    {item.highlighted && !isCurrent && (
                      <s-badge tone="info">Populaire</s-badge>
                    )}
                  </s-stack>
                  <s-paragraph color="subdued">{item.description}</s-paragraph>
                  <s-stack direction="block" gap="small">
                    {item.features.map((feature) => (
                      <s-paragraph key={feature}>✓ {feature}</s-paragraph>
                    ))}
                  </s-stack>

                  {item.id === PLAN_IDS.FREE && !isCurrent && (
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="select_free" />
                      <s-button type="submit" variant="secondary">
                        Revenir au plan Gratuit
                      </s-button>
                    </fetcher.Form>
                  )}

                  {item.id === PLAN_IDS.PRO && !isCurrent && (
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="subscribe_pro" />
                      <s-button type="submit" variant="primary">
                        Passer au plan Pro — 14 jours d&apos;essai
                      </s-button>
                    </fetcher.Form>
                  )}

                  {item.id === PLAN_IDS.EXPERT && !isCurrent && (
                    <fetcher.Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="subscribe_expert"
                      />
                      <s-button type="submit" variant="primary">
                        Passer au plan Expert — 14 jours d&apos;essai
                      </s-button>
                    </fetcher.Form>
                  )}
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Facturation Shopify">
        <s-paragraph>
          En validant un plan payant, vous serez redirigé vers la page de
          confirmation Shopify (intégrée à l&apos;admin). Le montant apparaît sur
          votre facture Shopify mensuelle.
        </s-paragraph>
        <s-paragraph color="subdued">
          Essai gratuit de 14 jours sur les plans Pro et Expert. Annulation
          possible à tout moment depuis cette page.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
