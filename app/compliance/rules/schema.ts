/** Types de vérification — chaque type mappe vers un Checker dans le registre. */
export type CheckType =
  | "page_exists"
  | "page_content"
  | "shop_policy_exists"
  | "shop_policy_content"
  | "product_pricing_strikethrough"
  | "shop_field_present"
  | "composite_all"
  | "composite_any";

export type RuleSeverity = "info" | "warning" | "critical";
export type RuleCategory =
  | "legal_pages"
  | "gdpr"
  | "consumer_rights"
  | "pricing"
  | "tax"
  | "accessibility"
  | "other";

export interface Applicability {
  jurisdictions?: string[];
  markets?: string[];
  shopCountries?: string[];
  minShopifyPlan?: string;
}

/** Actions que le marchand peut entreprendre lui-même dans l'admin Shopify. */
export interface MerchantAction {
  label: string;
  adminPath: string;
  description?: string;
}

/**
 * Bloc conseil — proposé au marchand, jamais appliqué automatiquement.
 * Le marchand copie, adapte, valide et publie manuellement.
 */
export interface AdvisoryBlock {
  remediationSteps: string[];
  merchantActions: MerchantAction[];
  textTemplateId?: string;
}

interface BaseRule {
  id: string;
  version?: string;
  jurisdiction: string;
  category: RuleCategory;
  severity: RuleSeverity;
  title: string;
  description: string;
  legalReference?: string;
  /** @deprecated Préférer advisory.remediationSteps */
  remediation?: string;
  advisory?: AdvisoryBlock;
  applicableWhen?: Applicability;
  enabled?: boolean;
}

export interface PageExistsParams {
  titlePatterns: string[];
  handlePatterns?: string[];
}

export interface PageContentParams extends PageExistsParams {
  requiredPatterns: string[];
  forbiddenPatterns?: string[];
}

export interface ShopPolicyExistsParams {
  policyType:
    | "PRIVACY_POLICY"
    | "REFUND_POLICY"
    | "TERMS_OF_SERVICE"
    | "SHIPPING_POLICY"
    | "CONTACT_INFORMATION";
}

export interface ShopPolicyContentParams extends ShopPolicyExistsParams {
  requiredPatterns: string[];
}

export interface ProductPricingParams {
  sampleSize?: number;
  requireCompareAtGreaterThanPrice?: boolean;
  flagMissingLowestPriceMention?: boolean;
}

export interface ShopFieldPresentParams {
  fields: Array<
    | "contactEmail"
    | "billingAddress.company"
    | "billingAddress.address1"
    | "billingAddress.city"
    | "billingAddress.zip"
    | "billingAddress.countryCodeV2"
  >;
}

export interface CompositeParams {
  ruleIds: string[];
}

export type ComplianceRule =
  | (BaseRule & { checkType: "page_exists"; params: PageExistsParams })
  | (BaseRule & { checkType: "page_content"; params: PageContentParams })
  | (BaseRule & {
      checkType: "shop_policy_exists";
      params: ShopPolicyExistsParams;
    })
  | (BaseRule & {
      checkType: "shop_policy_content";
      params: ShopPolicyContentParams;
    })
  | (BaseRule & {
      checkType: "product_pricing_strikethrough";
      params: ProductPricingParams;
    })
  | (BaseRule & {
      checkType: "shop_field_present";
      params: ShopFieldPresentParams;
    })
  | (BaseRule & { checkType: "composite_all"; params: CompositeParams })
  | (BaseRule & { checkType: "composite_any"; params: CompositeParams });

export interface RulePack {
  jurisdiction: string;
  version: string;
  name: string;
  description?: string;
  /** Date ISO (YYYY-MM-DD) de la dernière revue juridique du pack. */
  lastLegalReview?: string;
  rules: ComplianceRule[];
}
