import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants';
import type { AuthState, ExtensionSettings, AuthUser } from './types';

// Get auth state from storage
export async function getAuthState(): Promise<AuthState> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.TENANT_ID,
    STORAGE_KEYS.USER,
  ]);

  return {
    token: result[STORAGE_KEYS.AUTH_TOKEN] || null,
    tenantId: result[STORAGE_KEYS.TENANT_ID] || null,
    user: result[STORAGE_KEYS.USER] || null,
    isAuthenticated: !!(result[STORAGE_KEYS.AUTH_TOKEN] && result[STORAGE_KEYS.TENANT_ID]),
  };
}

// Save auth state to storage
export async function setAuthState(
  token: string,
  tenantId: string,
  user: AuthUser
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_TOKEN]: token,
    [STORAGE_KEYS.TENANT_ID]: tenantId,
    [STORAGE_KEYS.USER]: user,
  });
}

// Clear auth state from storage
export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.TENANT_ID,
    STORAGE_KEYS.USER,
  ]);
}

// Get extension settings
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...result[STORAGE_KEYS.SETTINGS],
  };
}

// Save extension settings
export async function setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const currentSettings = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: {
      ...currentSettings,
      ...settings,
    },
  });
}

// Get auth token
export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
  return result[STORAGE_KEYS.AUTH_TOKEN] || null;
}

// Get tenant ID
export async function getTenantId(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TENANT_ID);
  return result[STORAGE_KEYS.TENANT_ID] || null;
}
