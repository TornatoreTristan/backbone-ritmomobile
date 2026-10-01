export const API_URL = __DEV__
  ? 'http://localhost:3333'
  : 'https://backbone.ritmodiag.com';

// Doit être un client OAuth de type « Application Web » (le même que GOOGLE_CLIENT_ID
// côté backend). Y mettre un client Android provoque un DEVELOPER_ERROR sur Android.
// Les clients Android ne s'écrivent jamais ici : ils sont résolus par Google à partir
// du couple (package name, SHA-1 du certificat de signature).
export const GOOGLE_WEB_CLIENT_ID =
  '995934174575-tfsjcfq71i6p4bqn77i89k14a9kl3fps.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  '995934174575-6fdnlsoobvm9ctbcov0p8mltrigk3gjq.apps.googleusercontent.com';

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
