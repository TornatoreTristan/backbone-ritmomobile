/**
 * App is light-only (mirrors the SaaS partner portal, which forces light).
 * Always return 'light' so every themed component resolves the light palette.
 */
export function useColorScheme(): 'light' {
  return 'light';
}
