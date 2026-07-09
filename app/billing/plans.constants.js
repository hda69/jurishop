/** Noms Billing API — doivent correspondre exactement au Partner Dashboard App Pricing. */
export const PRO_PLAN = "jurishop-pro";
export const EXPERT_PLAN = "jurishop-expert";

/** Noms exacts des 2 plans payants — alignés avec le Partner Dashboard (3 plans au total). */
export const ALL_PAID_PLANS = [PRO_PLAN, EXPERT_PLAN];

export const PLAN_IDS = {
  FREE: "FREE",
  PRO: "PRO",
  EXPERT: "EXPERT",
};

export const PLAN_PRICING = {
  [PLAN_IDS.FREE]: { amount: 0, currency: "EUR", label: "Gratuit" },
  [PLAN_IDS.PRO]: {
    amount: 24,
    annualAmount: 240,
    currency: "EUR",
    label: "24 €/mois",
    annualLabel: "240 €/an",
    annualSavings: "2 mois offerts",
  },
  [PLAN_IDS.EXPERT]: {
    amount: 59,
    annualAmount: 590,
    currency: "EUR",
    label: "59 €/mois",
    annualLabel: "590 €/an",
    annualSavings: "2 mois offerts",
  },
};

function formatPaidPlanPrice(planId) {
  const p = PLAN_PRICING[planId];
  return `${p.label} — ou ${p.annualLabel} (${p.annualSavings})`;
}

export const PLAN_MARKETING = [
  {
    id: PLAN_IDS.FREE,
    name: "Gratuit",
    price: PLAN_PRICING[PLAN_IDS.FREE].label,
    description: "Découvrir JuriShop et votre score de conformité.",
    features: [
      "1 audit manuel par mois",
      "Score global et alertes basiques",
      "Pack de règles France",
      "Historique (3 audits)",
    ],
  },
  {
    id: PLAN_IDS.PRO,
    name: "Pro",
    price: formatPaidPlanPrice(PLAN_IDS.PRO),
    description: "Pour les boutiques qui veulent rester conformes au quotidien.",
    features: [
      "Audits illimités",
      "Audit planifié et webhooks",
      "Rapports HTML téléchargeables",
      "Partage avec votre conseiller",
      "Packs France + UE",
      "Historique (15 audits)",
    ],
    highlighted: true,
  },
  {
    id: PLAN_IDS.EXPERT,
    name: "Expert",
    price: formatPaidPlanPrice(PLAN_IDS.EXPERT),
    description: "Pour les marchands exigeants et les structures identifiées (SARL, SAS…).",
    features: [
      "Tout le plan Pro",
      "Pré-remplissage SIRENE — modèles de mentions légales auto-complétés (SIRET, RCS, TVA, adresse…)",
      "Mode expert (références légales)",
      "Multi-marchés : Belgique, Suisse, Luxembourg",
      "Historique étendu (50 audits)",
    ],
  },
];
