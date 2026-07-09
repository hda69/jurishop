import { useLoaderData } from "react-router";
import { getSupportEmail } from "../utils/support.server.js";

export const loader = async () => ({
  supportEmail: getSupportEmail(),
});

export default function PrivacyPage() {
  const { supportEmail } = useLoaderData();

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <title>Politique de confidentialité — JuriShop</title>
        <style>{`
          body { font-family: Inter, system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #202223; line-height: 1.6; }
          h1 { font-size: 1.5rem; }
          h2 { font-size: 1.1rem; margin-top: 1.5rem; }
        `}</style>
      </head>
      <body>
        <h1>Politique de confidentialité — JuriShop</h1>
        <p>
          JuriShop est une application Shopify d&apos;audit de conformité légale
          en mode lecture seule. Nous n&apos;accédons pas aux données de vos
          clients finaux (acheteurs). Nous n&apos;utilisons pas de service
          d&apos;intelligence artificielle générative.
        </p>
        <h2>Données collectées</h2>
        <ul>
          <li>Identifiants de la boutique Shopify et jetons d&apos;accès OAuth</li>
          <li>Résultats d&apos;audits de conformité et paramètres de l&apos;app</li>
          <li>Données SIRENE saisies volontairement (plan Expert)</li>
          <li>Abonnement et statut de facturation Shopify</li>
        </ul>
        <h2>Finalités</h2>
        <p>
          Fournir le service d&apos;audit, les recommandations, les rapports et
          la facturation. Aucune revente de données.
        </p>
        <h2>Sous-traitants</h2>
        <ul>
          <li>Shopify — hébergement de l&apos;app embarquée et facturation</li>
          <li>Railway — hébergement de l&apos;application et base de données</li>
          <li>API SIRENE (data.gouv.fr) — recherche SIRET sur demande (plan Expert)</li>
          <li>Resend — envoi d&apos;alertes email optionnelles</li>
        </ul>
        <h2>Conservation et suppression</h2>
        <p>
          Les données sont supprimées lors de la désinstallation de l&apos;app ou
          sur demande via les webhooks Shopify obligatoires (shop/redact).
        </p>
        <h2>Contact</h2>
        {supportEmail ? (
          <p>
            Pour toute question :{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        ) : (
          <p>
            Pour toute question : contactez le support via la fiche App Store
            JuriShop.
          </p>
        )}
        <p>
          <em>Dernière mise à jour : juillet 2026</em>
        </p>
      </body>
    </html>
  );
}
