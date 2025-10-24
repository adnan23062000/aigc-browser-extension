(() => {
    const DATA_URL = 'data.json';

    /* ---------- Small helpers ---------- */
    const qs = (sel, root = document) => root.querySelector(sel);
    const qid = (id) => document.getElementById(id);
    const getVar = (name) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const normalize = (arr) => {
        const total = arr.reduce((s, x) => s + (Number.isFinite(x.value) ? x.value : 0), 0) || 1;
        return arr.map((x) => ({ ...x, pct: (x.value / total) * 100 }));
    };

    /* ---------- Data loader (single fetch) ---------- */
    async function loadData() {
        const res = await fetch(DATA_URL, { cache: 'no-store' });
        return res.json();
    }

    /* ---------- Banner ---------- */
    function applyBanner(data) {
        const banner = document.querySelector('.banner');
        const textEl = document.querySelector('.banner-slogan');
        if (!banner || !textEl) return;

        const isAI = Boolean(data?.ai_generated);
        const msg = data?.ai_banner_text || '';

        // Always set text from JSON
        textEl.textContent = msg;

        // Remove old color classes
        banner.classList.remove('banner--red', 'banner--green');

        if (isAI) {
            // AI generated → red banner + enable UI
            banner.classList.add('banner--red');
            document.body.classList.remove('ui-disabled');
        } else {
            // Not AI → green banner + disable rest of UI
            banner.classList.add('banner--green');
            document.body.classList.add('ui-disabled');
        }
    }

    /* ---------- Sentiment ---------- */
    function renderSentiment(data) {
        const s = data?.sentiment || {};
        const barEl = qid('sentimentBar');
        const legendEl = qid('sentimentLegend');
        const tipEl = qid('sentimentTooltip');
        if (!barEl || !legendEl || !tipEl) return;

        const segments = [
            { key: 'positive', label: 'Positive', value: s.positive ?? 0, color: getVar('--pos'), extra: s.hint || '' },
            { key: 'neutral', label: 'Neutral', value: s.neutral ?? 0, color: getVar('--neu') },
            { key: 'negative', label: 'Negative', value: s.negative ?? 0, color: getVar('--neg') },
        ];

        // bar
        barEl.innerHTML = '';
        const norm = normalize(segments);
        norm.forEach((d) => {
            const seg = document.createElement('button');
            seg.className = 'progress-seg';
            seg.type = 'button';
            seg.style.width = d.pct + '%';
            seg.style.background = d.color;
            seg.setAttribute('aria-label', `${d.label} ${Math.round(d.pct)} percent`);
            seg.dataset.label = d.label;
            seg.dataset.percent = `${Math.round(d.pct)}%`;
            if (d.extra) seg.dataset.extra = d.extra;

            seg.addEventListener('pointerenter', (e) => showTip(e, tipEl));
            seg.addEventListener('pointerleave', () => hideTip(tipEl));
            seg.addEventListener('pointermove', (e) => moveTip(e, tipEl));
            barEl.appendChild(seg);
        });

        // legend
        const ln = normalize(segments).map((d) => ({ ...d, p: Math.round(d.pct) }));
        legendEl.innerHTML = [
            `<div class="legend-item pos"><b>${ln[0].p}%</b>Positive</div>`,
            `<div class="legend-item neu"><b>${ln[1].p}%</b>Neutral</div>`,
            `<div class="legend-item neg"><b>${ln[2].p}%</b>Negative</div>`,
        ].join('');
    }

    // tooltip helpers
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

    /* ---------- Categorization (thermometer + badge) ---------- */
    function applyCategorization(cat) {
        const pointer = qid('catPointer');
        const badge = qid('catBadge');
        if (!pointer || !badge) return;

        const score = clamp(Number(cat?.score ?? 0), 0, 1); // 0=safe(bottom) → 1=unsafe(top)
        const scale = String(cat?.scale || '').toLowerCase();
        const label = cat?.label || 'Unknown';

        const y = (1 - score) * 100; // map to top-origin
        pointer.style.top = `${y}%`;

        badge.classList.remove('safe', 'neutral', 'unsafe');
        const variant = (scale === 'safe' || scale === 'neutral') ? scale : 'unsafe';
        badge.classList.add(variant);
        badge.textContent = label;
    }

    /* expose updater (keep original API) */
    window.updateCategorization = function (nextCat) { applyCategorization(nextCat); };

    /* ---------- Audience (rating icon + segment) ---------- */
    function applyAudience(aud) {
        const icon = qid('audRatingIcon');
        const segEl = qid('audSegment');
        if (!icon || !segEl) return;

        const rating = String(aud?.rating || 'TV-Y7').trim();
        const segment = String(aud?.segment || '').trim();

        icon.src = `assets/tv_parental_icon/${rating}.svg`;
        icon.alt = `TV Parental Rating: ${rating}`;
        segEl.textContent = segment;
    }

    window.updateAudience = function (nextAudience) { applyAudience(nextAudience); };

    /* ---------- Comment Summary (card + risks + links) ---------- */
    function applyCommentSummary({ consensus = {}, risks = '', links = [] } = {}) {
        const labelEl = qid('csLabel');
        const summaryEl = qid('csSummary');
        const toggleEl = qid('csToggle');
        const riskEl = qid('csRisk');
        const linksEl = qid('csLinks');
        if (!labelEl || !summaryEl || !toggleEl || !riskEl || !linksEl) return;

        const label = consensus?.label || '—';
        const summary = consensus?.summary || '';
        const fullSummary = consensus?.full_summary || '';

        labelEl.textContent = label;
        summaryEl.textContent = summary;

        let expanded = false;
        toggleEl.onclick = () => {
            expanded = !expanded;
            toggleEl.setAttribute('aria-expanded', String(expanded));
            toggleEl.classList.toggle('active', expanded);
            toggleEl.textContent = expanded ? 'Show Less' : 'Show Full Summary';
            summaryEl.textContent = expanded && fullSummary ? fullSummary : summary;
        };

        riskEl.textContent = risks || '';

        linksEl.innerHTML = '';
        (Array.isArray(links) ? links : []).forEach((l) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = l?.url || '#';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = l?.title || 'Resource';
            li.appendChild(a);
            linksEl.appendChild(li);
        });
    }

    window.updateCommentSummary = function (next) { applyCommentSummary(next || {}); };

    /* ---------- Bootstrap ---------- */
    (async function init() {
        try {
            const data = await loadData();
            applyBanner(data);
            renderSentiment(data);
            applyCategorization(data?.categorization);
            applyAudience(data?.audience);
            applyCommentSummary({
                consensus: data?.consensus,
                risks: data?.risks,
                links: data?.links,
            });
        } catch (err) {
            console.error('Failed to load data.json', err);
        }
    })();
})();
