// Initialize rules on extension installation
chrome.runtime.onInstalled.addListener(async () => {
  const { redirects } = await chrome.storage.local.get('redirects');
  
  if (!redirects) {
    await chrome.storage.local.set({ redirects: [] });
  }
  
  updateRedirectRules();
});

/**
 * Updates the declarativeNetRequest dynamic rules based on the 
 * currently enabled redirects in sync storage.
 */
async function updateRedirectRules() {
  const { redirects } = await chrome.storage.local.get('redirects');
  
  if (!redirects || redirects.length === 0) {
    // Remove all rules if there are no redirects configured
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRules.map(rule => rule.id)
    });
    return;
  }

  // Create new dynamic rules from enabled redirects
  let ruleIdCounter = 1;
  const newRules = redirects
    .filter(redirect => redirect.enabled && redirect.from && redirect.to)
    .flatMap(redirect => {
      const fromArray = Array.isArray(redirect.from) ? redirect.from : [redirect.from];
      
      return fromArray.map(domain => {
        let transformHost = redirect.to;
        const transformBody = { host: transformHost };
        
        // Check if the destination includes a port (e.g., localhost:3000)
        const portMatch = redirect.to.match(/:(\d+)$/);
        if (portMatch) {
          transformBody.host = redirect.to.slice(0, -portMatch[0].length);
          transformBody.port = portMatch[1];
        } else {
          // Clear port to avoid retaining origin's port when redirecting
          transformBody.port = "";
        }

        return {
          id: ruleIdCounter++,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              transform: transformBody
            }
          },
          condition: {
            urlFilter: `||${domain}`,
            resourceTypes: ["main_frame"]
          }
        };
      });
    });

  // Apply rule updates: remove old ones, add new ones
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(rule => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: newRules
  });
}

// Listen for storage changes to instantly apply updates
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.redirects) {
    updateRedirectRules();
  }
});
