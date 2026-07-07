-- CreateTable
CREATE TABLE "ComplianceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "auditId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceAlert_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditShareLink_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "ShopComplianceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopComplianceProfile" (
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
    "businessModel" TEXT NOT NULL DEFAULT 'B2C',
    "uiMode" TEXT NOT NULL DEFAULT 'beginner',
    "alertEmail" TEXT,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "badgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "siret" TEXT,
    "companyData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopComplianceProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShopComplianceProfile" ("activeMarkets", "consumerRightsStatus", "createdAt", "criticalIssuesCount", "gdprStatus", "id", "lastAuditAt", "lastAuditId", "legalPagesStatus", "openIssuesCount", "overallStatus", "pricingStatus", "primaryJurisdiction", "sessionId", "shop", "shopCountry", "shopCurrency", "shopEmail", "shopName", "shopPlan", "updatedAt") SELECT "activeMarkets", "consumerRightsStatus", "createdAt", "criticalIssuesCount", "gdprStatus", "id", "lastAuditAt", "lastAuditId", "legalPagesStatus", "openIssuesCount", "overallStatus", "pricingStatus", "primaryJurisdiction", "sessionId", "shop", "shopCountry", "shopCurrency", "shopEmail", "shopName", "shopPlan", "updatedAt" FROM "ShopComplianceProfile";
DROP TABLE "ShopComplianceProfile";
ALTER TABLE "new_ShopComplianceProfile" RENAME TO "ShopComplianceProfile";
CREATE UNIQUE INDEX "ShopComplianceProfile_shop_key" ON "ShopComplianceProfile"("shop");
CREATE UNIQUE INDEX "ShopComplianceProfile_sessionId_key" ON "ShopComplianceProfile"("sessionId");
CREATE INDEX "ShopComplianceProfile_overallStatus_idx" ON "ShopComplianceProfile"("overallStatus");
CREATE INDEX "ShopComplianceProfile_lastAuditAt_idx" ON "ShopComplianceProfile"("lastAuditAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
