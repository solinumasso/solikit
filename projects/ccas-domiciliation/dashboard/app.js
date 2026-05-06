// --- State ---
let ccasData = [];
let statsData = {};
let soliguideData = [];
let filteredCcas = [];
let currentPage = 1;
const PAGE_SIZE = 50;

// --- Init ---
async function init() {
  const [ccasResp, statsResp, soliguideResp] = await Promise.all([
    fetch("../data/output/ccas.json").then((r) => r.json()),
    fetch("../data/output/stats.json").then((r) => r.json()),
    fetch("../data/output/soliguide.json").then((r) => r.json()),
  ]);

  ccasData = ccasResp;
  statsData = statsResp;
  soliguideData = soliguideResp;
  filteredCcas = [...ccasData];

  renderStats(statsData);
  populateRegionFilter();
  renderRegionTable(statsData.parRegion);
  renderMap();
  applyFilters();
  setupListeners();

  // Fix Leaflet render after DOM is ready
  setTimeout(() => map && map.invalidateSize(), 200);
}

// --- Stats ---
function renderStats(s) {
  document.getElementById("stat-total").textContent = s.totalCcasAnnuaire.toLocaleString("fr-FR");
  document.getElementById("stat-soliguide").textContent = s.ccasDansSoliguide.toLocaleString("fr-FR");
  document.getElementById("stat-taux").textContent = `${s.tauxCouverture}% de couverture`;
  document.getElementById("stat-dom").textContent = s.ccasAvecDomiciliation.toLocaleString("fr-FR");
  document.getElementById("stat-structures").textContent = s.totalSoliguide.toLocaleString("fr-FR");
  document.getElementById("stat-types").textContent = `${s.soliguideEstCcas} CCAS, ${s.soliguideEstAsso} assos`;
}

// --- Region filter ---
function populateRegionFilter() {
  const select = document.getElementById("filter-region");
  const regions = [...new Set(ccasData.map((c) => c.region))].filter(Boolean).sort();
  for (const r of regions) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  }
}

// --- Region table ---
function renderRegionTable(parRegion) {
  const tbody = document.getElementById("region-tbody");
  const entries = Object.entries(parRegion).sort((a, b) => b[1].total - a[1].total);

  tbody.innerHTML = entries
    .map(([region, s]) => {
      const taux = s.total > 0 ? Math.round((s.dansSoliguide / s.total) * 100) : 0;
      return `<tr>
        <td class="font-semibold">${region}</td>
        <td class="text-right">${s.total.toLocaleString("fr-FR")}</td>
        <td class="text-right font-semibold text-success">${s.dansSoliguide}</td>
        <td class="text-right">
          <div class="flex items-center justify-end gap-2">
            <span class="text-xs">${taux}%</span>
            <div class="coverage-bar"><div class="coverage-bar-fill" style="width:${taux}%"></div></div>
          </div>
        </td>
        <td class="text-right">${s.avecDom}</td>
        <td></td>
      </tr>`;
    })
    .join("");
}

// --- Map ---
let map;
let clusterGroup;

function renderMap() {
  map = L.map("map", { zoomControl: false }).setView([46.6, 2.5], 6);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
  });

  addMarkers(ccasData);
  map.addLayer(clusterGroup);
}

function addMarkers(data) {
  clusterGroup.clearLayers();

  for (const c of data) {
    if (!c.lat || !c.lng) continue;

    const color = c.dansSoliguide ? "#f84b32" : "#d1d5db";
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const marker = L.marker([c.lat, c.lng], { icon });

    let popup = `<div style="min-width:180px">
      <strong style="color:#f84b32">${c.nom}</strong><br/>
      <span style="font-size:12px;color:#666">${c.commune} (${c.departement})</span><br/>`;

    if (c.dansSoliguide) {
      popup += `<span style="font-size:11px;color:#019d4f;font-weight:600">✓ Dans Soliguide</span>`;
      if (c.soliguideUrl) {
        popup += ` <a href="${c.soliguideUrl}" target="_blank" style="font-size:11px">→ voir</a>`;
      }
      if (c.faitDomiciliation) {
        popup += `<br/><span style="font-size:11px;color:#503b5c">● Domiciliation</span>`;
      }
    } else {
      popup += `<span style="font-size:11px;color:#999">✗ Pas dans Soliguide</span>`;
    }
    popup += "</div>";

    marker.bindPopup(popup);
    clusterGroup.addLayer(marker);
  }
}

// --- Table ---
function applyFilters() {
  const search = document.getElementById("search-input").value.toLowerCase().trim();
  const status = document.getElementById("filter-status").value;
  const region = document.getElementById("filter-region").value;

  filteredCcas = ccasData.filter((c) => {
    if (region && c.region !== region) return false;
    if (status === "soliguide" && !c.dansSoliguide) return false;
    if (status === "absent" && c.dansSoliguide) return false;
    if (search) {
      const haystack = `${c.nom} ${c.commune} ${c.departement} ${c.region}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  currentPage = 1;
  renderTable();

  // Update map too
  if (map && clusterGroup) {
    addMarkers(filteredCcas);
  }

  // Update region stats if filtered
  if (region) {
    const regionFiltered = {};
    for (const c of filteredCcas) {
      if (!regionFiltered[c.region]) regionFiltered[c.region] = { total: 0, dansSoliguide: 0, avecDom: 0 };
      regionFiltered[c.region].total++;
      if (c.dansSoliguide) regionFiltered[c.region].dansSoliguide++;
      if (c.faitDomiciliation) regionFiltered[c.region].avecDom++;
    }
    renderRegionTable(regionFiltered);
  } else {
    renderRegionTable(statsData.parRegion);
  }
}

function renderTable() {
  const tbody = document.getElementById("ccas-tbody");
  const total = filteredCcas.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filteredCcas.slice(start, start + PAGE_SIZE);

  document.getElementById("table-count").textContent = `${total.toLocaleString("fr-FR")} résultats`;

  tbody.innerHTML = page
    .map(
      (c) => `<tr class="${c.dansSoliguide ? "" : "opacity-60"}">
      <td class="font-medium">${c.nom}</td>
      <td>${c.commune}</td>
      <td>${c.departement}</td>
      <td class="text-xs">${c.region}</td>
      <td>${
        c.dansSoliguide
          ? `<span class="badge badge-sm badge-success text-white">Oui</span>${c.soliguideUrl ? ` <a href="${c.soliguideUrl}" target="_blank" class="text-xs text-primary underline">→</a>` : ""}`
          : `<span class="badge badge-sm badge-ghost">Non</span>`
      }</td>
      <td>${c.faitDomiciliation ? '<span class="badge badge-sm badge-secondary text-white">Dom.</span>' : "-"}</td>
    </tr>`
    )
    .join("");

  renderPagination(total);
}

function renderPagination(total) {
  const container = document.getElementById("pagination");
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(pages, currentPage + 2);

  if (currentPage > 1) html += `<button class="btn btn-xs btn-ghost" data-page="${currentPage - 1}">←</button>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="btn btn-xs ${i === currentPage ? "btn-primary" : "btn-ghost"}" data-page="${i}">${i}</button>`;
  }
  if (currentPage < pages) html += `<button class="btn btn-xs btn-ghost" data-page="${currentPage + 1}">→</button>`;

  container.innerHTML = html;
  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page);
      renderTable();
    });
  });
}

// --- Tabs ---
function setupListeners() {
  // Menu
  const menuBtn = document.getElementById("menu-btn");
  const menuDropdown = document.getElementById("menu-dropdown");
  menuBtn.addEventListener("click", () => menuDropdown.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuDropdown.classList.add("hidden");
    }
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-ghost");
      });
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-ghost");

      document.querySelectorAll(".tab-content").forEach((t) => (t.style.display = "none"));
      document.getElementById(`tab-${btn.dataset.tab}`).style.display = "";

      if (btn.dataset.tab === "carte" && map) {
        setTimeout(() => map.invalidateSize(), 100);
      }
    });
  });

  // Filters
  document.getElementById("search-input").addEventListener("input", debounce(applyFilters, 300));
  document.getElementById("filter-status").addEventListener("change", applyFilters);
  document.getElementById("filter-region").addEventListener("change", applyFilters);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// --- Go ---
init();
