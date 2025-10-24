// cross-browser API reference
const API = globalThis.browser ?? globalThis.chrome;

// choose correct action API (Chrome uses chrome.action, old browsers use browserAction)
const actionApi = (API && (API.action ?? API.browserAction));

// when user clciked on extension icon  
if (actionApi && actionApi.onClicked) {
  actionApi.onClicked.addListener((tab) => {
    if (!tab || !tab.id) return;
    safeSendToTab(tab.id, { type: 'SHOW_AIGC_OVERLAY' });
  });
}

// sendMessage wrapper — Chrome returns void, Firefox returns Promise
function safeSendToTab(tabId, msg) {
  try {
    const res = API.tabs.sendMessage(tabId, msg);
    if (res && typeof res.then === 'function') {
      res.catch(() => {}); // Firefox Promise rejection ignore
    }
  } catch (err) {
    console.warn('[AIGC] Failed to send message:', err);
  }
}
