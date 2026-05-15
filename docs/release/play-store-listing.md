# Fiche Google Play Store — Ritmo

## Identité

| Champ | Valeur |
|---|---|
| Nom de l'app | Ritmo |
| Package | `com.backbone.ritmomobile` |
| Langue par défaut | Français (France) |
| Catégorie | Business _(ou : Productivity)_ |
| Type | Application |
| Prix | Gratuit |
| Contient des annonces | Non |
| Achats intégrés | Non |
| Public cible | Adultes (18+) — outil professionnel |

## Description courte (≤ 80 caractères)

```
Gérez dossiers, factures et réseaux Ritmo depuis votre mobile.
```

_(60 caractères)_

## Description longue (≤ 4000 caractères)

```
Ritmo Mobile est le compagnon mobile de la plateforme Ritmo, votre outil professionnel de gestion de dossiers, de facturation et de coordination réseau.

══ Fonctionnalités principales ══

• Consultez vos dossiers et leur progression depuis votre téléphone
• Visualisez vos factures et leur statut en temps réel
• Naviguez dans votre réseau d'organisations partenaires
• Créez un nouveau devis en quelques minutes via l'assistant intégré
• Conseillers et partenaires : accédez à votre vue dédiée
• Changez d'organisation en un tap
• Mode sombre supporté

══ Pour qui ? ══

Ritmo Mobile s'adresse aux professionnels utilisant déjà la plateforme Ritmo (https://backbone.ritmodiag.com). L'accès se fait via votre compte Ritmo existant — connexion Google, Apple ou email.

══ Authentification sécurisée ══

• Connexion Google ou Apple en un tap
• Connexion par email et mot de passe
• Sessions stockées dans le coffre-fort système (Android Keystore)
• Communications chiffrées en TLS

══ Confidentialité ══

Ritmo Mobile ne collecte que les données nécessaires au service. Aucune publicité, aucun tracker tiers. Politique de confidentialité complète : https://backbone.ritmodiag.com/mobile-privacy

══ Support ══

Une question, un bug ? Contactez-nous : contact@ritmodiag.com
```

_(à ajuster — environ 1100 caractères, marge confortable)_

## Mots-clés / tags (pour SEO ASO Play Store)

```
dossiers, factures, gestion, professionnel, réseau, devis, B2B, SaaS, organisation, partenaires
```

## Coordonnées (obligatoires)

| Champ | Valeur |
|---|---|
| Email contact | `contact@ritmodiag.com` |
| Site web | `https://backbone.ritmodiag.com` |
| Politique de confidentialité | `https://backbone.ritmodiag.com/mobile-privacy` _(à publier)_ |

## Assets graphiques requis

| Asset | Format | Statut |
|---|---|---|
| Icône haute résolution | 512×512 PNG (32-bit, sans transparence) | À générer depuis `assets/images/icon.png` |
| Feature graphic | 1024×500 PNG/JPG | **À créer** |
| Screenshots téléphone | 16:9 ou 9:16, min 320 px, max 3840 px — **2 à 8 obligatoires** | **À capturer** |
| Screenshots tablette 7" | _(optionnel mais recommandé)_ | À capturer |
| Screenshots tablette 10" | _(optionnel mais recommandé)_ | À capturer |
| Vidéo promotionnelle | YouTube URL | Optionnel |

### Suggestions de screenshots (par ordre)

1. Écran d'accueil avec liste des dossiers
2. Détail d'un dossier
3. Liste des factures
4. Assistant de création de devis (étape 1)
5. Vue Réseaux / Conseillers
6. Switch d'organisation
7. Login (Google / Apple / Email)
8. Mode sombre (variation de l'écran 1)

## Content rating (questionnaire IARC)

Réponses attendues pour un outil B2B :

| Question | Réponse |
|---|---|
| Violence | Non |
| Contenu sexuel | Non |
| Langage vulgaire | Non |
| Drogues / substances | Non |
| Jeu d'argent | Non |
| Achats en jeu | Non |
| Interactions utilisateur | **Oui** (utilisateurs liés via réseaux d'organisations) |
| Partage de localisation | Non |
| Informations personnelles partagées | Oui (email, nom — pour le service) |

**Résultat attendu** : PEGI 3 / Everyone.

## Data Safety form

### Section "Data collection and security"

- **Est-ce que votre app collecte ou partage des données utilisateur ?** → **Oui**
- **Toutes les données collectées sont-elles chiffrées en transit ?** → **Oui** (TLS 1.2+)
- **Offrez-vous un moyen pour les utilisateurs de demander la suppression de leurs données ?** → **Oui** (via support email ou paramètres app)

### Types de données collectées

| Type | Catégorie | Collecté | Partagé | Optionnel ? | Finalité |
|---|---|---|---|---|---|
| Name | Personal info | ✓ | ✓ (backend) | Requis | Account management |
| Email address | Personal info | ✓ | ✓ (backend) | Requis | Account management |
| User IDs | Personal info | ✓ | ✓ (backend, Sentry) | Requis | Account management, Analytics |
| Photos | Photos and videos | ✓ | ✓ (backend) | Optionnel | App functionality |
| Files and docs | Files and docs | ✓ | ✓ (backend) | Optionnel | App functionality |
| Crash logs | App activity | ✓ | ✓ (Sentry) | Optionnel | Analytics, App functionality |
| Diagnostics | App activity | ✓ | ✓ (Sentry) | Optionnel | Analytics |

**NE PAS cocher** : Location, Financial info, Health & fitness, Messages, Audio, Calendar, Contacts, App info & performance _autres que ci-dessus_, Device or other IDs (advertising), Web browsing, etc.

## App access

Si vous avez ajouté la connexion Google qui nécessite Google Play Services, déclarer :

- **Toutes les fonctionnalités sont-elles disponibles sans restriction ?** → **Non, certaines fonctionnalités nécessitent un compte Ritmo actif.**
- Fournir des **identifiants de test** Play Console : un compte Ritmo de démonstration (email + mot de passe). Sinon, l'évaluateur Google ne pourra pas dépasser l'écran de login → **risque de rejet**.

## Distribution

| Pays | Statut |
|---|---|
| France | ✓ |
| Belgique, Luxembourg, Suisse | ✓ _(à confirmer selon clientèle)_ |
| Canada | ✓ _(à confirmer)_ |

Si distribution mondiale non nécessaire, limiter au strict minimum simplifie la conformité (TVA, fiscalité, etc.).
