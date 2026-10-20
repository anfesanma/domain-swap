// Safe Storage Wrapper (Supports both Chrome Extension storage and browser preview fallback)
const storage = {
  get: async (key) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      return await chrome.storage.local.get(key);
    }
    try {
      const item = localStorage.getItem(key);
      if (item === null && key === 'redirects') {
        // Sample preview data for standalone UI testing
        const sampleData = [
          {
            id: 1,
            from: ['twitter.com', 'mobile.twitter.com'],
            to: 'x.com',
            enabled: true
          },
          {
            id: 2,
            from: ['reddit.com'],
            to: 'old.reddit.com',
            enabled: false
          }
        ];
        localStorage.setItem('redirects', JSON.stringify(sampleData));
        return { redirects: sampleData };
      }
      return { [key]: item ? JSON.parse(item) : null };
    } catch (e) {
      return { [key]: null };
    }
  },
  set: async (obj) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      return await chrome.storage.local.set(obj);
    }
    try {
      Object.entries(obj).forEach(([k, v]) => {
        localStorage.setItem(k, JSON.stringify(v));
      });
    } catch (e) {
      console.warn('Storage set failed', e);
    }
  }
};

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

// Direct JSON Import Section Elements
const importSection = document.getElementById('importSection');
const closeImportSectionBtn = document.getElementById('closeImportSectionBtn');
const importJsonTextarea = document.getElementById('importJsonTextarea');
const triggerFilePicker = document.getElementById('triggerFilePicker');
const mergeImportButton = document.getElementById('mergeImportButton');
const overwriteImportButton = document.getElementById('overwriteImportButton');
const importFeedback = document.getElementById('importFeedback');

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

// Setup Export functionality
exportButton.addEventListener('click', exportConfig);

// Setup Import Section Toggle (Solves popup closure bug when opening native file picker)
importButton.addEventListener('click', toggleImportSection);
if (closeImportSectionBtn) {
  closeImportSectionBtn.addEventListener('click', () => {
    importSection.classList.remove('active');
  });
}

// Fallback file picker inside import section
if (triggerFilePicker) {
  triggerFilePicker.addEventListener('click', () => importFile.click());
}
importFile.addEventListener('change', handleFileSelected);

// Merge / Overwrite JSON Import Actions
if (mergeImportButton) {
  mergeImportButton.addEventListener('click', () => processJsonImport('merge'));
}
if (overwriteImportButton) {
  overwriteImportButton.addEventListener('click', () => processJsonImport('overwrite'));
}

/**
 * Toggles the direct JSON paste section
 */
function toggleImportSection() {
  if (!importSection) return;
  const isCurrentlyActive = importSection.classList.contains('active');
  
  if (isCurrentlyActive) {
    importSection.classList.remove('active');
  } else {
    importSection.classList.add('active');
    hideFeedback();
    importJsonTextarea.focus();
    setTimeout(() => {
      importSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

/**
 * Loads redirects from Chrome's sync storage.
 */
async function loadRedirects() {
  const { redirects } = await storage.get('redirects');
  
  if (!redirects || redirects.length === 0) {
    redirectsList.replaceChildren();
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
  redirectsList.replaceChildren();
  const template = document.getElementById('redirectItemTemplate');
  
  redirects.forEach(redirect => {
    const item = document.createElement('div');
    item.className = 'redirect-item';
    item.setAttribute('data-id', String(redirect.id));
    
    if (template) {
      item.appendChild(template.content.cloneNode(true));
    }
    
    // Status & Toggle
    const toggle = item.querySelector('.toggle-checkbox');
    if (toggle) {
      toggle.checked = Boolean(redirect.enabled);
      toggle.addEventListener('change', () => toggleRedirect(redirect.id));
    }

    const statusPill = item.querySelector('.status-pill');
    if (statusPill) {
      statusPill.className = `status-pill ${redirect.enabled ? 'status-active' : 'status-inactive'}`;
      statusPill.textContent = redirect.enabled ? 'ACTIVE' : 'INACTIVE';
    }

    // Origin Chips
    const originChipsGroup = item.querySelector('.origin-chips');
    if (originChipsGroup) {
      const fromArray = Array.isArray(redirect.from) ? redirect.from : [redirect.from];
      fromArray.forEach(domain => {
        const chip = document.createElement('div');
        chip.className = 'domain-chip domain-chip-origin';
        chip.title = domain;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '12');
        svg.setAttribute('height', '12');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2.5');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '4');
        svg.appendChild(circle);

        const span = document.createElement('span');
        span.textContent = domain;

        chip.append(svg, span);
        originChipsGroup.appendChild(chip);
      });
    }

    // Target Chip
    const targetChip = item.querySelector('.domain-chip-target');
    if (targetChip) {
      targetChip.title = redirect.to;
    }
    const targetText = item.querySelector('.target-text');
    if (targetText) {
      targetText.textContent = redirect.to;
    }

    // Action buttons
    const editBtn = item.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => editRedirect(redirect.id));
    }
    
    const deleteBtn = item.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteRedirect(redirect.id));
    }
    
    redirectsList.appendChild(item);
  });
}

/**
 * Populates the form to edit an existing rule
 * @param {number} id - Rule ID
 */
async function editRedirect(id) {
  const { redirects = [] } = await storage.get('redirects');
  const redirect = redirects.find(r => r.id === id);
  if (!redirect) return;

  fromDomainInput.value = Array.isArray(redirect.from) ? redirect.from.join(', ') : redirect.from;
  toDomainInput.value = redirect.to;
  editIdInput.value = id;
  
  addBtnText.textContent = 'Update Redirect';
  cancelEditButton.style.display = 'inline-flex';
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
  
  const { redirects = [] } = await storage.get('redirects');
  
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
  
  await storage.set({ redirects: updatedRedirects });
  
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
  
  const { redirects = [] } = await storage.get('redirects');
  const updatedRedirects = redirects.filter(r => r.id !== id);
  
  await storage.set({ redirects: updatedRedirects });
  loadRedirects();
}

/**
 * Toggles the enabled state of a redirect rule
 * @param {number} id - Rule ID
 */
async function toggleRedirect(id) {
  const { redirects = [] } = await storage.get('redirects');
  const redirect = redirects.find(r => r.id === id);
  
  if (redirect) {
    redirect.enabled = !redirect.enabled;
    await storage.set({ redirects });
    loadRedirects();
  }
}

/**
 * Validates domain format (supports IPs, IPv6, localhost, single-word hosts, and ports)
 * @param {string} domain 
 * @returns {boolean}
 */
function isValidDomain(domain) {
  const domainPattern = /^(\[[a-fA-F0-9:]+\]|([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(:\d+)?$/;
  return domainPattern.test(domain);
}

/**
 * Exports current configuration as a JSON file and copies to clipboard
 */
async function exportConfig() {
  const { redirects = [] } = await storage.get('redirects');
  
  const dataStr = JSON.stringify(redirects, null, 2);
  
  // Copy to clipboard for easy pasting without saving file
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(dataStr);
    }
  } catch (err) {
    console.debug('Clipboard copy skipped', err);
  }

  // Trigger file download
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'domain-swap-config.json';
  a.click();
  
  URL.revokeObjectURL(url);

  // Visual feedback on export button
  const originalNodes = Array.from(exportButton.childNodes).map(n => n.cloneNode(true));
  
  const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  checkSvg.setAttribute('width', '16');
  checkSvg.setAttribute('height', '16');
  checkSvg.setAttribute('viewBox', '0 0 24 24');
  checkSvg.setAttribute('fill', 'none');
  checkSvg.setAttribute('stroke', 'currentColor');
  checkSvg.setAttribute('stroke-width', '2.5');
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '20 6 9 17 4 12');
  checkSvg.appendChild(polyline);

  exportButton.replaceChildren(checkSvg, document.createTextNode(' Exported & Copied!'));
  setTimeout(() => {
    exportButton.replaceChildren(...originalNodes);
  }, 2200);
}

/**
 * Handles file selection from the fallback file picker
 */
function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    if (importJsonTextarea) {
      importJsonTextarea.value = e.target.result;
      showFeedback('File loaded into the textarea! Choose "Merge" or "Overwrite" below.', 'success');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/**
 * Displays feedback banner in the import section
 */
function showFeedback(message, type = 'error') {
  if (!importFeedback) return;
  importFeedback.className = `feedback-banner ${type}`;
  importFeedback.replaceChildren();

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');

  if (type === 'success') {
    const polyline = document.createElementNS(svgNS, 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(polyline);
  } else {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');

    const line1 = document.createElementNS(svgNS, 'line');
    line1.setAttribute('x1', '12');
    line1.setAttribute('y1', '8');
    line1.setAttribute('x2', '12');
    line1.setAttribute('y2', '12');

    const line2 = document.createElementNS(svgNS, 'line');
    line2.setAttribute('x1', '12');
    line2.setAttribute('y1', '16');
    line2.setAttribute('x2', '12.01');
    line2.setAttribute('y2', '16');

    svg.append(circle, line1, line2);
  }

  const span = document.createElement('span');
  span.textContent = message;

  importFeedback.append(svg, span);
  importFeedback.style.display = 'flex';
}

/**
 * Hides feedback banner
 */
function hideFeedback() {
  if (importFeedback) {
    importFeedback.style.display = 'none';
  }
}

/**
 * Processes JSON import with either 'merge' or 'overwrite' mode
 * @param {'merge' | 'overwrite'} mode 
 */
async function processJsonImport(mode) {
  const rawText = importJsonTextarea ? importJsonTextarea.value.trim() : '';
  
  if (!rawText) {
    showFeedback('Please paste JSON configuration text or upload a file first.', 'error');
    if (importJsonTextarea) importJsonTextarea.focus();
    return;
  }
  
  let importedRedirects;
  try {
    importedRedirects = JSON.parse(rawText);
  } catch (error) {
    showFeedback(`Invalid JSON format: ${error.message}`, 'error');
    return;
  }
  
  // Validate structure
  if (!Array.isArray(importedRedirects)) {
    showFeedback('Invalid format: Root must be an array of rule objects.', 'error');
    return;
  }
  
  // Validate each redirect object
  const isValid = importedRedirects.every(r => 
    r && r.from && r.to && (typeof r.enabled === 'boolean' || r.enabled === undefined)
  );
  
  if (!isValid || importedRedirects.length === 0) {
    showFeedback('JSON contains invalid rules. Each rule must have "from" and "to" fields.', 'error');
    return;
  }
  
  try {
    let finalRedirects;
    
    if (mode === 'overwrite') {
      finalRedirects = importedRedirects.map((r, index) => ({
        id: r.id || (index + 1),
        from: Array.isArray(r.from) ? r.from : [r.from],
        to: r.to.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        enabled: typeof r.enabled === 'boolean' ? r.enabled : true
      }));
    } else {
      // Merge mode
      const { redirects = [] } = await storage.get('redirects');
      const combinedMap = new Map();
      
      // Load current
      redirects.forEach(r => combinedMap.set(r.to, { ...r, from: Array.isArray(r.from) ? r.from : [r.from] }));
      let maxId = redirects.length > 0 ? Math.max(...redirects.map(r => r.id)) : 0;
      
      importedRedirects.forEach(imported => {
        const cleanTo = imported.to.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const importedFroms = Array.isArray(imported.from) ? imported.from : [imported.from];
        
        if (combinedMap.has(cleanTo)) {
          const existing = combinedMap.get(cleanTo);
          existing.from = [...new Set([...existing.from, ...importedFroms])];
        } else {
          combinedMap.set(cleanTo, {
            id: ++maxId,
            from: importedFroms,
            to: cleanTo,
            enabled: typeof imported.enabled === 'boolean' ? imported.enabled : true
          });
        }
      });
      
      finalRedirects = Array.from(combinedMap.values());
    }
    
    await storage.set({ redirects: finalRedirects });
    loadRedirects();
    
    showFeedback(`Successfully imported! ${finalRedirects.length} rules active.`, 'success');
    
    // Automatically reset textarea and close section after a short delay
    setTimeout(() => {
      if (importJsonTextarea) importJsonTextarea.value = '';
      if (importSection) importSection.classList.remove('active');
    }, 1800);
    
  } catch (error) {
    showFeedback(`Error applying configuration: ${error.message}`, 'error');
  }
}
