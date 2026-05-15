export const API_URL = __DEV__
  ? 'http://localhost:3333'
  : 'https://backbone.ritmodiag.com';

export const GOOGLE_WEB_CLIENT_ID =
  '995934174575-cakivoc06d8gq99eutsqjpkdd08ojn95.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  '995934174575-6fdnlsoobvm9ctbcov0p8mltrigk3gjq.apps.googleusercontent.com';

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
