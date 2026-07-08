import prisma from "../db.server.js";

/** Supprime toutes les données JuriShop associées à une boutique. */
export async function purgeShopData(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({
    where: { shop },
  });

  if (profile) {
    await prisma.shopComplianceProfile.delete({ where: { id: profile.id } });
  }

  await prisma.session.deleteMany({ where: { shop } });
}
