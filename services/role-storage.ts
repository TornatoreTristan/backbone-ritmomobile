import * as SecureStore from 'expo-secure-store';

const ROLE_OVERRIDE_KEY = 'dev_role_override';

export type RoleOverride = 'technician' | 'partner' | 'staff' | null;

export async function getRoleOverride(): Promise<RoleOverride> {
  if (!__DEV__) return null;
  const raw = await SecureStore.getItemAsync(ROLE_OVERRIDE_KEY);
  if (raw === 'technician' || raw === 'partner' || raw === 'staff') return raw;
  return null;
}

export async function setRoleOverride(role: RoleOverride): Promise<void> {
  if (!__DEV__) return;
  if (role === null) {
    await SecureStore.deleteItemAsync(ROLE_OVERRIDE_KEY);
  } else {
    await SecureStore.setItemAsync(ROLE_OVERRIDE_KEY, role);
  }
}
