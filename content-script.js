(() => {
  const OVERLAY_ID = "aigc-overlay";
  const IFRAME_ID  = "aigc-iframe";

  console.log("[AIGC] content-script loaded on", location.href);

  async function shouldShowOverlay() {
    try {
      const url = chrome.runtime.getURL("data.json");
      console.log("[AIGC] fetching", url);
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      console.log("[AIGC] data.json =", data);
      // ai_generated true then overlay
      return Boolean(data?.ai_generated === true);
    } catch (e) {
      console.error("[AIGC] failed to read data.json", e);
      return false;
    }
  }

  function ensureStyles() {
    if (document.getElementById("aigc-overlay-style")) return;
    const style = document.createElement("style");
    style.id = "aigc-overlay-style";
    style.textContent = `
      #${OVERLAY_ID}{
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(0,0,0,.3);
        display: none; align-items: center; justify-content: center;
      }
      #${OVERLAY_ID}.show{ display: flex; }
      .aigc-frame-wrap{
        position: relative; width: 360px; height: 500px;
        border-radius: 12px; overflow: hidden; background: #fff;
        box-shadow: 0 22px 60px rgba(0,0,0,.35);
      }
      #${IFRAME_ID}{ width:100%; height:100%; border:0; display:block; }
      .aigc-close{
        position:absolute; top:6px; right:6px; width:26px; height:26px;
        border-radius:50%; border:0; background:rgba(0,0,0,.7); color:#fff;
        font-weight:bold; line-height:26px; cursor:pointer;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function createOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    ensureStyles();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;

    const wrap = document.createElement("div");
    wrap.className = "aigc-frame-wrap";

    const closeBtn = document.createElement("button");
    closeBtn.className = "aigc-close";
    closeBtn.textContent = "×";
    closeBtn.onclick = hideOverlay;

    const iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.src = chrome.runtime.getURL("popup.html");

    wrap.appendChild(iframe);
    wrap.appendChild(closeBtn);
    overlay.appendChild(wrap);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hideOverlay();
    });

    document.documentElement.appendChild(overlay);
    console.log("[AIGC] overlay created");
  }

  function showOverlay() {
    createOverlay();
    document.getElementById(OVERLAY_ID)?.classList.add("show");
    console.log("[AIGC] overlay shown");
  }
  function hideOverlay() {
    document.getElementById(OVERLAY_ID)?.classList.remove("show");
    console.log("[AIGC] overlay hidden");
  }

  // Message hooks (future backend)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "SHOW_AIGC_OVERLAY") showOverlay();
    if (msg?.type === "HIDE_AIGC_OVERLAY") hideOverlay();
  });

  (async () => {
    const shouldShow = await shouldShowOverlay();
    if (shouldShow) showOverlay();
  })();
})();
 