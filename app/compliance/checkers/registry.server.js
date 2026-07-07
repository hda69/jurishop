import { checkPageContent, checkPageExists } from "./page.checker.js";
import { checkShopPolicyContent, checkShopPolicyExists } from "./policy.checker.js";
import { checkProductPricingStrikethrough } from "./pricing.checker.js";
import { checkShopFieldPresent } from "./shop-field.checker.js";
import { checkCompositeAll, checkCompositeAny } from "./composite.checker.js";
import {
  checkThemeCookieBanner,
  checkThemeFooterLinks,
  checkCheckoutPaymentLabel,
} from "./theme.checker.js";
import { checkInstalledAppsAudit } from "./apps.checker.js";

const CHECKERS = {
  page_exists: checkPageExists,
  page_content: checkPageContent,
  shop_policy_exists: checkShopPolicyExists,
  shop_policy_content: checkShopPolicyContent,
  product_pricing_strikethrough: checkProductPricingStrikethrough,
  shop_field_present: checkShopFieldPresent,
  theme_footer_links: checkThemeFooterLinks,
  theme_cookie_banner: checkThemeCookieBanner,
  checkout_payment_label: checkCheckoutPaymentLabel,
  installed_apps_audit: checkInstalledAppsAudit,
};

export async function evaluateRule(rule, context, getRuleResult) {
  if (rule.checkType === "composite_any") {
    const result = await checkCompositeAny(rule.params, getRuleResult);
    return { ...result, ruleId: rule.id };
  }

  if (rule.checkType === "composite_all") {
    const result = await checkCompositeAll(rule.params, getRuleResult);
    return { ...result, ruleId: rule.id };
  }

  const checker = CHECKERS[rule.checkType];
  if (!checker) {
    return {
      status: "ERROR",
      message: `Type de vérification inconnu : ${rule.checkType}`,
      ruleId: rule.id,
    };
  }

  const result = await checker(rule.params, context);
  return { ...result, ruleId: rule.id };
}
