import { authenticate } from "../shopify.server";

/** JuriShop ne stocke pas de données clients Shopify (commandes, acheteurs). */
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[JuriShop] ${topic} pour ${shop} — aucune donnée client stockée`);
  return new Response();
};
