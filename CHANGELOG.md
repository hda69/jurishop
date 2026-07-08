# JuriShop — Changelog

## 2026-07-08

### Conformité & règles
- Packs de règles dédiés **Belgique**, **Suisse** et **Luxembourg**
- Checkers cookies/checkout plus explicites : détection apps + thème, checklists de vérification manuelle, moins de faux « Conforme »
- Webhooks GDPR corrigés dans `shopify.app.toml` (`compliance_topics`)

### Produit & UX
- Wizard d'onboarding complet (`/app/onboarding`)
- Tableau comparatif des plans, explication du score /100
- Preuves d'audit et compteurs dans les recommandations
- Graphique d'évolution du score (historique) en SVG
- Marchés BE / CH / LU pour le plan Expert

### Technique
- Redirections embarquées Shopify (fix écran « 200 »)
- README et documentation projet

## 2026-07-07

### v1 initiale
- Moteur d'audit lecture seule (FR + UE)
- Billing Gratuit / Pro / Expert via Shopify
- Rapports HTML, partage conseiller, SIRENE (Expert)
- Webhooks produits/thème, audit planifié, alertes in-app
- Templates mentions légales, CGV, politique de confidentialité
- Landing FR, page `/privacy`, purge données GDPR
