const BTN_ID = "toggle-reader";

async function toggleReaderOnActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const STYLE_ID = "__minimal_reader_style__";
            const existing = document.getElementById(STYLE_ID);
            if (existing) {
                existing.remove();
                return;
            }
            const style = document.createElement("style");
            style.id = STYLE_ID;
            style.textContent = `
/* Minimal, reversible reader-ish defaults */
:root { --reader-max: 820px; }
body { line-height: 1.6; font-size: 18px; }
main, article, #content, .content, .container { max-width: var(--reader-max) !important; margin-inline: auto !important; }
p { max-width: var(--reader-max); margin-block: 0.6em; }
`;
            document.documentElement.appendChild(style);
        }
    });
}

addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById(BTN_ID);
    btn?.addEventListener("click", toggleReaderOnActiveTab);
});