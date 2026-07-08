-- AlterTable
ALTER TABLE "ShopComplianceProfile" ADD COLUMN     "billingPlan" TEXT NOT NULL DEFAULT 'FREE',
ADD COLUMN     "billingSubscriptionId" TEXT,
ADD COLUMN     "billingSubscriptionStatus" TEXT,
ADD COLUMN     "manualAuditsThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "manualAuditsMonthKey" TEXT;
