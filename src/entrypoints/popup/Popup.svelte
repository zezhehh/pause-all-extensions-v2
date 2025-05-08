<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from 'wxt/browser';
  import { PauseController } from '../../lib/PauseController';
  import { 
    getStorageState, 
    updateStorageState, 
    type ExtensionGroup,
    type StorageMode,
    getStorageMode
  } from '../../lib/storage';
  import ExtensionItem from '../../lib/components/ExtensionItem.svelte';
  import Settings from '../../lib/components/Settings.svelte';

  let extensions: Array<{ id: string; name: string; enabled: boolean }> = [];
  let groups: ExtensionGroup[] = [];
  let advancedMode = false;
  let allPaused = false;
  let selectedExtensions: string[] = [];
  let isGrouping = false;
  let storageMode: StorageMode = 'local';
  let isProcessing = false;
  let editingGroupId: string | null = null;
  let editingGroupName = '';
  let whitelist: string[] = [];
  let blacklist: string[] = [];
  let showSettings = false;

  const pauseController = new PauseController();

  onMount(async () => {
    const state = await getStorageState();
    advancedMode = state.advancedMode;
    allPaused = state.allPaused;
    groups = state.groups;
    storageMode = await getStorageMode();
    whitelist = state.whitelist || [];
    blacklist = state.blacklist || [];

    const installed = await browser.management.getAll();
    extensions = installed
      .filter(ext => ext.id !== browser.runtime.id)
      .map(ext => ({
        id: ext.id,
        name: ext.name,
        enabled: ext.enabled
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  async function toggleAllExtensions() {
    if (isProcessing) return;
    
    isProcessing = true;
    const extIds = extensions.map(ext => ext.id);
    const newPausedState = !allPaused;
    
    try {
      if (newPausedState) {
        // When pausing all, exclude whitelisted extensions
        const extensionsToPause = extIds.filter(id => !whitelist.includes(id));
        await pauseController.pause(...extensionsToPause);
      } else {
        // When resuming all, exclude blacklisted extensions
        const extensionsToResume = extIds.filter(id => !blacklist.includes(id));
        const extensionsToPause = extIds.filter(id => blacklist.includes(id));
        await pauseController.unpause(...extensionsToResume);
        await pauseController.pause(...extensionsToPause);
      }
      
      allPaused = newPausedState;
      
      // Update extension states in the UI while maintaining order
      extensions = extensions.map(ext => ({
        ...ext,
        enabled: newPausedState 
          ? whitelist.includes(ext.id)  // When paused, only whitelisted are enabled
          : !blacklist.includes(ext.id) // When not paused, only non-blacklisted are enabled
      }));

      // Update group states
      const updatedGroups = groups.map(group => ({
        ...group,
        paused: newPausedState
      }));
      groups = updatedGroups;
      
      // Update storage with both changes
      await updateStorageState({ 
        allPaused,
        groups: updatedGroups
      });
    } finally {
      isProcessing = false;
    }
  }

  async function toggleAdvancedMode() {
    advancedMode = !advancedMode;
    await updateStorageState({ advancedMode });
  }

  function toggleGrouping() {
    isGrouping = !isGrouping;
    if (!isGrouping) {
      selectedExtensions = [];
    }
  }

  async function createGroup() {
    if (selectedExtensions.length === 0) return;

    const newGroup: ExtensionGroup = {
      id: crypto.randomUUID(),
      name: `Group ${groups.length + 1}`,
      extensions: selectedExtensions,
      paused: false
    };

    const updatedGroups = [...groups, newGroup];
    await updateStorageState({ groups: updatedGroups });
    groups = updatedGroups;

    isGrouping = false;
    selectedExtensions = [];
  }

  async function toggleGroup(group: ExtensionGroup) {
    const newPausedState = !group.paused;
    
    if (newPausedState) {
      // When pausing, exclude whitelisted extensions
      const extensionsToPause = group.extensions.filter(id => !whitelist.includes(id));
      await pauseController.pause(...extensionsToPause);
    } else {
      // When resuming, exclude blacklisted extensions
      const extensionsToResume = group.extensions.filter(id => !blacklist.includes(id));
      const extensionsToPause = group.extensions.filter(id => blacklist.includes(id));
      await pauseController.unpause(...extensionsToResume);
      await pauseController.pause(...extensionsToPause);
    }

    const updatedGroups = groups.map(g => 
      g.id === group.id ? { ...g, paused: newPausedState } : g
    );
    await updateStorageState({ groups: updatedGroups });
    groups = updatedGroups;

    // Update extension states in the UI
    extensions = extensions.map(ext => {
      if (group.extensions.includes(ext.id)) {
        return {
          ...ext,
          enabled: newPausedState 
            ? whitelist.includes(ext.id)  // When paused, only whitelisted are enabled
            : !blacklist.includes(ext.id) // When not paused, only non-blacklisted are enabled
        };
      }
      return ext;
    });
  }

  async function deleteGroup(groupId: string) {
    const updatedGroups = groups.filter(g => g.id !== groupId);
    await updateStorageState({ groups: updatedGroups });
    groups = updatedGroups;
  }

  function handleExtensionSelect(extId: string) {
    if (selectedExtensions.includes(extId)) {
      selectedExtensions = selectedExtensions.filter(id => id !== extId);
    } else {
      selectedExtensions = [...selectedExtensions, extId];
    }
  }

  async function startEditingGroup(group: ExtensionGroup) {
    if (isProcessing) return;
    editingGroupId = group.id;
    editingGroupName = group.name;
  }

  async function saveGroupName(group: ExtensionGroup) {
    if (isProcessing) return;
    
    const updatedGroups = groups.map(g => 
      g.id === group.id ? { ...g, name: editingGroupName } : g
    );
    await updateStorageState({ groups: updatedGroups });
    groups = updatedGroups;
    editingGroupId = null;
  }

  function cancelEditing() {
    editingGroupId = null;
  }

  function handleListChange(newWhitelist: string[], newBlacklist: string[]) {
    whitelist = newWhitelist;
    blacklist = newBlacklist;
    
    // Update extension states based on current pause state
    extensions = extensions.map(ext => ({
      ...ext,
      enabled: allPaused 
        ? whitelist.includes(ext.id)  // When paused, only whitelisted are enabled
        : !blacklist.includes(ext.id) // When not paused, only non-blacklisted are enabled
    }));
  }
</script>

<div class="popup">
  {#if showSettings}
    <Settings
      {extensions}
      {whitelist}
      {blacklist}
      {isProcessing}
      onClose={() => showSettings = false}
      onListChange={handleListChange}
    />
  {:else}
    <header>
      <div class="controls">
        <div class="main-controls">
          <button class="primary" on:click={toggleAllExtensions} disabled={isProcessing}>
            {allPaused ? 'Resume All' : 'Pause All'}
          </button>
          <button class="icon-button" on:click={() => showSettings = true} disabled={isProcessing}>
            ⚙️
          </button>
        </div>
        <div class="secondary-controls">
          {#if advancedMode}
            <button on:click={toggleGrouping} disabled={isProcessing || allPaused}>
              {isGrouping ? 'Cancel' : 'Create Group'}
            </button>
          {/if}
          <label class="mode-switch">
            <input
              type="checkbox"
              checked={advancedMode}
              on:change={toggleAdvancedMode}
              disabled={isProcessing}
            />
            <span class="slider"></span>
            <span class="mode-label">Advanced Mode</span>
          </label>
        </div>
      </div>
    </header>

    {#if advancedMode}
      <div class="advanced-controls">
        {#if isGrouping}
          <button class="primary" on:click={createGroup} disabled={selectedExtensions.length === 0 || isProcessing || allPaused}>
            Create Group ({selectedExtensions.length})
          </button>
        {/if}
      </div>

      {#if groups.length > 0}
        <div class="groups">
          {#each groups as group}
            <div class="group">
              <div class="group-header">
                {#if editingGroupId === group.id}
                  <div class="group-name-edit">
                    <input
                      type="text"
                      bind:value={editingGroupName}
                      on:keydown={(e) => e.key === 'Enter' && saveGroupName(group)}
                      on:blur={() => saveGroupName(group)}
                      disabled={isProcessing}
                    />
                    <button class="icon-button" on:click={() => cancelEditing()} disabled={isProcessing}>
                      ✕
                    </button>
                  </div>
                {:else}
                  <div class="group-name-container" on:click={() => startEditingGroup(group)}>
                    <h3 class="editable">{group.name}</h3>
                    <span class="edit-icon">✎</span>
                  </div>
                {/if}
                <div class="group-controls">
                  <button on:click={() => toggleGroup(group)} disabled={isProcessing || allPaused}>
                    {group.paused ? 'Resume' : 'Pause'}
                  </button>
                  <button class="danger" on:click={() => deleteGroup(group.id)} disabled={isProcessing}>
                    Delete
                  </button>
                </div>
              </div>
              {#each group.extensions as extId}
                {@const ext = extensions.find(e => e.id === extId)}
                {#if ext}
                  <ExtensionItem
                    extId={ext.id}
                    name={ext.name}
                    enabled={ext.enabled}
                    showCheckbox={isGrouping}
                    selected={selectedExtensions.includes(ext.id)}
                    onSelect={isGrouping ? handleExtensionSelect : null}
                    disabled={isProcessing || allPaused}
                    {blacklist}
                    {whitelist}
                  />
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      {/if}

      <div class="ungrouped">
        <h3>Ungrouped Extensions</h3>
        {#each extensions.filter(ext => !groups.some(g => g.extensions.includes(ext.id))) as ext}
          <ExtensionItem
            extId={ext.id}
            name={ext.name}
            enabled={ext.enabled}
            showCheckbox={isGrouping}
            selected={selectedExtensions.includes(ext.id)}
            onSelect={isGrouping ? handleExtensionSelect : null}
            disabled={isProcessing || allPaused}
            {blacklist}
            {whitelist}
          />
        {/each}
      </div>
    {:else}
      <div class="simple-list">
        {#each extensions as ext}
          <ExtensionItem
            extId={ext.id}
            name={ext.name}
            enabled={ext.enabled}
            disabled={isProcessing || allPaused}
            {blacklist}
            {whitelist}
          />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .popup {
    width: 400px;
    min-height: 500px;
    padding: 16px;
  }

  header {
    margin-bottom: 16px;
  }

  h1 {
    font-size: 20px;
    margin: 0 0 16px 0;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .main-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .main-controls .primary {
    flex: 1;
  }

  .secondary-controls {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    height: 36px;
  }

  .secondary-controls button {
    margin-right: auto;
    height: 36px;
  }

  button {
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }

  button.primary {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }

  button.danger {
    background: #f44336;
    color: white;
    border-color: #f44336;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
  }

  button.full-width {
    width: 100%;
  }

  .advanced-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .groups {
    margin-bottom: 24px;
  }

  .group {
    border: 1px solid #eee;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .group-header {
    padding: 8px 16px 8px 16px;
    background: #f5f5f5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .group-header h3 {
    margin: 0;
    font-size: 16px;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left: 0;
  }

  .group-controls {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .ungrouped h3 {
    font-size: 16px;
    margin: 0 0 8px 0;
  }

  .simple-list {
    display: flex;
    flex-direction: column;
  }

  button.storage-mode {
    background: #2196F3;
    color: white;
    border-color: #2196F3;
  }

  button.storage-mode:hover {
    background: #1976D2;
    border-color: #1976D2;
  }

  .group-name-edit {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .group-name-edit input {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    width: 100%;
    min-width: 0;
  }

  .group-name-edit input:focus {
    outline: none;
    border-color: #4CAF50;
  }

  .editable {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .editable:hover {
    background-color: #f0f0f0;
  }

  .icon-button {
    padding: 8px;
    font-size: 16px;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover:not(:disabled) {
    color: #333;
  }

  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .group-name-container {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    cursor: pointer;
    padding: 0;
  }

  .group-name-container:hover {
    background-color: #f0f0f0;
  }

  .group-name-container h3 {
    margin: 0;
    font-size: 16px;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .edit-icon {
    font-size: 14px;
    color: #666;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .group-name-container:hover .edit-icon {
    opacity: 1;
  }

  .list-selector {
    background: #f5f5f5;
    border-radius: 4px;
    margin: 16px 0;
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
    font-size: 16px;
  }

  .list-content {
    max-height: 200px;
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
    border-color: #ccc;
  }

  button.secondary:hover:not(:disabled) {
    background: #e0e0e0;
  }

  .mode-switch {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    height: 36px;
  }

  .mode-switch input {
    display: none;
  }

  .slider {
    position: relative;
    width: 40px;
    height: 20px;
    background-color: #ccc;
    border-radius: 20px;
    transition: all 0.2s;
  }

  .slider:before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .mode-switch input:checked + .slider {
    background-color: #4CAF50;
  }

  .mode-switch input:checked + .slider:before {
    transform: translateX(20px);
  }

  .mode-switch input:disabled + .slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mode-label {
    font-size: 14px;
    color: #333;
  }

  .mode-switch input:disabled ~ .mode-label {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style> 