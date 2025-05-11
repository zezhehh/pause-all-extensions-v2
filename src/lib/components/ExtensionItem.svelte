<script lang="ts">
  import { browser } from 'wxt/browser';
  import { PauseController } from '../PauseController';
  import { onMount, onDestroy } from 'svelte';

  export let extId: string;
  export let enabled: boolean;
  export let name: string;
  export let selected: boolean = false;
  export let onSelect: ((id: string) => void) | null = null;
  export let showCheckbox: boolean = false;
  export let disabled: boolean = false;
  export let blacklist: string[] = [];
  export let whitelist: string[] = [];
  export let iconURL: string = '';

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
      // Update the stored state using the new method
      await pauseController.updateExtensionState(extId, !enabled);
      // Update local state
      enabled = !enabled;
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  }

  // Watch for enabled prop changes and sync with actual state
  $: if (enabled !== undefined) {
    // Get the actual state from the browser
    pauseController.getExtensionState(extId).then(actualState => {
      if (actualState !== undefined && actualState !== enabled) {
        enabled = actualState;
      }
    });
  }

  onMount(() => {
    // Listen for extension state changes
    browser.management.onEnabled.addListener((info) => {
      if (info.id === extId) {
        enabled = true;
      }
    });

    browser.management.onDisabled.addListener((info) => {
      if (info.id === extId) {
        enabled = false;
      }
    });
  });

  onDestroy(() => {
    // Clean up listeners
    browser.management.onEnabled.removeListener((info) => {
      if (info.id === extId) {
        enabled = true;
      }
    });

    browser.management.onDisabled.removeListener((info) => {
      if (info.id === extId) {
        enabled = false;
      }
    });
  });
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
  
  {#if iconURL}
    <img class="extension-icon" src={iconURL} alt="" width="24" height="24" />
  {/if}
  <div class="extension-info">
    <span class="name">{name}</span>
    <span class="list-hint {whitelist.includes(extId) ? 'whitelisted' : ''} {blacklist.includes(extId) ? 'blacklisted' : ''}">
      {#if whitelist.includes(extId)}
        (whitelisted)
      {:else if blacklist.includes(extId)}
        (blacklisted)
      {:else}
        &nbsp;
      {/if}
    </span>
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
    flex: 1 1 0%;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name {
    font-size: 14px;
    color: #333;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .list-hint {
    font-size: 13px;
    width: 110px;
    text-align: right;
    margin-left: 8px;
    flex-shrink: 0;
  }

  .list-hint.whitelisted {
    color: #43a047;
  }

  .list-hint.blacklisted {
    color: #222;
  }

  .toggle-button {
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    width: 80px;
  }

  .toggle-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-button.enabled {
    background: #2196F3;
    color: white;
    border-color: #2196F3;
  }

  .toggle-button.enabled:hover:not(:disabled) {
    background: #1976D2;
    border-color: #1976D2;
    color: white;
  }

  .extension-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #e3eaf2;
    box-shadow: 0 1px 3px rgba(33,150,243,0.07);
    margin-right: 4px;
    flex-shrink: 0;
    object-fit: cover;
  }
</style> 