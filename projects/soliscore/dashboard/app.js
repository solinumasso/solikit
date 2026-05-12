const DATA_URL = "../data/output/scores.json";

const COMPOSANTES = [
  { id: "titre", label: "Titre" },
  { id: "description", label: "Description" },
  { id: "telephone_presence", label: "Tél. — Présence" },
  { id: "email_presence", label: "Email — Présence" },
  { id: "horaires_presence", label: "Horaires — Présence" },
  { id: "telephone_coherence", label: "Tél. — Cohérence" },
  { id: "email_coherence", label: "Email — Cohérence" },
  { id: "acronymes", label: "Acronymes" },
  { id: "orthographe", label: "Orthographe" },
  { id: "horaires_coherence", label: "Horaires — Cohérence" },
];

let allScores = [];
let sortKey = "score_total";
let sortDir = -1; // -1 = desc, 1 = asc

async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("not found");
    allScores = await res.json();
  } catch {
    show("empty-state");
    return;
  }

  if (!allScores.length) {
    show("empty-state");
    return;
  }

  show("stats-bar");
  show("table-wrapper");
  buildHead();
  renderAll();

  document.getElementById("search-input").addEventListener("input", (e) => {
    renderAll(e.target.value.trim().toLowerCase());
  });
}

function show(id) {
  const el = document.getElementById(id);
  el.classList.remove("hidden");
  el.classList.add("flex");
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
    nameTd.textContent = fiche.name;
    nameTd.title = fiche.name;
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
      if (rule?.detail) {
        compTd.title = rule.detail;
        compTd.style.cursor = "help";
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

// Hamburger menu
document.getElementById("menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("menu-dropdown").classList.toggle("hidden");
});
document.addEventListener("click", () => {
  document.getElementById("menu-dropdown").classList.add("hidden");
});

init();
