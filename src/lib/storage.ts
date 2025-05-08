import { browser } from 'wxt/browser';

export type StorageMode = 'local' | 'sync';

export interface ExtensionGroup {
  id: string;
  name: string;
  extensions: string[];
  paused: boolean;
}

export interface ExtensionState {
  enabled: boolean;
  name: string;
  shortName: string;
}

export interface StorageState {
  extensions: Record<string, boolean>;
  groups: ExtensionGroup[];
  advancedMode: boolean;
  allPaused: boolean;
  whitelist: string[];
  blacklist: string[];
}

export const defaultState: StorageState = {
  extensions: {},
  groups: [],
  advancedMode: false,
  allPaused: false,
  whitelist: [],
  blacklist: []
};

// Storage mode is always saved in sync storage
const STORAGE_MODE_KEY = 'storage_mode';

export async function getStorageMode(): Promise<StorageMode> {
  const result = await browser.storage.sync.get(STORAGE_MODE_KEY);
  return result[STORAGE_MODE_KEY] ?? 'local';
}

export async function setStorageMode(mode: StorageMode): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_MODE_KEY]: mode });
}

export function getStorageAPI(mode: StorageMode) {
  return mode === 'local' ? browser.storage.local : browser.storage.sync;
}

export async function getStorageState(): Promise<StorageState> {
  const mode = await getStorageMode();
  const storage = getStorageAPI(mode);
  const result = await storage.get('state');
  return result?.state ?? defaultState;
}

export async function updateStorageState(updates: Partial<StorageState>): Promise<void> {
  const mode = await getStorageMode();
  const storage = getStorageAPI(mode);
  const current = await getStorageState();
  await storage.set({ state: { ...current, ...updates } });
}

export async function addGroup(group: Omit<ExtensionGroup, 'id'>): Promise<void> {
  const state = await getStorageState();
  const newGroup: ExtensionGroup = {
    ...group,
    id: crypto.randomUUID()
  };
  await updateStorageState({
    groups: [...state.groups, newGroup]
  });
}

export async function removeGroup(groupId: string): Promise<void> {
  const state = await getStorageState();
  await updateStorageState({
    groups: state.groups.filter(g => g.id !== groupId)
  });
}

export async function updateGroup(groupId: string, updates: Partial<ExtensionGroup>): Promise<void> {
  const state = await getStorageState();
  const groups = state.groups.map(g => 
    g.id === groupId ? { ...g, ...updates } : g
  );
  await updateStorageState({ groups });
} 