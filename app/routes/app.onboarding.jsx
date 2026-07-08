import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useLocation, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { appRedirect } from "../utils/app-redirect.server.js";
import {
  computeScoreBreakdown,
  ensureShopProfile,
  getShopProfile,
  runAudit,
  serializeProfile,
  updateShopSettings,
} from "../models/compliance.server";
import { effectivePlanFromProfile } from "../billing/plans.server.js";
import { syncBillingPlanFromShopify } from "../billing/subscription.server.js";

const STEPS = [
  { id: "welcome", title: "Bienvenue" },
  { id: "profile", title: "Votre activité" },
  { id: "score", title: "Comprendre le score" },
  { id: "audit", title: "Premier audit" },
];

export const loader = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing);
  await ensureShopProfile(session.shop);
  const profile = serializeProfile(await getShopProfile(session.shop));

  if (profile?.onboardingDismissed) {
    throw appRedirect(request, "/app");
  }

  const { getPlanFeatures } = await import("../billing/plans.server.js");
  const plan = effectivePlanFromProfile(profile);
  const features = getPlanFeatures(plan);

  return {
    profile,
    plan,
    features,
    scoreBreakdown: computeScoreBreakdown(profile),
  };
};

export const action = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_profile") {
    await updateShopSettings(session.shop, {
      businessModel: formData.get("businessModel") || "B2C",
      uiMode: formData.get("uiMode") || "beginner",
    });
    return { ok: true, step: "profile" };
  }

  if (intent === "run_audit") {
    try {
      await runAudit(admin, session.shop, { trigger: "MANUAL" });
      await updateShopSettings(session.shop, { onboardingDismissed: true });
      return { ok: true, done: true, message: "Premier audit terminé" };
    } catch (error) {
      return {
        ok: false,
        message: error.message ?? "Impossible de lancer l'audit",
        planLimit: error.code === "PLAN_LIMIT",
      };
    }
  }

  if (intent === "complete") {
    await updateShopSettings(session.shop, { onboardingDismissed: true });
    return { ok: true, done: true };
  }

  return { ok: false };
};

export default function OnboardingPage() {
  const { profile, features, scoreBreakdown } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const location = useLocation();
  const shopify = useAppBridge();
  const [step, setStep] = useState(0);
  const isAuditing =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "run_audit";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, {
        isError: fetcher.data.ok === false,
      });
    }
    if (fetcher.state === "idle" && fetcher.data?.ok && fetcher.data?.step === "profile") {
      setStep(2);
    }
    if (fetcher.state === "idle" && fetcher.data?.done) {
      navigate(`/app${location.search}`);
    }
  }, [fetcher.state, fetcher.data, shopify, navigate, location.search]);

  const stepMeta = STEPS[step];

  return (
    <s-page heading="Configuration JuriShop">
      <s-section heading={`Étape ${step + 1} / ${STEPS.length} — ${stepMeta.title}`}>
        <s-stack direction="inline" gap="base">
          {STEPS.map((s, i) => (
            <s-badge key={s.id} tone={i === step ? "info" : i < step ? "success" : undefined}>
              {i + 1}. {s.title}
            </s-badge>
          ))}
        </s-stack>
      </s-section>

      {step === 0 && (
        <s-section heading="Audit de conformité pour boutiques françaises">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              JuriShop analyse votre boutique Shopify en lecture seule et vous
              guide pour corriger vos obligations légales (pages légales, RGPD,
              droits des consommateurs, prix).
            </s-paragraph>
            <s-banner tone="info">
              <s-paragraph>
                Aucune modification n&apos;est jamais appliquée automatiquement —
                vous gardez le contrôle total sur votre boutique.
              </s-paragraph>
            </s-banner>
            <s-button variant="primary" onClick={() => setStep(1)}>
              Commencer
            </s-button>
          </s-stack>
        </s-section>
      )}

      {step === 1 && (
        <s-section heading="Parlez-nous de votre activité">
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="save_profile" />
            <s-stack direction="block" gap="base">
              <s-select
                label="Modèle commercial"
                name="businessModel"
                value={profile?.businessModel ?? "B2C"}
              >
                <s-option value="B2C">B2C — Vente aux particuliers</s-option>
                <s-option value="B2B">B2B — Vente aux professionnels</s-option>
                <s-option value="MIXED">Mixte B2B + B2C</s-option>
              </s-select>

              <s-choice-list
                label="Mode d'affichage"
                name="uiMode"
                values={[profile?.uiMode ?? "beginner"]}
              >
                <s-choice value="beginner">Débutant — explications simplifiées</s-choice>
                <s-choice value="expert" disabled={!features.expertMode}>
                  Expert — références légales
                  {!features.expertMode ? " (plan Expert)" : ""}
                </s-choice>
              </s-choice-list>

              {features.sirene && (
                <s-banner tone="info">
                  <s-paragraph>
                    Sur le plan Expert, renseignez votre SIRET dans les{" "}
                    <s-link href="/app/settings">Paramètres</s-link> pour
                    pré-remplir vos mentions légales via SIRENE.
                  </s-paragraph>
                </s-banner>
              )}

              <s-stack direction="inline" gap="base">
                <s-button type="button" variant="secondary" onClick={() => setStep(0)}>
                  Retour
                </s-button>
                <s-button type="submit" variant="primary">
                  Enregistrer et continuer
                </s-button>
              </s-stack>
            </s-stack>
          </fetcher.Form>
        </s-section>
      )}

      {step === 2 && (
        <s-section heading="Comment est calculé le score /100 ?">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Votre score est la moyenne de 4 domaines, chacun noté selon le
              résultat de l&apos;audit :
            </s-paragraph>
            <s-unordered-list>
              <s-list-item>Conforme → 100 points</s-list-item>
              <s-list-item>À améliorer → 60 points</s-list-item>
              <s-list-item>Non conforme → 20 points</s-list-item>
              <s-list-item>Non audité → 0 point</s-list-item>
            </s-unordered-list>

            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                {scoreBreakdown.map((domain) => (
                  <s-stack key={domain.key} direction="inline" gap="base">
                    <s-text type="strong">{domain.label}</s-text>
                    <s-badge>{domain.points} pts</s-badge>
                  </s-stack>
                ))}
              </s-stack>
            </s-box>

            <s-stack direction="inline" gap="base">
              <s-button variant="secondary" onClick={() => setStep(1)}>
                Retour
              </s-button>
              <s-button variant="primary" onClick={() => setStep(3)}>
                Continuer
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      )}

      {step === 3 && (
        <s-section heading="Lancez votre premier audit">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              L&apos;audit parcourt vos pages, politiques, produits et
              paramètres Shopify. Il dure généralement moins d&apos;une minute.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="run_audit" />
                <s-button
                  type="submit"
                  variant="primary"
                  {...(isAuditing ? { loading: true } : {})}
                >
                  Lancer l&apos;audit maintenant
                </s-button>
              </fetcher.Form>
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="complete" />
                <s-button type="submit" variant="tertiary">
                  Passer et aller au tableau de bord
                </s-button>
              </fetcher.Form>
            </s-stack>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
