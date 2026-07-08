import { randomBytes } from "node:crypto";
import prisma from "../db.server";
import { DEFAULT_LEGAL_DISCLAIMER } from "../compliance/principles.ts";
import { runComplianceAudit } from "../compliance/engine/audit-runner.server.js";
import { fetchCompanyBySiret } from "../compliance/services/sirene.server.js";
import { generateAuditReportHtml } from "../compliance/services/report.server.js";
import {
  getUnreadAlerts,
  markAlertsRead,
} from "../compliance/services/alerts.server.js";
import {
  isAuditDue,
  daysUntilNextAudit,
  runScheduledAuditIfDue,
} from "../compliance/engine/scheduled-audit.server.js";
import {
  assertPlanFeature,
  afterAuditRecorded,
  getPlanFeatures,
  PLAN_IDS,
  validateAuditRequest,
} from "../billing/audit-gate.server.js";

export async function ensureShopProfile(shop) {
  return prisma.shopComplianceProfile.upsert({
    where: { shop },
    create: {
      shop,
      primaryJurisdiction: "FR",
      activeMarkets: JSON.stringify(["FR"]),
    },
    update: {},
  });
}

export async function runAudit(admin, shop, options = {}) {
  const profile = await ensureShopProfile(shop);
  const trigger = options.trigger ?? "MANUAL";

  const check = await validateAuditRequest(profile, trigger);
  if (!check.allowed) {
    const error = new Error(check.reason);
    error.code = "PLAN_LIMIT";
    throw error;
  }

  const result = await runComplianceAudit(admin, shop, options);
  await afterAuditRecorded(shop, trigger);
  return result;
}

/** Premier audit ou audit planifié si l'intervalle est dépassé. */
export async function ensureAuditCurrent(admin, shop) {
  await ensureShopProfile(shop);
  let profile = await getShopProfile(shop);

  if (!profile?.lastAuditAt) {
    await runAudit(admin, shop, { trigger: "INSTALL" });
    return getShopProfile(shop);
  }

  const { ran } = await runScheduledAuditIfDue(admin, shop, profile);
  if (ran) return getShopProfile(shop);

  return profile;
}

function enforceSettingsForPlan(plan, settings) {
  const features = getPlanFeatures(plan);
  const next = { ...settings };

  if (!features.scheduledAudit) {
    next.scheduledAuditEnabled = false;
  }
  if (!features.expertMode && next.uiMode === "expert") {
    next.uiMode = "beginner";
  }
  if (!features.multiMarkets) {
    const markets = next.activeMarkets ?? ["FR"];
    next.activeMarkets = markets.filter((m) => m === "FR" || m === "EU");
    if (!features.euPack) {
      next.activeMarkets = ["FR"];
    }
  }

  return next;
}

export async function getShopProfile(shop) {
  return prisma.shopComplianceProfile.findUnique({ where: { shop } });
}

export async function updateShopSettings(shop, settings) {
  const profile = await ensureShopProfile(shop);
  const plan = profile.billingPlan ?? PLAN_IDS.FREE;
  const gated = enforceSettingsForPlan(plan, settings);

  if (gated.uiMode === "expert") {
    const check = assertPlanFeature(plan, "expertMode");
    if (!check.allowed) throw new Error(check.reason);
  }
  if (gated.scheduledAuditEnabled) {
    const check = assertPlanFeature(plan, "scheduledAudit");
    if (!check.allowed) throw new Error(check.reason);
  }
  const markets = gated.activeMarkets ?? JSON.parse(profile.activeMarkets);
  if (markets.includes("EU")) {
    const check = assertPlanFeature(plan, "euPack");
    if (!check.allowed) throw new Error(check.reason);
  }

  return prisma.shopComplianceProfile.update({
    where: { id: profile.id },
    data: {
      businessModel: gated.businessModel ?? profile.businessModel,
      uiMode: gated.uiMode ?? profile.uiMode,
      alertEmail: gated.alertEmail ?? profile.alertEmail,
      alertsEnabled:
        gated.alertsEnabled !== undefined
          ? gated.alertsEnabled
          : profile.alertsEnabled,
      badgeEnabled:
        gated.badgeEnabled !== undefined
          ? gated.badgeEnabled
          : profile.badgeEnabled,
      siret: gated.siret ?? profile.siret,
      activeMarkets: gated.activeMarkets
        ? JSON.stringify(gated.activeMarkets)
        : profile.activeMarkets,
      primaryJurisdiction:
        gated.primaryJurisdiction ?? profile.primaryJurisdiction,
      companyData: gated.companyData ?? profile.companyData,
      scheduledAuditEnabled:
        gated.scheduledAuditEnabled !== undefined
          ? gated.scheduledAuditEnabled
          : profile.scheduledAuditEnabled,
      auditIntervalDays:
        gated.auditIntervalDays !== undefined
          ? gated.auditIntervalDays
          : profile.auditIntervalDays,
    },
  });
}

export async function lookupAndSaveSiret(shop, siret) {
  const profile = await ensureShopProfile(shop);
  const plan = profile.billingPlan ?? PLAN_IDS.FREE;
  const check = assertPlanFeature(plan, "sirene");
  if (!check.allowed) throw new Error(check.reason);

  const company = await fetchCompanyBySiret(siret);
  return prisma.shopComplianceProfile.update({
    where: { id: profile.id },
    data: {
      siret: company.siret,
      companyData: JSON.stringify(company),
    },
  });
}

export async function getAuditHistory(shop, limit) {
  const profile = await getShopProfile(shop);
  if (!profile) return [];

  const plan = profile.billingPlan ?? PLAN_IDS.FREE;
  const features = getPlanFeatures(plan);
  const take = limit ?? features.historyLimit;

  return prisma.complianceAudit.findMany({
    where: { shopId: profile.id, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    take,
  });
}

export async function getAuditWithResults(shop, auditId) {
  const profile = await getShopProfile(shop);
  if (!profile) return null;

  const audit = await prisma.complianceAudit.findFirst({
    where: { id: auditId, shopId: profile.id },
  });
  if (!audit) return null;

  const ruleResults = await prisma.complianceRuleResult.findMany({
    where: { auditId: audit.id },
    orderBy: { evaluatedAt: "asc" },
  });

  return { profile, audit, ruleResults };
}

export async function exportAuditReport(shop, auditId) {
  const profile = await getShopProfile(shop);
  const plan = profile?.billingPlan ?? PLAN_IDS.FREE;
  const check = assertPlanFeature(plan, "htmlReports");
  if (!check.allowed) throw new Error(check.reason);

  const data = await getAuditWithResults(shop, auditId);
  if (!data) throw new Response("Audit introuvable", { status: 404 });
  return generateAuditReportHtml({ shop, ...data });
}

export async function createShareLink(shop, auditId) {
  const profile = await getShopProfile(shop);
  if (!profile) throw new Response("Not found", { status: 404 });

  const plan = profile.billingPlan ?? PLAN_IDS.FREE;
  const check = assertPlanFeature(plan, "shareLinks");
  if (!check.allowed) throw new Error(check.reason);

  const audit = await prisma.complianceAudit.findFirst({
    where: { id: auditId, shopId: profile.id },
  });
  if (!audit) throw new Response("Audit introuvable", { status: 404 });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.auditShareLink.create({
    data: { shopId: profile.id, auditId: audit.id, token, expiresAt },
  });

  return { token, expiresAt };
}

export async function getSharedReport(token) {
  const link = await prisma.auditShareLink.findUnique({
    where: { token },
    include: { shop: true },
  });

  if (!link || link.expiresAt < new Date()) {
    throw new Response("Lien expiré ou invalide", { status: 404 });
  }

  const data = await getAuditWithResults(link.shop.shop, link.auditId);
  if (!data) throw new Response("Rapport introuvable", { status: 404 });

  return generateAuditReportHtml({ shop: link.shop.shop, ...data });
}

export async function getRecommendations(shop) {
  const profile = await getShopProfile(shop);
  if (!profile) return [];

  const rows = await prisma.complianceRecommendation.findMany({
    where: { shopId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  rows.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9),
  );

  return rows.map(serializeRecommendation);
}

export async function updateRecommendationStatus(id, shop, status, merchantNote) {
  const profile = await getShopProfile(shop);
  if (!profile) throw new Response("Not found", { status: 404 });

  const now = new Date();
  const timestamps = {
    VIEWED: { viewedAt: now },
    ACKNOWLEDGED: { viewedAt: now, acknowledgedAt: now },
    APPLIED_BY_MERCHANT: {
      viewedAt: now,
      acknowledgedAt: now,
      appliedAt: now,
    },
    DISMISSED: { dismissedAt: now },
  };

  const updated = await prisma.complianceRecommendation.update({
    where: { id, shopId: profile.id },
    data: {
      status,
      merchantNote: merchantNote ?? undefined,
      ...timestamps[status],
    },
  });

  await refreshIssueCounts(profile.id);
  return serializeRecommendation(updated);
}

async function refreshIssueCounts(shopId) {
  const openStatuses = ["PENDING", "VIEWED", "ACKNOWLEDGED"];
  const [openIssuesCount, criticalIssuesCount] = await Promise.all([
    prisma.complianceRecommendation.count({
      where: { shopId, status: { in: openStatuses } },
    }),
    prisma.complianceRecommendation.count({
      where: {
        shopId,
        status: { in: openStatuses },
        severity: "CRITICAL",
      },
    }),
  ]);

  await prisma.shopComplianceProfile.update({
    where: { id: shopId },
    data: { openIssuesCount, criticalIssuesCount },
  });
}

function serializeRecommendation(row) {
  return {
    id: row.id,
    ruleId: row.ruleId,
    jurisdiction: row.jurisdiction,
    category: row.category,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    remediationSteps: JSON.parse(row.remediationSteps),
    merchantActions: JSON.parse(row.merchantActions),
    textTemplateId: row.textTemplateId,
    textTemplateBody: row.textTemplateBody,
    status: row.status,
    merchantNote: row.merchantNote,
    legalDisclaimer: DEFAULT_LEGAL_DISCLAIMER,
    createdAt: row.createdAt.toISOString(),
    viewedAt: row.viewedAt?.toISOString() ?? null,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
  };
}

export function serializeProfile(profile) {
  if (!profile) return null;
  return {
    ...profile,
    activeMarkets: JSON.parse(profile.activeMarkets),
    companyData: profile.companyData ? JSON.parse(profile.companyData) : null,
    lastAuditAt: profile.lastAuditAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export { getUnreadAlerts, markAlertsRead, isAuditDue, daysUntilNextAudit };

export function computeComplianceScore(profile) {
  const weights = {
    COMPLIANT: 100,
    WARNING: 60,
    NON_COMPLIANT: 20,
    UNKNOWN: 0,
  };
  const fields = [
    profile?.legalPagesStatus,
    profile?.gdprStatus,
    profile?.consumerRightsStatus,
    profile?.pricingStatus,
  ];
  const scores = fields.map((s) => weights[s] ?? 0);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getBadgeSnippet(profile, score) {
  if (!profile?.badgeEnabled || score < 80) return null;
  return `<!-- JuriShop Badge -->
<a href="https://jurishop.app" target="_blank" rel="noopener" style="font-size:12px;color:#666;text-decoration:none;">
  ✓ Conformité vérifiée par JuriShop (${score}/100)
</a>`;
}
