const API = globalThis.browser ?? globalThis.chrome;

const actionApi = (API && (API.action ?? API.browserAction));
 
if (actionApi && actionApi.onClicked) {
  actionApi.onClicked.addListener((tab) => {
    if (!tab || !tab.id) return;
    safeSendToTab(tab.id, { type: 'SHOW_AIGC_OVERLAY' });
  });
}

function safeSendToTab(tabId, msg) {
  try {
    const res = API.tabs.sendMessage(tabId, msg);
    if (res && typeof res.then === 'function') {
      res.catch(() => {}); 
    }
  } catch (err) {
    console.warn('[AIGC] Failed to send message:', err);
  }
}
