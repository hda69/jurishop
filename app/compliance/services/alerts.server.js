import prisma from "../../db.server.js";

export async function createAlertsFromAudit(
  shopId,
  auditId,
  ruleResults,
  rulesById,
  internalRuleIds,
  previousAudit,
) {
  if (!previousAudit) return;

  const failures = ruleResults.filter(
    (r) =>
      (r.status === "FAIL" || r.status === "WARNING") &&
      !internalRuleIds.has(r.ruleId),
  );

  const previousResults = await prisma.complianceRuleResult.findMany({
    where: { auditId: previousAudit.id },
  });
  const prevByRule = new Map(previousResults.map((r) => [r.ruleId, r]));

  const alerts = [];

  for (const result of failures) {
    const prev = prevByRule.get(result.ruleId);
    const rule = rulesById.get(result.ruleId);
    if (!prev) {
      alerts.push({
        shopId,
        auditId,
        type: "NEW_ISSUE",
        title: `Nouveau manquement : ${rule?.title ?? result.ruleId}`,
        message: result.message,
      });
    } else if (
      prev.status === "PASS" &&
      (result.status === "FAIL" || result.status === "WARNING")
    ) {
      alerts.push({
        shopId,
        auditId,
        type: "REGRESSION",
        title: `Régression : ${rule?.title ?? result.ruleId}`,
        message: result.message,
      });
    }
  }

  if (
    previousAudit.overallStatus === "COMPLIANT" &&
    failures.length > 0
  ) {
    alerts.push({
      shopId,
      auditId,
      type: "REGRESSION",
      title: "Score de conformité en baisse",
      message: `${failures.length} manquement(s) détecté(s) depuis le dernier audit.`,
    });
  }

  if (alerts.length > 0) {
    await prisma.complianceAlert.createMany({ data: alerts });
  }

  return alerts;
}

export async function getUnreadAlerts(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({
    where: { shop },
  });
  if (!profile) return [];

  return prisma.complianceAlert.findMany({
    where: { shopId: profile.id, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function markAlertsRead(shop) {
  const profile = await prisma.shopComplianceProfile.findUnique({
    where: { shop },
  });
  if (!profile) return;

  await prisma.complianceAlert.updateMany({
    where: { shopId: profile.id, isRead: false },
    data: { isRead: true },
  });
}

export async function createWebhookAlert(shopId, topic) {
  await prisma.complianceAlert.create({
    data: {
      shopId,
      type: "WEBHOOK",
      title: "Changement détecté sur votre boutique",
      message: `Événement ${topic} — un ré-audit a été déclenché automatiquement.`,
    },
  });
}
