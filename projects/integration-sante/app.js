/* ────────────────────────────────────────────
   State
──────────────────────────────────────────── */
let DATA = null;
let map, clusterGroup;
let deptGeoJson = null;        // FeatureCollection des départements
let deptOutlineLayer = null;   // calque Leaflet du contour actif
let currentTab = 'matches';
let activeDilaPartenaire = ''; // filtre actif sur l'onglet DILA
let currentPage = 1;
const PAGE_SIZE = 100;
let filteredMatches = [];
let filteredFiness = [];
let filteredSoliguide = [];
let sortCol = 'score';
let sortDir = 'desc';
let activeConfidence = '';

const CONF_COLORS = {
  certain: '#007036',
  possible:'#ffc107'
};
const CONF_BADGE = {
  certain: 'badge-soft badge-success',
  possible:'badge-soft badge-warning'
};
const CONF_PROGRESS = {
  certain: 'progress-success',
  possible:'progress-warning'
};
const CONF_ICONS = {
  certain: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  possible: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  'finess-only': '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
  'soliguide-only': '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
};

const SOLIGUIDE_COLOR = '#3e3a71';
const FINESS_COLOR = '#da3849';

/* ────────────────────────────────────────────
   Init
──────────────────────────────────────────── */
async function init() {
  try {
    const resp = await fetch('data/matching-results.json');
    DATA = await resp.json();
  } catch (e) {
    document.getElementById('loading').innerHTML = `
      <div class="hero-content text-center">
        <div class="max-w-md">
          <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Impossible de charger <code>data/matching-results.json</code>.<br>Lancez <code>pnpm match</code> puis servez via un serveur local.</span>
          </div>
        </div>
      </div>`;
    return;
  }

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  renderMeta();
  renderStats();
  renderTabCounts();
  populateDeptFilter();
  initMap();
  bindEvents();
  applyFilters();
  loadDeptGeoJson(); // fire-and-forget, le zoom dept attend si pas encore chargé
}

/**
 * Charge le GeoJSON des départements français (source data.gouv / Étalab).
 * Léger (~1.5 Mo, contours simplifiés) — chargé async, non bloquant.
 */
async function loadDeptGeoJson() {
  try {
    const r = await fetch('assets/departements.geojson');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    deptGeoJson = await r.json();
  } catch (e) {
    console.warn('GeoJSON départements indisponible :', e.message);
  }
}

/**
 * Compteurs sur chaque onglet — réactualisés à chaque appel d'`applyFilters`.
 * Reflètent le filtre département + recherche (mais pas le filtre de confiance,
 * sinon "Certain" et "Possible" se cacheraient mutuellement).
 */
function renderTabCounts() {
  const dept = document.getElementById('dept-filter')?.value || '';
  const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  const inScope = (cp, hay) => {
    if (dept && deptFromCp(cp) !== dept) return false;
    if (search && !hay.toLowerCase().includes(search)) return false;
    return true;
  };

  const scopedMatches = DATA.matches.filter((m) =>
    inScope(m.finess.codePostal,
      m.finess.nom + ' ' + m.finess.adresse + ' ' + m.finess.ville + ' ' +
      (m.soliguide?.nom || '') + ' ' + (m.soliguide?.adresse || '')
    )
  );

  const counts = {
    matches: scopedMatches.length,
    'to-update': scopedMatches.filter(m =>
      m.scoring.confidence === 'certain'
      && m.finess?.updatedAt && m.soliguide?.updatedAt
      && new Date(m.finess.updatedAt) > new Date(m.soliguide.updatedAt)
    ).length,
    'dila': scopedMatches.filter(m => m.finess?.dila).length,
    'finess-only': DATA.finessNonMatchees.filter((f) =>
      inScope(f.codePostal, f.nom + ' ' + f.adresse + ' ' + f.ville + ' ' + f.categorie)
    ).length,
    'soliguide-only': DATA.soliguideNonMatchees.filter((s) =>
      inScope(s.codePostal, s.nom + ' ' + s.adresse + ' ' + s.ville)
    ).length,
  };
  for (const [tab, n] of Object.entries(counts)) {
    const btn = document.querySelector(`[role="tab"][data-tab="${tab}"]`);
    if (!btn) continue;
    const existing = btn.querySelector('.tab-count');
    const html = ` <span class="tab-count badge badge-sm badge-ghost ml-1 font-mono">${fmt(n)}</span>`;
    if (existing) existing.outerHTML = html;
    else btn.insertAdjacentHTML('beforeend', html);
  }
}

/* ────────────────────────────────────────────
   Meta
──────────────────────────────────────────── */
function renderMeta() {
  const m = DATA.meta;
  document.getElementById('meta-info').textContent =
    `${m.date} — ${fmt(m.finessTotal)} FINESS · ${fmt(m.soliguideTotal)} Soliguide · ${fmt(m.villesCommunes)} villes`;
}

function fmt(n) { return n.toLocaleString('fr-FR'); }
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR'); // → "26/01/2026"
}

/**
 * Adresse en label BAN si dispo (inclut CP+ville), sinon fallback adresse originale.
 * Le lien Google Maps utilise le label BAN si présent (plus précis).
 */
function renderBanOrOriginal(ban, adresse, cp, ville) {
  if (ban?.label) {
    return `<a href="${mapsUrl(ban.label, '', '')}" target="_blank" class="link link-primary">${esc(ban.label)}</a>`;
  }
  return `<a href="${mapsUrl(adresse, cp, ville)}" target="_blank" class="link link-primary">${esc(adresse)}, ${esc(cp)} ${titleCase(ville)}</a>`;
}

/**
 * Bloc "Enrichissement DILA (service public)" pour le détail d'un match.
 * Affiche website, email, téléphones, mission, horaires, partenaire.
 */
function renderDilaBlock(dila) {
  const items = [];
  if (dila.websites?.length) {
    items.push(`<div><span class="text-xs text-base-content/50 uppercase">🌐 site</span> ${dila.websites.map(w => `<a href="${esc(w)}" target="_blank" class="link link-primary text-sm break-all">${esc(w)}</a>`).join(' · ')}</div>`);
  }
  if (dila.email) {
    items.push(`<div><span class="text-xs text-base-content/50 uppercase">✉️ email</span> <a href="mailto:${esc(dila.email)}" class="link link-primary text-sm">${esc(dila.email)}</a></div>`);
  }
  if (dila.phones?.length) {
    items.push(`<div><span class="text-xs text-base-content/50 uppercase">📞 tel</span> <span class="text-sm font-mono">${dila.phones.map(esc).join(', ')}</span></div>`);
  }
  if (dila.hours) {
    let hoursTxt;
    try {
      const h = typeof dila.hours === 'string' ? JSON.parse(dila.hours) : dila.hours;
      hoursTxt = Array.isArray(h)
        ? h.map(p => `${p.nom_jour_debut}${p.nom_jour_debut !== p.nom_jour_fin ? '–'+p.nom_jour_fin : ''} ${p.valeur_heure_debut_1 || ''}-${p.valeur_heure_fin_1 || ''}${p.valeur_heure_debut_2 ? ' / '+p.valeur_heure_debut_2+'-'+p.valeur_heure_fin_2 : ''}`).join(' · ')
        : JSON.stringify(h);
    } catch { hoursTxt = String(dila.hours); }
    items.push(`<div><span class="text-xs text-base-content/50 uppercase">🕒 horaires</span> <span class="text-xs font-mono">${esc(hoursTxt)}</span></div>`);
  }
  if (dila.description && dila.description.length > 30) {
    const short = dila.description.length > 200 ? dila.description.slice(0, 200) + '…' : dila.description;
    items.push(`<div class="col-span-2"><span class="text-xs text-base-content/50 uppercase">📝 mission</span> <span class="text-xs">${esc(short)}</span></div>`);
  }
  if (items.length === 0) return '';
  return `
    <div class="border-t border-base-300 p-3 bg-info/5">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-semibold text-info-content uppercase tracking-wider">📋 Enrichissement DILA</span>
        ${dila.partenaire ? `<span class="badge badge-soft badge-info badge-xs">${esc(dila.partenaire)}</span>` : ''}
        ${dila.url ? `<a href="${esc(dila.url)}" target="_blank" class="text-xs link link-info ml-auto">Voir sur service-public.gouv.fr ↗</a>` : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">${items.join('')}</div>
    </div>
  `;
}

/* ────────────────────────────────────────────
   Stats cards
──────────────────────────────────────────── */
function computeFilteredStats() {
  const dept = document.getElementById('dept-filter')?.value || '';
  const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  function matchSearch(hay) { return !search || hay.toLowerCase().includes(search); }
  function matchDept(cp) { return !dept || deptFromCp(cp) === dept; }

  const baseMatches = DATA.matches.filter(m =>
    matchDept(m.finess.codePostal) &&
    matchSearch(m.finess.nom + ' ' + m.finess.adresse + ' ' + m.finess.ville + ' ' + (m.soliguide?.nom || '') + ' ' + (m.soliguide?.adresse || ''))
  );
  const baseFiness = DATA.finessNonMatchees.filter(f =>
    matchDept(f.codePostal) && matchSearch(f.nom + ' ' + f.adresse + ' ' + f.ville)
  );
  const baseSoliguide = DATA.soliguideNonMatchees.filter(s =>
    matchDept(s.codePostal) && matchSearch(s.nom + ' ' + s.adresse + ' ' + s.ville)
  );

  return {
    certain: baseMatches.filter(m => m.scoring.confidence === 'certain').length,
    possible: baseMatches.filter(m => m.scoring.confidence === 'possible').length,
    finessNonMatchees: baseFiness.length,
    soliguideNonMatchees: baseSoliguide.length
  };
}

function renderStats(stats) {
  const s = stats || DATA.stats;

  function statHtml(conf, label, value, desc, textClass) {
    return `
    <div class="stat stat-clickable" data-conf="${conf}">
      <div class="stat-figure ${textClass}">${CONF_ICONS[conf]}</div>
      <div class="stat-title">${label}</div>
      <div class="stat-value ${textClass}">${fmt(value)}</div>
      <div class="stat-desc">${desc}</div>
    </div>`;
  }

  document.getElementById('stats-bar').innerHTML =
    statHtml('certain', 'Certain', s.certain, 'score ≥75%', 'text-success-content') +
    statHtml('possible', 'Possible', s.possible, 'score 60–75%', 'text-warning-content') +
    statHtml('finess-only', 'FINESS seules', s.finessNonMatchees, 'sans match Soliguide', 'text-error-content') +
    statHtml('soliguide-only', 'Soliguide seules', s.soliguideNonMatchees, 'sans match FINESS', 'text-secondary');

  highlightStatCard();
}

/* ────────────────────────────────────────────
   Ville filter
──────────────────────────────────────────── */
/**
 * Extrait le code département depuis un code postal (2 premiers chars,
 * 3 pour outre-mer). "" si CP manquant.
 */
function deptFromCp(cp) {
  if (!cp || cp.length < 2) return '';
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3);
  return cp.slice(0, 2);
}

/**
 * Zoom sur le département sélectionné — utilise le contour GeoJSON si chargé
 * (zoom précis sur la frontière), sinon fallback sur les coords des fiches.
 * Affiche aussi le contour en surimpression.
 */
function zoomMapToDept(dept) {
  if (!map) return;
  // Retire le contour précédent
  if (deptOutlineLayer) {
    map.removeLayer(deptOutlineLayer);
    deptOutlineLayer = null;
  }
  if (!dept) {
    map.setView([46.5, 2.5], 6);
    return;
  }
  // 1. Tentative via GeoJSON (frontières administratives officielles)
  if (deptGeoJson?.features) {
    const feature = deptGeoJson.features.find((f) => f.properties?.code === dept);
    if (feature) {
      deptOutlineLayer = L.geoJSON(feature, {
        style: {
          color: 'var(--color-primary)',
          weight: 2,
          opacity: 0.7,
          fillColor: 'var(--color-primary)',
          fillOpacity: 0.05,
          interactive: false,
        },
      }).addTo(map);
      map.fitBounds(deptOutlineLayer.getBounds(), { padding: [30, 30] });
      return;
    }
  }
  // 2. Fallback : bbox des coords des fiches du dépt
  const coords = [];
  const pushIfDept = (rec) => {
    if (deptFromCp(rec.codePostal) === dept && rec.lat != null && rec.lon != null) {
      coords.push([rec.lat, rec.lon]);
    }
  };
  for (const m of DATA.matches) pushIfDept(m.finess);
  for (const f of DATA.finessNonMatchees) pushIfDept(f);
  for (const s of DATA.soliguideNonMatchees) pushIfDept(s);
  if (coords.length === 0) return;
  map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
}

function populateDeptFilter() {
  const counts = {};
  for (const m of DATA.matches) {
    const d = deptFromCp(m.finess.codePostal);
    if (d) counts[d] = (counts[d] || 0) + 1;
  }
  for (const f of DATA.finessNonMatchees) {
    const d = deptFromCp(f.codePostal);
    if (d) counts[d] = (counts[d] || 0) + 1;
  }
  for (const s of DATA.soliguideNonMatchees) {
    const d = deptFromCp(s.codePostal);
    if (d) counts[d] = (counts[d] || 0) + 1;
  }

  const sel = document.getElementById('dept-filter');
  // Tri alphabétique sur le code département (01, 02… puis 971…)
  const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [dept, count] of sorted) {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = `${dept} (${fmt(count)})`;
    sel.appendChild(opt);
  }
}

/* ────────────────────────────────────────────
   Map
──────────────────────────────────────────── */
function initMap() {
  map = L.map('map').setView([46.5, 2.5], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 15,
    chunkedLoading: true
  });
  map.addLayer(clusterGroup);
}

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

// Badge "source" affiché en haut des popups
function sourceBadge(label, color) {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;color:white;background:${color};letter-spacing:0.3px">${label}</span>`;
}

let mapTimer;
function updateMapDebounced() {
  clearTimeout(mapTimer);
  mapTimer = setTimeout(updateMap, 500);
}

function updateMap() {
  clusterGroup.clearLayers();
  const markers = [];

  if (currentTab === 'matches') {
    for (const m of filteredMatches) {
      const conf = m.scoring.confidence;
      const color = CONF_COLORS[conf] || '#666';
      const d = m.scoring.detail;

      if (m.finess.lat != null && m.finess.lon != null) {
        const mk = L.marker([m.finess.lat, m.finess.lon], { icon: makeIcon(color) });
        const dilaTag = m.finess.dila ? ' ' + sourceBadge('+ DILA', '#0284c7') : '';
        mk.bindPopup(`
          <div style="margin-bottom:4px">${sourceBadge('🏥 FINESS', FINESS_COLOR)}${dilaTag}</div>
          <b>${esc(m.finess.nom)}</b><br>
          <small>${esc(m.finess.adresse)}, ${esc(m.finess.ville)}</small><br>
          <b>Score :</b> ${pct(m.scoring.score)}
          <span class="popup-badge" style="background:${color}">${conf}</span><br>
          <small>Nom ${pct(d.nomLevenshtein)} · Adr ${pct(d.adresseLevenshtein)} · Geo ${d.distanceMetres != null ? d.distanceMetres.toFixed(0) + 'm' : '?'}</small>
        `);
        markers.push(mk);
      }

      if (m.soliguide && m.soliguide.lat != null && m.soliguide.lon != null) {
        const mk = L.marker([m.soliguide.lat, m.soliguide.lon], { icon: makeIcon(SOLIGUIDE_COLOR) });
        mk.bindPopup(`
          <div style="margin-bottom:4px">${sourceBadge('📍 Soliguide', SOLIGUIDE_COLOR)}</div>
          <b>${esc(m.soliguide.nom)}</b><br>
          <small>${esc(m.soliguide.adresse)}, ${esc(m.soliguide.ville)}</small><br>
          <a href="${esc(m.soliguide.lien)}" target="_blank">Voir fiche ↗</a>
        `);
        markers.push(mk);
      }
    }
  } else if (currentTab === 'finess-only') {
    for (const f of filteredFiness) {
      if (f.lat == null || f.lon == null) continue;
      const mk = L.marker([f.lat, f.lon], { icon: makeIcon(FINESS_COLOR) });
      const dilaTag = f.dila ? ' ' + sourceBadge('+ DILA', '#0284c7') : '';
      mk.bindPopup(`
        <div style="margin-bottom:4px">${sourceBadge('🏥 FINESS', FINESS_COLOR)}${dilaTag}</div>
        <b>${esc(f.nom)}</b><br>
        <small>${esc(f.adresse)}, ${esc(f.codePostal)} ${esc(f.ville)}</small><br>
        <span class="text-xs opacity-60">${esc(f.categorie)}</span>
      `);
      markers.push(mk);
    }
  } else {
    for (const s of filteredSoliguide) {
      if (s.lat == null || s.lon == null) continue;
      const mk = L.marker([s.lat, s.lon], { icon: makeIcon(SOLIGUIDE_COLOR) });
      mk.bindPopup(`
        <div style="margin-bottom:4px">${sourceBadge('📍 Soliguide', SOLIGUIDE_COLOR)}</div>
        <b>${esc(s.nom)}</b><br>
        <small>${esc(s.adresse)}, ${esc(s.ville)}</small><br>
        <a href="${esc(s.lien)}" target="_blank">Voir fiche ↗</a>
      `);
      markers.push(mk);
    }
  }

  clusterGroup.addLayers(markers);
}

/* ────────────────────────────────────────────
   Filters
──────────────────────────────────────────── */
function applyFilters() {
  const dept = document.getElementById('dept-filter')?.value || '';
  const conf = document.getElementById('confidence-filter')?.value || activeConfidence;
  const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  filteredMatches = DATA.matches.filter(m => {
    if (dept && deptFromCp(m.finess.codePostal) !== dept) return false;
    if (conf && m.scoring.confidence !== conf) return false;
    if (search) {
      const hay = (m.finess.nom + ' ' + m.finess.adresse + ' ' + m.finess.ville +
        ' ' + (m.soliguide?.nom || '') + ' ' + (m.soliguide?.adresse || '')).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    // Onglet "À mettre à jour" : certains uniquement où FINESS plus récent que Soliguide
    if (currentTab === 'to-update') {
      if (m.scoring.confidence !== 'certain') return false;
      if (!m.finess?.updatedAt || !m.soliguide?.updatedAt) return false;
      const f = new Date(m.finess.updatedAt);
      const s = new Date(m.soliguide.updatedAt);
      if (!(f > s)) return false;
    }
    // Onglet "DILA" : matches enrichis via DILA (+ filtre éventuel par fournisseur)
    if (currentTab === 'dila') {
      if (!m.finess?.dila) return false;
      if (activeDilaPartenaire) {
        const p = m.finess.dila.partenaire || '(DILA pur)';
        if (p !== activeDilaPartenaire) return false;
      }
    }
    return true;
  });

  filteredFiness = DATA.finessNonMatchees.filter(f => {
    if (dept && deptFromCp(f.codePostal) !== dept) return false;
    if (search) {
      const hay = (f.nom + ' ' + f.adresse + ' ' + f.ville + ' ' + f.categorie).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  filteredSoliguide = DATA.soliguideNonMatchees.filter(s => {
    if (dept && deptFromCp(s.codePostal) !== dept) return false;
    if (search) {
      const hay = (s.nom + ' ' + s.adresse + ' ' + s.ville).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  sortData();
  currentPage = 1;
  renderTable();
  renderTabCounts();
  updateResultCount();
  updateMapDebounced();
  renderStats(computeFilteredStats());
}

function resetFilters() {
  document.getElementById('confidence-filter').value = '';
  document.getElementById('dept-filter').value = '';
  document.getElementById('search-input').value = '';
  activeConfidence = '';
  highlightStatCard();
  applyFilters();
}

function updateResultCount() {
  let n;
  if (currentTab === 'matches' || currentTab === 'to-update' || currentTab === 'dila') n = filteredMatches.length;
  else if (currentTab === 'finess-only') n = filteredFiness.length;
  else n = filteredSoliguide.length;
  document.getElementById('result-count').textContent = `${fmt(n)} résultat(s)`;
}

function filterByConfidence(conf) {
  if (conf === 'finess-only') {
    switchTab('finess-only');
    activeConfidence = '';
    document.getElementById('confidence-filter').value = '';
  } else if (conf === 'soliguide-only') {
    switchTab('soliguide-only');
    activeConfidence = '';
    document.getElementById('confidence-filter').value = '';
  } else {
    switchTab('matches');
    activeConfidence = activeConfidence === conf ? '' : conf;
    document.getElementById('confidence-filter').value = activeConfidence;
  }
  highlightStatCard();
  applyFilters();
}

function highlightStatCard() {
  let active = activeConfidence;
  if (!active && currentTab === 'finess-only') active = 'finess-only';
  if (!active && currentTab === 'soliguide-only') active = 'soliguide-only';
  document.querySelectorAll('.stat-clickable').forEach(el => {
    el.classList.toggle('active', el.dataset.conf === active);
  });
}

/* ────────────────────────────────────────────
   Sort
──────────────────────────────────────────── */
function sortData() {
  const dir = sortDir === 'asc' ? 1 : -1;
  if (currentTab === 'matches' || currentTab === 'to-update' || currentTab === 'dila') {
    filteredMatches.sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'score': va = a.scoring.score; vb = b.scoring.score; break;
        case 'ville': va = a.finess.ville; vb = b.finess.ville; break;
        case 'finess': va = a.finess.nom.toLowerCase(); vb = b.finess.nom.toLowerCase(); break;
        case 'soliguide': va = (a.soliguide?.nom || '').toLowerCase(); vb = (b.soliguide?.nom || '').toLowerCase(); break;
        case 'updatedAt':
          va = a.finess?.updatedAt || '';
          vb = b.finess?.updatedAt || '';
          break;
        case 'confidence':
          const o = { certain: 0, possible: 1 };
          va = o[a.scoring.confidence] ?? 2;
          vb = o[b.scoring.confidence] ?? 2;
          break;
        default: va = a.scoring.score; vb = b.scoring.score;
      }
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  } else {
    const list = currentTab === 'finess-only' ? filteredFiness : filteredSoliguide;
    list.sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'ville': va = a.ville; vb = b.ville; break;
        case 'nom': va = a.nom.toLowerCase(); vb = b.nom.toLowerCase(); break;
        case 'adresse': va = (a.adresse || '').toLowerCase(); vb = (b.adresse || '').toLowerCase(); break;
        case 'cp': va = a.codePostal || ''; vb = b.codePostal || ''; break;
        case 'categorie': va = (a.categorie || '').toLowerCase(); vb = (b.categorie || '').toLowerCase(); break;
        default: va = a.nom.toLowerCase(); vb = b.nom.toLowerCase();
      }
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }
}

/* ────────────────────────────────────────────
   Table rendering
──────────────────────────────────────────── */
function si(col) {
  if (sortCol !== col) return '';
  return sortDir === 'asc' ? ' ↑' : ' ↓';
}

function renderTable() {
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');

  if (currentTab === 'matches' || currentTab === 'to-update' || currentTab === 'dila') {
    thead.innerHTML = `<tr>
      <th class="cursor-pointer select-none" data-col="finess">FINESS${si('finess')}</th>
      <th class="cursor-pointer select-none" data-col="soliguide">Soliguide${si('soliguide')}</th>
      <th class="cursor-pointer select-none" data-col="ville">Ville${si('ville')}</th>
      <th class="cursor-pointer select-none" data-col="updatedAt">Mise à jour${si('updatedAt')}</th>
      <th class="cursor-pointer select-none" data-col="score">Score${si('score')}</th>
      <th class="cursor-pointer select-none" data-col="confidence">Confiance${si('confidence')}</th>
      <th>Détail</th>
    </tr>`;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredMatches.slice(start, start + PAGE_SIZE);
    let html = '';

    for (let i = 0; i < page.length; i++) {
      const m = page[i];
      const idx = start + i;
      const conf = m.scoring.confidence;
      const scorePct = (m.scoring.score * 100).toFixed(0);
      const d = m.scoring.detail;

      const fDate = m.finess?.updatedAt || '';
      const sDate = m.soliguide?.updatedAt || '';
      const finessNewer = fDate && sDate && new Date(fDate) > new Date(sDate);
      const dateCls = finessNewer ? 'text-warning-content font-semibold' : 'text-base-content/70';

      const dilaBadge = m.finess?.dila
        ? `<span class="badge badge-soft badge-info badge-xs ml-1" title="Enrichi DILA">📋</span>`
        : '';

      html += `<tr class="hover:bg-base-200">
        <td>
          <div class="tooltip tooltip-right" data-tip="${esc(m.finess.categorie || '')}">${esc(m.finess.nom)}</div>
          ${dilaBadge}
        </td>
        <td>${m.soliguide
          ? `<div class="flex items-center gap-1">
               <a href="${esc(m.soliguide.lien)}" target="_blank" class="link link-primary text-sm flex-1 truncate" title="${esc(m.soliguide.nom)}">${esc(m.soliguide.nom)}</a>
               <a href="${esc(m.soliguide.lien)}" target="_blank" title="Ouvrir la fiche Soliguide" class="text-base shrink-0">🔗</a>
             </div>`
          : '<span class="opacity-30">—</span>'}</td>
        <td class="whitespace-nowrap">${titleCase(m.finess.ville)}</td>
        <td class="text-xs whitespace-nowrap">
          <div class="${dateCls}">F : ${fmtDate(fDate)}</div>
          <div class="text-base-content/50">S : ${fmtDate(sDate)}</div>
        </td>
        <td>
          <div class="flex items-center gap-2">
            <progress class="progress ${CONF_PROGRESS[conf]} w-16 h-2" value="${scorePct}" max="100"></progress>
            <span class="text-xs font-mono">${scorePct}%</span>
          </div>
        </td>
        <td><span class="badge ${CONF_BADGE[conf]} badge-sm">${conf}</span></td>
        <td><button class="btn btn-xs btn-ghost font-mono" onclick="toggleDetail(this, ${idx})">+</button></td>
      </tr>`;

      html += `<tr id="detail-${idx}" class="hidden">
        <td colspan="7" class="p-3">
          <div class="card bg-base-200 shadow-inner">
            <div class="card-body p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Adresse FINESS ${m.finess.banAddress ? '<span class="badge badge-soft badge-info badge-xs ml-1">BAN</span>' : ''}</div>
                  <div class="text-sm">${renderBanOrOriginal(m.finess.banAddress, m.finess.adresse, m.finess.codePostal, m.finess.ville)}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 flex items-center gap-2">
                    Adresse Soliguide ${m.soliguide?.banAddress ? '<span class="badge badge-soft badge-info badge-xs">BAN</span>' : ''}
                    ${m.soliguide?.lien ? `<a href="${esc(m.soliguide.lien)}" target="_blank" class="link link-primary text-xs normal-case font-normal ml-auto">Ouvrir la fiche ↗</a>` : ''}
                  </div>
                  <div class="text-sm">${m.soliguide ? renderBanOrOriginal(m.soliguide.banAddress, m.soliguide.adresse, m.soliguide.codePostal, m.soliguide.ville) : '—'}</div>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-0">
                <div class="p-3">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Nom (Levenshtein)</div>
                  <progress class="progress ${d.nomMatch ? 'progress-success' : 'progress-warning'} w-full h-2"
                            value="${(d.nomLevenshtein * 100).toFixed(0)}" max="100"></progress>
                  <div class="flex justify-between items-center mt-1">
                    <span class="text-xs font-mono">${(d.nomLevenshtein * 100).toFixed(1)}%</span>
                    ${d.nomMatch ? '<span class="badge badge-soft badge-success badge-xs">≥90%</span>' : ''}
                  </div>
                </div>
                <div class="p-3 border-l border-base-300">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Adresse (Levenshtein)</div>
                  <progress class="progress ${d.adresseMatch ? 'progress-success' : 'progress-warning'} w-full h-2"
                            value="${(d.adresseLevenshtein * 100).toFixed(0)}" max="100"></progress>
                  <div class="flex justify-between items-center mt-1">
                    <span class="text-xs font-mono">${(d.adresseLevenshtein * 100).toFixed(1)}%</span>
                    ${d.adresseMatch ? '<span class="badge badge-soft badge-success badge-xs">≥90%</span>' : ''}
                  </div>
                </div>
                <div class="p-3 border-l border-base-300">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Géolocalisation</div>
                  <div class="text-xl font-mono mt-1">${d.distanceMetres != null ? d.distanceMetres.toFixed(0) + ' m' : 'N/A'}</div>
                  ${d.geoMatch
                    ? '<span class="badge badge-soft badge-success badge-xs mt-1">≤200m</span>'
                    : d.distanceMetres != null
                      ? '<span class="badge badge-soft badge-error badge-xs mt-1">&gt;200m</span>'
                      : ''}
                </div>
                <div class="p-3 border-l border-base-300">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Code postal</div>
                  <div class="mt-1">${d.codePostalMatch
                    ? '<span class="badge badge-soft badge-success">Identique</span>'
                    : '<span class="badge badge-soft badge-error">Différent</span>'}</div>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-base-300">
                <div class="p-3">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Téléphone</div>
                  <div class="mt-1">${d.telephoneMatch
                    ? '<span class="badge badge-soft badge-success">Identique</span>'
                    : '<span class="badge badge-soft badge-ghost">Différent</span>'}</div>
                </div>
                <div class="p-3 border-l border-base-300">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Matché par</div>
                  <div class="mt-1"><span class="badge badge-soft badge-primary badge-sm">${esc(d.matchedBy || '—')}</span></div>
                </div>
                <div class="p-3 border-l border-base-300 ${finessNewer ? 'bg-warning/5' : ''}">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Date FINESS</div>
                  <div class="mt-1 text-sm font-mono ${finessNewer ? 'text-warning-content font-semibold' : ''}">${fmtDate(fDate)}</div>
                  ${finessNewer ? '<span class="badge badge-soft badge-warning badge-xs mt-1">+ récente</span>' : ''}
                </div>
                <div class="p-3 border-l border-base-300">
                  <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">Date Soliguide</div>
                  <div class="mt-1 text-sm font-mono">${fmtDate(sDate)}</div>
                </div>
              </div>
              ${m.soliguide?.services?.length ? `
              <div class="border-t border-base-300 p-3">
                <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Services Soliguide (${m.soliguide.services.length})</div>
                <div class="flex flex-wrap gap-1">
                  ${m.soliguide.services.map(s => `<span class="badge badge-sm bg-primary/10 text-primary">${esc(s)}</span>`).join('')}
                </div>
              </div>` : ''}
              ${m.finess?.dila ? renderDilaBlock(m.finess.dila) : ''}
            </div>
          </div>
        </td>
      </tr>`;
    }

    tbody.innerHTML = html;
    renderPagination(filteredMatches.length);

  } else if (currentTab === 'finess-only') {
    thead.innerHTML = `<tr>
      <th class="cursor-pointer select-none" data-col="nom">Nom${si('nom')}</th>
      <th class="cursor-pointer select-none" data-col="adresse">Adresse${si('adresse')}</th>
      <th class="cursor-pointer select-none" data-col="ville">Ville${si('ville')}</th>
      <th class="cursor-pointer select-none" data-col="cp">CP${si('cp')}</th>
      <th class="cursor-pointer select-none" data-col="categorie">Catégorie${si('categorie')}</th>
      <th>Détail</th>
    </tr>`;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredFiness.slice(start, start + PAGE_SIZE);

    let html = '';
    for (let i = 0; i < page.length; i++) {
      const f = page[i];
      const idx = start + i;
      const dilaBadge = f.dila ? `<span class="badge badge-soft badge-info badge-xs ml-1" title="Enrichi DILA">📋</span>` : '';
      const nbNearby = f.nearbySoliguide?.length || 0;

      html += `<tr class="hover:bg-base-200">
        <td>${esc(f.nom)}${dilaBadge}</td>
        <td class="text-sm"><a href="${mapsUrl(f.adresse, f.codePostal, f.ville)}" target="_blank" class="link link-primary">${esc(f.adresse)}</a></td>
        <td class="whitespace-nowrap">${titleCase(f.ville)}</td>
        <td>${esc(f.codePostal)}</td>
        <td class="text-xs">${esc(f.categorie)}</td>
        <td><button class="btn btn-xs btn-ghost font-mono" onclick="toggleDetail(this, ${idx})" title="${nbNearby} Soliguide à proximité">+</button></td>
      </tr>`;

      html += `<tr id="detail-${idx}" class="hidden">
        <td colspan="6" class="p-3">
          <div class="card bg-base-200 shadow-inner">
            <div class="card-body p-4 space-y-3">
              <div>
                <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">FINESS ${esc(f.nofinesset)}</div>
                <div class="text-sm">${renderBanOrOriginal(f.banAddress, f.adresse, f.codePostal, f.ville)}</div>
                <div class="text-xs text-base-content/60 mt-1">Maj : ${fmtDate(f.updatedAt)}</div>
              </div>
              ${f.dila ? renderDilaBlock(f.dila) : ''}
              <div class="border-t border-base-300 pt-3">
                <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">🎯 5 Soliguide les plus proches (GPS)</div>
                ${f.nearbySoliguide?.length
                  ? `<ol class="space-y-1 text-sm">${f.nearbySoliguide.map(n => `
                    <li class="flex items-center justify-between gap-2">
                      <span class="flex-1 min-w-0">
                        <a href="${esc(n.url)}" target="_blank" class="link link-primary truncate inline-block max-w-full">${esc(n.name)}</a>
                        <span class="text-xs text-base-content/60">— ${titleCase(n.city)}</span>
                      </span>
                      <span class="badge badge-soft badge-ghost text-xs font-mono whitespace-nowrap">${fmt(n.distance)} m</span>
                    </li>`).join('')}</ol>`
                  : '<p class="text-xs text-base-content/40 italic">Pas de coordonnées GPS pour cette fiche.</p>'}
              </div>
            </div>
          </div>
        </td>
      </tr>`;
    }
    tbody.innerHTML = html;

    renderPagination(filteredFiness.length);

  } else {
    thead.innerHTML = `<tr>
      <th class="cursor-pointer select-none" data-col="nom">Nom${si('nom')}</th>
      <th class="cursor-pointer select-none" data-col="adresse">Adresse${si('adresse')}</th>
      <th class="cursor-pointer select-none" data-col="ville">Ville${si('ville')}</th>
      <th class="cursor-pointer select-none" data-col="cp">CP${si('cp')}</th>
      <th>Lien</th>
    </tr>`;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredSoliguide.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = page.map(s => `<tr class="hover:bg-base-200">
      <td>${esc(s.nom)}</td>
      <td class="text-sm">${esc(s.adresse)}</td>
      <td class="whitespace-nowrap">${titleCase(s.ville)}</td>
      <td>${esc(s.codePostal)}</td>
      <td><a href="${esc(s.lien)}" target="_blank" title="Ouvrir la fiche Soliguide" class="btn btn-xs btn-ghost text-base">🔗</a></td>
    </tr>`).join('');

    renderPagination(filteredSoliguide.length);
  }
}

function toggleDetail(btn, idx) {
  const row = document.getElementById('detail-' + idx);
  if (!row) return;
  const open = !row.classList.contains('hidden');
  row.classList.toggle('hidden');
  btn.textContent = open ? '+' : '−';
}

/* ────────────────────────────────────────────
   Pagination
──────────────────────────────────────────── */
function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const pag = document.getElementById('pagination');

  if (pages <= 1) {
    pag.innerHTML = `<span class="text-sm opacity-60">${fmt(total)} résultat(s)</span>`;
    return;
  }

  let html = '<div class="join">';
  html += `<button class="join-item btn btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="goPage(1)">«</button>`;
  html += `<button class="join-item btn btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">‹</button>`;

  const lo = Math.max(1, currentPage - 2);
  const hi = Math.min(pages, currentPage + 2);
  if (lo > 1) html += `<button class="join-item btn btn-sm btn-disabled">…</button>`;
  for (let p = lo; p <= hi; p++) {
    html += `<button class="join-item btn btn-sm ${p === currentPage ? 'btn-active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }
  if (hi < pages) html += `<button class="join-item btn btn-sm btn-disabled">…</button>`;

  html += `<button class="join-item btn btn-sm" ${currentPage >= pages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">›</button>`;
  html += `<button class="join-item btn btn-sm" ${currentPage >= pages ? 'disabled' : ''} onclick="goPage(${pages})">»</button>`;
  html += '</div>';
  html += `<span class="text-sm opacity-60">Page ${currentPage}/${pages} — ${fmt(total)} résultat(s)</span>`;
  pag.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  renderTable();
  document.querySelector('.overflow-x-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ────────────────────────────────────────────
   Tabs
──────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('[role="tab"]').forEach(t => {
    t.classList.toggle('tab-btn-active', t.dataset.tab === tab);
  });
  currentPage = 1;
  if (tab === 'to-update') {
    sortCol = 'updatedAt';
    sortDir = 'desc';
  } else if (tab === 'matches' || tab === 'dila') {
    sortCol = 'score';
    sortDir = 'desc';
  } else {
    sortCol = 'nom';
    sortDir = 'asc';
  }
  if (tab !== 'dila') activeDilaPartenaire = '';
  renderDilaStats();
}

/**
 * Barre "Fournisseurs DILA" (visible uniquement sur l'onglet DILA).
 * Badges cliquables → filtre par partenaire.
 */
function renderDilaStats() {
  const bar = document.getElementById('dila-stats');
  if (!bar) return;
  if (currentTab !== 'dila') {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');

  // Compte par partenaire sur les matches enrichis DILA (avant filtre)
  const counts = {};
  for (const m of DATA.matches) {
    if (!m.finess?.dila) continue;
    const p = m.finess.dila.partenaire || '(DILA pur)';
    counts[p] = (counts[p] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const allActive = activeDilaPartenaire === '' ? 'badge-info' : 'badge-ghost';
  const badges = [
    `<button class="badge ${allActive} cursor-pointer" data-partenaire="">Tous · ${fmt(total)}</button>`,
    ...sorted.map(([p, n]) => {
      const active = activeDilaPartenaire === p ? 'badge-info' : 'badge-ghost';
      return `<button class="badge ${active} cursor-pointer" data-partenaire="${esc(p)}">${esc(p)} · ${fmt(n)}</button>`;
    }),
  ];

  bar.innerHTML = `
    <div class="flex items-center flex-wrap gap-2">
      <span class="text-xs font-semibold text-base-content/60 uppercase tracking-wider mr-1">Fournisseurs :</span>
      ${badges.join('')}
    </div>
  `;
  bar.querySelectorAll('[data-partenaire]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeDilaPartenaire = btn.dataset.partenaire;
      currentPage = 1;
      applyFilters();
      renderDilaStats();
    });
  });
}

/* ────────────────────────────────────────────
   Events
──────────────────────────────────────────── */
function bindEvents() {
  // Hamburger dropdown
  const menuBtn = document.getElementById('menu-btn');
  const menuDropdown = document.getElementById('menu-dropdown');
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => menuDropdown.classList.add('hidden'));
  }

  document.getElementById('confidence-filter').addEventListener('change', (e) => {
    activeConfidence = e.target.value;
    highlightStatCard();
    applyFilters();
  });

  document.getElementById('dept-filter').addEventListener('change', () => {
    applyFilters();
    zoomMapToDept(document.getElementById('dept-filter').value);
  });

  let searchTimer;
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
  });

  document.getElementById('reset-filters').addEventListener('click', resetFilters);

  document.getElementById('stats-bar').addEventListener('click', (e) => {
    const stat = e.target.closest('.stat-clickable');
    if (!stat) return;
    filterByConfidence(stat.dataset.conf);
  });

  document.querySelectorAll('[role="tab"]').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
      highlightStatCard();
      applyFilters();
    });
  });

  document.getElementById('table-head').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-col]');
    if (!th) return;
    if (sortCol === th.dataset.col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = th.dataset.col;
      sortDir = sortCol === 'score' ? 'desc' : 'asc';
    }
    sortData();
    currentPage = 1;
    renderTable();
  });

  document.getElementById('map-toggle').addEventListener('change', (e) => {
    const show = e.target.checked;
    document.getElementById('map-container').style.display = show ? '' : 'none';
    if (show) setTimeout(() => map.invalidateSize(), 150);
  });
}

/* ────────────────────────────────────────────
   Helpers
──────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function pct(v) {
  return (v * 100).toFixed(0) + '%';
}

function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function mapsUrl(adresse, cp, ville) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((adresse || '') + ', ' + (cp || '') + ' ' + (ville || ''));
}

/* ────────────────────────────────────────────
   Start
──────────────────────────────────────────── */
init();
