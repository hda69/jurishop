import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  ensureAuditCurrent,
  getRecommendations,
  runAudit,
  serializeProfile,
  updateRecommendationStatus,
} from "../models/compliance.server";
import {
  ComplianceSummary,
  RecommendationPanel,
} from "../components/RecommendationPanel";
import { CATEGORY_LABEL } from "../compliance/constants/labels.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || undefined;

  const profile = await ensureAuditCurrent(admin, shop);
  const recommendations = await getRecommendations(shop, { category });

  return {
    shopDomain: shop,
    profile: serializeProfile(profile),
    recommendations,
    category,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "run_audit") {
    try {
      await runAudit(admin, session.shop, { trigger: "MANUAL" });
      return { ok: true, message: "Audit terminé", audit: true };
    } catch (error) {
      return {
        ok: false,
        message: error.message ?? "Impossible de lancer l'audit",
        planLimit: error.code === "PLAN_LIMIT",
      };
    }
  }

  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { ok: false, error: "Identifiant manquant" };
  }

  if (intent === "mark_viewed") {
    await updateRecommendationStatus(id, session.shop, "VIEWED");
    return { ok: true };
  }

  if (intent === "update_status") {
    const status = formData.get("status");
    const allowed = [
      "ACKNOWLEDGED",
      "APPLIED_BY_MERCHANT",
      "DISMISSED",
      "VIEWED",
    ];
    if (!allowed.includes(status)) {
      return { ok: false, error: "Statut invalide" };
    }
    await updateRecommendationStatus(id, session.shop, status);
    return { ok: true, status };
  }

  return { ok: false, error: "Action inconnue" };
};

export default function RecommendationsPage() {
  const { shopDomain, profile, recommendations, category } = useLoaderData();
  const revalidator = useRevalidator();
  const auditFetcher = useFetcher();
  const shopify = useAppBridge();
  const [filter, setFilter] = useState("open");
  const isAuditing =
    auditFetcher.state !== "idle" &&
    auditFetcher.formData?.get("intent") === "run_audit";

  const filterCounts = {
    open: recommendations.filter(
      (r) => !["APPLIED_BY_MERCHANT", "DISMISSED"].includes(r.status),
    ).length,
    all: recommendations.length,
    resolved: recommendations.filter((r) =>
      ["APPLIED_BY_MERCHANT", "DISMISSED"].includes(r.status),
    ).length,
  };

  useEffect(() => {
    if (auditFetcher.state === "idle" && auditFetcher.data?.message) {
      if (auditFetcher.data.audit) revalidator.revalidate();
      shopify.toast.show(auditFetcher.data.message, {
        isError: auditFetcher.data.ok === false,
      });
    }
  }, [auditFetcher.state, auditFetcher.data, revalidator, shopify]);

  return (    <s-page heading="Recommandations de conformité">
      <s-button
        slot="primary-action"
        onClick={() =>
          auditFetcher.submit({ intent: "run_audit" }, { method: "post" })
        }
        {...(isAuditing ? { loading: true } : {})}
      >
        Relancer l&apos;audit
      </s-button>

      <s-banner tone="info" heading="Mode Audit & Advisor">
        <s-paragraph>
          JuriShop analyse votre boutique et vous propose des corrections.{" "}
          <s-text type="strong">
            Aucune modification n&apos;est appliquée automatiquement
          </s-text>{" "}
          — vous validez et publiez chaque changement vous-même dans
          l&apos;admin Shopify.
        </s-paragraph>
      </s-banner>

      <ComplianceSummary profile={profile} />

      {category && (
        <s-banner tone="info">
          <s-paragraph>
            Filtre actif : {CATEGORY_LABEL[category] ?? category}.{" "}
            <s-link href="/app/recommendations">Voir tout</s-link>
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="Manquements détectés">
        <s-stack direction="inline" gap="base">
          <s-button
            variant={filter === "open" ? "primary" : "secondary"}
            onClick={() => setFilter("open")}
          >
            À traiter ({filterCounts.open})
          </s-button>
          <s-button
            variant={filter === "all" ? "primary" : "secondary"}
            onClick={() => setFilter("all")}
          >
            Toutes ({filterCounts.all})
          </s-button>
          <s-button
            variant={filter === "resolved" ? "primary" : "secondary"}
            onClick={() => setFilter("resolved")}
          >
            Traitées ({filterCounts.resolved})
          </s-button>
          <s-button
            variant="tertiary"
            onClick={() => {
              revalidator.revalidate();
              shopify.toast.show("Liste actualisée");
            }}
          >
            Actualiser
          </s-button>
        </s-stack>

        <RecommendationPanel
          recommendations={recommendations}
          shopDomain={shopDomain}
          filter={filter}
          expertMode={profile?.uiMode === "expert"}
        />
      </s-section>

      <s-section slot="aside" heading="Comment ça marche ?">
        <s-unordered-list>
          <s-list-item>
            Consultez chaque manquement et les étapes recommandées.
          </s-list-item>
          <s-list-item>
            Copiez un modèle de texte si proposé, adaptez-le à votre activité.
          </s-list-item>
          <s-list-item>
            Ouvrez l&apos;admin Shopify via les liens fournis et publiez
            vous-même.
          </s-list-item>
          <s-list-item>
            Confirmez « J&apos;ai appliqué cette correction » une fois
            terminé.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Juridiction">
        <s-paragraph>
          Audit ciblé :{" "}
          <s-text type="strong">
            {profile?.primaryJurisdiction ?? "FR"}
          </s-text>
        </s-paragraph>
        <s-paragraph color="subdued">
          Marchés actifs :{" "}
          {(profile?.activeMarkets ?? ["FR"]).join(", ")}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
