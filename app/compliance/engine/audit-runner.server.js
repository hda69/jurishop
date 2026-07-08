import { readFile } from "node:fs/promises";
import { join } from "node:path";
import prisma from "../../db.server.js";
import { buildShopAuditContext } from "../fetchers/build-context.server.js";
import { evaluateRule } from "../checkers/registry.server.js";
import { aggregateAuditStatus, countResults } from "./status-aggregator.server.js";
import { loadTextTemplate } from "../templates/loader.server.js";
import { prefillTemplateBody } from "../services/template-prefill.server.js";
import { createAlertsFromAudit } from "../services/alerts.server.js";
import { sendRegressionEmailAlerts } from "../services/email-alerts.server.js";
import { DEFAULT_LEGAL_DISCLAIMER } from "../principles.ts";
import { effectivePlanFromProfile, getPlanFeatures } from "../../billing/plans.server.js";
import { getSirenePrefillContext } from "../services/sirene-prefill.server.js";

const PACKS_DIR = join(process.cwd(), "app/compliance/rules/packs");

async function loadRulePacks(jurisdictions) {
  const packs = [];
  for (const jurisdiction of jurisdictions) {
    const packPath = join(PACKS_DIR, jurisdiction.toLowerCase(), "index.json");
    try {
      const raw = await readFile(packPath, "utf-8");
      packs.push(JSON.parse(raw));
    } catch {
      // Pack non disponible
    }
  }
  return packs;
}

function flattenRules(packs) {
  const byId = new Map();
  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (rule.enabled !== false) byId.set(rule.id, rule);
    }
  }
  return [...byId.values()];
}

function getInternalRuleIds(rules) {
  const internal = new Set();
  for (const rule of rules) {
    if (rule.checkType === "composite_any" || rule.checkType === "composite_all") {
      for (const id of rule.params?.ruleIds ?? []) {
        internal.add(id);
      }
    }
  }
  return internal;
}

function toPrismaCategory(category) {
  const map = {
    legal_pages: "LEGAL_PAGES",
    gdpr: "GDPR",
    consumer_rights: "CONSUMER_RIGHTS",
    pricing: "PRICING",
    tax: "TAX",
    accessibility: "ACCESSIBILITY",
    other: "OTHER",
  };
  return map[category] ?? "OTHER";
}

function toPrismaSeverity(severity) {
  const map = { info: "INFO", warning: "WARNING", critical: "CRITICAL" };
  return map[severity] ?? "WARNING";
}

function buildRecommendationData(rule, checkResult) {
  const advisory = rule.advisory;
  const remediationSteps =
    advisory?.remediationSteps ??
    (rule.remediation ? [rule.remediation] : [
      "Consultez le détail du manquement.",
      "Appliquez la correction manuellement dans l'admin Shopify.",
    ]);

  return {
    ruleId: rule.id,
    jurisdiction: rule.jurisdiction,
    category: toPrismaCategory(rule.category),
    severity: toPrismaSeverity(rule.severity),
    title: rule.title,
    summary: checkResult.message,
    remediationSteps,
    merchantActions: advisory?.merchantActions ?? [],
    textTemplateId: advisory?.textTemplateId ?? null,
  };
}

function filterRulesForProfile(rules, profile) {
  return rules.filter((rule) => {
    const bm = rule.applicableWhen?.businessModel;
    if (bm && !bm.includes(profile.businessModel ?? "B2C")) return false;
    return true;
  });
}

function resolveJurisdictions(activeMarkets, billingPlan = "FREE") {
  const features =
    billingPlan === "EXPERT"
      ? { euPack: true, multiMarkets: true }
      : billingPlan === "PRO"
        ? { euPack: true, multiMarkets: false }
        : { euPack: false, multiMarkets: false };

  let markets = [...activeMarkets];
  if (!features.euPack) {
    markets = markets.filter((m) => m !== "EU");
  }
  if (!features.multiMarkets) {
    markets = markets.filter((m) => m === "FR" || m === "EU");
  }
  if (markets.length === 0) markets = ["FR"];

  const set = new Set(markets);
  if (set.has("FR") && features.euPack) set.add("EU");
  if (features.multiMarkets && ["BE", "CH", "LU"].some((m) => set.has(m))) {
    set.add("EU");
  }
  return [...set];
}

async function syncRecommendations(
  shopId,
  ruleResults,
  rulesById,
  internalRuleIds,
  { context, profile },
) {
  const failures = ruleResults.filter(
    (r) =>
      (r.status === "FAIL" || r.status === "WARNING") &&
      !internalRuleIds.has(r.ruleId),
  );
  const failureRuleIds = new Set(failures.map((f) => f.ruleId));

  await prisma.complianceRecommendation.deleteMany({
    where: {
      shopId,
      status: { in: ["PENDING", "VIEWED", "ACKNOWLEDGED"] },
      ruleId: { notIn: [...failureRuleIds] },
    },
  });

  for (const result of failures) {
    const rule = rulesById.get(result.ruleId);
    if (!rule) continue;

    const data = buildRecommendationData(rule, result);
    let textTemplateBody = null;
    if (data.textTemplateId) {
      const template = await loadTextTemplate(data.textTemplateId);
      const planFeatures = getPlanFeatures(effectivePlanFromProfile(profile));
      const sirenePrefill = planFeatures.sirene
        ? getSirenePrefillContext(profile)
        : { siret: null, companyData: null };
      textTemplateBody = template?.body
        ? prefillTemplateBody(template.body, {
            shop: context?.shop,
            ...sirenePrefill,
          })
        : null;
    }

    const existingOpen = await prisma.complianceRecommendation.findFirst({
      where: {
        shopId,
        ruleId: rule.id,
        status: { in: ["PENDING", "VIEWED", "ACKNOWLEDGED"] },
      },
    });

    if (existingOpen) {
      await prisma.complianceRecommendation.update({
        where: { id: existingOpen.id },
        data: {
          summary: data.summary,
          remediationSteps: JSON.stringify(data.remediationSteps),
          merchantActions: JSON.stringify(data.merchantActions),
          textTemplateId: data.textTemplateId,
          textTemplateBody,
          severity: data.severity,
        },
      });
      continue;
    }

    await prisma.complianceRecommendation.create({
      data: {
        shopId,
        ...data,
        remediationSteps: JSON.stringify(data.remediationSteps),
        merchantActions: JSON.stringify(data.merchantActions),
        textTemplateBody,
        status: "PENDING",
      },
    });
  }
}

async function refreshIssueCounts(shopId) {
  const openStatuses = ["PENDING", "VIEWED", "ACKNOWLEDGED"];
  const [openIssuesCount, criticalIssuesCount] = await Promise.all([
    prisma.complianceRecommendation.count({
      where: { shopId, status: { in: openStatuses } },
    }),
    prisma.complianceRecommendation.count({
      where: { shopId, status: { in: openStatuses }, severity: "CRITICAL" },
    }),
  ]);

  await prisma.shopComplianceProfile.update({
    where: { id: shopId },
    data: { openIssuesCount, criticalIssuesCount },
  });
}

/**
 * Lance un audit complet : fetch Shopify → évaluation règles → persistance.
 * Mode Audit & Advisor : aucune écriture sur la boutique marchand.
 */
export async function runComplianceAudit(admin, shop, { trigger = "MANUAL" } = {}) {
  const profile = await prisma.shopComplianceProfile.upsert({
    where: { shop },
    create: {
      shop,
      primaryJurisdiction: "FR",
      activeMarkets: JSON.stringify(["FR"]),
    },
    update: {},
  });

  const jurisdictions = resolveJurisdictions(
    JSON.parse(profile.activeMarkets || '["FR"]'),
    effectivePlanFromProfile(profile),
  );
  const packs = await loadRulePacks(jurisdictions);
  const allRules = flattenRules(packs);
  const rules = filterRulesForProfile(allRules, profile);
  const rulesById = new Map(rules.map((r) => [r.id, r]));
  const internalRuleIds = getInternalRuleIds(rules);

  const audit = await prisma.complianceAudit.create({
    data: {
      shopId: profile.id,
      status: "RUNNING",
      trigger,
      jurisdictions: JSON.stringify(jurisdictions),
      rulePackVersions: JSON.stringify(
        Object.fromEntries(packs.map((p) => [p.jurisdiction, p.version])),
      ),
    },
  });

  try {
    const previousAudit = await prisma.complianceAudit.findFirst({
      where: { shopId: profile.id, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
    });

    const context = await buildShopAuditContext(admin);
    const resultCache = new Map();

    const getRuleResult = async (ruleId) => {
      if (resultCache.has(ruleId)) return resultCache.get(ruleId);
      const rule = rulesById.get(ruleId);
      if (!rule) {
        const missing = { ruleId, status: "ERROR", message: `Règle introuvable : ${ruleId}` };
        resultCache.set(ruleId, missing);
        return missing;
      }
      const result = await evaluateRule(rule, context, getRuleResult);
      resultCache.set(ruleId, result);
      return result;
    };

    const ruleResults = [];
    for (const rule of rules) {
      const result = await getRuleResult(rule.id);
      ruleResults.push(result);
    }

    const statuses = aggregateAuditStatus(ruleResults, rulesById, internalRuleIds);
    const counts = countResults(ruleResults);

    await prisma.complianceRuleResult.createMany({
      data: ruleResults.map((result) => {
        const rule = rulesById.get(result.ruleId);
        return {
          shopId: profile.id,
          auditId: audit.id,
          ruleId: result.ruleId,
          ruleVersion: rule?.version ?? "1.0.0",
          jurisdiction: rule?.jurisdiction ?? "FR",
          category: toPrismaCategory(rule?.category ?? "other"),
          severity: toPrismaSeverity(rule?.severity ?? "warning"),
          status: result.status,
          message: result.message,
          details: result.details ? JSON.stringify(result.details) : null,
        };
      }),
    });

    await syncRecommendations(profile.id, ruleResults, rulesById, internalRuleIds, {
      context,
      profile,
    });
    await refreshIssueCounts(profile.id);

    let newAlerts = [];
    if (profile.alertsEnabled) {
      newAlerts =
        (await createAlertsFromAudit(
          profile.id,
          audit.id,
          ruleResults,
          rulesById,
          internalRuleIds,
          previousAudit,
        )) ?? [];
      if (newAlerts.length > 0) {
        await sendRegressionEmailAlerts(shop, profile, newAlerts);
      }
    }

    const updatedProfile = await prisma.shopComplianceProfile.update({
      where: { id: profile.id },
      data: {
        ...statuses,
        lastAuditAt: new Date(),
        lastAuditId: audit.id,
        shopName: context.shop.name,
        shopEmail: context.shop.email,
        shopCountry: context.shop.billingAddress?.countryCodeV2,
        shopCurrency: context.shop.currencyCode,
        shopPlan: context.shop.plan?.displayName,
      },
    });

    await prisma.complianceAudit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        marketsSnapshot: JSON.stringify(context.markets),
        ...statuses,
        ...counts,
      },
    });

    return {
      auditId: audit.id,
      profile: updatedProfile,
      counts,
      statuses,
      openIssues: updatedProfile.openIssuesCount,
      legalDisclaimer: DEFAULT_LEGAL_DISCLAIMER,
    };
  } catch (error) {
    await prisma.complianceAudit.update({
      where: { id: audit.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
