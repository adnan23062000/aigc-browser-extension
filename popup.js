const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function pct(n, showPercent = true, precision = 0) {
  if (typeof n !== 'number' || Number.isNaN(n)) return showPercent ? '0%' : '0';
  const val = showPercent ? (n * 100) : n;
  return showPercent ? `${val.toFixed(precision)}%` : `${val.toFixed(precision)}`;
}

function safeGetURL(path) {
  try {
    return (globalThis.chrome?.runtime?.getURL?.(path)) || path;
  } catch {
    return path;
  }
}

// --------- Data Loader ----------
async function loadData() {
  const url = safeGetURL('data.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load data.json: ${res.status}`);
  return res.json();
}

// --------- Banner ----------
function applyBanner(data) {
  const banner = qs('.banner');
  const slogan = qs('.banner-slogan');
  if (!banner || !slogan) return;

  const trueText  = data?.banner_v2?.is_ai_generated_flag?.true_text  || 'This is an AI Generated Content';
  const falseText = data?.banner_v2?.is_ai_generated_flag?.false_text || 'This is not an AI Generated Content';

  const aiTrueBg  = data?.banner_v2?.styles?.ai_true_bg  || '#dc2626';
  const aiFalseBg = data?.banner_v2?.styles?.ai_false_bg || '#16a34a';
  const textColor = data?.banner_v2?.styles?.text_color  || '#ffffff';

  if (data?.ai_generated) {
    banner.classList.remove('banner--green');
    banner.classList.add('banner--red');
    banner.style.background = aiTrueBg;
    slogan.textContent = trueText;
  } else {
    banner.classList.remove('banner--red');
    banner.classList.add('banner--green');
    banner.style.background = aiFalseBg;
    slogan.textContent = falseText;
  }
  slogan.style.color = textColor;
}

// --------- Title ----------
function applyTitle(title) {
  const el = qs('#videoTitle');
  if (el) el.textContent = title || '—';
}

// --------- Sentiment ----------
function applySentiment(sentiment) {
  const bar = qs('#sentimentBar');
  const legend = qs('#sentimentLegend');
  const tooltip = qs('#sentimentTooltip');
  if (!bar || !legend) return;

  const showPercent = !!sentiment?.format?.show_percent;
  const precision = Number.isFinite(sentiment?.format?.precision) ? sentiment.format.precision : 0;

  const pos = Number(sentiment?.positive) || 0;
  const neu = Number(sentiment?.neutral) || 0;
  const neg = Number(sentiment?.negative) || 0;

  const labels = sentiment?.labels || { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' };
  const hints  = sentiment?.tooltip || {};

  bar.innerHTML = '';
  legend.innerHTML = '';

  const segments = [
    { key: 'positive', value: pos, title: hints.positive || '', var: '--pos' },
    { key: 'neutral',  value: neu, title: hints.neutral  || '', var: '--neu' },
    { key: 'negative', value: neg, title: hints.negative || '', var: '--neg' },
  ];

  const total = pos + neu + neg || 1;

  segments.forEach(({ key, value, title, var: v }) => {
    const seg = document.createElement('span');
    seg.className = 'progress-seg';
    const widthPct = (value / total) * 100;
    seg.style.width = `${widthPct}%`;
    seg.style.background = getComputedStyle(document.documentElement).getPropertyValue(v) || '#ddd';
    seg.setAttribute('aria-label', `${labels[key]} ${pct(value, true, precision)}`);
    seg.dataset.key = key;

    // tooltip handlers
    seg.addEventListener('mousemove', (e) => {
      if (!tooltip) return;
      tooltip.textContent = title || `${labels[key]}: ${pct(value, true, precision)}`;
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.classList.add('show');
    });
    seg.addEventListener('mouseleave', () => tooltip?.classList.remove('show'));

    bar.appendChild(seg);
  });

  // Legend
  const mkLegend = (name, val, cls) => {
    const d = document.createElement('div');
    d.className = `legend-item ${cls}`;
    d.innerHTML = `<b>${labels[name] || name}</b>${pct(val, showPercent, precision)}`;
    return d;
  };
  legend.appendChild(mkLegend('positive', pos, 'pos'));
  legend.appendChild(mkLegend('neutral',  neu, 'neu'));
  legend.appendChild(mkLegend('negative', neg, 'neg'));
}

/* ===================== Info Popover (singleton) ===================== */
let activePopover = null;
let activeAnchor = null;
let hideTimer = null;

function ensurePopover() {
  let el = document.getElementById('catInfoPopover');
  if (!el) {
    el = document.createElement('div');
    el.id = 'catInfoPopover';
    el.className = 'info-popover';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);

    el.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    el.addEventListener('mouseleave', scheduleHide);
  }
  return el;
}

function positionPopover(popover, anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const pad = 8; 
  const vw = window.innerWidth;
  const popW = popover.offsetWidth || 260;
  const popH = popover.offsetHeight || 60;

  let left = rect.left + (rect.width / 2) - (popW / 2);
  let top  = rect.top - popH - margin;

  const clampedLeft = Math.max(pad, Math.min(left, vw - popW - pad));
  popover.style.left = `${clampedLeft}px`;
  popover.style.top  = `${Math.max(pad, top)}px`;

  popover.classList.remove('arrow-left', 'arrow-right');
  if (clampedLeft !== left) {
    if (clampedLeft > left) {
      popover.classList.add('arrow-left');
    } else {
      popover.classList.add('arrow-right');
    }
  }
}

function showPopover(anchor, text) {
  const pop = ensurePopover();
  pop.textContent = text || 'No details available.';
  pop.classList.add('show');

  requestAnimationFrame(() => positionPopover(pop, anchor));

  activePopover = pop;
  activeAnchor = anchor;

  document.addEventListener('click', onDocClick, true);
  document.addEventListener('keydown', onEsc, true);
  window.addEventListener('resize', onReposition, { passive: true });
  window.addEventListener('scroll', onReposition, { passive: true });
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => hidePopover(), 120);
}

function hidePopover() {
  if (!activePopover) return;
  activePopover.classList.remove('show');
  activePopover = null;
  activeAnchor = null;

  document.removeEventListener('click', onDocClick, true);
  document.removeEventListener('keydown', onEsc, true);
  window.removeEventListener('resize', onReposition);
  window.removeEventListener('scroll', onReposition);
}

function onDocClick(e) {
  if (!activePopover) return;
  if (activePopover.contains(e.target) || activeAnchor?.contains(e.target)) return;
  hidePopover();
}
function onEsc(e) {
  if (e.key === 'Escape') hidePopover();
}
function onReposition() {
  if (activePopover && activeAnchor) positionPopover(activePopover, activeAnchor);
}

// --------- Categorization (Badge + Thermo) ----------
function applyCategorization(cat) {
  const badge = qs('#catBadge');
  const thermo = qs('#catThermo');
  const pointerEl = qs('#catPointer');
  if (!thermo || !badge) return;

  // Badge text
  const label = cat?.label || '—';
  badge.textContent = label;

  let infoButton = qs('#catInfoBtn');
  if (!infoButton) {
    infoButton = document.createElement('button');
    infoButton.className = 'info-btn';
    infoButton.id = 'catInfoBtn';
    infoButton.setAttribute('aria-label', 'More info');
    badge.appendChild(infoButton);
  } else {
    badge.appendChild(infoButton);
  }

  infoButton.innerHTML = '';
  const img = document.createElement('img');
  img.src = 'assets/info.png';
  img.alt = 'Info';
  img.style.width = '14px';
  img.style.height = '14px';
  img.style.display = 'block';
  infoButton.appendChild(img);

  const infoText = cat?.information_icon || cat?.ui?.info_tooltip || 'No details available.';

  if (!infoButton._bound) {
    infoButton._bound = true;

    infoButton.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      showPopover(infoButton, infoText);
    });
    infoButton.addEventListener('mouseleave', scheduleHide);

    infoButton.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(hideTimer);
      showPopover(infoButton, infoText);
    });
  }

  badge.classList.remove('safe', 'neutral', 'unsafe');
  const scale = (cat?.scale || '').toLowerCase();
  if (['safe', 'neutral', 'unsafe'].includes(scale)) badge.classList.add(scale);

  const labels = cat?.ui?.risk_gauge?.scale_labels ?? ['Unsafe', 'Neutral', 'Safe'];
  const ticks = qsa('.scale-labels .tick');
  ticks.forEach((t, i) => {
    t.textContent = labels[i] ?? t.textContent;
  });

  const pointer = Number.isFinite(cat?.ui?.risk_gauge?.pointer)
    ? cat.ui.risk_gauge.pointer
    : (Number.isFinite(cat?.score) ? cat.score : 0.5);

  if (pointerEl) {
    const pctLeft = Math.max(0, Math.min(1, pointer)) * 100;
    pointerEl.style.left = `${pctLeft}%`;
  }
}

function applyConsensus(cons) {
  const sectionHeading = qsa('.comment-summary-wide .section-heading')[0];
  if (sectionHeading) {
    sectionHeading.textContent = cons?.ui?.section_title || 'Summary of the Community is thinking about';
  }

  const label = qs('#csLabel');
  const summary = qs('#csSummary');
  if (label)   label.textContent = cons?.label || '—';
  if (!summary) return;

  const oldBtn = qs('#csToggle');
  if (oldBtn) oldBtn.style.display = 'none';

  const shortText = cons?.summary || '—';
  const fullText  = cons?.full_summary || shortText;

  let isExpanded = false;

  const renderSummary = () => {
    summary.textContent = isExpanded ? fullText : shortText;

    if (fullText !== shortText) {
      const link = document.createElement('span');
      link.className = 'see-more';
      link.id = 'seeMoreLink';
      link.textContent = isExpanded ? ' See less' : ' See more';
      summary.appendChild(link);

      link.addEventListener('click', (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        renderSummary();
      });
    }
  };

  renderSummary();

  applyAboutAccordion(cons?.ui?.about_accordion);
}

function applyAboutAccordion(about) {
  const aboutSection = qs('.cs-about');
  if (!aboutSection) return;

  const summaryEl = aboutSection.querySelector('summary');
  const bodyEl = aboutSection.querySelector('p');

  const title = about?.title ?? 'About this';
  const body  = about?.body  ?? 'No details available.';

  if (summaryEl) summaryEl.textContent = title;
  if (bodyEl)    bodyEl.textContent = body;
}

function applyRisks(data) {
  const riskWrap = qs('.cs-risk-wide');
  const riskTitleEl = riskWrap?.querySelector('h4');
  const riskBody = qs('#csRisk');
  const expandBtn = qs('#riskExpand');
  const extra = qs('#riskExtra');

  if (riskTitleEl) {
    riskTitleEl.textContent = data?.risk_panel?.title || 'Risk Patterns in the Content';
  }
  if (riskBody) {
    riskBody.textContent = data?.risks || data?.risk_panel?.content_scripts || '—';
  }

  if (expandBtn && extra) {
    expandBtn.addEventListener('click', () => {
      extra.classList.toggle('show');
      expandBtn.textContent = extra.classList.contains('show')
        ? '▲ Hide typical viewer responses'
        : '▼ See how viewers generally address these risks';
    });

    extra.textContent = data?.risk_panel?.content_scripts 
      || 'Viewers typically respond by reporting misleading content, adding clarifying comments, or referencing credible sources to reduce misinformation.';
  }
}

function applyLinks(data) {
  const wrap  = document.querySelector('.cs-links');
  const title = document.querySelector('.cs-links-title');
  const list  = document.querySelector('#csLinks');
  if (!wrap || !title || !list) return;

  const refNote = data?.references?.note || 'Related references and citations provided by community:';

  const refs = Array.isArray(data?.references?.list) ? data.references.list : [];
  const lnks = Array.isArray(data?.links) ? data.links : [];
  const merged = [...refs, ...lnks].filter(item => item && item.title && item.url);

  const seen = new Set();
  const unique = [];
  for (const item of merged) {
    const norm = String(item.url).trim().replace(/\/+$/,'').toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    unique.push(item);
  }

  title.textContent = refNote;
  list.innerHTML = '';

  // Render all links (no cap)
  const frag = document.createDocumentFragment();
  unique.forEach(item => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = item.title;
    li.appendChild(a);
    frag.appendChild(li);
  });
  list.appendChild(frag);

  console.info(`Rendered ${unique.length} reference link(s).`);
}

// --------- Audience ----------
function applyAudience(aud) {
  const icon = qs('#audRatingIcon');
  const seg  = qs('#audSegment');

  const rating = (aud?.rating || 'TV-Y').toUpperCase();
  const iconPath = `assets/tv_parental_icon/${rating}.svg`;

  if (icon) {
    icon.src = iconPath;
    icon.alt = `TV Parental Rating: ${rating}`;
  }
  if (seg) {
    seg.textContent = aud?.segment || '—';
  }

}

// --------- Boot ----------
(async function init() {
  try {
    const data = await loadData();

    applyTitle(data?.title);
    applyBanner(data);
    applySentiment(data?.sentiment);
    applyCategorization(data?.categorization);
    applyConsensus(data?.consensus);
    applyRisks(data);
    applyLinks(data);
    applyAudience(data?.audience);

    console.info('AIGC popup initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize AIGC popup:', err);
  }
})();
