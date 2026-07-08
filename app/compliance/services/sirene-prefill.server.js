/** Données SIRENE utilisées pour le pré-remplissage des modèles légaux. */
export function getSirenePrefillContext(profile) {
  if (!profile?.sireneAutoPrefill || !profile.siret) {
    return { siret: null, companyData: null };
  }
  return {
    siret: profile.siret,
    companyData: profile.companyData,
  };
}
