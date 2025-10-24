// bg.js
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "SHOW_AIGC_OVERLAY" });
});
