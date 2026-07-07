import prisma from "../../db.server.js";
import { unauthenticated } from "../../shopify.server.js";
import { isAuditDue } from "./scheduled-audit.server.js";
import { runComplianceAudit } from "./audit-runner.server.js";

/**
 * Endpoint cron — audite toutes les boutiques dont l'intervalle est dépassé.
 * Appelé par Railway Cron ou un service externe avec CRON_SECRET.
 */
export async function runCronAuditsForAllShops() {
  const profiles = await prisma.shopComplianceProfile.findMany({
    where: { scheduledAuditEnabled: true },
  });

  const results = [];

  for (const profile of profiles) {
    if (!isAuditDue(profile)) {
      results.push({ shop: profile.shop, skipped: true, reason: "not_due" });
      continue;
    }

    const session = await prisma.session.findFirst({
      where: { shop: profile.shop },
      orderBy: { expires: "desc" },
    });

    if (!session) {
      results.push({ shop: profile.shop, skipped: true, reason: "no_session" });
      continue;
    }

    try {
      const { admin } = await unauthenticated.admin(profile.shop);
      await runComplianceAudit(admin, profile.shop, { trigger: "SCHEDULED" });
      results.push({ shop: profile.shop, audited: true });
    } catch (error) {
      results.push({
        shop: profile.shop,
        audited: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: profiles.length,
    audited: results.filter((r) => r.audited).length,
    results,
  };
}
