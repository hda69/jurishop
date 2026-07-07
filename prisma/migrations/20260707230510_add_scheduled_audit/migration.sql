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
    "scheduledAuditEnabled" BOOLEAN NOT NULL DEFAULT true,
    "auditIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopComplianceProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShopComplianceProfile" ("activeMarkets", "alertEmail", "alertsEnabled", "badgeEnabled", "businessModel", "companyData", "consumerRightsStatus", "createdAt", "criticalIssuesCount", "gdprStatus", "id", "lastAuditAt", "lastAuditId", "legalPagesStatus", "openIssuesCount", "overallStatus", "pricingStatus", "primaryJurisdiction", "sessionId", "shop", "shopCountry", "shopCurrency", "shopEmail", "shopName", "shopPlan", "siret", "uiMode", "updatedAt") SELECT "activeMarkets", "alertEmail", "alertsEnabled", "badgeEnabled", "businessModel", "companyData", "consumerRightsStatus", "createdAt", "criticalIssuesCount", "gdprStatus", "id", "lastAuditAt", "lastAuditId", "legalPagesStatus", "openIssuesCount", "overallStatus", "pricingStatus", "primaryJurisdiction", "sessionId", "shop", "shopCountry", "shopCurrency", "shopEmail", "shopName", "shopPlan", "siret", "uiMode", "updatedAt" FROM "ShopComplianceProfile";
DROP TABLE "ShopComplianceProfile";
ALTER TABLE "new_ShopComplianceProfile" RENAME TO "ShopComplianceProfile";
CREATE UNIQUE INDEX "ShopComplianceProfile_shop_key" ON "ShopComplianceProfile"("shop");
CREATE UNIQUE INDEX "ShopComplianceProfile_sessionId_key" ON "ShopComplianceProfile"("sessionId");
CREATE INDEX "ShopComplianceProfile_overallStatus_idx" ON "ShopComplianceProfile"("overallStatus");
CREATE INDEX "ShopComplianceProfile_lastAuditAt_idx" ON "ShopComplianceProfile"("lastAuditAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
