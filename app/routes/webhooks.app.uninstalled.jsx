import { authenticate } from "../shopify.server";
import { purgeShopData } from "../models/shop-data.server.js";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await purgeShopData(shop);

  if (session) {
    // purgeShopData supprime déjà les sessions ; garde-fou si le profil n'existait pas.
  }

  return new Response();
};
