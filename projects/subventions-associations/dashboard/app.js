// --- Diagnostic ---
console.log("[init] Leaflet:", typeof L !== "undefined" ? "OK (v" + L.version + ")" : "MANQUANT");
console.log("[init] Chart.js:", typeof Chart !== "undefined" ? "OK (v" + Chart.version + ")" : "MANQUANT");
console.log("[init] DaisyUI theme:", document.documentElement.dataset.theme || "non défini");

// --- State ---
let stats, matches, nonTrouvees;
let selectedYear = "all";
let selectedSecteur = "all";
let matchesSort = { col: "montant", dir: "desc" };
let nonTrouveesSort = { col: "montant", dir: "desc" };

// --- Data loading ---
async function loadData() {
  const urls = [
    "../data/output/stats.json",
    "../data/output/matches.json",
    "../data/output/non-trouvees.json",
  ];
  const results = await Promise.all(
    urls.map(async (url) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Fetch ${url} → ${resp.status}`);
      return resp.json();
    })
  );
  [stats, matches, nonTrouvees] = results;
  console.log(`[data] stats OK, ${matches.length} matches, ${nonTrouvees.length} non-trouvées`);
}

// --- Helpers ---
function fmt(n) { return n.toLocaleString("fr-FR"); }
function fmtEuro(n) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}
function scoreBadge(score) {
  const pct = Math.round(score * 100);
  const cls = score >= 0.95 ? "score-high" : score >= 0.8 ? "score-mid" : "score-low";
  return `<span class="score-badge ${cls}">${pct}%</span>`;
}

// --- Filtering ---
function filterSubs(subs) {
  let filtered = subs;
  if (selectedYear !== "all") {
    const y = parseInt(selectedYear);
    filtered = filtered.filter((s) => s.annee === y);
  }
  if (selectedSecteur !== "all") {
    filtered = filtered.filter((s) => s.secteurs === selectedSecteur);
  }
  return filtered;
}
function hasFilters(item) {
  return filterSubs(item.subventions).length > 0;
}
function hasYear(item) {
  return hasFilters(item);
}
function montant(subs) {
  return filterSubs(subs).reduce((s, x) => s + x.montant, 0);
}

// --- Year selector ---
function initYearSelector() {
  const sel = document.getElementById("year-select");
  if (stats.anneesDisponibles) {
    for (const y of stats.anneesDisponibles) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    }
  }
  sel.addEventListener("change", (e) => {
    selectedYear = e.target.value;
    renderAll();
  });
}

// --- Secteur selector ---
function initSecteurSelector() {
  const sel = document.getElementById("secteur-select");
  const secteurs = new Set();
  for (const m of matches) {
    for (const s of m.subventions) {
      if (s.secteurs) secteurs.add(s.secteurs);
    }
  }
  for (const a of nonTrouvees) {
    for (const s of a.subventions) {
      if (s.secteurs) secteurs.add(s.secteurs);
    }
  }
  const sorted = [...secteurs].sort();
  for (const s of sorted) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  }
  sel.value = "Social";
  selectedSecteur = "Social";

  sel.addEventListener("change", (e) => {
    selectedSecteur = e.target.value;
    renderAll();
  });
}

// --- Table sorting ---
function initSorting() {
  document.querySelectorAll("[data-sort-matches]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sortMatches;
      if (matchesSort.col === col) {
        matchesSort.dir = matchesSort.dir === "desc" ? "asc" : "desc";
      } else {
        matchesSort.col = col;
        matchesSort.dir = col === "association" ? "asc" : "desc";
      }
      renderMatches();
    });
  });
  document.querySelectorAll("[data-sort-nontrouvees]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sortNontrouvees;
      if (nonTrouveesSort.col === col) {
        nonTrouveesSort.dir = nonTrouveesSort.dir === "desc" ? "asc" : "desc";
      } else {
        nonTrouveesSort.col = col;
        nonTrouveesSort.dir = col === "association" ? "asc" : "desc";
      }
      renderNonTrouvees();
    });
  });
}

function sortIndicator(currentSort, col) {
  if (currentSort.col !== col) return "";
  return currentSort.dir === "asc" ? " ↑" : " ↓";
}

function updateSortIndicators() {
  document.querySelectorAll("[data-sort-matches]").forEach((th) => {
    const ind = th.querySelector(".sort-indicator");
    if (ind) ind.textContent = sortIndicator(matchesSort, th.dataset.sortMatches);
  });
  document.querySelectorAll("[data-sort-nontrouvees]").forEach((th) => {
    const ind = th.querySelector(".sort-indicator");
    if (ind) ind.textContent = sortIndicator(nonTrouveesSort, th.dataset.sortNontrouvees);
  });
}

// --- Hamburger dropdown ---
function initDropdown() {
  const btn = document.getElementById("menu-btn");
  const dropdown = document.getElementById("menu-dropdown");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
  });

  dropdown.querySelectorAll("[data-tab-link]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(link.dataset.tabLink);
      dropdown.classList.add("hidden");
    });
  });
}

// --- Tabs ---
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("tab-btn-active"));
  const active = document.querySelector(`.tab-btn[data-tab="${name}"]`);
  if (active) active.classList.add("tab-btn-active");

  document.querySelectorAll(".tab-panel").forEach((c) => c.classList.add("hidden"));
  document.getElementById("tab-" + name).classList.remove("hidden");

  if (name === "carte" && map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

// --- Stats ---
function renderStats() {
  const fm = matches.filter(hasYear);
  const fn = nonTrouvees.filter(hasYear);
  const nbM = fm.length;
  const nbA = selectedYear === "all" ? stats.associationsRecentes : nbM + fn.length;
  const taux = nbA > 0 ? Math.round((nbM / nbA) * 1000) / 10 : 0;
  const mMatchs = fm.reduce((s, m) => s + montant(m.subventions), 0);
  const mTotal = selectedYear === "all"
    ? stats.montantTotalSubventions
    : mMatchs + fn.reduce((s, a) => s + montant(a.subventions), 0);

  document.getElementById("stat-matches").textContent = fmt(nbM);
  document.getElementById("stat-fiches").textContent = fmt(stats.totalFichesSoliguide);
  document.getElementById("stat-assos").textContent = fmt(nbA);
  document.getElementById("stat-taux").textContent = taux + "%";
  document.getElementById("stat-montant-matchs").textContent = fmtEuro(mMatchs);
  document.getElementById("stat-montant-total").textContent = fmtEuro(mTotal);
}

// --- Map ---
let map, markersLayer;

function renderMap() {
  if (typeof L === "undefined") {
    console.error("[map] Leaflet non chargé — carte désactivée");
    return;
  }

  if (!map) {
    map = L.map("map", { zoomControl: false }).setView([48.8566, 2.3522], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    console.log("[map] Carte initialisée");
  }

  if (markersLayer) map.removeLayer(markersLayer);
  markersLayer = L.markerClusterGroup({ maxClusterRadius: 40 });

  const icon = L.divIcon({
    className: "",
    html: '<div style="width:20px;height:20px;background:#f84b32;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  let markerCount = 0;
  for (const m of matches.filter(hasYear)) {
    if (!m.ficheLat || !m.ficheLng) continue;
    const subs = filterSubs(m.subventions).slice(0, 4);
    const tags = subs.map((s) =>
      `<span class="subvention-tag">${s.annee} · ${fmtEuro(s.montant)} · ${escHtml(s.objet).substring(0, 50)}</span>`
    ).join("");
    const total = montant(m.subventions);

    const popup = `<div style="max-width:320px">
      <strong>${escHtml(m.ficheNom)}</strong><br>
      <span style="font-size:.75rem;opacity:.7">${escHtml(m.ficheServices).substring(0, 100)}</span>
      <hr style="margin:6px 0;border-color:#e5e7eb">
      <strong style="color:#503b5c">Subventions :</strong> ${escHtml(m.associationNom)}<br>
      <strong>${fmtEuro(total)}</strong> ${selectedYear === "all" ? "cumulés" : "en " + selectedYear}<br>
      <div style="margin-top:4px">${tags}</div>
      <div style="margin-top:6px"><a href="${m.ficheLien}" target="_blank" style="color:#f84b32">Voir la fiche Soliguide →</a></div>
    </div>`;

    markersLayer.addLayer(L.marker([m.ficheLat, m.ficheLng], { icon }).bindPopup(popup));
    markerCount++;
  }
  map.addLayer(markersLayer);
  console.log(`[map] ${markerCount} marqueurs ajoutés`);
}

// --- Table: matches ---
function renderMatches() {
  const tbody = document.getElementById("matches-body");
  const q = document.getElementById("search-matches").value.toLowerCase();
  const minScore = parseFloat(document.getElementById("filter-score").value);

  const filtered = matches.filter((m) => {
    if (!hasYear(m)) return false;
    if (m.score < minScore) return false;
    if (q && !m.associationNom.toLowerCase().includes(q) && !m.ficheNom.toLowerCase().includes(q)) return false;
    return true;
  });

  const dir = matchesSort.dir === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    switch (matchesSort.col) {
      case "association": return a.associationNom.localeCompare(b.associationNom) * dir;
      case "score": return (a.score - b.score) * dir;
      case "montant":
      default: return (montant(a.subventions) - montant(b.subventions)) * dir;
    }
  });
  updateSortIndicators();

  tbody.innerHTML = filtered
    .map((m) => {
      const subs = filterSubs(m.subventions).slice(0, 3);
      const details = subs.map((s) =>
        `<div class="text-xs">${s.annee} · ${fmtEuro(s.montant)} · ${escHtml(s.objet).substring(0, 60)}</div>`
      ).join("");
      return `<tr>
        <td class="font-medium">${escHtml(m.associationNom)}</td>
        <td><a href="${m.ficheLien}" target="_blank">${escHtml(m.ficheNom)}</a></td>
        <td class="text-xs max-w-xs truncate">${escHtml(m.ficheServices).substring(0, 80)}</td>
        <td>${details}</td>
        <td class="font-semibold whitespace-nowrap">${fmtEuro(montant(m.subventions))}</td>
        <td>${scoreBadge(m.score)}</td>
        <td><a href="${m.ficheLien}" target="_blank" class="text-xs">↗</a></td>
      </tr>`;
    }).join("");

  document.getElementById("matches-count").textContent =
    `${filtered.length} correspondance${filtered.length > 1 ? "s" : ""}`;
  console.log(`[tableau] ${filtered.length} correspondances affichées`);
}

// --- Table: non trouvées ---
function renderNonTrouvees() {
  const tbody = document.getElementById("non-trouvees-body");
  const q = document.getElementById("search-non-trouvees").value.toLowerCase();

  const filtered = nonTrouvees.filter((a) => {
    if (!hasYear(a)) return false;
    if (q && !a.nom.toLowerCase().includes(q)) return false;
    return true;
  });

  const dir = nonTrouveesSort.dir === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    switch (nonTrouveesSort.col) {
      case "association": return a.nom.localeCompare(b.nom) * dir;
      case "montant":
      default: return (montant(a.subventions) - montant(b.subventions)) * dir;
    }
  });
  updateSortIndicators();

  tbody.innerHTML = filtered
    .map((a) => {
      const subs = filterSubs(a.subventions).slice(0, 3);
      const details = subs.map((s) =>
        `<div class="text-xs">${s.annee} · ${fmtEuro(s.montant)} · ${escHtml(s.objet).substring(0, 60)}</div>`
      ).join("");
      return `<tr>
        <td class="font-medium">${escHtml(a.nom)}</td>
        <td class="text-xs font-mono">${a.siret || "—"}</td>
        <td>${details}</td>
        <td class="font-semibold whitespace-nowrap">${fmtEuro(montant(a.subventions))}</td>
        <td class="text-xs">${a.anneesActives.join(", ")}</td>
      </tr>`;
    }).join("");

  document.getElementById("non-trouvees-count").textContent =
    `${filtered.length} association${filtered.length > 1 ? "s" : ""}`;
}

// --- Charts ---
let chartSecteurs, chartDirections;

function renderCharts() {
  if (typeof Chart === "undefined") {
    console.error("[charts] Chart.js non chargé — graphiques désactivés");
    return;
  }

  const colors = ["#f84b32","#503b5c","#271332","#019d4f","#f29013","#4a90d9","#d4526e","#13d8aa","#a5978b","#546e7a"];
  const opts = {
    indexAxis: "y",
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
  };

  if (chartSecteurs) chartSecteurs.destroy();
  if (chartDirections) chartDirections.destroy();

  chartSecteurs = new Chart(document.getElementById("chart-secteurs"), {
    type: "bar",
    data: {
      labels: stats.topSecteurs.map((s) => s.label),
      datasets: [{ data: stats.topSecteurs.map((s) => s.count), backgroundColor: colors, borderRadius: 4 }],
    },
    options: opts,
  });
  chartDirections = new Chart(document.getElementById("chart-directions"), {
    type: "bar",
    data: {
      labels: stats.topDirections.map((d) => d.label),
      datasets: [{ data: stats.topDirections.map((d) => d.count), backgroundColor: colors, borderRadius: 4 }],
    },
    options: opts,
  });
  console.log("[charts] Graphiques initialisés");
}

// --- Filters ---
function initFilters() {
  document.getElementById("search-matches").addEventListener("input", renderMatches);
  document.getElementById("filter-score").addEventListener("change", renderMatches);
  document.getElementById("search-non-trouvees").addEventListener("input", renderNonTrouvees);
}

// --- Render all ---
function renderAll() {
  renderStats();
  renderMap();
  renderMatches();
  renderNonTrouvees();
}

// --- Init ---
async function init() {
  try {
    await loadData();
    initYearSelector();
    initSecteurSelector();
    initDropdown();
    initTabs();
    initFilters();
    initSorting();
    renderAll();
    renderCharts();
    console.log("[init] Dashboard prêt");
  } catch (err) {
    console.error("[init] Erreur d'initialisation:", err);
    document.querySelector("main").innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 mt-4">
        <h3 class="font-bold mb-2">Erreur de chargement</h3>
        <p class="text-sm">Impossible de charger les données. Vérifiez que le serveur est lancé avec <code>pnpm dashboard</code> et que les fichiers JSON existent dans <code>data/output/</code>.</p>
        <pre class="text-xs mt-2 bg-red-100 rounded p-2">${err.message}</pre>
      </div>`;
  }
}

init();
