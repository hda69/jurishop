/** Résout les packs de règles à charger selon les marchés actifs et le plan. */
export function resolveJurisdictions(activeMarkets, billingPlan = "FREE") {
  const features =
    billingPlan === "EXPERT"
      ? { euPack: true, multiMarkets: true }
      : billingPlan === "PRO"
        ? { euPack: true, multiMarkets: false }
        : { euPack: false, multiMarkets: false };

  let markets = [...activeMarkets];
  if (!features.euPack) {
    markets = markets.filter((m) => m !== "EU");
  }
  if (!features.multiMarkets) {
    markets = markets.filter((m) => m === "FR" || m === "EU");
  }
  if (markets.length === 0) markets = ["FR"];

  const set = new Set(markets);
  if (set.has("FR") && features.euPack) set.add("EU");
  if (features.multiMarkets) {
    if (set.has("BE") || set.has("LU")) set.add("EU");
  }
  return [...set];
}
