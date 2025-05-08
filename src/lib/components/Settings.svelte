<script lang="ts">
  import { browser } from 'wxt/browser';
  import { 
    type StorageMode,
    getStorageMode,
    setStorageMode,
    updateStorageState
  } from '../../lib/storage';

  export let extensions: Array<{ id: string; name: string; enabled: boolean }> = [];
  export let whitelist: string[] = [];
  export let blacklist: string[] = [];
  export let isProcessing = false;
  export let onClose: () => void;
  export let onListChange: (whitelist: string[], blacklist: string[]) => void;

  let storageMode: StorageMode = 'local';
  let showListSelector = false;
  let currentList: 'whitelist' | 'blacklist' = 'whitelist';

  async function toggleStorageMode() {
    const newMode: StorageMode = storageMode === 'local' ? 'sync' : 'local';
    await setStorageMode(newMode);
    storageMode = newMode;
  }

  function handleExtensionListSelect(extId: string) {
    if (currentList === 'whitelist') {
      if (whitelist.includes(extId)) {
        whitelist = whitelist.filter(id => id !== extId);
      } else {
        whitelist = [...whitelist, extId];
        blacklist = blacklist.filter(id => id !== extId);
      }
    } else {
      if (blacklist.includes(extId)) {
        blacklist = blacklist.filter(id => id !== extId);
      } else {
        blacklist = [...blacklist, extId];
        whitelist = whitelist.filter(id => id !== extId);
      }
    }
    updateStorageState({ whitelist, blacklist });
    onListChange(whitelist, blacklist);
  }

  function clearList() {
    if (currentList === 'whitelist') {
      whitelist = [];
    } else {
      blacklist = [];
    }
    updateStorageState({ whitelist, blacklist });
    onListChange(whitelist, blacklist);
  }

  function switchList(list: 'whitelist' | 'blacklist') {
    currentList = list;
  }
</script>

<div class="settings">
  <header>
    <h1>Settings</h1>
    <button class="close-button" on:click={onClose}>✕</button>
  </header>

  <div class="settings-section">
    <h2>Storage Mode</h2>
    <div class="storage-mode">
      <p>Choose where to store your extension settings:</p>
      <div class="storage-mode-radios">
        <label>
          <input
            type="radio"
            name="storage-mode"
            value="local"
            checked={storageMode === 'local'}
            on:change={() => storageMode !== 'local' && toggleStorageMode()}
            disabled={isProcessing}
          />
          Local Storage
        </label>
        <label>
          <input
            type="radio"
            name="storage-mode"
            value="sync"
            checked={storageMode === 'sync'}
            on:change={() => storageMode !== 'sync' && toggleStorageMode()}
            disabled={isProcessing}
          />
          Sync Storage
        </label>
      </div>
      <p class="hint">
        {storageMode === 'local' 
          ? 'Settings are stored only on this device'
          : 'Settings are synced across your devices'}
      </p>
    </div>
  </div>

  <div class="settings-section">
    <h2>Extension Lists</h2>
    <div class="list-tabs">
      <div
        class="tab {currentList === 'whitelist' ? 'active' : ''}"
        on:click={() => switchList('whitelist')}
        aria-selected={currentList === 'whitelist'}
        tabindex="0"
        role="tab"
      >
        Whitelist
      </div>
      <div
        class="tab {currentList === 'blacklist' ? 'active' : ''}"
        on:click={() => switchList('blacklist')}
        aria-selected={currentList === 'blacklist'}
        tabindex="0"
        role="tab"
      >
        Blacklist
      </div>
    </div>

    <div class="list-content">
      <div class="list-header">
        <h3>
          {currentList === 'whitelist' 
            ? 'Extensions that stay enabled when pausing all'
            : 'Extensions that stay disabled when resuming all'}
        </h3>
        <button class="secondary" on:click={clearList} disabled={isProcessing}>
          Clear {currentList === 'whitelist' ? 'Whitelist' : 'Blacklist'}
        </button>
      </div>
      <div class="extensions-list">
        {#each extensions as ext}
          <div class="list-item">
            <input
              type="checkbox"
              id={`list-${ext.id}`}
              checked={currentList === 'whitelist' 
                ? whitelist.includes(ext.id) 
                : blacklist.includes(ext.id)}
              on:change={() => handleExtensionListSelect(ext.id)}
              disabled={isProcessing || (currentList === 'whitelist' 
                ? blacklist.includes(ext.id)
                : whitelist.includes(ext.id))}
            />
            <label for={`list-${ext.id}`} class:disabled={currentList === 'whitelist' 
              ? blacklist.includes(ext.id)
              : whitelist.includes(ext.id)}>
              {ext.name}
              {#if (currentList === 'whitelist' && blacklist.includes(ext.id)) || 
                   (currentList === 'blacklist' && whitelist.includes(ext.id))}
                <span class="list-hint">(in {currentList === 'whitelist' ? 'blacklist' : 'whitelist'})</span>
              {/if}
            </label>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .settings {
    width: 100%;
    height: 100%;
    padding: 16px;
    background: white;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  h1 {
    margin: 0;
    font-size: 20px;
  }

  .close-button {
    padding: 8px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 16px;
    color: #666;
    border-radius: 4px;
  }

  .close-button:hover {
    background: #f0f0f0;
  }

  .settings-section {
    margin-bottom: 32px;
  }

  h2 {
    font-size: 16px;
    margin: 0 0 16px 0;
    color: #333;
  }

  .storage-mode {
    background: #f5f5f5;
    padding: 16px;
    border-radius: 4px;
  }

  .storage-mode p {
    margin: 0 0 8px 0;
    color: #666;
  }

  .hint {
    font-size: 12px;
    color: #999;
  }

  .storage-mode-radios {
    display: flex;
    gap: 24px;
    margin-bottom: 8px;
  }
  .storage-mode-radios label {
    font-size: 14px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .storage-mode-radios input[type="radio"]:disabled + span {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .list-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 16px;
    border-bottom: 2px solid #eee;
  }
  .tab {
    padding: 8px 24px;
    font-size: 14px;
    color: #666;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.2s, border-bottom 0.2s;
    outline: none;
  }
  .tab.active {
    color: #2196F3;
    border-bottom: 2px solid #2196F3;
    background: #fff;
    font-weight: 600;
  }
  .tab:not(.active):hover {
    color: #333;
    background: #f5f5f5;
  }

  .list-content {
    background: #f5f5f5;
    border-radius: 4px;
    padding: 16px;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .list-header h3 {
    margin: 0;
    font-size: 14px;
    color: #666;
  }

  .extensions-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  .list-item label {
    cursor: pointer;
    user-select: none;
  }

  button.secondary {
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  button.secondary:hover:not(:disabled) {
    background: #e0e0e0;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .list-item label.disabled {
    color: #999;
    cursor: not-allowed;
  }

  .list-hint {
    font-size: 12px;
    color: #666;
    margin-left: 4px;
  }
</style> 