import type { ComplianceStatus, RuleCategory, RuleResultStatus, RuleSeverity } from "@prisma/client";

/** Contexte Shopify chargé une fois par audit — évite N requêtes par règle. */
export interface ShopAuditContext {
  shop: {
    name: string;
    email: string;
    contactEmail: string | null;
    myshopifyDomain: string;
    primaryDomain: { url: string } | null;
    billingAddress: {
      company: string | null;
      address1: string | null;
      city: string | null;
      zip: string | null;
      countryCodeV2: string | null;
    } | null;
    currencyCode: string;
    plan: { displayName: string } | null;
  };
  pages: Array<{
    id: string;
    title: string;
    handle: string;
    body: string;
    isPublished: boolean;
  }>;
  shopPolicies: Array<{
    type: string;
    title: string;
    body: string;
    url: string;
  }>;
  markets: Array<{
    id: string;
    name: string;
    enabled: boolean;
    regions: Array<{ code: string; name: string }>;
  }>;
  productsWithCompareAt: Array<{
    id: string;
    title: string;
    handle: string;
    price: string;
    compareAtPrice: string | null;
  }>;
}

export interface RuleCheckResult {
  status: RuleResultStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface ComplianceChecker {
  readonly checkType: string;
  evaluate(
    params: Record<string, unknown>,
    context: ShopAuditContext,
  ): Promise<RuleCheckResult>;
}

export interface CategoryStatusMap {
  legal_pages: ComplianceStatus;
  gdpr: ComplianceStatus;
  consumer_rights: ComplianceStatus;
  pricing: ComplianceStatus;
  tax: ComplianceStatus;
  accessibility: ComplianceStatus;
  other: ComplianceStatus;
}

export function mapCategoryToProfileField(
  category: string,
): keyof Pick<
  import("@prisma/client").ShopComplianceProfile,
  | "legalPagesStatus"
  | "gdprStatus"
  | "consumerRightsStatus"
  | "pricingStatus"
> | null {
  const map: Record<string, ReturnType<typeof mapCategoryToProfileField>> = {
    legal_pages: "legalPagesStatus",
    gdpr: "gdprStatus",
    consumer_rights: "consumerRightsStatus",
    pricing: "pricingStatus",
  };
  return map[category] ?? null;
}

export function toPrismaCategory(category: string): RuleCategory {
  const map: Record<string, RuleCategory> = {
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

export function toPrismaSeverity(severity: string): RuleSeverity {
  const map: Record<string, RuleSeverity> = {
    info: "INFO",
    warning: "WARNING",
    critical: "CRITICAL",
  };
  return map[severity] ?? "WARNING";
}
