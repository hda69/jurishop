-- CreateTable
CREATE TABLE "ShopComplianceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT,
    "primaryJurisdiction" TEXT NOT NULL DEFAULT 'FR',
    "activeMarkets" TEXT NOT NULL DEFAULT '[]',
    "overallStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "legalPagesStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "gdprStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consumerRightsStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "pricingStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastAuditAt" DATETIME,
    "lastAuditId" TEXT,
    "openIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "criticalIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "shopName" TEXT,
    "shopEmail" TEXT,
    "shopCountry" TEXT,
    "shopCurrency" TEXT,
    "shopPlan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopComplianceProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "rulePackVersions" TEXT NOT NULL DEFAULT '{}',
    "jurisdictions" TEXT NOT NULL DEFAULT '[]',
    "marketsSnapshot" TEXT NOT NULL DEFAULT '[]',
    "overallStatus" TEXT,
    "legalPagesStatus" TEXT,
    "gdprStatus" TEXT,
    "consumerRightsStatus" TEXT,
    "pricingStatus" TEXT,
    "rulesTotal" INTEGER NOT NULL DEFAULT 0,
    "rulesPassed" INTEGER NOT NULL DEFAULT 0,
    "rulesFailed" INTEGER NOT NULL DEFAULT 0,
    "rulesSkipped" INTEGER NOT NULL DEFAULT 0,
    "rulesWarning" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "ComplianceAudit_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceRuleResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "jurisdiction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "details" TEXT,
    "resolvedAt" DATETIME,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceRuleResult_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComplianceRuleResult_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "ComplianceAudit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "ruleResultId" TEXT,
    "ruleId" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "remediationSteps" TEXT NOT NULL,
    "merchantActions" TEXT NOT NULL,
    "textTemplateId" TEXT,
    "textTemplateBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "merchantNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "appliedAt" DATETIME,
    "dismissedAt" DATETIME,
    CONSTRAINT "ComplianceRecommendation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComplianceRecommendation_ruleResultId_fkey" FOREIGN KEY ("ruleResultId") REFERENCES "ComplianceRuleResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TextTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "placeholders" TEXT NOT NULL DEFAULT '[]',
    "legalDisclaimer" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RulePack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jurisdiction" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
