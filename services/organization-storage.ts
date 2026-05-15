import * as SecureStore from 'expo-secure-store';

const CURRENT_ORG_ID_KEY = 'current_organization_id';

export async function getCurrentOrgId(): Promise<string | null> {
  return SecureStore.getItemAsync(CURRENT_ORG_ID_KEY);
}

export async function saveCurrentOrgId(id: string): Promise<void> {
  await SecureStore.setItemAsync(CURRENT_ORG_ID_KEY, id);
}

export async function clearCurrentOrgId(): Promise<void> {
  await SecureStore.deleteItemAsync(CURRENT_ORG_ID_KEY);
}
