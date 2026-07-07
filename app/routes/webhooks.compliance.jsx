import { authenticate, unauthenticated } from "../shopify.server";
import { runAudit } from "../models/compliance.server";
import { createWebhookAlert } from "../compliance/services/alerts.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[JuriShop] Webhook ${topic} pour ${shop}`);

  const profile = await prisma.shopComplianceProfile.findUnique({
    where: { shop },
  });

  if (!profile) {
    return new Response();
  }

  try {
    const { admin } = await unauthenticated.admin(shop);
    await createWebhookAlert(profile.id, topic);
    await runAudit(admin, shop, { trigger: "WEBHOOK" });
  } catch (error) {
    console.error(`[JuriShop] Échec ré-audit webhook:`, error);
  }

  return new Response();
};
