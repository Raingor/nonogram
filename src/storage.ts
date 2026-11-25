import { defaultSave, parseSave, persistSave, STORAGE_KEY, type SaveData } from './game';

export type { SaveData };
export { STORAGE_KEY, defaultSave, parseSave };

export function safeLoad(storage: Storage = localStorage): SaveData {
  try {
    return parseSave(storage.getItem(STORAGE_KEY));
  } catch {
    return defaultSave();
  }
}

export function safePersist(storage: Storage = localStorage, data: SaveData): boolean {
  return persistSave(storage, data);
}
