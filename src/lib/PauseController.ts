import { browser } from 'wxt/browser';
import { getStorageMode, getStorageAPI } from './storage';

export class PauseController {
  private myID: string;

  constructor() {
    this.myID = browser.runtime.id;
  }

  async pause(...extIDs: string[]) {
    const items: Record<string, boolean> = {};
    const mode = await getStorageMode();
    const storage = getStorageAPI(mode);
    
    for (const extID of extIDs) {
      if (extID === this.myID) continue;
      
      const extInfo = await browser.management.get(extID);
      items[`ext_${extID}`] = extInfo.enabled;
      await browser.management.setEnabled(extID, false);
    }
    
    await storage.set({ extensions: items });
  }

  async unpause(...extIDs: string[]) {
    const mode = await getStorageMode();
    const storage = getStorageAPI(mode);
    const stored = await storage.get('extensions');
    
    for (const extID of extIDs) {
      if (extID === this.myID) continue;
      
      const storageKey = `ext_${extID}`;
      const previousState = stored[storageKey] ?? true;
      await browser.management.setEnabled(extID, previousState);
    }
  }
} 