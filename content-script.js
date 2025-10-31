(() => {
  const OVERLAY_ID = "aigc-overlay";
  const IFRAME_ID  = "aigc-iframe";

  /* ---------- auto trigger from data.json ---------- */
  async function shouldShowOverlay() {
    try {
      const url = chrome.runtime.getURL("data.json");
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      return Boolean(data?.ai_generated === true);
    } catch (e) {
      console.warn("[AIGC] data.json fetch failed", e);
      return false;
    }
  }

  function ensureStyles() {
    if (document.getElementById("aigc-overlay-style")) return;
    const css = `
      #${OVERLAY_ID}{
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: transparent;
        display: none;
        align-items: flex-start;      /* top */
        justify-content: flex-end;    /* right */
        --aigc-sbw: 0px;              /* scrollbar width (measured in JS) */
        padding: 10px calc(12px + var(--aigc-sbw)) 0 0;
        overscroll-behavior: contain; /* keep wheel events inside overlay */
      }
      #${OVERLAY_ID}.show{ display: flex; }

      .aigc-frame-wrap{
        position: relative;
  position: relative;
  width: 400px;
  height: 600px;
  max-width: min(400px, 94vw);
  max-height: min(600px, 92vh);
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 22px 60px rgba(0,0,0,.35);
        transform-origin: top right;
        animation: aigc-slide .18s ease-out;
        overscroll-behavior: contain;
      }

      @keyframes aigc-slide{
        from{ transform: translateY(-8px) scale(.98); opacity: .0; }
        to  { transform: translateY(0)   scale(1);   opacity: 1;  }
      }

      #${IFRAME_ID}{
        width:100%;
        height:100%;
        border:0;
        display:block;
      }

      .aigc-close{
        position:absolute; top:6px; right:6px;
        width:26px; height:26px; border-radius:50%;
        border:0; background:rgba(0,0,0,.7); color:#fff;
        font-weight:700; line-height:26px; cursor:pointer;
      }
    `;
    const style = document.createElement("style");
    style.id = "aigc-overlay-style";
    style.textContent = css;
    document.documentElement.appendChild(style);
  }


  function getViewportScrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  function getOSScrollbarWidthFallback() {
    const box = document.createElement('div');
    box.style.cssText =
      'position:absolute;top:-9999px;left:-9999px;width:120px;height:120px;overflow:scroll;';
    document.body.appendChild(box);
    const sbw = box.offsetWidth - box.clientWidth;
    box.remove();
    return Math.max(0, sbw);
  }

  function updateScrollbarPadding() {
    let sbw = getViewportScrollbarWidth();
    if (sbw === 0) {
      try { sbw = getOSScrollbarWidthFallback(); } catch { sbw = 0; }
    }
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.style.setProperty('--aigc-sbw', sbw + 'px');
  }

  window.addEventListener('resize', updateScrollbarPadding);

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

    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        doc.documentElement.style.height = '100%';
        doc.documentElement.style.overflow = 'hidden';

        const body = doc.body;
        body.style.margin = '0';
        body.style.height = '100%';
        body.style.overflowY = 'auto';
        body.style.webkitOverflowScrolling = 'touch';

        const app = doc.querySelector('#app, .popup-root');
        if (app) {
          app.style.height = '100%';
          app.style.overflowY = 'auto';
          app.style.boxSizing = 'border-box';
        }
      } catch (_) { /* noop */ }
    });

    wrap.appendChild(iframe);
    wrap.appendChild(closeBtn);
    overlay.appendChild(wrap);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hideOverlay(); 
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideOverlay();   
    });

    document.documentElement.appendChild(overlay);
    updateScrollbarPadding(); 
  }

  function showOverlay() {
    createOverlay();
    document.getElementById(OVERLAY_ID)?.classList.add("show");
    updateScrollbarPadding(); 
  }

  function hideOverlay() {
    document.getElementById(OVERLAY_ID)?.classList.remove("show");
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "SHOW_AIGC_OVERLAY") showOverlay();
    if (msg?.type === "HIDE_AIGC_OVERLAY") hideOverlay();
  });

  (async () => {
    if (await shouldShowOverlay()) showOverlay();
  })();
})();
