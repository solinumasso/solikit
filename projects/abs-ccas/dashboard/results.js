const INDICATEURS = [
  // ── Alimentation — Offre ──────────────────────────────────────────────────
  {
    key: "nb_services_alimentaires",
    label: "Nombre de services alimentaires",
    description: "Nombre de services alimentaires cartographiés dans des structures en ligne du territoire",
    format: (v) => Math.round(v).toString(),
    hasHistory: true,
    chartLabel: "Nb services alimentaires",
    unit: "",
    section: "Alimentation — Offre",
    methodology: {
      description: "Nombre de services alimentaires cartographiés dans des structures en ligne du territoire concerné. Un service est considéré comme alimentaire s'il appartient à l'une des catégories : Distribution de repas, Panier alimentaire, Colis bébé, Bon / chèque alimentaire, Épicerie Sociale et Solidaire, Cuisine partagée, Atelier cuisine, Jardin solidaire, Frigo solidaire.",
      notes: ["Les fiches brouillons, fermées définitivement et hors ligne ne sont pas incluses.", "Les fiches réservées aux professionnels ne sont pas incluses."],
    },
  },
  {
    key: "taux_ouverture_moyen",
    label: "Taux d'ouverture moyen",
    description: "Moyenne du taux d'ouverture des services alimentaires du territoire",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux d'ouverture (%)",
    unit: "%",
    section: "Alimentation — Offre",
    methodology: {
      description: "Moyenne du taux d'ouverture des services alimentaires du territoire concerné. Le taux d'ouverture d'un service correspond au nombre de jours de semaine durant lequel le service est ouvert à au moins un moment dans la journée, divisé par 7.",
      formula: "Nb jours d'ouverture en semaine &divide; 7",
      notes: ["Ce taux est calculé indépendamment de l'amplitude horaire : un service ouvert 1h/jour a le même taux qu'un service ouvert 8h/jour."],
    },
  },
  {
    key: "taux_ouverture_ete",
    label: "Taux d'ouverture estival",
    description: "Taux d'ouverture des services alimentaires durant le dernier été (juillet/août)",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: false,
    chartLabel: null,
    unit: "%",
    section: "Alimentation — Offre",
    methodology: {
      description: "Moyenne du taux d'ouverture des services alimentaires durant les mois de juillet/août du dernier été. Un service ouvrant habituellement 5j/7 et fermant complètement 2 semaines a un taux estival de ~53 %.",
    },
  },
  {
    key: "taux_satures",
    label: "Taux de services saturés",
    description: "Part des services alimentaires saturés ou en risque de saturation",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux de saturation (%)",
    unit: "%",
    section: "Alimentation — Offre",
    methodology: {
      description: "Nombre de services alimentaires marqués comme saturé ou en risque de saturation, divisé par le nombre de services alimentaires total sur le territoire concerné.",
      notes: ["⚠️ Biais identifié : le champ saturation est peu renseigné dans la base Soliguide (à vérifier)."],
    },
  },
  // ── Alimentation — Modalités d'accès ─────────────────────────────────────
  {
    key: "taux_acces_libre",
    label: "Taux en accès libre",
    description: "Part des services alimentaires accessibles sans démarche préalable",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux en accès libre (%)",
    unit: "%",
    section: "Alimentation — Modalités d'accès",
    methodology: {
      description: "Nombre de services alimentaires marqués comme étant en accès libre, divisé par le nombre de services alimentaire total sur le territoire concerné.",
    },
  },
  {
    key: "taux_inscription",
    label: "Taux sur inscription",
    description: "Part des services alimentaires nécessitant une inscription préalable",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux sur inscription (%)",
    unit: "%",
    section: "Alimentation — Modalités d'accès",
    methodology: {
      description: "Nombre de services alimentaires marqués comme étant sur inscription, divisé par le nombre de services alimentaire total sur le territoire concerné.",
    },
  },
  {
    key: "taux_rendez_vous",
    label: "Taux sur rendez-vous",
    description: "Part des services alimentaires fonctionnant sur rendez-vous",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux sur rendez-vous (%)",
    unit: "%",
    section: "Alimentation — Modalités d'accès",
    methodology: {
      description: "Nombre de services alimentaires marqués comme étant sur rendez-vous, divisé par le nombre de services alimentaire total sur le territoire concerné.",
    },
  },
  {
    key: "taux_orientation",
    label: "Taux sur orientation",
    description: "Part des services alimentaires accessibles uniquement sur orientation",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux sur orientation (%)",
    unit: "%",
    section: "Alimentation — Modalités d'accès",
    methodology: {
      description: "Nombre de services alimentaires marqués comme étant sur orientation, divisé par le nombre de services alimentaire total sur le territoire concerné.",
    },
  },
  {
    key: "taux_sans_participation",
    label: "Taux sans participation financière",
    description: "Part des services alimentaires ne requérant aucune participation financière",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Taux sans participation (%)",
    unit: "%",
    section: "Alimentation — Modalités d'accès",
    methodology: {
      description: "Nombre de services alimentaires ne requérant pas de participation financière, divisé par le nombre de services alimentaire total sur le territoire concerné.",
    },
  },
  // ── Alimentation — Contexte ───────────────────────────────────────────────
  {
    key: "risque_precarite_alimentaire",
    label: "Risque de précarité alimentaire",
    description: "Score de risque de précarité alimentaire sur le territoire",
    format: (v) => v < 33 ? "Faible" : v < 66 ? "Modéré" : "Élevé",
    renderCell: (v) => {
      if (v < 33) return `<span class="badge badge-sm bg-success/20 text-success-content font-semibold">Faible</span>`;
      if (v < 66) return `<span class="badge badge-sm bg-warning/20 text-warning-content font-semibold">Modéré</span>`;
      return `<span class="badge badge-sm bg-error/20 text-error-content font-semibold">Élevé</span>`;
    },
    hasHistory: false,
    chartLabel: null,
    unit: null,
    section: "Alimentation — Contexte",
    methodology: {
      description: "[Description à compléter]",
    },
  },
  // ── Alimentation — Usage ──────────────────────────────────────────────────
  {
    key: "nb_recherches_alimentation",
    label: "Nb recherches Alimentation",
    description: "Nombre de recherches effectuées sur la catégorie Alimentation",
    format: (v) => Math.round(v).toLocaleString("fr-FR"),
    hasHistory: true,
    chartLabel: "Nb recherches",
    unit: "",
    section: "Alimentation — Usage",
  },
  {
    key: "part_recherches_alimentation",
    label: "Part des recherches Alimentation",
    description: "Part des recherches Alimentation parmi les recherches associées à une thématique",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Part des recherches (%)",
    unit: "%",
    section: "Alimentation — Usage",
    methodology: {
      description: "Part des recherches effectuées sur la catégorie Alimentation parmi toutes les recherches associées à une thématique Soliguide.",
    },
  },
  {
    key: "nb_consultations_alimentation",
    label: "Nb consultations Alimentation",
    description: "Nombre de consultations de fiches Soliguide liées à une recherche Alimentation",
    format: (v) => Math.round(v).toLocaleString("fr-FR"),
    hasHistory: true,
    chartLabel: "Nb consultations",
    unit: "",
    section: "Alimentation — Usage",
    methodology: {
      description: "Une consultation est considérée comme faite sur une thématique si l'accès à la fiche, le clic sur <strong>Afficher le numéro</strong>, <strong>Appeler</strong> ou le bouton de navigation a été effectué dans la même session qu'une recherche sur la thématique concernée.",
    },
  },
  {
    key: "part_consultations_alimentation",
    label: "Part des consultations Alimentation",
    description: "Part des consultations Alimentation parmi les consultations associées à une thématique",
    format: (v) => v.toFixed(1) + " %",
    hasHistory: true,
    chartLabel: "Part des consultations (%)",
    unit: "%",
    section: "Alimentation — Usage",
    methodology: {
      description: "Nombre de consultations sur la thématique Alimentation divisé par le nombre de consultations inputtées à d'autres catégories.",
    },
  },
  // ── Général — Usage ───────────────────────────────────────────────────────
  {
    key: "repartition_recherches_thematiques",
    label: "Répartition des recherches",
    description: "Répartition des recherches Soliguide par thématique",
    format: (v) => v.slice(0, 2).map(e => `${e.label} ${e.pct}%`).join(" · "),
    renderCell: (v) => `<div class="flex flex-col gap-0.5 items-center">${v.slice(0, 3).map((e, i) => `<span class="text-xs ${i === 0 ? "font-semibold text-primary-content" : "text-base-content/50"}">${e.label} ${e.pct}%</span>`).join("")}</div>`,
    hasHistory: true,
    chartLabel: "Part Alimentation (%)",
    unit: "%",
    type: "distribution",
    section: "Général — Usage",
    methodology: {
      description: "Certaines recherches peuvent être « associées » à une thématique. Par exemple, une recherche sur la catégorie Distribution de repas est associée à la thématique Alimentation. Cet indicateur montre la répartition des thématiques parmi les recherches associées à une thématique.",
    },
  },
  {
    key: "repartition_consultations_thematiques",
    label: "Répartition des consultations",
    description: "Répartition des consultations Soliguide par thématique",
    format: (v) => v.slice(0, 2).map(e => `${e.label} ${e.pct}%`).join(" · "),
    renderCell: (v) => `<div class="flex flex-col gap-0.5 items-center">${v.slice(0, 3).map((e, i) => `<span class="text-xs ${i === 0 ? "font-semibold text-primary-content" : "text-base-content/50"}">${e.label} ${e.pct}%</span>`).join("")}</div>`,
    hasHistory: true,
    chartLabel: "Part Alimentation (%)",
    unit: "%",
    type: "distribution",
    section: "Général — Usage",
    methodology: {
      description: "Certaines consultations peuvent être « associées » à une thématique. Par exemple, une consultation faite après une recherche sur Distribution de repas est associée à la thématique Alimentation. Cet indicateur montre la répartition des thématiques parmi les consultations associées à une thématique.",
    },
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

const THEMATIQUES = ["Accueil", "Activités", "Alimentation", "Conseil", "Formation et emploi", "Hébergement et logement", "Hygiène et bien-être", "Matériel", "Santé", "Technologie", "Transport / Mobilité"];
const THEMATIQUE_COLORS = [
  "#503b5c", "#f29013", "#f84b32", "#019d4f", "#271332",
  "#ed3215", "#a78bfa", "#0ea5e9", "#ec4899", "#84cc16", "#14b8a6",
];
const PLAGES = {
  commune:     { nbMin: 1,   nbMax: 80 },
  epci:        { nbMin: 10,  nbMax: 200 },
  departement: { nbMin: 20,  nbMax: 400 },
  region:      { nbMin: 50,  nbMax: 1000 },
};
const PLAGES_USAGE = {
  commune:     { rechMin: 200,   rechMax: 3000 },
  epci:        { rechMin: 1000,  rechMax: 15000 },
  departement: { rechMin: 5000,  rechMax: 80000 },
  region:      { rechMin: 30000, rechMax: 400000 },
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

function genDistribution(rand, dominantPct) {
  const others = THEMATIQUES.filter(t => t !== "Alimentation").map((label) => ({
    label,
    pct: Math.round((100 - dominantPct) / (THEMATIQUES.length - 1) * (0.5 + rand() * 1.0)),
  }));
  const totalOthers = others.reduce((s, o) => s + o.pct, 0);
  const remaining = 100 - dominantPct;
  const normalized = others.map((o) => ({ label: o.label, pct: Math.round(o.pct * remaining / totalOthers) }));
  return [{ label: "Alimentation", pct: dominantPct }, ...normalized];
}

function genHistoriqueDistribution(rand, distribution) {
  return MOIS.map(mois => {
    const raw = distribution.map(e => ({
      label: e.label,
      v: Math.max(0.5, e.pct + (rand() - 0.5) * e.pct * 0.4),
    }));
    const total = raw.reduce((s, e) => s + e.v, 0);
    const valeur = {};
    raw.forEach(e => { valeur[e.label] = Math.round(e.v * 100 / total); });
    return { mois, valeur };
  });
}

function generateIndicateurs(code, type) {
  const rand = seededRandom(hashCode(code + type));
  const { nbMin, nbMax } = PLAGES[type] ?? PLAGES.commune;
  const { rechMin, rechMax } = PLAGES_USAGE[type] ?? PLAGES_USAGE.commune;

  const nbServices = Math.round(nbMin + rand() * (nbMax - nbMin));
  const tauxOuverture = 40 + rand() * 55;
  const tauxOuvertureEte = Math.max(0, tauxOuverture - 10 - rand() * 20);
  const tauxSatures = 5 + rand() * 40;
  const tauxAccesLibre = 20 + rand() * 55;
  const tauxInscription = 5 + rand() * 35;
  const tauxRendezVous = 5 + rand() * 30;
  const tauxOrientation = 3 + rand() * 20;
  const tauxSansParticipation = 40 + rand() * 50;
  const risquePrecarite = Math.round(rand() * 100);
  const nbRecherches = Math.round(rechMin + rand() * (rechMax - rechMin));
  const partRecherches = 20 + rand() * 40;
  const nbConsultations = Math.round(nbRecherches * (0.25 + rand() * 0.4));
  const partConsultations = 15 + rand() * 35;
  const dominantRech = Math.round(partRecherches);
  const dominantCons = Math.round(partConsultations);

  return {
    nb_services_alimentaires: {
      valeur: nbServices,
      historique: genHistoriqueNb(rand, nbServices),
    },
    taux_ouverture_moyen: {
      valeur: Math.round(tauxOuverture * 10) / 10,
      historique: genHistoriquePct(rand, tauxOuverture, -4, 2),
    },
    taux_ouverture_ete: {
      valeur: Math.round(tauxOuvertureEte * 10) / 10,
      historique: null,
    },
    taux_satures: {
      valeur: Math.round(tauxSatures * 10) / 10,
      historique: genHistoriquePct(rand, tauxSatures, 3, -2),
    },
    taux_acces_libre: {
      valeur: Math.round(tauxAccesLibre * 10) / 10,
      historique: genHistoriquePct(rand, tauxAccesLibre, 0, 0),
    },
    taux_inscription: {
      valeur: Math.round(tauxInscription * 10) / 10,
      historique: genHistoriquePct(rand, tauxInscription, 0, 0),
    },
    taux_rendez_vous: {
      valeur: Math.round(tauxRendezVous * 10) / 10,
      historique: genHistoriquePct(rand, tauxRendezVous, 0, 0),
    },
    taux_orientation: {
      valeur: Math.round(tauxOrientation * 10) / 10,
      historique: genHistoriquePct(rand, tauxOrientation, 0, 0),
    },
    taux_sans_participation: {
      valeur: Math.round(tauxSansParticipation * 10) / 10,
      historique: genHistoriquePct(rand, tauxSansParticipation, 0, 0),
    },
    risque_precarite_alimentaire: {
      valeur: risquePrecarite,
      historique: null,
    },
    nb_recherches_alimentation: {
      valeur: nbRecherches,
      historique: genHistoriqueNb(rand, nbRecherches),
    },
    part_recherches_alimentation: {
      valeur: Math.round(partRecherches * 10) / 10,
      historique: genHistoriquePct(rand, partRecherches, 0, 0),
    },
    nb_consultations_alimentation: {
      valeur: nbConsultations,
      historique: genHistoriqueNb(rand, nbConsultations),
    },
    part_consultations_alimentation: {
      valeur: Math.round(partConsultations * 10) / 10,
      historique: genHistoriquePct(rand, partConsultations, 0, 0),
    },
    repartition_recherches_thematiques: {
      valeur: genDistribution(rand, dominantRech),
      historique: genHistoriqueDistribution(rand, genDistribution(rand, dominantRech)),
    },
    repartition_consultations_thematiques: {
      valeur: genDistribution(rand, dominantCons),
      historique: genHistoriqueDistribution(rand, genDistribution(rand, dominantCons)),
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
  let currentSection = null;

  INDICATEURS.forEach((indicateur) => {
    if (indicateur.section !== currentSection) {
      currentSection = indicateur.section;
      const trSection = document.createElement("tr");
      trSection.className = "bg-base-200/60 pointer-events-none";
      const tdSection = document.createElement("td");
      tdSection.colSpan = territoires.length + 1;
      tdSection.className = "py-1.5 px-4 text-xs font-semibold uppercase tracking-widest text-base-content/40";
      tdSection.textContent = indicateur.section;
      trSection.appendChild(tdSection);
      tbody.appendChild(trSection);
    }

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
      td.className = "text-center align-middle py-3";
      const indData = t.indicateurs[indicateur.key];
      if (indData) {
        td.innerHTML = indicateur.renderCell
          ? indicateur.renderCell(indData.valeur)
          : `<span class="font-bold text-base text-primary-content">${indicateur.format(indData.valeur)}</span>`;
      } else {
        td.innerHTML = `<span class="text-base-content/30">—</span>`;
      }
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
      const chartInner = indicateur.type === "distribution"
        ? territoires.map((t, i) => `
            <div class="mb-6 last:mb-0">
              <p class="text-xs font-semibold text-primary-content mb-2">${t.nom}</p>
              <canvas id="chart-${indicateur.key}-${i}" height="80"></canvas>
            </div>`).join("")
        : `<canvas id="chart-${indicateur.key}" height="120"></canvas>`;
      tdChart.innerHTML = `<div class="chart-container px-6 py-4 bg-base-50">${chartInner}</div>`;
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

  if (indicateur.type === "distribution") {
    if (chartInstances[`${indicateur.key}-0`]) return;
    const labels = MOIS.map(formatMois);
    territoires.forEach((t, i) => {
      const canvas = document.getElementById(`chart-${indicateur.key}-${i}`);
      if (!canvas) return;
      const hist = t.indicateurs[indicateur.key]?.historique || [];
      const datasets = THEMATIQUES.map((them, j) => ({
        label: them,
        data: hist.map(h => h.valeur?.[them] ?? 0),
        backgroundColor: THEMATIQUE_COLORS[j % THEMATIQUE_COLORS.length],
        borderWidth: 0,
        stack: "stack",
      }));
      chartInstances[`${indicateur.key}-${i}`] = new Chart(canvas, {
        type: "bar",
        data: { labels, datasets },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, padding: 12, font: { family: "Roboto", size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label} : ${ctx.raw} %` } },
          },
          scales: {
            x: {
              stacked: true,
              ticks: { maxTicksLimit: 12, font: { family: "Roboto", size: 11 }, color: "#737373" },
              grid: { display: false },
            },
            y: {
              stacked: true,
              max: 100,
              ticks: { font: { family: "Roboto", size: 11 }, color: "#737373", callback: (v) => v + " %" },
              grid: { color: "#f5f5f5" },
            },
          },
        },
      });
    });
    return;
  }

  if (chartInstances[indicateur.key]) return;

  const canvas = document.getElementById(`chart-${indicateur.key}`);
  if (!canvas) return;

  const labels = MOIS.map(formatMois);
  const chartFormat = indicateur.format;
  const chartUnit = indicateur.unit;

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
            label: (ctx) => `${ctx.dataset.label} : ${chartFormat(ctx.raw)}`
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
            callback: (v) => chartUnit ? v + " " + chartUnit : v
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
