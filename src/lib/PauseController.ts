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
      // Always save the current state when pausing all
      items[`ext_${extID}`] = extInfo.enabled;
      await browser.management.setEnabled(extID, false);
    }

    // Save the new states
    await storage.set({ extensions: items });
  }

  async unpause(...extIDs: string[]) {
    const mode = await getStorageMode();
    const storage = getStorageAPI(mode);
    const result = await storage.get('extensions');
    const stored = result?.extensions || {};

    for (const extID of extIDs) {
      if (extID === this.myID) continue;

      const storageKey = `ext_${extID}`;
      const previousState = stored[storageKey];

      // Get current state of the extension
      const currentState = await this.getExtensionState(extID);
      
      // If the extension was manually enabled while paused, respect that state
      if (currentState === true) {
        // Update the stored state to reflect the new enabled state
        stored[storageKey] = true;
        continue;
      }

      // Otherwise, restore the previous state
      if (typeof previousState === 'boolean') {
        await browser.management.setEnabled(extID, previousState);
      }
    }

    // Save any updated states
    await storage.set({ extensions: stored });
  }

  // Add method to update extension state when it's manually changed
  async updateExtensionState(extID: string, enabled: boolean) {
    if (extID === this.myID) return;

    const mode = await getStorageMode();
    const storage = getStorageAPI(mode);
    const result = await storage.get('extensions');
    const stored = result?.extensions || {};

    // Update the stored state
    stored[`ext_${extID}`] = enabled;
    await storage.set({ extensions: stored });
  }

  // Add method to get current extension state
  async getExtensionState(extID: string): Promise<boolean> {
    if (extID === this.myID) return true;

    try {
      const extInfo = await browser.management.get(extID);
      return extInfo.enabled;
    } catch (error) {
      console.error('Failed to get extension state:', error);
      return false;
    }
  }
} 