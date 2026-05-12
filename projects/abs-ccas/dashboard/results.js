const INDICATEURS = [
  {
    key: "nb_services_alimentaires",
    label: "Nb services alimentaires",
    description: "Nombre total de services d'aide alimentaire actifs",
    format: (v) => Math.round(v).toString(),
    hasHistory: true,
    chartLabel: "Nombre de services alimentaires",
    unit: "",
    methodology: {
      description: "Nombre de services référencés dans la catégorie <strong>Alimentation</strong> sur Soliguide, dont la fiche est <strong>en ligne</strong> au moment du calcul.",
      subcategories: ["Distribution de repas", "Panier alimentaire", "Colis bébé", "Fontaine à eau", "Cuisine partagée"],
      notes: ["Inclut les services des structures réservées aux professionnels, même s'ils ne sont visibles que par les comptes professionnels sur Soliguide."],
    },
  },
  {
    key: "taux_ouverture",
    label: "Taux d'ouverture",
    description: "Part des services ouverts parmi les services référencés",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux d'ouverture (%)",
    unit: "%",
    methodology: {
      description: "Taux d'ouverture <strong>moyen</strong> des services alimentaires sur le territoire.",
      formula: "Nombre de jours d'ouverture en semaine &divide; 7",
      notes: ["Calculé uniquement sur les services de la catégorie Alimentation.", "Un service ouvert 5 jours sur 7 a un taux d'ouverture de 71,4 %."],
    },
  },
  {
    key: "taux_saturation",
    label: "Taux de saturation",
    description: "Part des services ayant atteint leur capacité maximale",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux de saturation (%)",
    unit: "%",
  },
  {
    key: "top_categories",
    label: "Top 3 catégories recherchées",
    description: "Les 3 catégories de services les plus recherchées sur ce territoire",
    format: (v) => v.join(" · "),
    hasHistory: false,
    chartLabel: null,
    unit: null,
  },
];

const SERIE_COLORS = [
  "#f84b32",
  "#503b5c",
  "#ed3215",
  "#019d4f",
  "#f29013",
  "#271332",
];

const TYPE_LABELS = {
  commune: "Commune",
  epci: "EPCI",
  departement: "Département",
  region: "Région",
};

const TYPE_BADGE_CLASSES = {
  commune: "badge-primary text-white",
  epci: "badge-secondary text-white",
  departement: "bg-base-300 text-base-content",
  region: "bg-base-300 text-base-content",
};

const chartInstances = {};

// ─── Génération de mock déterministe (même algo que le script TS) ──────────

const CATEGORIES = ["Alimentation", "Hébergement", "Santé", "Emploi", "Administratif", "Petite enfance", "Hygiène", "Transport"];
const PLAGES = {
  commune:     { nbMin: 1,   nbMax: 80 },
  epci:        { nbMin: 10,  nbMax: 200 },
  departement: { nbMin: 20,  nbMax: 400 },
  region:      { nbMin: 50,  nbMax: 1000 },
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function genMois() {
  const mois = [];
  for (let y = 2022; y <= 2025; y++)
    for (let m = 1; m <= 12; m++)
      mois.push(`${y}-${String(m).padStart(2, "0")}`);
  return mois;
}
const MOIS = genMois();

function genHistoriqueNb(rand, valeurFinale) {
  const valeurInitiale = valeurFinale * (0.7 + rand() * 0.2);
  return MOIS.map((mois, i) => {
    const progression = i / (MOIS.length - 1);
    const base = valeurInitiale + (valeurFinale - valeurInitiale) * progression;
    const bruit = (rand() - 0.5) * 0.15 * base;
    return { mois, valeur: Math.max(1, Math.round(base + bruit)) };
  });
}

function genHistoriquePct(rand, valeurFinale, saisonEte, saisonHiver) {
  return MOIS.map((mois) => {
    const moisNum = parseInt(mois.split("-")[1]);
    let saisonnalite = 0;
    if (moisNum === 7 || moisNum === 8) saisonnalite = saisonEte;
    if (moisNum === 12 || moisNum === 1) saisonnalite = saisonHiver;
    const bruit = (rand() - 0.5) * 8;
    const valeur = Math.min(100, Math.max(0, valeurFinale + saisonnalite + bruit));
    return { mois, valeur: Math.round(valeur * 10) / 10 };
  });
}

function genTopCategories(rand) {
  return [...CATEGORIES].sort(() => rand() - 0.5).slice(0, 3);
}

function generateIndicateurs(code, type) {
  const rand = seededRandom(hashCode(code + type));
  const { nbMin, nbMax } = PLAGES[type] ?? PLAGES.commune;

  const nbServices = Math.round(nbMin + rand() * (nbMax - nbMin));
  const tauxOuverture = 40 + rand() * 55;
  const tauxSaturation = 30 + rand() * 60;

  return {
    nb_services_alimentaires: {
      valeur: nbServices,
      historique: genHistoriqueNb(rand, nbServices),
    },
    taux_ouverture: {
      valeur: Math.round(tauxOuverture * 10) / 10,
      historique: genHistoriquePct(rand, tauxOuverture, -4, 2),
    },
    taux_saturation: {
      valeur: Math.round(tauxSaturation * 10) / 10,
      historique: genHistoriquePct(rand, tauxSaturation, -3, 6),
    },
    top_categories: {
      valeur: genTopCategories(rand),
      historique: null,
    },
  };
}

// ─── Modales méthodologie ──────────────────────────────────────────────────

function buildMethodologyModals() {
  INDICATEURS.forEach((ind) => {
    if (!ind.methodology) return;
    const m = ind.methodology;

    const subcatsHtml = m.subcategories?.length
      ? `<div class="mt-3">
           <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1">Sous-catégories incluses</p>
           <ul class="flex flex-wrap gap-1">
             ${m.subcategories.map(s => `<li class="badge badge-sm bg-primary/10 text-primary border-0">${s}</li>`).join("")}
           </ul>
         </div>`
      : "";

    const formulaHtml = m.formula
      ? `<div class="mt-3 bg-base-200 rounded-lg px-4 py-2 text-sm font-mono text-primary-content">${m.formula}</div>`
      : "";

    const notesHtml = m.notes?.length
      ? `<div class="mt-3 space-y-1">
           ${m.notes.map(n => `<p class="text-xs text-base-content/50 flex gap-1.5"><span>ℹ️</span><span>${n}</span></p>`).join("")}
         </div>`
      : "";

    const dialog = document.createElement("dialog");
    dialog.id = `modal-${ind.key}`;
    dialog.className = "modal";
    dialog.innerHTML = `
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-base text-primary-content mb-1" style="font-family:'Nunito',sans-serif">${ind.label}</h3>
        <p class="text-sm text-base-content/70">${m.description}</p>
        ${formulaHtml}
        ${subcatsHtml}
        ${notesHtml}
        <div class="modal-action mt-4">
          <form method="dialog"><button class="btn btn-sm btn-ghost">Fermer</button></form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>Fermer</button></form>`;
    document.body.appendChild(dialog);
  });
}

// ─── Init ──────────────────────────────────────────────────────────────────

async function init() {
  // Récupérer les territoires depuis sessionStorage (posé par app.js)
  const stored = sessionStorage.getItem("abs-territories");
  let territoires = stored ? JSON.parse(stored) : [];

  // Fallback : reconstruire depuis l'URL si sessionStorage vide (ex: accès direct)
  if (territoires.length === 0) {
    const params = new URLSearchParams(window.location.search);
    const codes = (params.get("territories") || "").split(",").filter(Boolean);
    if (codes.length === 0) {
      showError("Aucun territoire sélectionné.");
      return;
    }
    territoires = codes.map(code => ({ code, nom: code, type: "commune" }));
  }

  // Charger le mock JSON pré-généré (pour les 52 territoires connus)
  let mockData = { territoires: {} };
  try {
    const res = await fetch("../data/output/mock-data.json");
    mockData = await res.json();
  } catch (_) {}

  // Pour chaque territoire : utiliser le mock si dispo, sinon générer à la volée
  const territoiresAvecData = territoires.map(t => {
    const fromMock = mockData.territoires?.[t.code];
    return {
      ...t,
      indicateurs: fromMock ? fromMock.indicateurs : generateIndicateurs(t.code, t.type),
    };
  });

  buildMethodologyModals();
  renderBadges(territoiresAvecData);
  buildTable(territoiresAvecData);
}

function showError(msg) {
  document.querySelector("main").innerHTML = `
    <div class="text-center py-20">
      <p class="text-base-content/50">${msg}</p>
      <a href="index.html" class="btn btn-primary mt-4">← Retour à la sélection</a>
    </div>`;
}

// ─── Badges territoires ────────────────────────────────────────────────────

function renderBadges(territoires) {
  const container = document.getElementById("territory-badges");
  territoires.forEach((t, i) => {
    const badge = document.createElement("span");
    const dot = `<span class="inline-block w-2 h-2 rounded-full mr-1" style="background:${SERIE_COLORS[i % SERIE_COLORS.length]}"></span>`;
    const typeClass = TYPE_BADGE_CLASSES[t.type] || "bg-base-300";
    badge.className = `badge badge-lg gap-1 font-semibold ${typeClass}`;
    badge.innerHTML = `${dot}${t.nom} <span class="opacity-60 text-xs font-normal">${TYPE_LABELS[t.type] || t.type}</span>`;
    container.appendChild(badge);
  });
}

// ─── Tableau ───────────────────────────────────────────────────────────────

function buildTable(territoires) {
  buildThead(territoires);
  buildTbody(territoires);
}

function buildThead(territoires) {
  const thead = document.getElementById("results-thead");
  const tr = document.createElement("tr");

  const thInd = document.createElement("th");
  thInd.textContent = "Indicateur";
  thInd.className = "sticky-col";
  tr.appendChild(thInd);

  territoires.forEach((t, i) => {
    const th = document.createElement("th");
    th.className = "text-center min-w-36";
    th.innerHTML = `
      <div class="flex flex-col items-center gap-1">
        <span class="w-3 h-3 rounded-full inline-block" style="background:${SERIE_COLORS[i % SERIE_COLORS.length]}"></span>
        <span class="font-bold text-primary-content leading-tight">${t.nom}</span>
        <span class="badge badge-sm ${TYPE_BADGE_CLASSES[t.type] || ''} font-normal">${TYPE_LABELS[t.type] || t.type}</span>
      </div>`;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}

function buildTbody(territoires) {
  const tbody = document.getElementById("results-tbody");

  INDICATEURS.forEach((indicateur) => {
    const tr = document.createElement("tr");
    tr.className = "hover";

    const tdLabel = document.createElement("td");
    tdLabel.className = "sticky-col";
    const infoBtn = indicateur.methodology
      ? `<button class="btn-info-toggle inline-flex items-center justify-center w-4 h-4 rounded-full text-xs bg-base-300 text-base-content/50 hover:bg-primary/20 hover:text-primary transition-colors ml-1 leading-none" data-modal="modal-${indicateur.key}" title="Méthodologie">ⓘ</button>`
      : "";

    tdLabel.innerHTML = `
      <div class="flex flex-col gap-0.5">
        <span class="font-semibold text-primary-content text-sm">${indicateur.label}${infoBtn}</span>
        <span class="text-xs text-base-content/40 leading-tight">${indicateur.description}</span>
        ${indicateur.hasHistory
          ? `<button class="btn-chart-toggle btn btn-xs btn-ghost text-accent-content mt-1 w-fit px-0 gap-1 hover:bg-transparent" data-key="${indicateur.key}">
               <span class="chart-toggle-icon">📈</span> <span class="chart-toggle-label">Voir l'évolution</span>
             </button>`
          : `<span class="text-xs text-base-content/20 mt-1">— pas d'historique</span>`
        }
      </div>`;
    tr.appendChild(tdLabel);

    territoires.forEach((t) => {
      const td = document.createElement("td");
      td.className = "text-center align-top";
      const indData = t.indicateurs[indicateur.key];
      td.innerHTML = indData
        ? `<span class="font-bold text-base text-primary-content">${indicateur.format(indData.valeur)}</span>`
        : `<span class="text-base-content/30">—</span>`;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);

    if (indicateur.methodology) {
      tdLabel.querySelector(".btn-info-toggle")?.addEventListener("click", () => {
        if (window.posthog) posthog.capture("analysis-page-more-info", { indicator: indicateur.key });
        document.getElementById(`modal-${indicateur.key}`)?.showModal();
      });
    }

    if (indicateur.hasHistory) {
      const trChart = document.createElement("tr");
      trChart.id = `chart-row-${indicateur.key}`;
      trChart.className = "hidden";

      const tdChart = document.createElement("td");
      tdChart.colSpan = territoires.length + 1;
      tdChart.className = "p-0";
      tdChart.innerHTML = `
        <div class="chart-container px-6 py-4 bg-base-50">
          <canvas id="chart-${indicateur.key}" height="120"></canvas>
        </div>`;
      trChart.appendChild(tdChart);
      tbody.appendChild(trChart);

      tdLabel.querySelector(".btn-chart-toggle").addEventListener("click", () => {
        toggleChart(indicateur, territoires, trChart);
      });
    }
  });
}

// ─── Graphiques Chart.js ───────────────────────────────────────────────────

function toggleChart(indicateur, territoires, trChart) {
  const isOpen = !trChart.classList.contains("hidden");
  const btn = document.querySelector(`[data-key="${indicateur.key}"]`);

  if (isOpen) {
    trChart.classList.add("hidden");
    if (btn) {
      btn.querySelector(".chart-toggle-icon").textContent = "📈";
      btn.querySelector(".chart-toggle-label").textContent = "Voir l'évolution";
    }
    return;
  }

  trChart.classList.remove("hidden");
  if (window.posthog) posthog.capture("analysis-page-see-evolution", { indicator: indicateur.key });
  if (btn) {
    btn.querySelector(".chart-toggle-icon").textContent = "📉";
    btn.querySelector(".chart-toggle-label").textContent = "Masquer";
  }

  if (chartInstances[indicateur.key]) return;

  const canvas = document.getElementById(`chart-${indicateur.key}`);
  if (!canvas) return;

  const labels = MOIS.map(formatMois);

  const datasets = territoires.map((t, i) => {
    const hist = t.indicateurs[indicateur.key]?.historique || [];
    return {
      label: t.nom,
      data: hist.map(h => h.valeur),
      borderColor: SERIE_COLORS[i % SERIE_COLORS.length],
      backgroundColor: SERIE_COLORS[i % SERIE_COLORS.length] + "20",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
    };
  });

  chartInstances[indicateur.key] = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 12, padding: 16, font: { family: "Roboto" } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label} : ${indicateur.format(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 12, font: { family: "Roboto", size: 11 }, color: "#737373" },
          grid: { display: false }
        },
        y: {
          ticks: {
            font: { family: "Roboto", size: 11 },
            color: "#737373",
            callback: (v) => indicateur.unit ? v + " " + indicateur.unit : v
          },
          grid: { color: "#f5f5f5" }
        }
      }
    }
  });
}

function formatMois(moisStr) {
  const [annee, mois] = moisStr.split("-");
  const noms = ["jan.", "fév.", "mar.", "avr.", "mai", "jun.", "jul.", "aoû.", "sep.", "oct.", "nov.", "déc."];
  return `${noms[parseInt(mois) - 1]} ${annee}`;
}

init();
