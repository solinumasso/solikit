// Dashboard "Aide à la régularisation Espagne"
// Charge 2 sources JSON, place les marqueurs sur Leaflet, synchronise liste & carte.

const SOURCES = {
  oficinas: "../data/output/oficinas_regularizacion_2026.json",
  soliguide: "../data/output/soliguide-conseil-administratif-es.json",
};

const TYPE_META = {
  soliguide: { label: "Aide aux dossiers", emoji: "📝" },
  SS:        { label: "Seguridad Social",  emoji: "🏛️" },
  OEX:       { label: "Extranjería",        emoji: "🛂" },
  Correos:   { label: "Correos",            emoji: "✉️" },
};

const state = {
  places: [],            // entrées normalisées
  filteredPlaces: [],
  markers: new Map(),    // id -> Leaflet marker
  cluster: null,
  map: null,
  filters: { types: new Set(["soliguide", "SS", "OEX", "Correos"]), province: "", search: "" },
  activeId: null,
};

async function loadAll() {
  const [oficinasJson, soliJson] = await Promise.all([
    fetch(SOURCES.oficinas).then((r) => r.json()),
    fetch(SOURCES.soliguide).then((r) => r.json()),
  ]);

  // Oficinas État → normalisation
  for (const o of oficinasJson.oficinas) {
    if (!o.lat || !o.lon) continue;
    state.places.push({
      id: o.id,
      type: o.tipo,
      name: o.nombre,
      address: o.direccion,
      city: o.ciudad,
      postalCode: o.codigo_postal,
      province: o.provincia,
      region: o.comunidad_autonoma,
      lat: o.lat,
      lon: o.lon,
      precision: o.geocoding_status,
      source: "estado",
      typeLabel: o.tipo_label,
    });
  }

  // Soliguide → normalisation
  for (const p of soliJson.places) {
    const coords = p.position?.location?.coordinates;
    if (!coords || coords.length !== 2) continue;
    state.places.push({
      id: `sg-${p.lieu_id}`,
      type: "soliguide",
      name: p.name,
      address: p.position?.address || p.position?.adresse || "",
      city: p.position?.city || p.position?.ville || "",
      postalCode: p.position?.postalCode || p.position?.codePostal || "",
      province: p.position?.department || p.position?.departement || "",
      region: p.position?.region || "",
      lat: coords[1],
      lon: coords[0],
      source: "soliguide",
      typeLabel: "Aide aux dossiers",
      seoUrl: p.seo_url,
      description: p.description,
      phone: p.entity?.phones?.[0]?.phoneNumber || "",
      mail: p.entity?.mail || "",
      website: p.entity?.website || "",
    });
  }
}

function updateCounts() {
  const counts = { soliguide: 0, SS: 0, OEX: 0, Correos: 0 };
  for (const p of state.places) counts[p.type] = (counts[p.type] || 0) + 1;
  document.getElementById("count-soliguide").textContent = counts.soliguide;
  document.getElementById("count-ss").textContent = counts.SS;
  document.getElementById("count-oex").textContent = counts.OEX;
  document.getElementById("count-correos").textContent = counts.Correos;
}

function buildProvinceOptions() {
  const set = new Set();
  state.places.forEach((p) => p.province && set.add(p.province));
  const select = document.getElementById("filter-province");
  [...set].sort((a, b) => a.localeCompare(b, "es")).forEach((prov) => {
    const opt = document.createElement("option");
    opt.value = prov;
    opt.textContent = prov;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const { types, province, search } = state.filters;
  const q = search.trim().toLowerCase();
  state.filteredPlaces = state.places.filter((p) => {
    if (!types.has(p.type)) return false;
    if (province && p.province !== province) return false;
    if (q && !`${p.name} ${p.city} ${p.address}`.toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById("result-count").textContent = `${state.filteredPlaces.length} lieu${state.filteredPlaces.length > 1 ? "x" : ""}`;
  renderMarkers();
  renderList();
}

function makeIcon(type) {
  return L.divIcon({
    className: "",
    html: `<div class="pin pin-${type}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

function popupHtml(p) {
  const parts = [`<h3 class="text-primary-content text-base font-bold">${escapeHtml(p.name)}</h3>`];
  parts.push(`<div class="text-xs text-gray-500 mb-1">${TYPE_META[p.type].emoji} ${TYPE_META[p.type].label}</div>`);
  if (p.address) parts.push(`<p class="text-sm">${escapeHtml(p.address)}</p>`);
  const cityLine = [p.postalCode, p.city].filter(Boolean).join(" ");
  if (cityLine) parts.push(`<p class="text-sm text-gray-600">${escapeHtml(cityLine)}</p>`);
  if (p.phone) parts.push(`<p class="text-sm mt-1">📞 ${escapeHtml(p.phone)}</p>`);
  if (p.mail) parts.push(`<p class="text-sm">✉️ <a class="text-accent-content underline" href="mailto:${escapeHtml(p.mail)}">${escapeHtml(p.mail)}</a></p>`);
  if (p.website) parts.push(`<p class="text-sm">🌐 <a class="text-accent-content underline" href="${escapeHtml(p.website)}" target="_blank" rel="noopener">site web</a></p>`);
  if (p.seoUrl) parts.push(`<p class="text-sm mt-1"><a class="text-accent-content underline" href="https://soliguia.es/${escapeHtml(p.seoUrl)}" target="_blank" rel="noopener">Voir sur Soliguia →</a></p>`);
  return parts.join("");
}

function renderMarkers() {
  if (!state.cluster) return;
  state.cluster.clearLayers();
  state.markers.clear();
  const visibleIds = new Set(state.filteredPlaces.map((p) => p.id));
  for (const p of state.filteredPlaces) {
    const marker = L.marker([p.lat, p.lon], { icon: makeIcon(p.type) });
    marker.bindPopup(popupHtml(p));
    marker.on("click", () => focusOn(p.id, false));
    state.markers.set(p.id, marker);
    state.cluster.addLayer(marker);
  }
}

function renderList() {
  const container = document.getElementById("place-list");
  if (state.filteredPlaces.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-base-content/50 text-sm">Aucun lieu ne correspond aux filtres.</div>`;
    return;
  }
  container.innerHTML = state.filteredPlaces.slice(0, 300).map((p) => `
    <div class="place-card p-3" data-id="${p.id}">
      <div class="flex items-start gap-2">
        <span class="w-3 h-3 rounded-full bg-${typeBadgeColor(p.type)} mt-1.5 shrink-0"></span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${escapeHtml(p.name)}</div>
          <div class="text-xs text-base-content/60 truncate">${escapeHtml([p.address, [p.postalCode, p.city].filter(Boolean).join(" ")].filter(Boolean).join(" — "))}</div>
          <div class="text-xs mt-1"><span class="text-${typeTextColor(p.type)}">${TYPE_META[p.type].emoji} ${TYPE_META[p.type].label}</span></div>
        </div>
      </div>
    </div>
  `).join("");
  if (state.filteredPlaces.length > 300) {
    container.insertAdjacentHTML("beforeend", `<div class="p-3 text-xs text-center text-base-content/50">+ ${state.filteredPlaces.length - 300} autres lieux (affine les filtres pour les voir)</div>`);
  }
  container.querySelectorAll(".place-card").forEach((el) => {
    el.addEventListener("click", () => focusOn(el.dataset.id, true));
  });
}

function typeBadgeColor(t) {
  return t === "soliguide" ? "primary" : t === "SS" ? "success" : t === "OEX" ? "warning" : "secondary";
}
function typeTextColor(t) {
  return t === "soliguide" ? "primary" : t === "SS" ? "success-content" : t === "OEX" ? "warning-content" : "secondary";
}

function focusOn(id, fromList) {
  state.activeId = id;
  document.querySelectorAll(".place-card").forEach((el) => el.classList.toggle("active", el.dataset.id === id));
  const marker = state.markers.get(id);
  if (marker) {
    state.cluster.zoomToShowLayer(marker, () => {
      marker.openPopup();
      if (fromList) state.map.panTo(marker.getLatLng());
    });
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function setupMap() {
  state.map = L.map("map", { zoomControl: true }).setView([40.4, -3.7], 6);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(state.map);
  state.cluster = L.markerClusterGroup({ disableClusteringAtZoom: 12, spiderfyOnMaxZoom: true });
  state.map.addLayer(state.cluster);
}

function setupFilters() {
  document.querySelectorAll(".filter-type").forEach((cb) => {
    cb.addEventListener("change", () => {
      const t = cb.dataset.type;
      cb.checked ? state.filters.types.add(t) : state.filters.types.delete(t);
      applyFilters();
    });
  });
  document.getElementById("filter-province").addEventListener("change", (e) => {
    state.filters.province = e.target.value;
    applyFilters();
  });
  let timer;
  document.getElementById("filter-search").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.filters.search = e.target.value; applyFilters(); }, 200);
  });
}

function setupMenu() {
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("menu-dropdown");
  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add("hidden");
  });
}

(async function init() {
  setupMap();
  setupMenu();
  await loadAll();
  updateCounts();
  buildProvinceOptions();
  setupFilters();
  applyFilters();
})();
