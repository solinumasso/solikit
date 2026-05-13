const GOOGLE_CLIENT_ID = "679070476589-reg8ecvigkumckof7bld9ss137d1oat7.apps.googleusercontent.com";
const ALLOWED_DOMAIN = "solinum.org";
const AUTH_KEY = "soliscore_user";

const DATA_URL = "../data/output/scores.json";
const API_URL = "/api/score";
const STATS_URL = "/api/stats";
const RESULTS_URL = "/api/results";
let currentTab = "preload";

const COMPOSANTES = [
  { id: "titre", label: "Titre" },
  { id: "description", label: "Description" },
  { id: "telephone_presence", label: "Tél. — Présence" },
  { id: "email_presence", label: "Email — Présence" },
  { id: "horaires_presence", label: "Horaires — Présence" },
  { id: "telephone_coherence", label: "Tél. — Cohérence", nonObvious: true },
  { id: "email_coherence", label: "Email — Cohérence", nonObvious: true },
  { id: "acronymes", label: "Acronymes", nonObvious: true },
  { id: "orthographe", label: "Orthographe", nonObvious: true },
  { id: "horaires_coherence", label: "Horaires — Cohérence", nonObvious: true },
];

let allScores = [];
let importScores = [];
let sortKey = "score_total";
let sortDir = -1; // -1 = desc, 1 = asc

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tab-preload").classList.toggle("tab-active", tab === "preload");
  document.getElementById("tab-import").classList.toggle("tab-active", tab === "import");
  document.getElementById("tab-usage").classList.toggle("tab-active", tab === "usage");
  document.getElementById("import-panel").classList.toggle("hidden", tab !== "import");
  document.getElementById("usage-panel").classList.toggle("hidden", tab !== "usage");
  document.getElementById("search-input").parentElement.classList.toggle("hidden", tab !== "preload");

  hide("stats-bar");
  hide("table-wrapper");
  hide("empty-state-preload");
  hide("empty-state-import");

  if (tab === "preload") {
    allScores = [];
    loadPreload();
  } else if (tab === "import") {
    if (importScores.length) {
      allScores = importScores;
      show("stats-bar");
      show("table-wrapper");
      buildHead();
      renderAll();
    } else {
      checkSavedResults();
      show("empty-state-import");
    }
  } else if (tab === "usage") {
    loadUsage();
  }
}

async function loadUsage() {
  const loading = document.getElementById("usage-loading");
  const content = document.getElementById("usage-content");
  const empty = document.getElementById("usage-empty");

  loading.classList.remove("hidden");
  hide("usage-content");
  hide("usage-empty");

  try {
    const res = await fetch(STATS_URL);
    if (!res.ok) throw new Error("Erreur serveur");
    const stats = await res.json();

    loading.classList.add("hidden");

    if (!stats.length) {
      show("usage-empty");
      return;
    }

    const total = stats.reduce((s, d) => s + d.count, 0);
    const avg = Math.round(total / stats.length);
    document.getElementById("usage-total").textContent = total.toLocaleString("fr-FR");
    document.getElementById("usage-days").textContent = stats.length;
    document.getElementById("usage-avg").textContent = avg.toLocaleString("fr-FR");

    const tbody = document.getElementById("usage-table-body");
    tbody.innerHTML = "";
    for (const { date, count } of [...stats].reverse()) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-base-200";
      tr.innerHTML = `
        <td class="font-mono text-sm text-base-content/70">${date}</td>
        <td class="text-right font-semibold text-primary-content">${count.toLocaleString("fr-FR")}</td>
      `;
      tbody.appendChild(tr);
    }

    show("usage-content");
  } catch {
    loading.classList.add("hidden");
    show("usage-empty");
  }
}

async function checkSavedResults() {
  const email = sessionStorage.getItem(AUTH_KEY);
  if (!email) return;
  try {
    const res = await fetch(`${RESULTS_URL}?email=${encodeURIComponent(email)}`);
    if (!res.ok) return;
    const { savedAt, count } = await res.json();
    const date = new Date(savedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    document.getElementById("resume-meta").textContent = `${date} · ${count} fiche${count > 1 ? "s" : ""}`;
    document.getElementById("resume-box").classList.remove("hidden");
  } catch {}
}

async function loadSavedResults() {
  const email = sessionStorage.getItem(AUTH_KEY);
  if (!email) return;
  const btn = document.querySelector("#resume-box button");
  btn.disabled = true;
  btn.textContent = "Chargement…";
  try {
    const res = await fetch(`${RESULTS_URL}?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error();
    const { scores } = await res.json();
    allScores = scores;
    importScores = scores;
    hide("empty-state-import");
    show("stats-bar");
    show("table-wrapper");
    buildHead();
    renderAll();
  } catch {
    btn.textContent = "Erreur";
  } finally {
    btn.disabled = false;
    btn.textContent = "Reprendre";
  }
}

async function loadPreload() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("not found");
    allScores = await res.json();
  } catch {
    show("empty-state-preload");
    return;
  }

  if (!allScores.length) {
    show("empty-state-preload");
    return;
  }

  show("stats-bar");
  show("table-wrapper");
  buildHead();
  renderAll();
}

function csvRowToFiche(row) {
  const g = (col) => row[col]?.trim() || undefined;
  const bool = (col) => row[col]?.trim() === "true";

  const phoneStr = g("Informations de contact: Numéro de téléphone") || "";
  const phones = [];
  for (const m of phoneStr.matchAll(/\[:phoneNumber "([^"]+)"\]/g)) phones.push({ phoneNumber: m[1] });

  let newhours;
  try { const nh = g("Newhours"); if (nh) newhours = JSON.parse(nh); } catch {}

  let publics;
  try {
    const raw = row["Publics accueillis "] || row["Publics accueillis"] || "";
    const pub = JSON.parse(raw);
    if (pub?.description) publics = { description: pub.description };
  } catch {}

  const servStr = g("Services du lieu") || "";
  const services = [];
  for (const m of servStr.matchAll(/\[:description "([^"]+)"\]/g)) {
    if (m[1].trim()) services.push({ description: m[1] });
  }

  return {
    lieu_id: parseInt(row["Lieu ID"]) || 0,
    name: g("Nom de la structure") || "",
    seo_url: g("URL"),
    description: g("Description du lieu"),
    entity: {
      mail: g("Informations de contact: Mail"),
      phones: phones.length ? phones : undefined,
    },
    newhours,
    modalities: {
      appointment: {
        checked: bool("Modalités d'accès de la structure: Besoin de rendez vous pour accéder à la structure"),
        precisions: g("Modalités d'accès de la structure: Besoin de rendez vous pour accéder à la structure: Précisions sur l'accès via rendez vous"),
      },
      inscription: {
        checked: bool("Modalités d'accès de la structure: Besoin d'inscription pour accéder à la structure"),
        precisions: g("Modalités d'accès de la structure: Besoin d'inscription pour accéder à la structure: Précisions pour l'accès via inscription"),
      },
      orientation: {
        checked: bool("Modalités d'accès de la structure: Besoin d'accès via orientation pour accéder à la structure "),
        precisions: g("Modalités d'accès de la structure: Besoin d'accès via orientation pour accéder à la structure : Précisions pour accès via orientation"),
      },
      price: {
        checked: bool("Modalités d'accès de la structure: Faut il payer pour y accéder?"),
        precisions: g("Modalités d'accès de la structure: Faut il payer pour y accéder?: Précisions sur le paiement pour y accéder"),
      },
      other: g("Modalités d'accès de la structure: Autres modalités d'accès"),
    },
    publics,
    services_all: services.length ? services : undefined,
  };
}

function parseCsvFile(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  return result.data.map(csvRowToFiche).filter(f => f.lieu_id || f.name);
}

async function runImport() {
  const fileInput = document.getElementById("file-input");
  const btn = document.getElementById("score-btn");
  const progress = document.getElementById("import-progress");
  const errorEl = document.getElementById("import-error");

  errorEl.classList.add("hidden");
  const file = fileInput.files[0];
  if (!file) return;

  let fiches;
  try {
    const text = await file.text();
    if (file.name.endsWith(".csv")) {
      fiches = parseCsvFile(text);
    } else {
      const parsed = JSON.parse(text);
      fiches = Array.isArray(parsed) ? parsed : (parsed.places ?? []);
    }
  } catch {
    errorEl.textContent = "Fichier invalide (CSV ou JSON attendu).";
    errorEl.classList.remove("hidden");
    return;
  }

  if (fiches.length === 0) {
    errorEl.textContent = "Aucune fiche trouvée dans le fichier.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (fiches.length > 100) {
    errorEl.textContent = `Trop de fiches : ${fiches.length} dans le fichier, maximum 100. Réduis l'export.`;
    errorEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  progress.classList.remove("hidden");
  hide("stats-bar");
  hide("table-wrapper");
  hide("empty-state-import");

  try {
    const userEmail = sessionStorage.getItem(AUTH_KEY);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiches, userEmail }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? `Erreur serveur (${res.status})`);
    }
    allScores = await res.json();
    importScores = allScores;
    show("stats-bar");
    show("table-wrapper");
    buildHead();
    renderAll();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    show("empty-state-import");
  } finally {
    btn.disabled = false;
    progress.classList.add("hidden");
  }
}

async function init() {
  loadPreload();
  document.getElementById("search-input").addEventListener("input", (e) => {
    renderAll(e.target.value.trim().toLowerCase());
  });
}

function show(id) {
  const el = document.getElementById(id);
  el.classList.remove("hidden");
  el.classList.add("flex");
}

function hide(id) {
  const el = document.getElementById(id);
  el.classList.add("hidden");
  el.classList.remove("flex");
}

function buildHead() {
  const tr = document.createElement("tr");

  const cols = [
    { key: "lieu_id", label: "ID" },
    { key: "name", label: "Fiche" },
    { key: "score_total", label: "Score total" },
    ...COMPOSANTES.map((c) => ({ key: c.id, label: c.label })),
  ];

  for (const col of cols) {
    const th = document.createElement("th");
    th.className = "cursor-pointer select-none whitespace-nowrap hover:text-accent-content transition-colors";
    th.dataset.key = col.key;
    th.textContent = col.label;
    th.addEventListener("click", () => {
      if (sortKey === col.key) sortDir *= -1;
      else { sortKey = col.key; sortDir = -1; }
      renderAll(document.getElementById("search-input").value.trim().toLowerCase());
    });
    tr.appendChild(th);
  }

  document.getElementById("table-head").innerHTML = "";
  document.getElementById("table-head").appendChild(tr);
}

function renderAll(query = "") {
  let data = allScores;

  if (query) {
    data = data.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        String(f.lieu_id).includes(query)
    );
  }

  data = [...data].sort((a, b) => {
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    if (av < bv) return sortDir;
    if (av > bv) return -sortDir;
    return 0;
  });

  updateStats(data);
  renderTable(data);
}

function getValue(score, key) {
  if (key === "lieu_id") return score.lieu_id;
  if (key === "name") return score.name.toLowerCase();
  if (key === "score_total") return score.score_total;
  const comp = score.composantes.find((c) => c.id === key);
  return comp ? comp.points : 0;
}

function updateStats(data) {
  if (!data.length) {
    document.getElementById("stat-total").textContent = "0";
    document.getElementById("stat-avg").textContent = "—";
    document.getElementById("stat-max").textContent = "—";
    document.getElementById("stat-min").textContent = "—";
    return;
  }
  const totals = data.map((f) => f.score_total);
  const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
  document.getElementById("stat-total").textContent = data.length;
  document.getElementById("stat-avg").textContent = avg.toFixed(1);
  document.getElementById("stat-max").textContent = Math.max(...totals);
  document.getElementById("stat-min").textContent = Math.min(...totals);
}

function renderTable(data) {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  for (const fiche of data) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-base-50 border-b border-base-200";

    // ID
    td(tr, fiche.lieu_id, "text-base-content/40 text-xs font-mono");

    // Name
    const nameTd = document.createElement("td");
    nameTd.className = "font-medium text-primary-content max-w-xs";
    if (fiche.seo_url) {
      const a = document.createElement("a");
      a.href = `https://soliguide.fr/fiche/${fiche.seo_url}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = fiche.name;
      a.title = fiche.name;
      a.className = "hover:text-accent-content underline underline-offset-2";
      nameTd.appendChild(a);
    } else {
      nameTd.textContent = fiche.name;
      nameTd.title = fiche.name;
    }
    tr.appendChild(nameTd);

    // Score total
    const totalTd = document.createElement("td");
    totalTd.className = "font-bold text-center text-base " + scoreColor(fiche.score_total, true);
    totalTd.textContent = fiche.score_total > 0 ? `+${fiche.score_total}` : fiche.score_total;
    tr.appendChild(totalTd);

    // Each composante
    for (const comp of COMPOSANTES) {
      const rule = fiche.composantes.find((c) => c.id === comp.id);
      const points = rule ? rule.points : 0;
      const compTd = document.createElement("td");
      compTd.className = "text-center text-sm font-mono " + scoreColor(points, false);

      if (comp.nonObvious && points !== 0 && rule?.detail) {
        compTd.style.cursor = "pointer";
        compTd.style.textDecoration = "underline dotted";
        compTd.style.textUnderlineOffset = "3px";
        compTd.addEventListener("click", (e) => {
          e.stopPropagation();
          showDetailPopup(e, comp.label, rule.detail);
        });
      } else if (rule?.detail) {
        compTd.title = rule.detail;
      }

      compTd.textContent = points === 0 ? "·" : points > 0 ? `+${points}` : points;
      tr.appendChild(compTd);
    }

    tbody.appendChild(tr);
  }
}

function td(tr, text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  tr.appendChild(cell);
  return cell;
}

function scoreColor(points, isBig) {
  if (points > 0) return isBig ? "text-success-content" : "text-success-content/80";
  if (points < 0) return isBig ? "text-error-content" : "text-error-content/80";
  return "text-base-content/30";
}

// ── Detail popup ────────────────────────────────────────────────────────────

const popup = document.getElementById("detail-popup");

function showDetailPopup(e, label, detail) {
  popup.innerHTML = `<p class="font-semibold text-primary-content mb-1">${label}</p><p class="text-base-content/80 leading-relaxed">${detail}</p>`;
  popup.classList.remove("hidden");

  const margin = 12;
  const pw = 320;
  const rect = e.target.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + margin;

  if (left + pw > window.innerWidth - margin) left = window.innerWidth - pw - margin;
  if (left < margin) left = margin;

  popup.style.left = left + "px";
  popup.style.top = top + "px";
  popup.style.width = pw + "px";
}

document.addEventListener("click", () => popup.classList.add("hidden"));

// ── Auth Google ──────────────────────────────────────────────────────────────

function parseJwt(token) {
  return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
}

function onGoogleSignIn(response) {
  const payload = parseJwt(response.credential);
  if (payload.email.endsWith("@" + ALLOWED_DOMAIN)) {
    sessionStorage.setItem(AUTH_KEY, payload.email);
    document.getElementById("login-screen").remove();
    init();
  } else {
    const err = document.getElementById("auth-error");
    err.textContent = `Accès refusé. Seuls les comptes @${ALLOWED_DOMAIN} sont autorisés (connecté avec : ${payload.email}).`;
    err.classList.remove("hidden");
  }
}

window.addEventListener("load", () => {
  const savedUser = sessionStorage.getItem(AUTH_KEY);
  if (savedUser) {
    document.getElementById("login-screen").remove();
    init();
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleSignIn,
    auto_select: false,
  });
  google.accounts.id.renderButton(document.getElementById("google-btn"), {
    theme: "outline",
    size: "large",
    locale: "fr",
    text: "signin_with",
    shape: "rectangular",
  });
});

// Hamburger menu
document.getElementById("menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("menu-dropdown").classList.toggle("hidden");
});
document.addEventListener("click", () => {
  document.getElementById("menu-dropdown").classList.add("hidden");
});

// Activer le bouton scoring dès qu'un fichier est sélectionné
document.getElementById("file-input").addEventListener("change", (e) => {
  document.getElementById("score-btn").disabled = !e.target.files.length;
});
