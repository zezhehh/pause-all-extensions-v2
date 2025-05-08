<script lang="ts">
  import { browser } from 'wxt/browser';
  import { PauseController } from '../PauseController';
  import { updateStorageState, getStorageState } from '../storage';

  export let extId: string;
  export let enabled: boolean;
  export let name: string;
  export let selected: boolean = false;
  export let onSelect: ((id: string) => void) | null = null;
  export let showCheckbox: boolean = false;
  export let disabled: boolean = false;
  export let blacklist: string[] = [];
  export let whitelist: string[] = [];

  const pauseController = new PauseController();

  async function toggleExtension() {
    if (onSelect) {
      onSelect(extId);
      return;
    }

    // Don't allow enabling if extension is blacklisted
    if (!enabled && blacklist.includes(extId)) {
      return;
    }

    // Don't allow disabling if extension is whitelisted
    if (enabled && whitelist.includes(extId)) {
      return;
    }

    try {
      await browser.management.setEnabled(extId, !enabled);
      const state = await getStorageState();
      await updateStorageState({
        extensions: {
          ...state.extensions,
          [extId]: !enabled
        }
      });
      // Update local state
      enabled = !enabled;
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  }

  // Watch for enabled prop changes
  $: if (enabled !== undefined) {
    enabled = enabled;
  }
</script>

<div class="extension-item" class:selected>
  {#if showCheckbox}
    <input
      type="checkbox"
      checked={selected}
      on:change={() => onSelect?.(extId)}
      disabled={disabled}
    />
  {/if}
  
  <div class="extension-info">
    <span class="name">{name}</span>
    {#if blacklist.includes(extId)}
      <span class="list-hint blacklist">(blacklisted)</span>
    {/if}
    {#if whitelist.includes(extId)}
      <span class="list-hint whitelist">(whitelisted)</span>
    {/if}
  </div>
  
  <button
    class="toggle-button"
    class:enabled
    on:click={toggleExtension}
    disabled={disabled || 
      (!enabled && blacklist.includes(extId)) || 
      (enabled && whitelist.includes(extId))}
  >
    {enabled ? 'Enabled' : 'Disabled'}
  </button>
</div>

<style>
  .extension-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid #eee;
    gap: 12px;
  }

  .extension-item.selected {
    background-color: #f0f0f0;
  }

  .extension-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name {
    font-size: 14px;
    color: #333;
  }

  .list-hint {
    font-size: 12px;
  }

  .list-hint.blacklist {
    color: #666;
  }

  .list-hint.whitelist {
    color: #4CAF50;
  }

  .toggle-button {
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .toggle-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-button.enabled {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }

  .toggle-button:hover:not(:disabled) {
    opacity: 0.9;
  }
</style> 