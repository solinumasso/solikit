const state = {
  commune: null,          // objet { code, nom, epci, departement, region }
  parents: new Map(),     // code → { code, nom, type, actif: bool }
  extras: new Map(),      // code → { code, nom } communes supplémentaires
  communesFallback: []    // communes du mock, utilisées si l'API Geo échoue
};

const GEO_API = "https://geo.api.gouv.fr/communes";

// ─── Init ──────────────────────────────────────────────────────────────────

async function init() {
  // Charger les communes du mock comme fallback local
  try {
    const res = await fetch("../data/output/mock-data.json");
    const data = await res.json();
    state.communesFallback = data.communes || [];
  } catch (_) {}

  setupCommuneSearch();
  setupExtraSearch();
  setupMenu();
}

// ─── Menu hamburger ────────────────────────────────────────────────────────

function setupMenu() {
  const btn = document.getElementById("menu-btn");
  const dropdown = document.getElementById("menu-dropdown");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", () => dropdown.classList.add("hidden"));
}

// ─── Appel API Geo ─────────────────────────────────────────────────────────

async function searchCommunes(query) {
  try {
    const url = `${GEO_API}?nom=${encodeURIComponent(query)}&fields=nom,code,departement,region,epci&boost=population&limit=8`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API indisponible");
    return await res.json();
  } catch (_) {
    // Fallback : chercher dans les communes du mock local
    const q = query.toLowerCase();
    return state.communesFallback.filter(c => c.nom.toLowerCase().includes(q)).slice(0, 8);
  }
}

// ─── Recherche commune principale ─────────────────────────────────────────

function setupCommuneSearch() {
  const input = document.getElementById("commune-input");
  const suggestions = document.getElementById("suggestions");
  const clearBtn = document.getElementById("commune-clear");
  let debounce = null;

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearBtn.classList.toggle("hidden", q.length === 0);
    clearTimeout(debounce);
    if (q.length < 2) { suggestions.classList.add("hidden"); return; }
    debounce = setTimeout(async () => {
      try {
        const communes = await searchCommunes(q);
        renderSuggestions(suggestions, communes, (commune) => {
          if (window.posthog) {
            posthog.capture("homepage-commune-selected", {
              commune_nom: commune.nom,
              commune_code: commune.code,
              departement: commune.departement?.nom ?? null,
            });
          }
          selectCommune(commune);
          input.value = commune.nom;
          clearBtn.classList.remove("hidden");
          suggestions.classList.add("hidden");
        });
      } catch (err) {
        console.error("Erreur recherche commune:", err);
      }
    }, 200);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.add("hidden");
    suggestions.classList.add("hidden");
    resetSelection();
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add("hidden");
    }
  });
}

function renderSuggestions(container, communes, onSelect) {
  container.innerHTML = "";
  if (communes.length === 0) {
    container.innerHTML = `<li class="px-4 py-3 text-sm text-base-content/50">Aucune commune trouvée</li>`;
    container.classList.remove("hidden");
    return;
  }
  communes.forEach(commune => {
    const li = document.createElement("li");
    li.className = "px-4 py-3 text-sm cursor-pointer hover:bg-base-200 border-b border-base-100 last:border-0";
    const dept = commune.departement?.nom ?? "";
    li.innerHTML = `<span class="font-semibold">${commune.nom}</span> <span class="text-base-content/40 text-xs">${dept}</span>`;
    li.addEventListener("click", () => onSelect(commune));
    container.appendChild(li);
  });
  container.classList.remove("hidden");
}

function selectCommune(commune) {
  state.commune = commune;
  state.extras.delete(commune.code);

  state.parents.clear();

  if (commune.epci?.code) {
    state.parents.set(commune.epci.code, {
      code: commune.epci.code,
      nom: commune.epci.nom,
      type: "EPCI",
      territoireType: "epci",
      actif: true
    });
  }
  if (commune.departement?.code) {
    state.parents.set(commune.departement.code, {
      code: commune.departement.code,
      nom: `${commune.departement.nom} (${commune.departement.code})`,
      type: "Département",
      territoireType: "departement",
      actif: true
    });
  }
  if (commune.region?.code) {
    state.parents.set(commune.region.code, {
      code: commune.region.code,
      nom: commune.region.nom,
      type: "Région",
      territoireType: "region",
      actif: true
    });
  }

  renderParents();
  renderExtras();
  renderLaunch();

  document.getElementById("parents-section").classList.remove("hidden");
  document.getElementById("extras-section").classList.remove("hidden");
  document.getElementById("launch-section").classList.remove("hidden");
}

function resetSelection() {
  state.commune = null;
  state.parents.clear();
  state.extras.clear();
  document.getElementById("parents-section").classList.add("hidden");
  document.getElementById("extras-section").classList.add("hidden");
  document.getElementById("launch-section").classList.add("hidden");
}

// ─── Badges territoires parent ─────────────────────────────────────────────

function renderParents() {
  const container = document.getElementById("parents-badges");
  container.innerHTML = "";
  state.parents.forEach((parent) => {
    const badge = document.createElement("button");
    badge.className = parent.actif
      ? "badge badge-lg gap-1 cursor-pointer border-2 border-primary text-primary bg-primary/10 font-semibold"
      : "badge badge-lg gap-1 cursor-pointer border-2 border-base-300 text-base-content/40 bg-base-200 font-semibold line-through";
    badge.innerHTML = `<span class="text-xs opacity-60">${parent.type}</span> <span>${parent.nom}</span> <span>${parent.actif ? "✓" : "✗"}</span>`;
    badge.addEventListener("click", () => {
      parent.actif = !parent.actif;
      renderParents();
      renderLaunch();
    });
    container.appendChild(badge);
  });
}

// ─── Communes supplémentaires ──────────────────────────────────────────────

function setupExtraSearch() {
  const input = document.getElementById("extra-input");
  const suggestions = document.getElementById("extra-suggestions");
  let debounce = null;

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearTimeout(debounce);
    if (q.length < 2) { suggestions.classList.add("hidden"); return; }

    debounce = setTimeout(async () => {
      try {
        const exclusions = new Set([state.commune?.code, ...state.extras.keys()]);
        const communes = (await searchCommunes(q)).filter(c => !exclusions.has(c.code));
        renderSuggestions(suggestions, communes, (commune) => {
          state.extras.set(commune.code, commune);
          input.value = "";
          suggestions.classList.add("hidden");
          renderExtras();
          renderLaunch();
        });
      } catch (err) {
        console.error("Erreur recherche commune (extra):", err);
      }
    }, 200);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add("hidden");
    }
  });
}

function renderExtras() {
  const container = document.getElementById("extras-list");
  container.innerHTML = "";
  state.extras.forEach((commune, code) => {
    const badge = document.createElement("span");
    badge.className = "badge badge-lg gap-2 border border-secondary text-secondary bg-secondary/10 font-semibold";
    badge.innerHTML = `${commune.nom} <button class="text-secondary/60 hover:text-secondary font-bold" aria-label="Retirer">✕</button>`;
    badge.querySelector("button").addEventListener("click", () => {
      state.extras.delete(code);
      renderExtras();
      renderLaunch();
    });
    container.appendChild(badge);
  });
}

// ─── Résumé + lancement ────────────────────────────────────────────────────

function renderLaunch() {
  if (!state.commune) return;

  // Construire la liste des territoires à passer à la page résultats
  const territoires = [
    { code: state.commune.code, nom: state.commune.nom, type: "commune" },
    ...[...state.parents.values()]
      .filter(p => p.actif)
      .map(p => ({ code: p.code, nom: p.nom, type: p.territoireType })),
    ...[...state.extras.values()]
      .map(c => ({ code: c.code, nom: c.nom, type: "commune" }))
  ];

  const total = territoires.length;
  document.getElementById("resume-text").textContent =
    `Vous allez comparer ${total} territoire${total > 1 ? "s" : ""} : ${state.commune.nom} et ${total - 1} territoire${total - 1 !== 1 ? "s" : ""} de référence.`;

  // Stocker les infos complètes en sessionStorage pour la page résultats
  sessionStorage.setItem("abs-territories", JSON.stringify(territoires));

  const btn = document.getElementById("launch-btn");
  const newBtn = btn.cloneNode(true); // reset les listeners précédents
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", () => {
    if (window.posthog) {
      posthog.capture("homepage-launch-analysis", {
        territories: territoires.map(t => ({ code: t.code, nom: t.nom, type: t.type })),
        nb_territories: territoires.length,
      });
    }
    const codes = territoires.map(t => t.code).join(",");
    window.location.href = `results.html?territories=${codes}`;
  });
}

init();
