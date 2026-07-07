/**
 * API Recherche Entreprises (gouv.fr) — gratuite, sans clé API.
 * https://recherche-entreprises.api.gouv.fr
 */
export async function fetchCompanyBySiret(siret) {
  const cleaned = siret.replace(/\s/g, "");
  if (!/^\d{14}$/.test(cleaned)) {
    throw new Error("Le SIRET doit contenir 14 chiffres.");
  }

  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${cleaned}&per_page=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API SIRENE indisponible (${response.status})`);
  }

  const data = await response.json();
  const result = data.results?.[0];
  if (!result) {
    throw new Error("Aucune entreprise trouvée pour ce SIRET.");
  }

  const siege = result.siege ?? {};
  const dirigeant = result.dirigeants?.[0];

  return {
    siret: cleaned,
    siren: result.siren,
    denomination: result.nom_complet ?? result.nom_raison_sociale,
    forme_juridique: result.nature_juridique ?? "",
    adresse: [siege.adresse, siege.code_postal, siege.libelle_commune]
      .filter(Boolean)
      .join(", "),
    code_postal: siege.code_postal,
    ville: siege.libelle_commune,
    rcs: siege.code_postal
      ? `RCS ${siege.libelle_commune ?? ""} ${result.siren}`
      : "",
    tva: result.siren ? `FR${computeVATKey(result.siren)}${result.siren}` : "",
    dirigeant: dirigeant
      ? `${dirigeant.prenoms ?? ""} ${dirigeant.nom ?? ""}`.trim()
      : "",
    activite: result.activite_principale ?? "",
    date_creation: result.date_creation,
  };
}

function computeVATKey(siren) {
  const key = (12 + 3 * (parseInt(siren, 10) % 97)) % 97;
  return String(key).padStart(2, "0");
}
