# Checklist Play Console — Onboarding Ritmo

À cocher dans l'ordre. Chaque étape référence l'écran exact de la Play Console (https://play.google.com/console).

---

## ☐ Étape 0 — Pré-requis (à faire AVANT inscription)

- ☐ Compte Google dédié à la publication (recommandé : `play@ritmodiag.com` ou alias dédié, **pas** un compte perso)
- ☐ Carte bancaire valide pour le paiement des frais d'inscription ($25)
- ☐ Pièce d'identité ou document KYC (passeport, carte d'identité)
- ☐ Adresse de contact valide (mail support : `contact@ritmodiag.com`)
- ☐ Statut juridique de Ritmo : raison sociale, n° SIRET, adresse — si compte "Organization"

## ☐ Étape 1 — Inscription développeur ($25 one-time)

URL : https://play.google.com/console/signup

- ☐ Choisir **"Organization"** (pas "Personal") si Ritmo a une raison sociale
- ☐ Remplir le formulaire d'identité et passer la vérification KYC (1-3 jours ouvrés)
- ☐ Activer la 2FA sur le compte Google associé
- ☐ Paiement des $25

⚠ Tant que la vérification KYC n'est pas validée, vous ne pouvez pas créer de fiche app.

## ☐ Étape 2 — Créer la fiche app

Play Console → "Create app"

- ☐ Nom : `Ritmo`
- ☐ Langue par défaut : Français (France)
- ☐ App / Game : **App**
- ☐ Gratuit / Payant : **Gratuit**
- ☐ Cochez les déclarations (politiques + lois export US)

## ☐ Étape 3 — Setup compte (Setup → All)

- ☐ **App access** : préciser que login Ritmo requis, fournir credentials de test (compte démo Ritmo)
- ☐ **Ads** : "No, my app does not contain ads"
- ☐ **Content rating** : remplir questionnaire IARC (voir `play-store-listing.md` § Content rating)
- ☐ **Target audience** : 18+ (adultes professionnels)
- ☐ **News app** : Non
- ☐ **Covid-19 contact tracing** : Non
- ☐ **Data safety** : remplir le formulaire (voir `play-store-listing.md` § Data Safety)
- ☐ **Government app** : Non
- ☐ **Financial features** : Non _(à vérifier si gestion de factures = "Financial features" pour Google — généralement non, car pas de transaction de paiement dans l'app)_
- ☐ **Health features** : Non

## ☐ Étape 4 — Publier la privacy policy

- ☐ Publier le contenu de `docs/release/mobile-privacy-policy.md` sur le backend Ritmo
- ☐ URL cible : `https://backbone.ritmodiag.com/mobile-privacy` (ou équivalent)
- ☐ Vérifier que l'URL répond en HTTPS sans redirection cassée
- ☐ Renseigner cette URL dans Play Console → App content → Privacy policy

## ☐ Étape 5 — Main store listing (Grow → Store presence → Main store listing)

- ☐ App name : `Ritmo`
- ☐ Short description (80 car. max) — voir `play-store-listing.md`
- ☐ Full description — voir `play-store-listing.md`
- ☐ App icon 512×512 PNG (générer depuis `assets/images/icon.png`)
- ☐ Feature graphic 1024×500 PNG — **à créer**
- ☐ Screenshots phone (2 à 8) — **à capturer**
- ☐ Screenshots tablet 7" (optionnel, recommandé)
- ☐ Screenshots tablet 10" (optionnel, recommandé)

## ☐ Étape 6 — Service account pour `eas submit` (optionnel mais recommandé)

Pour automatiser les uploads :

- ☐ Play Console → Setup → API access
- ☐ Lier un projet Google Cloud (ou créer un nouveau)
- ☐ Créer un service account avec rôle "Service Account User"
- ☐ Télécharger la clé JSON
- ☐ Dans la Play Console, donner à ce service account les permissions : "Release manager" pour cette app uniquement
- ☐ Sauvegarder le JSON hors du repo, le référencer dans `eas.json` section `submit`

Exemple de config future dans `eas.json` :
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```
(le fichier `google-service-account.json` doit être en `.gitignore`)

## ☐ Étape 7 — Premier build (Phase 3 du plan)

À lancer depuis le projet :
```
eas build --platform android --profile production
```

- ☐ EAS demande de créer un keystore → choisir "Generate new keystore" (managé par EAS)
- ☐ Attendre la fin du build (~10-20 min)
- ☐ Récupérer le SHA-1 : `eas credentials --platform android`
- ☐ Aller dans Google Cloud Console → APIs & Services → Credentials → OAuth client (Web `995934174575-...`) → ajouter le SHA-1 + package `com.backbone.ritmomobile` dans un nouveau client OAuth Android dédié
- ☐ Télécharger l'AAB depuis le dashboard EAS

## ☐ Étape 8 — Upload sur Internal testing

Play Console → Testing → Internal testing

- ☐ Create new release
- ☐ Uploader l'AAB
- ☐ Release name : `1.0.0 (1)` (version + versionCode)
- ☐ Release notes (FR) : `Première version interne — validation`
- ☐ Save → Review release → Start rollout to Internal testing
- ☐ Ajouter testeurs (Testers tab) : créer une liste, ajouter les emails de l'équipe Ritmo
- ☐ Diffuser le lien opt-in aux testeurs

## ☐ Étape 9 — Validation interne (critères de sortie)

À valider sur device Android physique :

- ☐ Login Google fonctionne (KO si SHA-1 pas enregistré dans Google Cloud)
- ☐ Login Email fonctionne
- ☐ Restoration de session au redémarrage de l'app
- ☐ Switch d'organisation
- ☐ Navigation onglets (Accueil, Factures, Réseaux, Conseillers, etc.)
- ☐ Création de devis end-to-end
- ☐ Ajout photo depuis caméra (permission CAMERA demandée avec string FR)
- ☐ Ajout document (permission storage)
- ☐ Logout propre
- ☐ Mode sombre OK
- ☐ Crash report Sentry visible dans le dashboard (test manuel : déclencher une erreur)
- ☐ Pas de logs `localhost` en mode production

## ☐ Étape 10 — Promotion progressive

Quand internal testing OK depuis au moins 1 semaine :

- ☐ Promouvoir le build vers **Closed testing** (groupes nommés)
- ☐ Quand closed testing OK : **Open testing** (public mais opt-in)
- ☐ Quand open testing OK : **Production** avec staged rollout 10% → 50% → 100%

⏱ Review Google : 3-7 jours première soumission, ~1 jour ensuite.

---

## Risques courants de rejet (à vérifier avant chaque soumission)

| Risque | Mitigation |
|---|---|
| Pas d'identifiants de test → reviewer bloqué au login | Fournir compte démo Ritmo dans "App access" |
| Privacy policy 404 ou non-HTTPS | Vérifier URL avant soumission |
| Data Safety incohérent avec ce que l'app fait | Recouper avec `mobile-privacy-policy.md` |
| Icône avec transparence ou < 512px | Générer un PNG plein 512×512 |
| Permissions déclarées dans le manifest sans justification | Toutes nos permissions sont justifiées par expo-image-picker / expo-document-picker (camera + photos) — déjà documenté |
| versionCode pas incrémenté entre deux builds | Bumper `app.json` android.versionCode à chaque release |
