(async function loadSentiment() {
    try {
        const res = await fetch('data.json', { cache: 'no-store' });
        const data = await res.json();

        // banner text (if ai_generated true)
        if (data?.ai_generated && data?.ai_banner_text) {
            const ban = document.querySelector('.banner-slogan');
            if (ban) ban.textContent = data.ai_banner_text;
        }

        const s = data?.sentiment || {};
        const barEl = document.getElementById('sentimentBar');
        const legendEl = document.getElementById('sentimentLegend');
        const tipEl = document.getElementById('sentimentTooltip');

        const segments = [
            { key: 'positive', label: 'Positive', value: s.positive ?? 0, color: getVar('--pos'), extra: s.hint || '' },
            { key: 'neutral', label: 'Neutral', value: s.neutral ?? 0, color: getVar('--neu') },
            { key: 'negative', label: 'Negative', value: s.negative ?? 0, color: getVar('--neg') },
        ];

        renderSegments(barEl, segments, tipEl);
        renderLegend(legendEl, segments);
    } catch (err) {
        console.error('Failed to load data.json', err);
    }
})();

/* ---------- renderers ---------- */
function renderSegments(container, items, tip) {
    container.innerHTML = '';
    const norm = normalize(items);

    norm.forEach(d => {
        const seg = document.createElement('button');
        seg.className = 'progress-seg';
        seg.type = 'button';
        seg.style.width = d.pct + '%';
        seg.style.background = d.color;
        seg.setAttribute('aria-label', `${d.label} ${Math.round(d.pct)} percent`);
        seg.dataset.label = d.label;
        seg.dataset.percent = `${Math.round(d.pct)}%`;
        if (d.extra) seg.dataset.extra = d.extra;

        seg.addEventListener('pointerenter', (e) => showTip(e, tip));
        seg.addEventListener('pointerleave', () => hideTip(tip));
        seg.addEventListener('pointermove', (e) => moveTip(e, tip));

        container.appendChild(seg);
    });
}

function renderLegend(container, items) {
    const norm = normalize(items).map(d => ({ ...d, p: Math.round(d.pct) }));
    container.innerHTML = [
        `<div class="legend-item pos"><b>${norm[0].p}%</b>Positive</div>`,
        `<div class="legend-item neu"><b>${norm[1].p}%</b>Neutral</div>`,
        `<div class="legend-item neg"><b>${norm[2].p}%</b>Negative</div>`
    ].join('');
}

/* ---------- tooltip ---------- */
function showTip(e, tip) {
    const t = e.currentTarget;
    const extra = t.dataset.extra ? ` · ${t.dataset.extra}` : '';
    tip.textContent = `${t.dataset.label} — ${t.dataset.percent}${extra}`;
    tip.classList.add('show');
    tip.setAttribute('aria-hidden', 'false');
    moveTip(e, tip);
}
function hideTip(tip) {
    tip.classList.remove('show');
    tip.setAttribute('aria-hidden', 'true');
}
function moveTip(e, tip) {
    const offset = 16;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY - offset}px`;
}

/* ---------- utils ---------- */
function normalize(arr) {
    const total = arr.reduce((s, x) => s + (Number.isFinite(x.value) ? x.value : 0), 0) || 1;
    return arr.map(x => ({ ...x, pct: (x.value / total) * 100 }));
}
function getVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
/* ---------- end ---------- */



// ===================================================================================



// Content Categorization — reads data.json and renders the scale/badge
(async function initCategorization(){
  try{
    const res = await fetch('data.json', { cache: 'no-store' });
    const json = await res.json();
    applyCategorization(json?.categorization);
  }catch(e){
    console.error('categorization load failed:', e);
  }
})();

// Public updater for real-time change: window.updateCategorization(next)
function applyCategorization(cat){
  const therm = document.getElementById('catThermo');
  const pointer = document.getElementById('catPointer');
  const badge = document.getElementById('catBadge');

  // defaults & clamp
  const score = clamp(Number(cat?.score ?? 0), 0, 1); // 0=Safe(bottom) → 1=Unsafe(top)
  const scale = String(cat?.scale || '').toLowerCase(); // 'safe' | 'neutral' | 'unsafe'
  const label = cat?.label || 'Unknown';

  // position pointer: 0..1 mapped to [bottom..top]
  const y = (1 - score) * 100; // percentage from top
  pointer.style.top = `${y}%`;

  // badge
  badge.classList.remove('safe','neutral','unsafe');
  const variant = (scale === 'safe' || scale === 'neutral') ? scale : 'unsafe';
  badge.classList.add(variant);
  badge.textContent = label;
}

// expose updater
window.updateCategorization = function(nextCat){ applyCategorization(nextCat); };

/* utils */
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
