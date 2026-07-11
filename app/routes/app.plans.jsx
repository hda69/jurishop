import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import {
  authenticate,
} from "../shopify.server";
import { PLAN_IDS, PLAN_MARKETING } from "../billing/plans.constants.js";
import { PLAN_COMPARISON_ROWS } from "../billing/plans.comparison.js";
import {
  resolveMerchantPlan,
} from "../billing/subscription.server.js";
import { redirectToAppPricingPlanSelection, buildAppPricingPlanSelectionUrl } from "../billing/app-pricing.server.js";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const planHandle = url.searchParams.get("plan_handle");
  const billingReturn =
    url.searchParams.get("billing_return") === "1" || Boolean(planHandle);

  const { plan, features, profile, session } = await resolveMerchantPlan(request, authenticate, {
    planHandleFromUrl: planHandle,
    retryOnReturn: billingReturn,
  });

  return {
    plan,
    features,
    plans: PLAN_MARKETING,
    planSelectionUrl: buildAppPricingPlanSelectionUrl(session),
    billingReturn,
    billingSucceeded: billingReturn && plan !== PLAN_IDS.FREE,
    billingPending:
      billingReturn && plan === PLAN_IDS.FREE && Boolean(planHandle),
    billingCancelled:
      billingReturn && plan === PLAN_IDS.FREE && !planHandle,
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
  const { session, redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (
    intent === "subscribe_pro" ||
    intent === "subscribe_pro_annual" ||
    intent === "subscribe_expert" ||
    intent === "subscribe_expert_annual" ||
    intent === "manage_plans"
  ) {
    return redirectToAppPricingPlanSelection(session, redirect);
  }

  if (intent === "select_free") {
    return redirectToAppPricingPlanSelection(session, redirect);
  }

  return { ok: false };
};

export default function PlansPage() {
  const { plan, plans, planSelectionUrl, billingSucceeded, billingPending, billingCancelled, manualAuditsRemaining } =
    useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (billingSucceeded) {
      shopify.toast.show("Abonnement activé avec succès");
    } else if (billingPending) {
      shopify.toast.show(
        "Activation en cours — rechargez la page dans quelques secondes",
      );
    } else if (billingCancelled) {
      shopify.toast.show(
        "Abonnement non confirmé — vous restez sur le plan Gratuit",
        { isError: true },
      );
    }
  }, [billingSucceeded, billingPending, billingCancelled, shopify]);

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
                        Revenir au plan Gratuit (via Shopify)
                      </s-button>
                    </fetcher.Form>
                  )}

                  {item.id === PLAN_IDS.PRO && !isCurrent && (
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="subscribe_pro" />
                      <s-button type="submit" variant="primary">
                        Choisir Pro sur Shopify (mensuel ou annuel)
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
                        Choisir Expert sur Shopify (mensuel ou annuel)
                      </s-button>
                    </fetcher.Form>
                  )}
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-section>

      <s-section heading="Comparatif des fonctionnalités">
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>
                  Fonctionnalité
                </th>
                <th style={{ textAlign: "center", padding: "10px 8px" }}>
                  Gratuit
                </th>
                <th style={{ textAlign: "center", padding: "10px 8px" }}>
                  Pro
                </th>
                <th style={{ textAlign: "center", padding: "10px 8px" }}>
                  Expert
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} style={{ borderTop: "1px solid #e3e3e3" }}>
                  <td style={{ padding: "10px 8px" }}>{row.feature}</td>
                  <td style={{ textAlign: "center", padding: "10px 8px" }}>
                    {row.free}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 8px" }}>
                    {row.pro}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 8px" }}>
                    {row.expert}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </s-section>

      <s-section slot="aside" heading="Facturation Shopify">
        <s-paragraph>
          Les plans sont gérés par Shopify (page officielle de facturation).
          Vous y choisissez le plan, mensuel ou annuel, puis vous approuvez le
          montant sur votre facture Shopify.
        </s-paragraph>
        <s-paragraph color="subdued">
          Essai 14 jours sur Pro et Expert. Annulation ou changement de plan via
          la même page Shopify.
        </s-paragraph>
        {planSelectionUrl && (
          <s-paragraph color="subdued">
            Lien direct (si la redirection échoue) :{" "}
            <a href={planSelectionUrl} target="_top" rel="noreferrer">
              Ouvrir la page forfaits Shopify
            </a>
          </s-paragraph>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
