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

### EAS secrets (required for production builds)
- `EXPO_PUBLIC_SENTRY_DSN` — must be set as an EAS project secret (`eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value <DSN>`). Sentry is auto-disabled when the DSN is empty (`constants/api.ts`, `app/_layout.tsx`), so crash reporting silently no-ops if this secret is missing.

### Android Google Sign-In prerequisites
The Google Sign-In native lib does **not** take an `androidClientId` in JS. On Android it works off the **SHA-1 fingerprint of the build's signing certificate** registered in Google Cloud Console.
- After the first `eas build --platform android`, get the SHA-1: `eas credentials --platform android`.
- Register that SHA-1 in https://console.cloud.google.com → API & Services → Credentials → OAuth client (Web client `995934174575-...`) under "Authorized Android applications" or create a dedicated Android OAuth client for `com.backbone.ritmomobile`.
- If you ever rotate the EAS keystore, you must update the SHA-1 in Google Cloud or Sign-In silently breaks on Android.

### Error boundary
`components/error-boundary.tsx` wraps the root Stack (`app/_layout.tsx`). Render-time errors show a localized fallback and are captured by Sentry via `componentDidCatch`. Do not remove it — without it, an uncaught render error crashes the JS bundle on device.
