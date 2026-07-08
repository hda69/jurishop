import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LandingPage() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>JuriShop</h1>
        <p className={styles.text}>
          Auditez la conformité légale de votre boutique Shopify (France & UE) —
          en lecture seule, sans modifier votre boutique.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Domaine de la boutique</span>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="ma-boutique.myshopify.com"
              />
            </label>
            <button className={styles.button} type="submit">
              Se connecter
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Score de conformité</strong> — pages légales, RGPD, droits
            consommateurs et prix.
          </li>
          <li>
            <strong>Recommandations actionnables</strong> — modèles de textes et
            liens vers l&apos;admin Shopify.
          </li>
          <li>
            <strong>Pré-remplissage SIRENE</strong> — mentions légales et CGV
            (plan Expert).
          </li>
        </ul>
        <p className={styles.text}>
          <a href="/privacy">Politique de confidentialité</a>
        </p>
      </div>
    </div>
  );
}
