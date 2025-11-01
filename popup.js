
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function safeGetURL(path) {
  try {
    return (globalThis.chrome?.runtime?.getURL?.(path)) || path;
  } catch {
    return path;
  }
}

// ---------- Load Data ----------
async function loadData() {
  const url = safeGetURL('data.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load data.json: ${res.status}`);
  return res.json();
}

// ---------- Title ----------
function applyTitle(title) {
  const el = qs('#videoTitle');
  if (el) el.textContent = title || 'Untitled Content';
}

// ---------- Categorization ----------
function applyCategorization(data) {
  const badge = qs('#catBadge');
  const thermo = qs('#catThermo');
  const pointerEl = qs('#catPointer');
  if (!badge || !thermo) return;

  const category = (data.content_category || '').trim();
  const label = category || '—';
  badge.textContent = label;

  const categoryMeanings = {
    // Positive
    "Educational": "Content providing learning or informative value.",
    "News and Media": "Content related to current events or updates.",
    "Entertainment": "Content intended for enjoyment or social interaction.",
    "Advertisement/Promotional": "Content promoting products or services.",
    "AI Personalized Content": "Content tailored and customized by AI for individuals for personalized use.",

    // Negative
    "Impersonation": "Mimicking someone without their consent.",
    "Appropriated Likeness": "Unauthorized use of someone's identity or image.",
    "Non-consensual Intimate Imagery": "Sharing intimate content without consent.",
    "IP Infringement": "Violation of intellectual property rights.",
    "Counterfeit": "Content representing fake or fraudulent products.",
    "Scaling & Amplification": "Unethical spreading or exaggeration of content.",
    "Targeting & Personalization": "Invasive or manipulative content targeting individuals."
  };

  const infoText = categoryMeanings[category] || 'No specific information available for this category.';

  let infoButton = qs('#catInfoBtn');
  if (!infoButton) {
    infoButton = document.createElement('button');
    infoButton.className = 'info-btn';
    infoButton.id = 'catInfoBtn';
    badge.appendChild(infoButton);
  }
  

  infoButton.innerHTML = ''; 
  const infoIcon = document.createElement('img');
  infoIcon.src = './assets/info.png';
  infoIcon.alt = 'Info';
  infoButton.appendChild(infoIcon);
  infoButton.title = infoText;

  infoButton.onmouseenter = () => showPopover(infoButton, infoText);
  infoButton.onmousexit = hidePopover;

  // ---------------- Thermometer pointer logic ----------------
  if (pointerEl) {
    const positiveCategories = [
      "Educational", "News and Media", "Entertainment",
      "Advertisement/Promotional", "AI Personalized Content"
    ];

    const negativeCategories = [
      "Impersonation", "Appropriated Likeness", "Non-consensual Intimate Imagery",
      "IP Infringement", "Counterfeit", "Scaling & Amplification", "Targeting & Personalization"
    ];

    let position = 50; 

    if (positiveCategories.includes(category)) position = 90;     
    else if (negativeCategories.includes(category)) position = 10; 

    pointerEl.style.left = `${position}%`;
  }
}


// ---------- Simple Popover ----------
let activePopover = null;
function showPopover(anchor, text) {
  hidePopover();
  const pop = document.createElement('div');
  pop.className = 'info-popover show';
  pop.textContent = text;
  document.body.appendChild(pop);

  const rect = anchor.getBoundingClientRect();
  pop.style.left = `${rect.left + rect.width / 2 - pop.offsetWidth / 2}px`;
  pop.style.top = `${rect.top - 40}px`;

  activePopover = pop;
}
function hidePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

// ---------- Community Consensus ----------
// ---------- Community Consensus ----------
function applyConsensus(data) {
  const heading = qs('#csHeading');
  const summary = qs('#csSummary');
  if (!summary) return;

  // Get the consensus value and format it
  const consensusValue = data.community_consensus || 'Unknown';
  
  // Update the heading with formatted consensus
  if (heading) {
    heading.innerHTML = `Community Consensus about the Content: <span class="consensus-badge">${consensusValue}</span>`;
  }
  
  const fullText = data.community_consensus_message || 'No summary available.';

  let isExpanded = false;
  const render = () => {
    summary.textContent = isExpanded ? fullText : fullText.slice(0, 180);
    if (fullText.length > 180) {
      const link = document.createElement('span');
      link.className = 'see-more';
      link.textContent = isExpanded ? ' See less' : ' See more';
      link.addEventListener('click', () => {
        isExpanded = !isExpanded;
        render();
      });
      summary.appendChild(link);
    }
  };
  render();
}

// ---------- Risk Patterns ----------
function applyRisks(data) {
  const riskBody = qs('#csRisk');
  const expandBtn = qs('#riskExpand');
  const extra = qs('#riskExtra');

  const list = Array.isArray(data.risk_patterns) ? data.risk_patterns : [];
  riskBody.innerHTML = list.length
    ? list.map(r => `• ${r}`).join('<br>')
    : 'No risk patterns detected.';

  if (expandBtn && extra) {
    expandBtn.addEventListener('click', () => {
      extra.classList.toggle('show');
      expandBtn.textContent = extra.classList.contains('show')
        ? '▲ Hide typical viewer responses'
        : '▼ See how viewers generally address these risks';
    });
  }
}

// ---------- References ----------
function applyLinks(data) {
  const list = qs('#csLinks');
  if (!list) return;

  const refs = Array.isArray(data.relevant_references) ? data.relevant_references : [];
  list.innerHTML = '';

  if (!refs.length) {
    const li = document.createElement('li');
    li.textContent = 'No references available.';
    list.appendChild(li);
    return;
  }

  refs.forEach(url => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = url;
    li.appendChild(a);
    list.appendChild(li);
  });
}

// ---------- Audience ----------
function applyAudience(data) {
  const icon = qs('#audRatingIcon');
  const seg = qs('#audSegment');

  const rating = (data.age_appropriateness || 'TV-Y').toUpperCase();
  const iconPath = `assets/tv_parental_icon/${rating}.svg`;

  if (icon) {
    icon.src = iconPath;
    icon.alt = `TV Parental Rating: ${rating}`;
  }

  // ------- Rating description lookup -------
  const ratingDescriptions = {
    "TV-Y": "This program is designed to be appropriate for all children.",
    "TV-Y7": "This program is designed for children age 7 and above.",
    "TV-Y7-FV": "This program is designed for children age 7 and above, with more intense fantasy violence.",
    "TV-G": "This program is suitable for all ages.",
    "TV-PG": "Parental guidance suggested.",
    "TV-14": "Parents strongly cautioned.",
    "TV-MA": "Mature audience only."
  };

  const desc = ratingDescriptions[rating] || "No age rating description available.";

  if (seg) {
    seg.innerHTML = `<b>${rating}</b>: ${desc}`;
  }
}


// ---------- Initialization ----------
(async function init() {
  try {
    const data = await loadData();

    applyTitle(data.title);
    applyCategorization(data);
    applyConsensus(data);
    applyRisks(data);
    applyLinks(data);
    applyAudience(data);

    console.info('AIGC popup initialized successfully with hardcoded category meanings.');
  } catch (err) {
    console.error('Failed to initialize AIGC popup:', err);
  }
})();
