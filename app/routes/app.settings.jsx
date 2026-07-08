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
  const { PLAN_IDS, PLAN_MARKETING } = await import("../billing/plans.constants.js");
  const { session, billing } = await authenticate.admin(request);
  const { syncBillingPlanFromShopify } = await import(
    "../billing/subscription.server.js"
  );
  await syncBillingPlanFromShopify(session.shop, billing);
  await ensureShopProfile(session.shop);
  const profile = serializeProfile(await getShopProfile(session.shop));
  const plan = effectivePlanFromProfile(profile);
  const planName = PLAN_MARKETING.find((p) => p.id === plan)?.name ?? plan;
  const features = getPlanFeatures(plan);
  const score = computeComplianceScore(profile);
  return { profile, score, badgeSnippet: getBadgeSnippet(profile, score), plan, planName, features };
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
      sireneAutoPrefill: formData.get("sireneAutoPrefill") === "on",
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
  const { profile, score, badgeSnippet, plan, planName, features } = useLoaderData();
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
      <fetcher.Form method="post" id="settings-form">
        <input type="hidden" name="intent" value="save_settings" />

        <s-section heading="Profil juridique">
          <s-stack direction="block" gap="base">
            <s-select
              label="Modèle commercial"
              name="businessModel"
              value={profile?.businessModel ?? "B2C"}
              details="Détermine quelles obligations consommateur s'appliquent à votre boutique."
            >
              <s-option value="B2C">B2C — Vente aux particuliers</s-option>
              <s-option value="B2B">B2B — Vente aux professionnels</s-option>
              <s-option value="MIXED">Mixte B2B + B2C</s-option>
            </s-select>

            <s-choice-list
              label="Mode d'affichage"
              name="uiMode"
              values={[profile?.uiMode ?? "beginner"]}
              details="Le mode Expert affiche les références légales dans l'app et les rapports."
            >
              <s-choice value="beginner">
                Débutant — explications simplifiées
              </s-choice>
              <s-choice value="expert" disabled={!features.expertMode}>
                Expert — références légales détaillées
                {!features.expertMode ? " (plan Expert)" : ""}
              </s-choice>
            </s-choice-list>

            <s-choice-list
              label="Marchés audités"
              name="markets"
              multiple
              values={markets}
              details="Les règles de conformité sont appliquées selon les marchés sélectionnés. Belgique, Suisse et Luxembourg utilisent le pack UE en complément."
            >
              <s-choice value="FR">France</s-choice>
              <s-choice value="EU" disabled={!features.euPack}>
                Union européenne{!features.euPack ? " (plan Pro)" : ""}
              </s-choice>
              <s-choice value="BE" disabled={!features.multiMarkets}>
                Belgique{!features.multiMarkets ? " (plan Expert)" : ""}
              </s-choice>
              <s-choice value="CH" disabled={!features.multiMarkets}>
                Suisse{!features.multiMarkets ? " (plan Expert)" : ""}
              </s-choice>
              <s-choice value="LU" disabled={!features.multiMarkets}>
                Luxembourg{!features.multiMarkets ? " (plan Expert)" : ""}
              </s-choice>
            </s-choice-list>
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
          <s-stack direction="block" gap="base">
            <s-switch
              label="Activer l'audit planifié"
              name="scheduledAuditEnabled"
              value="on"
              checked={profile?.scheduledAuditEnabled !== false}
              disabled={!features.scheduledAudit}
            />
            <s-select
              label="Fréquence de l'audit"
              name="auditIntervalDays"
              value={String(profile?.auditIntervalDays ?? 7)}
              disabled={!features.scheduledAudit}
              details="Fréquence à laquelle JuriShop relance un audit automatique."
            >
              <s-option value="1">Tous les jours</s-option>
              <s-option value="3">Tous les 3 jours</s-option>
              <s-option value="7">Toutes les semaines</s-option>
              <s-option value="14">Toutes les 2 semaines</s-option>
              <s-option value="30">Tous les mois</s-option>
            </s-select>
          </s-stack>
        </s-section>

        <s-section heading="Alertes">
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Email d'alerte"
              name="alertEmail"
              details="Si renseigné, vous recevrez un email lorsqu'une régression de conformité est détectée après un audit."
              value={profile?.alertEmail ?? ""}
            />
            <s-switch
              label="Alertes in-app lors des régressions"
              name="alertsEnabled"
              value="on"
              checked={profile?.alertsEnabled !== false}
            />
          </s-stack>
        </s-section>

        <s-section heading="Badge conformité">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Score : <s-text type="strong">{score}/100</s-text>
              {score >= 80 ? " — badge disponible" : " — minimum 80 requis"}
            </s-paragraph>
            <s-switch
              label="Activer le badge JuriShop"
              name="badgeEnabled"
              value="on"
              checked={profile?.badgeEnabled === true}
            />
            {badgeSnippet && (
              <s-button type="button" onClick={copyBadge}>
                Copier le code HTML
              </s-button>
            )}
          </s-stack>
        </s-section>

        <s-button variant="primary" type="submit">
          Enregistrer
        </s-button>
      </fetcher.Form>

      <s-section slot="aside" heading="SIRENE — pré-remplissage">
        <s-paragraph color="subdued">
          Entrez votre SIRET pour importer vos informations légales depuis le
          registre officiel. Activez le pré-remplissage automatique ci-dessous
          pour les injecter dans les modèles de mentions légales et CGV (capital
          social et téléphone restent à compléter manuellement).
        </s-paragraph>
        {features.sirene && (
          <>
            <s-checkbox
              form="settings-form"
              label="Pré-remplir automatiquement les modèles avec les données SIRENE"
              name="sireneAutoPrefill"
              value="on"
              checked={profile?.sireneAutoPrefill !== false}
            />
            <s-paragraph color="subdued">
              Cliquez sur « Enregistrer » en bas de page pour sauvegarder ce
              choix.
            </s-paragraph>
          </>
        )}
        {!features.sirene && (
          <s-banner tone="info">
            <s-paragraph>
              Le pré-remplissage SIRENE est inclus dans le plan Expert — passez
              de l&apos;audit à la correction en quelques clics.{" "}
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
        {features.sirene && profile?.sireneAutoPrefill === false && (
          <s-paragraph color="subdued">
            Le pré-remplissage automatique est désactivé — les modèles
            conserveront les placeholders jusqu&apos;à réactivation.
          </s-paragraph>
        )}
        <s-paragraph color="subdued">Plan actuel : {planName}</s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
