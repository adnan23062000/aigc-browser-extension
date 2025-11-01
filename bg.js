const API = globalThis.browser ?? globalThis.chrome;
const actionApi = (API && (API.action ?? API.browserAction));

async function isAIGCEnabled() {
  try {
    const url = API.runtime.getURL("data.json");
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return Boolean(data?.ai_generated === true);
  } catch (err) {
    console.warn("[AIGC] Failed to load data.json:", err);
    return false;
  }
}

if (actionApi && actionApi.onClicked) {
  actionApi.onClicked.addListener(async (tab) => {
    if (!tab || !tab.id) return;
    if (await isAIGCEnabled()) {
      safeSendToTab(tab.id, { type: 'SHOW_AIGC_OVERLAY' });
    } else {
      console.info("[AIGC] ai_generated flag is false — overlay not shown.");
    }
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
