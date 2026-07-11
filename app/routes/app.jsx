import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { syncBillingPlanFromShopify } from "../billing/subscription.server.js";

export const loader = async ({ request }) => {
  const { billing, session, admin } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing, { admin });

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Tableau de bord</s-link>
        <s-link href="/app/recommendations">Recommandations</s-link>
        <s-link href="/app/history">Historique</s-link>
        <s-link href="/app/settings">Paramètres</s-link>
        <s-link href="/app/plans">Abonnement</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
