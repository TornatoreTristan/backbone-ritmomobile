# Politique de confidentialité — Application mobile Ritmo

_Dernière mise à jour : 15 mai 2026_

Le présent addendum complète la politique de confidentialité générale de Ritmo (disponible sur https://backbone.ritmodiag.com) et précise les traitements de données effectués par l'**application mobile Ritmo** (iOS et Android, ci-après « l'Application »). En cas de divergence, le présent document prévaut pour les usages mobiles.

## 1. Responsable du traitement

Ritmo — éditeur de la plateforme SaaS Ritmo accessible sur `https://backbone.ritmodiag.com`.

Contact : `contact@ritmodiag.com`

## 2. Données collectées par l'Application

### 2.1 Données de compte (Google Sign-In / Apple Sign-In / email-mot de passe)

Lors de la connexion, l'Application reçoit de Google ou d'Apple les informations suivantes :

- Identifiant unique de compte (`id`)
- Adresse email
- Nom complet (`fullName`)
- URL de la photo de profil (`avatarUrl`), le cas échéant

Ces données sont transmises au backend Ritmo (`https://backbone.ritmodiag.com`) qui émet un jeton d'authentification. Le jeton et le profil utilisateur sont stockés **localement sur l'appareil** via le coffre-fort système sécurisé (Android Keystore / iOS Keychain), via la librairie `expo-secure-store`. Aucune donnée d'identification n'est partagée avec un tiers autre que Google / Apple (au moment de l'authentification) et le backend Ritmo.

**Finalité** : authentification du compte utilisateur, gestion de la session.
**Base légale** : exécution du contrat de service.
**Durée de conservation** : tant que le compte est actif et que l'utilisateur ne se déconnecte pas. La déconnexion supprime immédiatement le jeton et le profil du stockage local.

### 2.2 Rapports de plantage et performances anonymisés (Sentry)

L'Application utilise Sentry (`@sentry/react-native`) pour collecter automatiquement des rapports de plantage et un échantillon de traces de performance. Les données envoyées incluent :

- La trace d'erreur (stack trace) et le code source associé à l'erreur
- La version de l'application, la version du système d'exploitation, le modèle d'appareil
- Un échantillon des traces de performance (~ 20 % des sessions, paramètre `tracesSampleRate: 0.2`)
- L'identifiant utilisateur, l'email et le nom (rattachement utilisateur Sentry, après connexion uniquement)

Les rapports ne contiennent pas le contenu fonctionnel (dossiers, factures, etc.). Aucune donnée n'est envoyée tant que l'utilisateur n'a pas déclenché d'erreur. En mode développement, Sentry est désactivé.

**Finalité** : diagnostic technique, amélioration de la stabilité.
**Base légale** : intérêt légitime de l'éditeur à maintenir un service stable.
**Durée de conservation** : 90 jours par défaut côté Sentry.
**Sous-traitant** : Functional Software Inc. (Sentry), hébergement US, traitement des données conforme aux Clauses Contractuelles Types de la Commission Européenne.

### 2.3 Photos et documents (à la demande de l'utilisateur)

L'Application demande l'accès à la caméra, à la galerie photo et aux documents **uniquement lorsque l'utilisateur initie une action explicite** (ex. joindre une pièce à un dossier). Les fichiers sélectionnés sont transmis au backend Ritmo, jamais à un tiers, et uniquement à la demande de l'utilisateur.

- **Accès caméra** : pour prendre une photo en vue de la joindre à un dossier.
- **Accès galerie** : pour joindre une photo existante à un dossier.
- **Accès aux documents** : pour joindre un fichier (PDF, etc.) à un dossier.

Aucune analyse automatique des images n'est effectuée. Aucune photo ou document n'est lu ou téléchargé sans une action explicite de l'utilisateur.

**Finalité** : permettre à l'utilisateur d'ajouter des pièces justificatives aux dossiers.
**Base légale** : exécution du contrat de service, à la demande de l'utilisateur.
**Durée de conservation** : pour la durée de vie du dossier côté backend.

### 2.4 Données fonctionnelles (dossiers, factures, organisations)

L'Application est une interface vers la plateforme Ritmo : toutes les actions métier (création de dossiers, consultation de factures, navigation dans les organisations, etc.) sont des appels à l'API Ritmo (`https://backbone.ritmodiag.com`). Ces traitements sont régis par la politique de confidentialité générale de Ritmo.

## 3. Données NON collectées

L'Application ne collecte **pas** :

- Données de géolocalisation
- Contacts
- Calendrier
- Identifiant publicitaire (Advertising ID)
- Données de navigation web ou cookies tiers
- SMS, appels, micro
- Aucun pixel ou SDK de publicité (Facebook, Google Ads, etc.)

## 4. Partage des données

Vos données sont partagées uniquement avec :

| Destinataire | Catégorie de données | Finalité |
|---|---|---|
| Backend Ritmo (`backbone.ritmodiag.com`) | Compte, fonctionnel | Service principal |
| Google LLC | Email, profil OAuth | Authentification (à votre demande) |
| Apple Inc. | Email, profil OAuth | Authentification (à votre demande) |
| Sentry / Functional Software Inc. | Erreurs techniques, métadonnées appareil | Diagnostic |

**Aucune donnée n'est vendue à des tiers.**

## 5. Vos droits

Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :

- Droit d'accès, de rectification, d'effacement
- Droit à la portabilité
- Droit d'opposition et de limitation du traitement
- Droit de retirer votre consentement à tout moment

Pour exercer ces droits, contactez : `contact@ritmodiag.com`.

Vous avez également le droit d'introduire une réclamation auprès de la CNIL (https://www.cnil.fr).

## 6. Sécurité

- Communications avec le backend chiffrées en TLS 1.2+
- Jetons d'authentification stockés dans le coffre-fort système (Android Keystore / iOS Keychain)
- Pas de stockage de mots de passe sur l'appareil
- Authentification multi-facteurs disponible via les fournisseurs OAuth (Google, Apple)

## 7. Modifications

Toute modification substantielle de la présente politique sera notifiée dans l'Application et signalée par une mise à jour du champ « Dernière mise à jour » ci-dessus.

## 8. Suppression du compte

La suppression de votre compte peut être demandée :

- Depuis l'Application : `Paramètres → Supprimer mon compte` (si disponible)
- Par email : `contact@ritmodiag.com`

La suppression entraîne l'effacement des données de compte et des données fonctionnelles associées, sous réserve des obligations légales de conservation.
