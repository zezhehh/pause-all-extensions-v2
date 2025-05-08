<script lang="ts">
  import { browser } from "wxt/browser";
  import { type StorageMode, getStorageMode, setStorageMode, updateStorageState } from "../../lib/storage";
  import { onMount } from "svelte";

  export let extensions: Array<{ id: string; name: string; enabled: boolean }> = [];
  export let whitelist: string[] = [];
  export let blacklist: string[] = [];
  export let isProcessing = false;
  export let onClose: () => void;
  export let onListChange: (whitelist: string[], blacklist: string[]) => void;

  let storageMode: StorageMode = "local";
  let showListSelector = false;
  let currentList: "whitelist" | "blacklist" = "whitelist";

  onMount(async () => {
    storageMode = await getStorageMode();
  });

  async function toggleStorageMode() {
    const newMode: StorageMode = storageMode === "local" ? "sync" : "local";
    await setStorageMode(newMode);
    storageMode = newMode;
  }

  function handleExtensionListSelect(extId: string) {
    if (currentList === "whitelist") {
      if (whitelist.includes(extId)) {
        whitelist = whitelist.filter((id) => id !== extId);
      } else {
        whitelist = [...whitelist, extId];
        blacklist = blacklist.filter((id) => id !== extId);
        browser.management.setEnabled(extId, true);
      }
    } else {
      if (blacklist.includes(extId)) {
        blacklist = blacklist.filter((id) => id !== extId);
      } else {
        blacklist = [...blacklist, extId];
        whitelist = whitelist.filter((id) => id !== extId);
        browser.management.setEnabled(extId, false);
      }
    }
    updateStorageState({ whitelist, blacklist });
    onListChange(whitelist, blacklist);
  }

  function clearList() {
    if (currentList === "whitelist") {
      whitelist = [];
    } else {
      blacklist = [];
    }
    updateStorageState({ whitelist, blacklist });
    onListChange(whitelist, blacklist);
  }

  function switchList(list: "whitelist" | "blacklist") {
    currentList = list;
  }
</script>

<div class="settings-root">
  <div class="settings-header">
    <span class="settings-title">Settings</span>
    <button class="close-button" on:click={onClose} title="Close">✕</button>
  </div>
  <div class="header-divider"></div>

  <div class="settings-section">
    <div class="storage-mode">
      <p>Choose where to store your extension settings:</p>
      <div class="storage-mode-radios">
        <label>
          <input
            type="radio"
            name="storage-mode"
            value="local"
            checked={storageMode === "local"}
            on:change={() => storageMode !== "local" && toggleStorageMode()}
            disabled={isProcessing}
          />
          Local Storage
        </label>
        <label>
          <input
            type="radio"
            name="storage-mode"
            value="sync"
            checked={storageMode === "sync"}
            on:change={() => storageMode !== "sync" && toggleStorageMode()}
            disabled={isProcessing}
          />
          Sync Storage
        </label>
      </div>
      <p class="hint">
        {storageMode === "local"
          ? "Settings are stored only on this device"
          : "Settings are synced across your devices"}
      </p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="settings-section">
    <div class="list-tabs">
      <button
        type="button"
        class="tab {currentList === 'whitelist' ? 'active' : ''}"
        on:click={() => switchList("whitelist")}
        aria-selected={currentList === "whitelist"}
        role="tab"
      >
        Whitelist
      </button>
      <button
        type="button"
        class="tab {currentList === 'blacklist' ? 'active' : ''}"
        on:click={() => switchList("blacklist")}
        aria-selected={currentList === "blacklist"}
        role="tab"
      >
        Blacklist
      </button>
    </div>
    <div class="list-content">
      <div class="list-header">
        <h3>
          {currentList === "whitelist"
            ? "Extensions that stay enabled when pausing all"
            : "Extensions that stay disabled when resuming all"}
        </h3>
        <button class="secondary" on:click={clearList} disabled={isProcessing}>
          Clear {currentList === "whitelist" ? "Whitelist" : "Blacklist"}
        </button>
      </div>
      <div class="extensions-list">
        {#each extensions as ext}
          <div class="list-item">
            <input
              type="checkbox"
              id={`list-${ext.id}`}
              checked={currentList === "whitelist" ? whitelist.includes(ext.id) : blacklist.includes(ext.id)}
              on:change={() => handleExtensionListSelect(ext.id)}
              disabled={isProcessing ||
                (currentList === "whitelist" ? blacklist.includes(ext.id) : whitelist.includes(ext.id))}
            />
            <div class="extension-info">
              <label
                for={`list-${ext.id}`}
                class:disabled={currentList === "whitelist" ? blacklist.includes(ext.id) : whitelist.includes(ext.id)}
              >
                {ext.name}
              </label>
              <span
                class="list-hint {whitelist.includes(ext.id) ? 'whitelisted' : ''} {blacklist.includes(ext.id)
                  ? 'blacklisted'
                  : ''}"
              >
                {#if currentList === "whitelist" && blacklist.includes(ext.id)}
                  (blacklisted)
                {:else if currentList === "blacklist" && whitelist.includes(ext.id)}
                  (whitelisted)
                {:else if whitelist.includes(ext.id)}
                  (whitelisted)
                {:else if blacklist.includes(ext.id)}
                  (blacklisted)
                {:else}
                  &nbsp;
                {/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f5f8fa;
    border-radius: 0;
    height: 48px;
    position: relative;
    margin: 0;
    box-shadow: none;
    padding: 0 16px;
  }

  .settings-title {
    font-size: 18px;
    font-weight: 600;
    color: #1976d2;
    letter-spacing: 0.2px;
  }

  .header-divider {
    height: 1px;
    background: #e3eaf2;
    margin: 0 0 18px 0;
    border: none;
  }

  .close-button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 22px;
    color: #888;
    border-radius: 50%;
    transition:
      background 0.2s,
      color 0.2s;
  }
  .close-button:hover {
    background: #f0f4fa;
    color: #2196f3;
  }

  .settings-section {
    margin-bottom: 28px;
    padding: 0;
  }

  .storage-mode {
    background: #f5f8fa;
    padding: 18px 16px 12px 16px;
    border-radius: 10px;
    margin-bottom: 0;
  }

  .storage-mode p {
    margin: 0 0 8px 0;
    color: #666;
  }

  .hint {
    font-size: 13px;
    color: #999;
    margin-top: 8px;
  }

  .storage-mode-radios {
    display: flex;
    gap: 32px;
    margin-bottom: 8px;
  }
  .storage-mode-radios label {
    font-size: 15px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .list-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 18px;
    border-bottom: 2px solid #e3eaf2;
    background: #f5f8fa;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
  }
  .tab {
    padding: 10px 32px 10px 32px;
    font-size: 15px;
    color: #666;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition:
      color 0.2s,
      border-bottom 0.2s,
      background 0.2s;
    outline: none;
    font-weight: 500;
  }
  .tab.active {
    color: #2196f3;
    border-bottom: 2.5px solid #2196f3;
    background: #fff;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.04);
  }
  .tab:not(.active):hover {
    color: #1976d2;
    background: #e3eaf2;
  }

  .list-content {
    background: #f5f8fa;
    border-radius: 0 0 10px 10px;
    padding: 18px 16px 10px 16px;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.03);
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .list-header h3 {
    margin: 0;
    font-size: 15px;
    color: #666;
    font-weight: 500;
  }

  .extensions-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #e3eaf2;
  }

  .list-item:last-child {
    border-bottom: none;
  }

  .extension-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 8px;
  }

  .list-item label {
    cursor: pointer;
    user-select: none;
    font-size: 14px;
    color: #222;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button.secondary {
    background: #2196f3;
    color: white;
    border: 1px solid #2196f3;
    padding: 5px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition:
      background 0.2s,
      color 0.2s,
      border 0.2s;
  }
  button.secondary:hover:not(:disabled) {
    background: #1976d2;
    color: white;
    border-color: #1976d2;
  }
  button.secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
</style>
