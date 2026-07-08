export const PRO_PLAN = "JuriShop Pro";
export const EXPERT_PLAN = "JuriShop Expert";

export const PLAN_IDS = {
  FREE: "FREE",
  PRO: "PRO",
  EXPERT: "EXPERT",
};

export const PLAN_PRICING = {
  [PLAN_IDS.FREE]: { amount: 0, currency: "EUR", label: "Gratuit" },
  [PLAN_IDS.PRO]: { amount: 24, currency: "EUR", label: "24 €/mois" },
  [PLAN_IDS.EXPERT]: { amount: 59, currency: "EUR", label: "59 €/mois" },
};

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
    price: PLAN_PRICING[PLAN_IDS.PRO].label,
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
    price: PLAN_PRICING[PLAN_IDS.EXPERT].label,
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
