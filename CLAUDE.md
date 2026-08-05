# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Mobile client for the Ritmo SaaS (mobile companion to the existing AdonisJS backend at `https://backbone.ritmodiag.com`). Built with Expo (SDK 54) + Expo Router + React Native 0.81 + React 19. Targets iOS, Android, and web.

## Commands

```bash
npm install          # install deps
npm start            # expo start (Metro bundler)
npm run ios          # expo start --ios
npm run android      # expo start --android
npm run web          # expo start --web
npm run lint         # expo lint (eslint-config-expo)
```

There is no test runner configured. `npm run reset-project` is the Expo template's nuke-and-restart script — do not run it casually.

Native modules in use (`@react-native-google-signin/google-signin`, `expo-secure-store`) require a custom dev client, **not** Expo Go. Builds go through EAS (`eas.json` defines `development`, `preview`, `production` profiles; project id is in `app.json`).

## Architecture

### Routing — Expo Router (file-based)
- `app/_layout.tsx` is the root: wraps everything in `ThemeProvider` + `AuthProvider` and declares the top-level Stack with three routes: `login`, `(tabs)`, `modal`. `unstable_settings.anchor = '(tabs)'` makes the tab group the default.
- `app/(tabs)/` is the authenticated area (group route, no URL segment).
- `app/login.tsx` is the unauthenticated entry point.
- Typed routes are enabled (`experiments.typedRoutes: true` in `app.json`).

### Auth flow — `contexts/auth-context.tsx`
This is the central piece. Read it before touching auth, navigation guards, or API calls.

1. On mount, configures `GoogleSignin` with `GOOGLE_WEB_CLIENT_ID` (from `constants/api.ts`) and calls `restoreSession()` which reads token + user from `expo-secure-store` via `services/auth-storage.ts`.
2. A `useEffect` watching `[user, segments, isLoading]` performs the redirect: unauthenticated users get pushed to `/login`, authenticated users on `/login` get pushed to `/`. **Do not duplicate this guard inside individual screens.**
3. `signInWithGoogle()` calls Google native sign-in, gets the `accessToken`, and POSTs it to `POST /api/v1/auth/google` on the backend with `{ accessToken, deviceName, deviceType }`. Backend returns `{ token, user, expiresAt, isNewUser }`; token + user are persisted to SecureStore.
4. `signOut()` calls `POST /api/v1/auth/logout` (best-effort, swallows errors), then `GoogleSignin.signOut()`, then clears SecureStore.

### API layer — `services/api.ts`
Single helper: `apiRequest<T>(endpoint, { method, body, authenticated })`. Defaults to `authenticated: true`, which reads the bearer token from SecureStore and attaches `Authorization: Bearer …`. Base URL is `API_URL` in `constants/api.ts`. All new backend calls should go through this helper rather than calling `fetch` directly.

### Storage — `services/auth-storage.ts`
Wraps `expo-secure-store` with two keys: `auth_token` and `auth_user`. The `StoredUser` shape (`id`, `email`, `fullName`, `avatarUrl`) is the contract with the backend's `/api/v1/auth/google` response — keep them in sync.

### Theming
- `constants/theme.ts` defines `Colors.light` / `Colors.dark`.
- `hooks/use-color-scheme.ts` (+ `.web.ts` variant) returns the active scheme.
- `components/themed-text.tsx` and `components/themed-view.tsx` are the base primitives — prefer them over raw `Text`/`View` so dark mode keeps working.

### Path alias
`@/*` maps to the repo root (configured in `tsconfig.json`). Use `@/contexts/...`, `@/services/...`, etc. — not relative paths.

### React Compiler
`experiments.reactCompiler: true` is on. Avoid manual `useMemo`/`useCallback` micro-optimizations that the compiler will handle, but be aware that mutating refs/state outside React's rules will misbehave.

## Conventions worth knowing
- New Architecture (`newArchEnabled: true`) — Fabric/TurboModules are on.
- File names are kebab-case (`auth-context.tsx`, `themed-view.tsx`); React component exports are PascalCase.
- UI strings are French (see `app/login.tsx`).
- The backend already exists; do not assume from-scratch infra. Ask before introducing new auth providers, storage layers, or API conventions.

## Release & build

### Versioning
- iOS uses `expo.version` + `expo.ios.buildNumber` (currently set by EAS auto-increment in production profile).
- Android uses `expo.version` + `expo.android.versionCode`. The `versionCode` is currently pinned in `app.json`; **bump it manually in any PR that ships an Android build to a higher track (internal → closed → production)**. EAS production profile has `autoIncrement: true` as a safety net, but explicit bumps make release diffs reviewable.

### EAS environment variables (required for production builds)
`EXPO_PUBLIC_SENTRY_DSN` gates crash reporting: `Sentry.init({ enabled: SENTRY_DSN !== '' && !__DEV__ })` (`app/_layout.tsx`, `constants/api.ts`). When it is unset, Sentry silently no-ops — **as of 2026-08-05 no variable was configured at all, so Sentry had never actually been active in production.** Verify with `eas env:list production` before trusting any absence of alerts.

```bash
eas env:create --scope project --environment production \
  --name EXPO_PUBLIC_SENTRY_DSN --value <DSN> --visibility plaintext
```

Two traps:
- **Do not use `secret` visibility.** Secret values are never readable back by the CLI, so `eas update` cannot inline them and every OTA-delivered bundle would ship with an empty DSN. A Sentry DSN is public by design (it ships inside the client bundle) — `plaintext` is correct.
- **`eas update` bundles locally**, so it resolves env vars from *your shell*, not from EAS, unless you pass `--environment production`. Always publish with:
  ```bash
  eas update --branch production --environment production --message "..."
  ```
  Omitting it silently produces a bundle with `SENTRY_DSN = ''`, disabling crash reporting for every user who receives the update.

### Android Google Sign-In prerequisites
Two independent conditions must **both** hold, or Android fails with `DEVELOPER_ERROR`. They are unrelated to each other — check both before debugging anything else.

**1. `GOOGLE_WEB_CLIENT_ID` must be a "Web application" OAuth client.**
`GoogleSignin.configure({ webClientId })` rejects any other client type. It must match `GOOGLE_CLIENT_ID` in the backend's `.env` (same client the web app uses for Ally). Putting an *Android* client ID there is silent on iOS (which relies on `iosClientId`) and breaks only Android — an easy trap, and the cause of a real production outage.

**2. An Android OAuth client must exist for each signing certificate.**
The lib takes no `androidClientId` in JS. Google resolves the app by the pair *(package name, SHA-1 of the signing certificate)*, so Android client IDs are never written anywhere in the codebase. One Android OAuth client holds **exactly one SHA-1**, so you need one client per certificate:

| Certificate | How to get its SHA-1 | Covers |
| --- | --- | --- |
| Play App Signing | Play Console → `…/app/<ID>/keymanagement` → *App signing key certificate* | installs from the Play Store |
| EAS upload key | `eas credentials --platform android` | APKs installed by hand (`development`, `preview`) |

Google **re-signs every uploaded AAB** with its own key, so the Play Store build's fingerprint is *not* the EAS one. Registering only the EAS SHA-1 makes Sign-In work on sideloaded builds and fail on the Store — the exact symptom that hid this for a while.

Create clients at https://console.cloud.google.com → *Google Auth Platform* → *Clients* → type **Android**, package `com.backbone.ritmomobile`. (The old "Authorized Android applications" field on the Web client no longer exists.) Propagation takes 5 minutes to a few hours; force-stop the app before retesting, since Play Services caches the result.

If you rotate the EAS keystore, update the corresponding SHA-1 or Sign-In silently breaks.

### OTA updates — never edit `eas.json` before publishing
`runtimeVersion.policy` is `fingerprint`, and **`eas.json` is one of the hashed sources — including its `submit` section**, which has no effect on the native binary. Any edit there shifts the whole project's `runtimeVersion`, so `eas update` publishes an update that **no installed build will ever download**. The failure is completely silent: the CLI prints "Published!" and the EAS dashboard lists the update normally. One update was lost this way for six weeks.

Always verify before publishing:
```bash
eas fingerprint:compare --build-id <id of the installed build>   # must print ✅
eas update --branch production --message "..."
```
On ❌ the command names the offending file. Restore it to the built state, publish, then reapply.

For this reason, `submit.production.android.serviceAccountKeyPath` is deliberately **absent** from `eas.json`. Upload the Play service account key to EAS instead — `eas credentials --platform android` → *Google Service Account* — so `eas submit` picks it up without touching a fingerprinted file.

### Error boundary
`components/error-boundary.tsx` wraps the root Stack (`app/_layout.tsx`). Render-time errors show a localized fallback and are captured by Sentry via `componentDidCatch`. Do not remove it — without it, an uncaught render error crashes the JS bundle on device.
