# JuriShop — Fiche App Store & checklist de soumission

Document de travail pour la soumission sur le [Shopify App Store](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review).

**URLs à renseigner dans le Partner Dashboard**

| Champ | Valeur |
|-------|--------|
| App URL | `https://jurishop-production.up.railway.app` |
| Politique de confidentialité | `https://jurishop-production.up.railway.app/privacy` |
| Support (email ou URL) | _à compléter — ex. support@votredomaine.fr_ |

---

## Catégorie App Store (validée)

| Champ | Valeur |
|-------|--------|
| **Primary category** | **Store management** |
| **Subcategory** | **Security** |
| **Primary tag** | **Legal** |
| **Tag secondaire** | _aucun_ (recommandé pour la 1ʳᵉ soumission) |

Chemin App Store : [Store management → Security → Legal](https://apps.shopify.com/categories/store-management-security-legal)

**Justification pour la review Shopify**  
JuriShop audite la conformité légale des boutiques (pages légales, RGPD, droits consommateur, prix Omnibus) en lecture seule. Elle ne modifie pas la boutique : score, recommandations et modèles de textes. La fonction principale est la conformité juridique.

**Catégories à éviter**  
Store design, Marketing, Cookie consent (JuriShop vérifie les cookies mais ne fournit pas de CMP), SEO, Taxes.

---

## App category details (tags structurés)

Champs du formulaire **Store management › Security › Legal**. Ne cochez que ce que JuriShop **fait réellement** (audit + recommandations, pas d’installation de widgets).

### Customization — Personnalisation

| Action | |
|--------|---|
| **Cocher** | **Not applicable for this app** / **Non applicable pour cette app** |

JuriShop n’ajoute pas de case à cocher checkout, pop-ups, couleurs ni polices sur la boutique. C’est un outil d’audit en lecture seule.

**Tiroir déroulant Customization** (si affiché malgré « Non applicable ») : **ne sélectionnez aucune option**.

| Option du menu | Cocher ? |
|----------------|----------|
| Boutons | ❌ |
| CSS personnalisées | ❌ |
| Cases à cocher | ❌ |
| Ciblage de produit | ❌ |
| Code personnalisé | ❌ |
| Couleur et police | ❌ |
| Enregistrer mes informations | ❌ |
| Géolocalisation | ❌ |
| Multilingue | ❌ |
| Pop-ups | ❌ |
| Position du widget | ❌ |
| Restriction de page | ❌ |
| Texte personnalisé | ❌ |

Le badge HTML (score conformité) est copié manuellement par le marchand — ce n’est pas un widget ni une personnalisation checkout gérée par l’app.

### Compliance — Conformité

**Minimum 1 tag obligatoire.** Liste exacte du formulaire Partner Dashboard :

| Tag | Cocher ? | Justification |
|-----|----------|---------------|
| **CGU** | ✅ **Oui** | Audit CGV/conditions générales + modèles de textes |
| **Confidentialité des données** | ✅ **Oui** | RGPD, politique de confidentialité, cookies |
| **Rapport de conformité** | ✅ **Oui** | Score /100, rapports HTML, historique, partage conseiller |
| **Avertissement produit** | ✅ **Oui** | Prix barrés, directive Omnibus, cohérence promo/produit |
| **Gestion de politiques** | ⚠️ **Optionnel** | Vérifie les politiques Shopify + modèles — pas de publication auto. Cocher si vous voulez apparaître sur cette recherche ; sinon laisser décoché pour rester strict |
| **Accessibilité** | ❌ Non | Pas d’audit WCAG / ADA |
| **Conformité fiscale** | ❌ Non | Pas de contrôle TVA/fiscalité |
| **Conformité TSE** | ❌ Non | Hors périmètre JuriShop |
| **Exonérations fiscales** | ❌ Non | Hors périmètre JuriShop |
| **Vérif. de l’âge** | ❌ Non | Pas de gate 18+ ni contrôle d’âge |

**Recommandation (sélection sûre pour la review)** — 4 tags :

1. CGU  
2. Confidentialité des données  
3. Rapport de conformité  
4. Avertissement produit  

**+ optionnel** : Gestion de politiques (si vous assumez le libellé « gestion » = audit + modèles, pas édition automatique).

---

## Langues

Deux champs distincts dans le Partner Dashboard — ne pas les confondre.

### Langue de l’interface app (« Languages » / langues supportées)

| Champ | Valeur |
|-------|--------|
| **Langues de l’interface** | **Français uniquement** |

L’admin JuriShop est entièrement en français (dashboard, recommandations, paramètres, onboarding, rapports). Aucune traduction de l’UI n’existe aujourd’hui.

**Ne pas cocher** : Anglais, Allemand, Néerlandais, etc.

> Règle Shopify : ne lister que les langues dans lesquelles le marchand peut **utiliser l’app**, pas les langues de la boutique auditée.

### Langue de la fiche App Store (listing)

| Champ | Valeur |
|-------|--------|
| **Langue principale de la fiche** | **Français** |

**Anglais (optionnel)** : vous pouvez ajouter une **traduction de la fiche** (titre, description) pour la découverte internationale, sans déclarer l’anglais comme langue d’interface tant que l’app n’est pas traduite.

---

## Nom & positionnement

| Champ | Proposition |
|-------|-------------|
| **Nom affiché** | JuriShop |
| **Sous-titre** (80 car. max) | Audit conformité légale France & UE — lecture seule |
| **Catégorie** | Store management → Security → **Legal** |

**Phrase d’accroche (tagline)**  
Vérifiez la conformité légale de votre boutique Shopify sans jamais modifier vos pages.

### Textes formulaire App Store (limites Shopify)

#### Version sobre (factuelle)

**Introduction** — 93 caractères

```
Audit conformité légale pour boutiques FR/UE. Score, recommandations, modèles. Lecture seule.
```

**Détails de l’app** — 464 caractères

```
JuriShop audite votre boutique Shopify en lecture seule et signale les écarts de conformité : mentions légales, CGV, RGPD, cookies, droits consommateur et prix Omnibus (France & UE).

Score /100, recommandations avec liens vers l'admin et modèles à personnaliser. Pro : audits illimités, rapports HTML. Expert : SIRENE et marchés BE/CH/LU. Essai 14 jours sur les plans payants.

Jamais de modification auto. Historique et suivi de score. Audit, pas avis juridique.
```

#### Version marketing (recommandée)

**Introduction** — 87 caractères

```
Conformité légale sans stress : score, plan d'action et modèles prêts. Zéro modif auto.
```

**Détails de l’app** — 457 caractères

```
Vendez sereinement en France et en Europe. JuriShop scanne votre boutique en lecture seule et révèle quoi corriger : mentions légales, CGV, RGPD, cookies, droits consommateur et prix Omnibus.

Score /100, to-do priorisée, liens admin Shopify et modèles prêts à adapter. Pro : audits illimités, rapports HTML, alertes. Expert : SIRENE + BE/CH/LU. Essai 14 jours.

Vous publiez, vous décidez — JuriShop n'écrit jamais à votre place. Audit, pas avis juridique.
```

---

## Description courte (≈ 120 caractères)

Score de conformité, recommandations actionnables et rapports pour boutiques françaises et européennes. Mode lecture seule.

---

## Description longue (français)

### Le problème

Vendre en France ou en Europe implique des obligations légales : mentions légales, CGV, RGPD, droits des consommateurs, transparence des prix… Une page manquante ou un texte incomplet peut exposer votre boutique.

### La solution JuriShop

JuriShop analyse votre boutique Shopify **en lecture seule** et vous indique précisément ce qui manque ou doit être amélioré. **Aucune modification n’est jamais appliquée automatiquement** — vous gardez le contrôle total sur votre contenu.

### Ce que JuriShop vérifie

- **Pages légales** — mentions légales, CGV, politique de confidentialité
- **RGPD** — politiques, cookies, apps tierces
- **Droits des consommateurs** — rétractation, médiation, informations précontractuelles
- **Prix & promotions** — cohérence des prix barrés (directive Omnibus)

### Fonctionnalités clés

- **Score de conformité /100** avec détail par domaine
- **Recommandations** avec étapes concrètes et liens vers l’admin Shopify
- **Modèles de textes** (mentions légales, CGV, confidentialité) à copier et adapter
- **Pré-remplissage SIRENE** (plan Expert) — import SIRET depuis le registre officiel
- **Rapports HTML** téléchargeables et partage conseiller (plans payants)
- **Audits planifiés** et alertes en cas de régression (plan Pro)
- **Multi-marchés** France, UE, Belgique, Suisse, Luxembourg (plan Expert)

### Pour qui ?

- Boutiques B2C et mixtes ciblant la France et l’Europe
- Marchands qui veulent un **diagnostic clair** avant de faire relire par un professionnel
- Structures identifiées (SARL, SAS…) qui ont besoin de mentions légales à jour

### Ce que JuriShop n’est pas

JuriShop est un outil d’**audit et de recommandation**. Il ne remplace pas un avocat ni un expert-comptable. Les modèles fournis sont indicatifs et doivent être adaptés à votre activité.

### Plans

| Plan | Prix | Essentiel |
|------|------|-----------|
| **Gratuit** | 0 € | 1 audit/mois, pack France, score global |
| **Pro** | 24 €/mois | Audits illimités, UE, rapports, webhooks — **14 jours d’essai** |
| **Expert** | 59 €/mois | SIRENE, multi-marchés BE/CH/LU, mode expert — **14 jours d’essai** |

La facturation passe par votre facture Shopify.

---

## Description longue (anglais — optionnel)

**JuriShop — Legal compliance audit for French & EU Shopify stores (read-only)**

JuriShop scans your Shopify store without modifying anything. Get a compliance score, actionable recommendations, and legal page templates for France and the EU.

- Legal pages, GDPR, consumer rights, pricing (Omnibus)
- Copy-paste text templates and direct links to Shopify admin
- SIRENE pre-fill for French companies (Expert plan)
- HTML reports and advisor sharing (paid plans)

JuriShop is an audit tool, not legal advice. 14-day free trial on Pro and Expert plans.

---

## Mots-clés / SEO (suggestions)

conformité légale, mentions légales, CGV, RGPD, France, Europe, audit, consommateur, Omnibus, SIRET, SIRENE, cookies, boutique française

---

## Captures d’écran (6 recommandées)

Préparez des captures **1280×800** ou selon les specs actuelles du Partner Dashboard, en **français**, sur une boutique de démo propre.

| # | Écran | Légende suggérée |
|---|--------|------------------|
| 1 | Tableau de bord — score /100 + domaines | « Votre score de conformité en un coup d’œil » |
| 2 | Recommandations — détail avec preuves | « Des actions concrètes, jamais de modification automatique » |
| 3 | Paramètres — SIRET / SIRENE | « Pré-remplissez vos mentions légales avec votre SIRET » |
| 4 | Historique — graphique d’évolution | « Suivez vos progrès dans le temps » |
| 5 | Abonnement — comparatif des plans | « Gratuit, Pro ou Expert — facturation Shopify » |
| 6 | Onboarding ou rapport HTML | « Guidé dès la première installation » |

**Conseils**

- Masquez les données sensibles (email perso, vraie adresse).
- Utilisez une boutique de dev avec nom générique (« Boutique Démo FR »).
- Affichez un score réaliste (pas 100/100 vide) pour crédibilité.

---

## Icône app

- Format : PNG 1200×1200, coins carrés (Shopify arrondit).
- Style : sobre, professionnel, évoquant conformité / bouclier / balance — éviter symboles officiels (drapeau UE seul, balance de la justice institutionnelle).

---

## Instructions pour l’équipe de review Shopify

Copier-coller dans le champ « Instructions de test » du formulaire de soumission :

```
JuriShop est une app embarquée d'audit de conformité légale (lecture seule).

Parcours de test :
1. Installer l'app sur une boutique de développement.
2. Compléter l'onboarding (modèle commercial → premier audit).
3. Consulter le tableau de bord : score /100 et domaines.
4. Ouvrir Recommandations : lire une recommandation, copier un modèle si proposé.
5. (Optionnel) Paramètres → saisir un SIRET valide sur plan Expert pour tester SIRENE.
6. Historique → télécharger un rapport HTML (plan Pro requis — activer l'essai 14 jours).
7. Abonnement → vérifier les 3 plans ; la facturation est en mode test sur les dev stores.

Scopes : lecture seule (produits, pages, politiques, thèmes, marchés). Aucune écriture sur la boutique.

Webhooks GDPR : customers/data_request, customers/redact, shop/redact — configurés via compliance_topics.

Politique de confidentialité : https://jurishop-production.up.railway.app/privacy

Contact support : [VOTRE EMAIL]
```

---

## Checklist avant soumission

### Partner Dashboard — Configuration

- [ ] Distribution **publique** (App Store) activée
- [ ] App URL = `https://jurishop-production.up.railway.app`
- [ ] Redirect URLs alignées avec `shopify.app.toml`
- [ ] `shopify app deploy` récent (webhooks GDPR OK — version **jurishop-6**+)
- [ ] Plans de facturation créés : **JuriShop Pro** (24 €), **JuriShop Expert** (59 €), essai 14 jours
- [ ] En production réelle : `SHOPIFY_BILLING_TEST=false` sur Railway

### Contenu fiche

- [x] Catégorie : **Store management → Security → Legal**
- [ ] App category details : Compliance (4 tags) + Customization **Non applicable**
- [x] Langues interface app : **Français** uniquement
- [ ] Langue fiche listing : **Français** (+ EN optionnel pour la description seule)
- [ ] Nom, sous-titre, descriptions FR (et EN si souhaité)
- [ ] 4 à 6 captures d’écran
- [ ] Icône 1200×1200
- [ ] URL politique de confidentialité
- [ ] Email ou URL de support **valide et surveillé**
- [ ] Instructions de test remplies

### Technique (vérifié côté code)

- [x] Webhooks GDPR (`compliance_topics`)
- [x] Purge données à la désinstallation / `shop/redact`
- [x] Page `/privacy`
- [x] Billing API intégré (3 plans)
- [x] App embarquée (`embedded = true`)
- [x] Scopes lecture seule uniquement

### Tests manuels (vous)

- [ ] Install → onboarding → audit → dashboard OK
- [ ] Upgrade Pro → confirmation billing → retour app OK (pas d’écran « 200 »)
- [ ] Téléchargement rapport HTML (plan Pro)
- [ ] Désinstallation → réinstallation propre
- [ ] Aucune erreur 500 dans les logs Railway pendant le parcours

### Juridique & communication

- [ ] Disclaimer « pas un avocat » visible dans l’app (recommandations + rapports)
- [ ] Politique de confidentialité : **remplacer le contact générique** par votre email réel
- [ ] Ne pas promettre « conformité garantie » ou « certification officielle »

### Après soumission

- [ ] Répondre sous 48 h aux questions de l’équipe review
- [ ] Prévoir 5–10 jours ouvrés pour la première review
- [ ] En cas de refus : corriger point par point et resoumettre

---

## Textes courts pour la fiche (champs limités)

**Intro (1 phrase)**  
JuriShop audite la conformité légale de votre boutique française ou européenne — en lecture seule.

**Bénéfice 1**  
Score /100 et recommandations par domaine (pages légales, RGPD, consommateur, prix).

**Bénéfice 2**  
Modèles de textes et liens directs vers l’admin Shopify — vous publiez vous-même.

**Bénéfice 3**  
Pré-remplissage SIRENE et multi-marchés pour les boutiques exigeantes (plan Expert).

---

## Points de vigilance review Shopify

1. **Pas de modification automatique** — bien visible dans l’UI (c’est un atout).
2. **Billing** — les fonctionnalités payantes doivent être bloquées sur le plan Gratuit (déjà le cas).
3. **GDPR webhooks** — doivent répondre 200 (routes existantes).
4. **Support** — un email qui rebondit = refus fréquent.
5. **Captures** — doivent correspondre à l’app réelle (pas de mockups trompeurs).

---

## Prochaines actions recommandées

1. Renseigner **email de support** dans `/privacy` et Partner Dashboard.
2. Prendre les **6 captures** sur votre boutique de dev.
3. Créer l’**icône** 1200×1200.
4. Remplir la fiche avec les textes ci-dessus.
5. Lancer un **parcours test complet** avec la checklist.
6. Soumettre via Partner Dashboard → Distribution → Submit for review.
