/** Formate les preuves JSON d'un résultat de règle pour l'affichage marchand. */
export function formatRuleEvidence(details) {
  if (!details) return [];

  let parsed;
  try {
    parsed = typeof details === "string" ? JSON.parse(details) : details;
  } catch {
    return [];
  }

  const items = [];

  if (Array.isArray(parsed.invalidProducts) && parsed.invalidProducts.length) {
    for (const p of parsed.invalidProducts.slice(0, 8)) {
      items.push({
        type: "product",
        label: p.title ?? p.handle ?? p.id,
        detail: `Prix ${p.price} / barré ${p.compareAtPrice}`,
      });
    }
    if (parsed.totalInvalid > 8) {
      items.push({
        type: "note",
        label: `…et ${parsed.totalInvalid - 8} autre(s) produit(s)`,
      });
    }
  }

  if (Array.isArray(parsed.missingFields) && parsed.missingFields.length) {
    for (const field of parsed.missingFields) {
      items.push({ type: "missing", label: field });
    }
  }

  if (Array.isArray(parsed.foundKeywords) && parsed.foundKeywords.length) {
    items.push({
      type: "found",
      label: `Mots-clés détectés : ${parsed.foundKeywords.join(", ")}`,
    });
  }

  if (Array.isArray(parsed.detectedKeywords) && parsed.detectedKeywords.length) {
    items.push({
      type: "found",
      label: `Signaux cookies : ${parsed.detectedKeywords.join(", ")}`,
    });
  }

  if (Array.isArray(parsed.cookieApps) && parsed.cookieApps.length) {
    items.push({
      type: "found",
      label: `Apps cookies : ${parsed.cookieApps.join(", ")}`,
    });
  }

  if (Array.isArray(parsed.trackingApps) && parsed.trackingApps.length) {
    items.push({
      type: "warning",
      label: `Apps traceuses : ${parsed.trackingApps.join(", ")}`,
    });
  }

  if (parsed.scanMethod) {
    items.push({
      type: "note",
      label: `Méthode : ${parsed.scanMethod.replace(/_/g, " ")}`,
    });
  }

  if (Array.isArray(parsed.verificationChecklist)) {
    for (const step of parsed.verificationChecklist.slice(0, 4)) {
      items.push({ type: "checklist", label: step });
    }
  }

  if (parsed.omnibusMissing) {
    items.push({
      type: "warning",
      label: "Mention du prix le plus bas sur 30 jours absente des textes légaux",
    });
  }

  if (typeof parsed.checkedCount === "number" && items.length === 0) {
    items.push({
      type: "note",
      label: `${parsed.checkedCount} élément(s) vérifié(s)`,
    });
  }

  if (parsed.remediation && typeof parsed.remediation === "string") {
    items.push({ type: "tip", label: parsed.remediation });
  }

  return items;
}
