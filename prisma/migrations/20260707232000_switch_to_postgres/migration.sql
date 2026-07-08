-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('UNKNOWN', 'COMPLIANT', 'WARNING', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "AuditRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK', 'INSTALL');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('LEGAL_PAGES', 'GDPR', 'CONSUMER_RIGHTS', 'PRICING', 'TAX', 'ACCESSIBILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RuleResultStatus" AS ENUM ('PASS', 'FAIL', 'WARNING', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'VIEWED', 'ACKNOWLEDGED', 'APPLIED_BY_MERCHANT', 'DISMISSED');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopComplianceProfile" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT,
    "primaryJurisdiction" TEXT NOT NULL DEFAULT 'FR',
    "activeMarkets" TEXT NOT NULL DEFAULT '[]',
    "overallStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "legalPagesStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "gdprStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "consumerRightsStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "pricingStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastAuditAt" TIMESTAMP(3),
    "lastAuditId" TEXT,
    "openIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "criticalIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "shopName" TEXT,
    "shopEmail" TEXT,
    "shopCountry" TEXT,
    "shopCurrency" TEXT,
    "shopPlan" TEXT,
    "businessModel" TEXT NOT NULL DEFAULT 'B2C',
    "uiMode" TEXT NOT NULL DEFAULT 'beginner',
    "alertEmail" TEXT,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "badgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "siret" TEXT,
    "companyData" TEXT,
    "scheduledAuditEnabled" BOOLEAN NOT NULL DEFAULT true,
    "auditIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopComplianceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "AuditRunStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" "AuditTrigger" NOT NULL DEFAULT 'MANUAL',
    "rulePackVersions" TEXT NOT NULL DEFAULT '{}',
    "jurisdictions" TEXT NOT NULL DEFAULT '[]',
    "marketsSnapshot" TEXT NOT NULL DEFAULT '[]',
    "overallStatus" "ComplianceStatus",
    "legalPagesStatus" "ComplianceStatus",
    "gdprStatus" "ComplianceStatus",
    "consumerRightsStatus" "ComplianceStatus",
    "pricingStatus" "ComplianceStatus",
    "rulesTotal" INTEGER NOT NULL DEFAULT 0,
    "rulesPassed" INTEGER NOT NULL DEFAULT 0,
    "rulesFailed" INTEGER NOT NULL DEFAULT 0,
    "rulesSkipped" INTEGER NOT NULL DEFAULT 0,
    "rulesWarning" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRuleResult" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "jurisdiction" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "status" "RuleResultStatus" NOT NULL,
    "message" TEXT,
    "details" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRuleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecommendation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "ruleResultId" TEXT,
    "ruleId" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "remediationSteps" TEXT NOT NULL,
    "merchantActions" TEXT NOT NULL,
    "textTemplateId" TEXT,
    "textTemplateBody" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "merchantNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "placeholders" TEXT NOT NULL DEFAULT '[]',
    "legalDisclaimer" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulePack" (
    "id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RulePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAlert" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "auditId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditShareLink" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopComplianceProfile_shop_key" ON "ShopComplianceProfile"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ShopComplianceProfile_sessionId_key" ON "ShopComplianceProfile"("sessionId");

-- CreateIndex
CREATE INDEX "ShopComplianceProfile_overallStatus_idx" ON "ShopComplianceProfile"("overallStatus");

-- CreateIndex
CREATE INDEX "ShopComplianceProfile_lastAuditAt_idx" ON "ShopComplianceProfile"("lastAuditAt");

-- CreateIndex
CREATE INDEX "ComplianceAudit_shopId_startedAt_idx" ON "ComplianceAudit"("shopId", "startedAt");

-- CreateIndex
CREATE INDEX "ComplianceAudit_status_idx" ON "ComplianceAudit"("status");

-- CreateIndex
CREATE INDEX "ComplianceRuleResult_shopId_ruleId_idx" ON "ComplianceRuleResult"("shopId", "ruleId");

-- CreateIndex
CREATE INDEX "ComplianceRuleResult_shopId_status_idx" ON "ComplianceRuleResult"("shopId", "status");

-- CreateIndex
CREATE INDEX "ComplianceRuleResult_category_idx" ON "ComplianceRuleResult"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRuleResult_auditId_ruleId_key" ON "ComplianceRuleResult"("auditId", "ruleId");

-- CreateIndex
CREATE INDEX "ComplianceRecommendation_shopId_status_idx" ON "ComplianceRecommendation"("shopId", "status");

-- CreateIndex
CREATE INDEX "ComplianceRecommendation_ruleId_idx" ON "ComplianceRecommendation"("ruleId");

-- CreateIndex
CREATE INDEX "TextTemplate_jurisdiction_category_idx" ON "TextTemplate"("jurisdiction", "category");

-- CreateIndex
CREATE UNIQUE INDEX "TextTemplate_slug_version_key" ON "TextTemplate"("slug", "version");

-- CreateIndex
CREATE INDEX "RulePack_jurisdiction_isActive_idx" ON "RulePack"("jurisdiction", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RulePack_jurisdiction_version_key" ON "RulePack"("jurisdiction", "version");

-- CreateIndex
CREATE INDEX "ComplianceAlert_shopId_isRead_idx" ON "ComplianceAlert"("shopId", "isRead");

-- CreateIndex
CREATE INDEX "ComplianceAlert_shopId_createdAt_idx" ON "ComplianceAlert"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditShareLink_token_key" ON "AuditShareLink"("token");

-- CreateIndex
CREATE INDEX "AuditShareLink_token_idx" ON "AuditShareLink"("token");

-- CreateIndex
CREATE INDEX "AuditShareLink_shopId_idx" ON "AuditShareLink"("shopId");

-- AddForeignKey
ALTER TABLE "ShopComplianceProfile" ADD CONSTRAINT "ShopComplianceProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAudit" ADD CONSTRAINT "ComplianceAudit_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRuleResult" ADD CONSTRAINT "ComplianceRuleResult_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRuleResult" ADD CONSTRAINT "ComplianceRuleResult_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "ComplianceAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecommendation" ADD CONSTRAINT "ComplianceRecommendation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecommendation" ADD CONSTRAINT "ComplianceRecommendation_ruleResultId_fkey" FOREIGN KEY ("ruleResultId") REFERENCES "ComplianceRuleResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditShareLink" ADD CONSTRAINT "AuditShareLink_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
