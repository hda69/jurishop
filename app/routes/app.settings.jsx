import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import {
  ensureShopProfile,
  getShopProfile,
  lookupAndSaveSiret,
  serializeProfile,
  updateShopSettings,
  computeComplianceScore,
  getBadgeSnippet,
} from "../models/compliance.server";

export const loader = async ({ request }) => {
  const { getPlanFeatures, effectivePlanFromProfile } = await import(
    "../billing/plans.server.js"
  );
  const { PLAN_IDS } = await import("../billing/plans.constants.js");
  const { session, billing } = await authenticate.admin(request);
  const { syncBillingPlanFromShopify } = await import(
    "../billing/subscription.server.js"
  );
  await syncBillingPlanFromShopify(session.shop, billing);
  await ensureShopProfile(session.shop);
  const profile = serializeProfile(await getShopProfile(session.shop));
  const plan = effectivePlanFromProfile(profile);
  const features = getPlanFeatures(plan);
  const score = computeComplianceScore(profile);
  return { profile, score, badgeSnippet: getBadgeSnippet(profile, score), plan, features };
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const { syncBillingPlanFromShopify } = await import(
    "../billing/subscription.server.js"
  );
  await syncBillingPlanFromShopify(session.shop, billing);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_settings") {
    const markets = formData.getAll("markets");
    await updateShopSettings(session.shop, {
      businessModel: formData.get("businessModel"),
      uiMode: formData.get("uiMode"),
      alertEmail: formData.get("alertEmail") || null,
      alertsEnabled: formData.get("alertsEnabled") === "on",
      badgeEnabled: formData.get("badgeEnabled") === "on",
      scheduledAuditEnabled: formData.get("scheduledAuditEnabled") === "on",
      auditIntervalDays: parseInt(formData.get("auditIntervalDays") || "7", 10),
      primaryJurisdiction: formData.get("primaryJurisdiction") || "FR",
      activeMarkets: markets.length > 0 ? markets : ["FR"],
    });
    return { ok: true, message: "Paramètres enregistrés" };
  }

  if (intent === "lookup_siret") {
    const siret = formData.get("siret");
    if (!siret) return { ok: false, error: "SIRET requis" };
    try {
      await lookupAndSaveSiret(session.shop, String(siret));
      return { ok: true, message: "Entreprise trouvée via SIRENE" };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  return { ok: false };
};

export default function SettingsPage() {
  const { profile, score, badgeSnippet, plan, features } = useLoaderData();
  const fetcher = useFetcher();
  const siretFetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    const data = fetcher.data ?? siretFetcher.data;
    if (data?.message) {
      shopify.toast.show(data.message, { isError: data.ok === false });
    }
    if (data?.error) {
      shopify.toast.show(data.error, { isError: true });
    }
  }, [fetcher.data, siretFetcher.data, shopify]);

  const copyBadge = async () => {
    if (!badgeSnippet) return;
    await navigator.clipboard.writeText(badgeSnippet);
    shopify.toast.show("Code badge copié");
  };

  const markets = profile?.activeMarkets ?? ["FR"];

  return (
    <s-page heading="Paramètres JuriShop">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="save_settings" />

        <s-section heading="Profil juridique">
          <s-stack direction="block" gap="base">
            <label>
              Modèle commercial
              <br />
              <select name="businessModel" defaultValue={profile?.businessModel ?? "B2C"}>
                <option value="B2C">B2C — Vente aux particuliers</option>
                <option value="B2B">B2B — Vente aux professionnels</option>
                <option value="MIXED">Mixte B2B + B2C</option>
              </select>
            </label>

            <label>
              Mode d&apos;affichage
              <br />
              <select name="uiMode" defaultValue={profile?.uiMode ?? "beginner"}>
                <option value="beginner">Débutant</option>
                <option value="expert" disabled={!features.expertMode}>
                  Expert (références légales){!features.expertMode ? " — plan Expert" : ""}
                </option>
              </select>
            </label>

            <div>
              <s-text type="strong">Marchés audités</s-text>
              <br />
              <label>
                <input type="checkbox" name="markets" value="FR" defaultChecked={markets.includes("FR")} />
                {" "}France
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  name="markets"
                  value="EU"
                  defaultChecked={markets.includes("EU")}
                  disabled={!features.euPack}
                />
                {" "}Union européenne{!features.euPack ? " (plan Pro)" : ""}
              </label>
            </div>
          </s-stack>
        </s-section>

        <s-section heading="Audit planifié">
          {!features.scheduledAudit && (
            <s-banner tone="info">
              <s-paragraph>
                L&apos;audit planifié est disponible à partir du plan Pro.{" "}
                <s-link href="/app/plans">Voir les plans</s-link>
              </s-paragraph>
            </s-banner>
          )}
          <s-paragraph>
            Compense l&apos;absence de webhooks pour les pages et politiques
            légales. Vérifie automatiquement votre conformité à intervalle
            régulier.
          </s-paragraph>
          <label>
            <input
              type="checkbox"
              name="scheduledAuditEnabled"
              defaultChecked={profile?.scheduledAuditEnabled !== false}
              disabled={!features.scheduledAudit}
            />
            {" "}Activer l&apos;audit planifié
          </label>
          <br />
          <label>
            Intervalle (jours)
            <br />
            <select
              name="auditIntervalDays"
              defaultValue={String(profile?.auditIntervalDays ?? 7)}
            >
              <option value="1">Tous les jours</option>
              <option value="3">Tous les 3 jours</option>
              <option value="7">Toutes les semaines</option>
              <option value="14">Toutes les 2 semaines</option>
              <option value="30">Tous les mois</option>
            </select>
          </label>
        </s-section>

        <s-section heading="Alertes">
          <s-text-field
            label="Email d'alerte (futur)"
            name="alertEmail"
            value={profile?.alertEmail ?? ""}
          />
          <label>
            <input
              type="checkbox"
              name="alertsEnabled"
              defaultChecked={profile?.alertsEnabled !== false}
            />
            {" "}Alertes in-app lors des régressions
          </label>
        </s-section>

        <s-section heading="Badge conformité">
          <s-paragraph>
            Score : <s-text type="strong">{score}/100</s-text>
            {score >= 80 ? " — badge disponible" : " — minimum 80 requis"}
          </s-paragraph>
          <label>
            <input
              type="checkbox"
              name="badgeEnabled"
              defaultChecked={profile?.badgeEnabled === true}
            />
            {" "}Activer le badge JuriShop
          </label>
          {badgeSnippet && (
            <s-button type="button" onClick={copyBadge}>
              Copier le code HTML
            </s-button>
          )}
        </s-section>

        <s-button variant="primary" type="submit">
          Enregistrer
        </s-button>
      </fetcher.Form>

      <s-section slot="aside" heading="SIRENE — pré-remplissage">
        {!features.sirene && (
          <s-banner tone="info">
            <s-paragraph>
              La recherche SIRENE est incluse dans le plan Expert.{" "}
              <s-link href="/app/plans">Passer au plan Expert</s-link>
            </s-paragraph>
          </s-banner>
        )}
        {profile?.companyData && (
          <s-banner tone="success" heading={profile.companyData.denomination}>
            <s-paragraph>SIRET {profile.siret}</s-paragraph>
            <s-paragraph color="subdued">{profile.companyData.adresse}</s-paragraph>
          </s-banner>
        )}
        <siretFetcher.Form method="post">
          <input type="hidden" name="intent" value="lookup_siret" />
          <s-text-field
            label="SIRET"
            name="siret"
            value={profile?.siret ?? ""}
            disabled={!features.sirene}
          />
          <s-button type="submit" variant="secondary" disabled={!features.sirene}>
            Rechercher via SIRENE
          </s-button>
        </siretFetcher.Form>
        <s-paragraph color="subdued">Plan actuel : {plan}</s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
