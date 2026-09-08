// DOM Elements
const fromDomainInput = document.getElementById('fromDomain');
const toDomainInput = document.getElementById('toDomain');
const addButton = document.getElementById('addButton');
const redirectsList = document.getElementById('redirectsList');
const emptyMessage = document.getElementById('emptyMessage');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');
const importFile = document.getElementById('importFile');
const editIdInput = document.getElementById('editId');
const addBtnText = document.getElementById('addBtnText');
const cancelEditButton = document.getElementById('cancelEditButton');

// Load and display redirects when the popup opens
document.addEventListener('DOMContentLoaded', loadRedirects);

// Add new redirect rule
addButton.addEventListener('click', addRedirect);
cancelEditButton.addEventListener('click', cancelEdit);

// Allow adding with Enter key
fromDomainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') toDomainInput.focus();
});

toDomainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addRedirect();
});

// Setup Export/Import functionality
exportButton.addEventListener('click', exportConfig);
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importConfig);

/**
 * Loads redirects from Chrome's sync storage.
 */
async function loadRedirects() {
  const { redirects } = await chrome.storage.local.get('redirects');
  
  if (!redirects || redirects.length === 0) {
    redirectsList.innerHTML = '';
    emptyMessage.style.display = 'block';
    return;
  }
  
  emptyMessage.style.display = 'none';
  displayRedirects(redirects);
}

/**
 * Escapes characters to prevent XSS
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Displays the redirects in the UI.
 * @param {Array} redirects - Array of redirect objects
 */
function displayRedirects(redirects) {
  redirectsList.innerHTML = '';
  
  redirects.forEach(redirect => {
    const item = document.createElement('div');
    item.className = 'redirect-item';
    item.setAttribute('data-id', redirect.id);
    
    const fromArray = Array.isArray(redirect.from) ? redirect.from : [redirect.from];
    
    item.innerHTML = `
      <div style="display: flex; flex-direction: column; width: 100%; gap: 14px;">
        <!-- Top Row: Status and Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(51, 65, 85, 0.6); padding-bottom: 12px; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="toggle-switch" title="Toggle On/Off" style="margin: 0;">
              <input type="checkbox" class="toggle-checkbox" ${redirect.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: ${redirect.enabled ? 'rgba(129, 140, 248, 0.1)' : 'rgba(100, 116, 139, 0.1)'}; color: ${redirect.enabled ? '#818cf8' : '#64748b'}; border: 1px solid ${redirect.enabled ? 'rgba(129, 140, 248, 0.2)' : 'rgba(100, 116, 139, 0.2)'};">${redirect.enabled ? 'ACTIVE' : 'INACTIVE'}</span>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon btn-edit" title="Edit Rule" style="display: flex; gap: 6px; align-items: center; background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; transition: all 0.2s;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 
              Edit
            </button>
            <button class="btn-icon btn-delete" title="Delete Rule" style="display: flex; gap: 6px; align-items: center; background: rgba(244, 63, 94, 0.1); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; transition: all 0.2s;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> 
              Delete
            </button>
          </div>
        </div>
        
        <!-- Routing Section -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 500;">From origins:</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${fromArray.map(domain => `<div style="font-size: 12px; background: rgba(244, 63, 94, 0.08); color: #fb7185; padding: 6px 12px; border-radius: 6px; font-family: monospace; width: 100%; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid rgba(244, 63, 94, 0.15);" title="${escapeHTML(domain)}">${escapeHTML(domain)}</div>`).join('')}
          </div>

          <div style="display: flex; justify-content: center; align-items: center; color: #64748b; padding: 2px 0;">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </div>
          
          <div style="font-size: 11px; color: #94a3b8; font-weight: 500;">Redirect to:</div>
          <div style="font-size: 12px; background: rgba(99, 102, 241, 0.08); color: #818cf8; padding: 6px 12px; border-radius: 6px; font-family: monospace; width: 100%; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid rgba(99, 102, 241, 0.15);" title="${escapeHTML(redirect.to)}">${escapeHTML(redirect.to)}</div>
        </div>
      </div>
    `;
    // Bind Event Listeners replacing exact global window functions with block-scoped functions
    const toggle = item.querySelector('.toggle-checkbox');
    toggle.addEventListener('change', () => toggleRedirect(redirect.id));
    
    const editBtn = item.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => editRedirect(redirect.id));
    
    const deleteBtn = item.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => deleteRedirect(redirect.id));
    
    redirectsList.appendChild(item);
  });
}

/**
 * Populates the form to edit an existing rule
 * @param {number} id - Rule ID
 */
async function editRedirect(id) {
  const { redirects = [] } = await chrome.storage.local.get('redirects');
  const redirect = redirects.find(r => r.id === id);
  if (!redirect) return;

  fromDomainInput.value = Array.isArray(redirect.from) ? redirect.from.join(', ') : redirect.from;
  toDomainInput.value = redirect.to;
  editIdInput.value = id;
  
  addBtnText.textContent = 'Update Redirect';
  cancelEditButton.style.display = 'block';
  fromDomainInput.focus();
}

/**
 * Resets the edit state
 */
function cancelEdit() {
  fromDomainInput.value = '';
  toDomainInput.value = '';
  editIdInput.value = '';
  addBtnText.textContent = 'Add Redirect';
  cancelEditButton.style.display = 'none';
}

/**
 * Handles adding a new redirect rule or updating an existing one
 */
async function addRedirect() {
  const rawFrom = fromDomainInput.value;
  const rawTo = toDomainInput.value.trim();
  const editId = editIdInput.value ? parseInt(editIdInput.value) : null;
  
  if (!rawFrom || !rawTo) {
    alert('Please fill out both fields.');
    return;
  }
  
  const cleanTo = rawTo.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!isValidDomain(cleanTo)) {
    alert('Please enter a valid destination domain.');
    return;
  }
  
  const fromDomains = rawFrom.split(',')
    .map(d => d.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
    .filter(d => d.length > 0);
    
  if (fromDomains.length === 0 || !fromDomains.every(isValidDomain)) {
    alert('Please enter valid source domains (separated by commas).');
    return;
  }
  
  const uniqueFromDomains = [...new Set(fromDomains)];
  
  const { redirects = [] } = await chrome.storage.local.get('redirects');
  
  // Collision check across rules
  for (const rule of redirects) {
    if (editId && rule.id === editId) continue;
    const ruleFroms = Array.isArray(rule.from) ? rule.from : [rule.from];
    for (const d of uniqueFromDomains) {
      if (ruleFroms.includes(d)) {
        alert(`The source domain "${d}" is already being redirected to ${rule.to}.`);
        return;
      }
    }
  }
  
  let updatedRedirects = redirects;
  let currentEnabled = true;
  
  if (editId) {
    const ruleToEdit = updatedRedirects.find(r => r.id === editId);
    if (ruleToEdit) currentEnabled = ruleToEdit.enabled;
    updatedRedirects = updatedRedirects.filter(r => r.id !== editId);
  }
  
  // Find if target domain already exists to unify rules
  const targetRule = updatedRedirects.find(r => r.to === cleanTo);
  
  if (targetRule) {
    // Merge into the existing rule for this destination
    const existingFroms = Array.isArray(targetRule.from) ? targetRule.from : [targetRule.from];
    targetRule.from = [...new Set([...existingFroms, ...uniqueFromDomains])];
    
    // In edit mode we retain the current specific enabled status if merging replaces our edited item completely
    // But usually merging to a different rule keeps that rules enabled status.
  } else {
    // Create new rule
    const newId = redirects.length > 0 ? Math.max(...redirects.map(r => r.id)) + 1 : 1;
    updatedRedirects.push({
      id: newId,
      from: uniqueFromDomains,
      to: cleanTo,
      enabled: currentEnabled
    });
  }
  
  await chrome.storage.local.set({ redirects: updatedRedirects });
  
  cancelEdit();
  loadRedirects();
}

/**
 * Deletes a redirect rule by ID
 * @param {number} id - Rule ID
 */
async function deleteRedirect(id) {
  if (!confirm('Are you sure you want to delete this redirect?')) {
    return;
  }
  
  const { redirects = [] } = await chrome.storage.local.get('redirects');
  const updatedRedirects = redirects.filter(r => r.id !== id);
  
  await chrome.storage.local.set({ redirects: updatedRedirects });
  loadRedirects();
}

/**
 * Toggles the enabled state of a redirect rule
 * @param {number} id - Rule ID
 */
async function toggleRedirect(id) {
  const { redirects = [] } = await chrome.storage.local.get('redirects');
  const redirect = redirects.find(r => r.id === id);
  
  if (redirect) {
    redirect.enabled = !redirect.enabled;
    await chrome.storage.local.set({ redirects });
    // Updating storage triggers the background worker to update rules automatically
    // Reload the UI to reflect the change visually immediately
    loadRedirects();
  }
}

/**
 * Validates domain format (supports IPs, IPv6, localhost, single-word hosts, and ports)
 * @param {string} domain 
 * @returns {boolean}
 */
function isValidDomain(domain) {
  // Allow IPv6 in brackets [::1], single-word hostnames (intranets), IPv4, normal domains, and optional ports
  const domainPattern = /^(\[[a-fA-F0-9:]+\]|([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(:\d+)?$/;
  return domainPattern.test(domain);
}

/**
 * Exports current configuration as a JSON file
 */
async function exportConfig() {
  const { redirects = [] } = await chrome.storage.local.get('redirects');
  
  const dataStr = JSON.stringify(redirects, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'domain-swap-config.json';
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Imports configuration from a JSON file
 * @param {Event} event 
 */
async function importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedRedirects = JSON.parse(e.target.result);
      
      // Validate structure
      if (!Array.isArray(importedRedirects)) {
        alert('Invalid configuration file format.');
        return;
      }
      
      // Validate each redirect object
      const isValid = importedRedirects.every(r => 
        r.id && r.from && r.to && typeof r.enabled === 'boolean'
      );
      
      if (!isValid) {
        alert('The file contains incorrectly formatted redirects.');
        return;
      }
      
      // Ask what to do with the existing configured rules
      const mode = confirm(
        'Import Configuration:\n\n' +
        '[OK] = Overwrite current configuration\n' +
        '[Cancel] = Keep current and append imported rules (Merge)'
      );
      
      // Give the user a way to completely cancel the import
      if (!confirm('Are you sure you want to proceed with the import?')) {
        event.target.value = '';
        return;
      }
      
      let finalRedirects;
      if (mode) {
        finalRedirects = importedRedirects;
      } else {
        const { redirects = [] } = await chrome.storage.local.get('redirects');
        
        // Advanced merge avoiding duplicates and unifying targets
        const combinedMap = new Map();
        
        // Load current
        redirects.forEach(r => combinedMap.set(r.to, { ...r, from: Array.isArray(r.from) ? r.from : [r.from] }));
        let maxId = redirects.length > 0 ? Math.max(...redirects.map(r => r.id)) : 0;
        
        importedRedirects.forEach(imported => {
          const importedFroms = Array.isArray(imported.from) ? imported.from : [imported.from];
          if (combinedMap.has(imported.to)) {
             const existing = combinedMap.get(imported.to);
             existing.from = [...new Set([...existing.from, ...importedFroms])];
          } else {
             combinedMap.set(imported.to, { ...imported, id: ++maxId, from: importedFroms });
          }
        });
        
        finalRedirects = Array.from(combinedMap.values());
      }
      
      await chrome.storage.local.set({ redirects: finalRedirects });
      loadRedirects();
      
      alert(`Configuration successfully imported. ${finalRedirects.length} redirects loaded.`);
      
    } catch (error) {
      alert('Error importing file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
  
  // Reset input to allow re-importing the same file
  event.target.value = '';
}
