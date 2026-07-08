import { authenticate } from "../shopify.server";

/** JuriShop ne stocke pas de données clients Shopify. */
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[JuriShop] ${topic} pour ${shop} — rien à effacer`);
  return new Response();
};
