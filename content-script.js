// content-script.js
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

  /* ---------- styles: top-right anchored panel ---------- */
  function ensureStyles() {
    if (document.getElementById("aigc-overlay-style")) return;
    const css = `
      #${OVERLAY_ID}{
        position: fixed; inset: 0; z-index: 2147483647;
        background: transparent; 
        display: none; align-items: flex-start; 
        justify-content: flex-end; 
        padding: 10px 12px 0 0; 
      }
      #${OVERLAY_ID}.show{ display: flex; }

      .aigc-frame-wrap{
        position: relative;
        width: 360px; height: 500px;
        border-radius: 12px; overflow: hidden; background: #fff;
        box-shadow: 0 22px 60px rgba(0,0,0,.35);
        transform-origin: top right;
        animation: aigc-slide .18s ease-out;
      }
      @keyframes aigc-slide{
        from{ transform: translateY(-8px) scale(.98); opacity: .0; }
        to  { transform: translateY(0)    scale(1);   opacity: 1;  }
      }

      #${IFRAME_ID}{ width:100%; height:100%; border:0; display:block; }

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

  /* ---------- overlay DOM ---------- */
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
      if (e.target === overlay) hideOverlay();       // backdrop click to close
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideOverlay();        // Esc to close
    });

    document.documentElement.appendChild(overlay);
  }

  function showOverlay(){ createOverlay(); document.getElementById(OVERLAY_ID)?.classList.add("show"); }
  function hideOverlay(){ document.getElementById(OVERLAY_ID)?.classList.remove("show"); }

  /* ---------- open/close messages (icon click / future backend) ---------- */
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "SHOW_AIGC_OVERLAY") showOverlay();
    if (msg?.type === "HIDE_AIGC_OVERLAY") hideOverlay();
  });

  /* ---------- auto-on when ai_generated === true ---------- */
  (async () => {
    if (await shouldShowOverlay()) showOverlay();
  })();
})();
