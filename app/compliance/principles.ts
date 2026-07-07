/**
 * JuriShop — Principe fondateur : Audit & Advisor
 *
 * L'application n'intervient JAMAIS en autonomie sur le site du marchand.
 * Elle analyse, signale, et propose — le marchand décide et applique.
 */

export const APP_MODE = "audit_advisor" as const;

/** Scopes autorisés — lecture seule uniquement. Toute écriture est interdite par design. */
// NB : "read_shop" n'existe pas — les données boutique sont lisibles sans scope.
export const ALLOWED_SCOPES = [
  "read_products",
  "read_content",
  "read_online_store_pages",
  "read_legal_policies",
  "read_markets",
  "read_themes",
] as const;

/** Mutations Shopify explicitement interdites dans le code applicatif. */
export const FORBIDDEN_OPERATION_PREFIXES = [
  "create",
  "update",
  "delete",
  "bulk",
  "publish",
  "unpublish",
  "activate",
  "deactivate",
  "replace",
  "set",
  "append",
  "remove",
] as const;

export type RecommendationStatus =
  | "pending"
  | "viewed"
  | "acknowledged"
  | "applied_by_merchant"
  | "dismissed";

/** Lien deep-link vers l'admin Shopify — le marchand agit manuellement. */
export interface MerchantActionLink {
  label: string;
  /** Chemin relatif admin Shopify, ex: /settings/legal */
  adminPath: string;
  description?: string;
}

/** Recommandation générée après un échec d'audit — jamais appliquée automatiquement. */
export interface AdvisoryRecommendation {
  ruleId: string;
  title: string;
  summary: string;
  remediationSteps: string[];
  merchantActions: MerchantActionLink[];
  textTemplateId?: string;
  legalDisclaimer: string;
}

export const DEFAULT_LEGAL_DISCLAIMER =
  "Ce contenu est fourni à titre indicatif et ne constitue pas un conseil juridique. " +
  "Adaptez-le à votre activité et faites-le valider par un professionnel du droit avant publication.";
