# JuriShop

Application Shopify embarquée d'audit de conformité juridique pour boutiques françaises et européennes. JuriShop analyse votre boutique en **lecture seule** et propose des recommandations actionnables — aucune modification n'est jamais appliquée automatiquement.

## Fonctionnalités

- Audit de conformité (pages légales, RGPD, droits des consommateurs, prix & promotions)
- Recommandations avec modèles de texte et liens vers l'admin Shopify
- Rapports HTML téléchargeables (plans Pro et Expert)
- Abonnements intégrés via la facturation Shopify (Gratuit / Pro / Expert)
- Pré-remplissage SIRENE via SIRET (plan Expert)
- Webhooks GDPR (customers/data_request, customers/redact, shop/redact)

## Stack

- [React Router v7](https://reactrouter.com/) + [Shopify App React Router](https://shopify.dev/docs/api/shopify-app-react-router)
- Polaris Web Components (`s-page`, `s-button`, …)
- Prisma + PostgreSQL
- Déploiement : [Railway](https://railway.app)

## Développement local

### Prérequis

- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- Node.js 20+
- PostgreSQL (local ou distant)

### Installation

```shell
npm install
cp .env.example .env   # si présent — sinon configurer les variables ci-dessous
npx prisma migrate deploy
shopify app dev
```

### Variables d'environnement

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | Clé API de l'app Partner |
| `SHOPIFY_API_SECRET` | Secret API |
| `SHOPIFY_APP_URL` | URL publique de l'app (tunnel en dev) |
| `DATABASE_URL` | Connexion PostgreSQL |
| `SHOPIFY_BILLING_TEST` | `true` pour facturation test sur dev stores |
| `RESEND_API_KEY` | *(optionnel)* Alertes email |
| `ALERT_EMAIL_FROM` | *(optionnel)* Expéditeur des alertes |
| `RAILWAY_PUBLIC_DOMAIN` | *(prod Railway)* Fallback pour `SHOPIFY_APP_URL` |

## Déploiement

1. Pousser sur Railway avec les variables ci-dessus
2. `npx prisma migrate deploy` au démarrage
3. `shopify app deploy` pour synchroniser `shopify.app.toml` (webhooks, scopes)

## Structure

```
app/
  billing/          # Plans, abonnements Shopify Billing API
  compliance/       # Moteur d'audit, règles, rapports
  components/       # UI partagée (RecommendationPanel, …)
  models/           # Prisma / logique métier boutique
  routes/           # Pages embarquées (/app, /app/settings, …)
prisma/             # Schéma et migrations
```

## Licence

Propriétaire — usage interne / commercial selon accord.
