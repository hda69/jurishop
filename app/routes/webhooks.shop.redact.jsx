import { authenticate } from "../shopify.server";
import { purgeShopData } from "../models/shop-data.server.js";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[JuriShop] ${topic} pour ${shop} — purge des données`);
  await purgeShopData(shop);
  return new Response();
};
