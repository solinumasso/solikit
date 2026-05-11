// Page de navigation par catégorie FINESS.
// Charge le matching-results.json, groupe par catégorie, et affiche un panneau de détail.

const STATUS_LABELS = {
  certain: { label: "Certain", classes: "badge-success" },
  possible: { label: "Possible", classes: "badge-warning" },
  none: { label: "Non matché", classes: "badge-ghost" },
};

const $ = (s) => document.querySelector(s);

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s ?? "").replaceAll(/[&<>"]/g, (c) => ESC_MAP[c]);

function coverageColor(ratio) {
  if (ratio >= 0.5) return "text-success-content";
  if (ratio >= 0.2) return "text-warning-content";
  return "text-base-content/60";
}

let allByCategory = new Map(); // category → { items, total, certain, possible, none }
let allItems = []; // [{finess, status, soliguide, score, category}]
let selectedCategory = null;
let sortKey = "total";
let sortAsc = false;

// ── Init ──────────────────────────────────────────────────────────────────────

async function main() {
  const data = await fetch("data/matching-results.json").then((r) => r.json());

  for (const m of data.matches) {
    const cat = m.finess.categorie || "(sans catégorie)";
    const item = { finess: m.finess, status: m.scoring.confidence, soliguide: m.soliguide, score: m.scoring.score, category: cat };
    allItems.push(item);
    if (!allByCategory.has(cat)) allByCategory.set(cat, { items: [], total: 0, certain: 0, possible: 0, none: 0 });
    const bucket = allByCategory.get(cat);
    bucket.items.push(item);
    bucket.total++;
    bucket[m.scoring.confidence]++;
  }
  for (const f of data.finessNonMatchees) {
    const cat = f.categorie || "(sans catégorie)";
    const item = { finess: f, status: "none", soliguide: null, score: 0, category: cat };
    allItems.push(item);
    if (!allByCategory.has(cat)) allByCategory.set(cat, { items: [], total: 0, certain: 0, possible: 0, none: 0 });
    const bucket = allByCategory.get(cat);
    bucket.items.push(item);
    bucket.total++;
    bucket.none++;
  }

  const total = allItems.length;
  const certain = data.stats.certain;
  const covered = (((certain + data.stats.possible) / total) * 100).toFixed(1);
  $("#stat-categories").textContent = allByCategory.size;
  $("#stat-total").textContent = total.toLocaleString("fr");
  $("#stat-certain").textContent = certain.toLocaleString("fr");
  $("#stat-coverage").textContent = covered + "%";
  $("#meta-info").textContent = `Données du ${data.meta.date}`;

  renderCategories();
  setupEvents();
  $("#loading").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

// ── Rendu ─────────────────────────────────────────────────────────────────────

function renderCategories() {
  const filter = $("#search-cat").value.toLowerCase();
  const rows = [...allByCategory.entries()]
    .map(([name, b]) => ({
      name,
      total: b.total,
      certain: b.certain,
      possible: b.possible,
      none: b.none,
      coverage: b.total > 0 ? (b.certain + b.possible) / b.total : 0,
    }))
    .filter((r) => !filter || r.name.toLowerCase().includes(filter));

  rows.sort((a, b) => {
    const sign = sortAsc ? 1 : -1;
    if (sortKey === "name") return sign * a.name.localeCompare(b.name, "fr");
    return sign * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0));
  });

  $("#cat-tbody").innerHTML = rows.map((r) => {
    const covCls = coverageColor(r.coverage);
    const rowCls = selectedCategory === r.name ? "bg-primary/10" : "";
    return `
      <tr data-cat="${esc(r.name)}" class="cursor-pointer hover:bg-base-200 ${rowCls}">
        <td class="font-medium text-base-content">${esc(r.name)}</td>
        <td class="text-right tabular-nums">${r.total}</td>
        <td class="text-right">
          <span class="tabular-nums ${covCls}">${(r.coverage * 100).toFixed(0)}%</span>
          <span class="text-xs text-base-content/40 ml-1">(${r.certain}+${r.possible})</span>
        </td>
      </tr>
    `;
  }).join("");
}

function renderDetail() {
  if (!selectedCategory) return;
  const bucket = allByCategory.get(selectedCategory);
  if (!bucket) return;

  const statusFilter = $("#filter-status").value;
  const search = $("#search-finess").value.toLowerCase();

  const items = bucket.items.filter((it) => {
    if (statusFilter && it.status !== statusFilter) return false;
    if (search) {
      const hay = `${it.finess.nom} ${it.finess.ville} ${it.soliguide?.nom ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  $("#detail-title").textContent = `${selectedCategory} — ${bucket.total} FINESS`;
  $("#detail-count").textContent =
    `${items.length} sur ${bucket.total} affichés — ${bucket.certain} certains, ${bucket.possible} possibles, ${bucket.none} non matchés`;

  if (items.length === 0) {
    $("#detail-tbody").innerHTML = `<tr><td colspan="5" class="text-center text-base-content/40 py-8">Aucun résultat avec ces filtres</td></tr>`;
    return;
  }

  $("#detail-tbody").innerHTML =
    items.slice(0, 500).map((it, idx) => {
      const status = STATUS_LABELS[it.status] || STATUS_LABELS.none;
      const sgLink = it.soliguide
        ? `<a href="${esc(it.soliguide.lien)}" target="_blank" class="text-accent-content underline truncate inline-block max-w-[240px]" title="${esc(it.soliguide.nom)}">${esc(it.soliguide.nom)}</a>`
        : `<span class="text-base-content/40">—</span>`;
      const scoreTxt = it.score ? " · " + (it.score * 100).toFixed(0) + "%" : "";
      return `
        <tr>
          <td class="text-base-content">${esc(it.finess.nom)}</td>
          <td class="text-base-content/70">${esc(it.finess.ville)}</td>
          <td><span class="badge badge-sm ${status.classes}">${status.label}${scoreTxt}</span></td>
          <td>${sgLink}</td>
          <td><button class="btn btn-xs btn-ghost" data-detail-idx="${idx}">Détail</button></td>
        </tr>
      `;
    }).join("")
    + (items.length > 500 ? `<tr><td colspan="5" class="text-center text-xs text-base-content/40 py-3">… ${items.length - 500} de plus (affine ton filtre)</td></tr>` : "");

  $("#detail-tbody").dataset.items = JSON.stringify(items.slice(0, 500));
}

// ── Modal détail ──────────────────────────────────────────────────────────────

function renderServicesList(services) {
  if (!services || services.length === 0) {
    return `<p class="text-sm text-base-content/40 italic">Aucun service tagué</p>`;
  }
  return `<div class="flex flex-wrap gap-1">${services.map((s) => `<span class="badge badge-sm bg-primary/10 text-primary">${esc(s)}</span>`).join("")}</div>`;
}

function renderAddressBlock(label, ban) {
  if (ban === undefined) return `<p class="text-xs text-base-content/40 italic">BAN : non encore géocodé</p>`;
  if (ban === null) return `<p class="text-xs text-warning-content italic">BAN : aucun résultat</p>`;
  return `
    <div class="text-xs space-y-0.5 mt-1 pl-2 border-l-2 border-primary/30">
      <p><span class="text-base-content/40">BAN ${(ban.score * 100).toFixed(0)}% :</span> <span class="text-primary-content font-medium">${esc(ban.label)}</span></p>
      <p class="text-base-content/40">${esc(ban.context)} · INSEE ${esc(ban.citycode)}</p>
    </div>
  `;
}

function renderDilaCard(dila) {
  if (!dila) return '';
  const lines = [];
  if (dila.websites?.length) lines.push(`🌐 ${dila.websites.map((w) => `<a href="${esc(w)}" target="_blank" class="link link-primary break-all">${esc(w)}</a>`).join(' · ')}`);
  if (dila.email) lines.push(`✉️ <a href="mailto:${esc(dila.email)}" class="link link-primary">${esc(dila.email)}</a>`);
  if (dila.phones?.length) lines.push(`📞 ${dila.phones.map(esc).join(', ')}`);
  if (dila.hours) {
    let hoursTxt;
    try {
      const h = typeof dila.hours === 'string' ? JSON.parse(dila.hours) : dila.hours;
      hoursTxt = Array.isArray(h)
        ? h.map((p) => `${p.nom_jour_debut}${p.nom_jour_debut !== p.nom_jour_fin ? '–' + p.nom_jour_fin : ''} ${p.valeur_heure_debut_1 || ''}-${p.valeur_heure_fin_1 || ''}${p.valeur_heure_debut_2 ? ' / ' + p.valeur_heure_debut_2 + '-' + p.valeur_heure_fin_2 : ''}`).join(' · ')
        : JSON.stringify(h);
    } catch { hoursTxt = String(dila.hours); }
    lines.push(`🕒 ${esc(hoursTxt)}`);
  }
  if (dila.description?.length > 30) {
    const short = dila.description.length > 200 ? dila.description.slice(0, 200) + '…' : dila.description;
    lines.push(`📝 ${esc(short)}`);
  }
  if (lines.length === 0) return '';
  return `
    <div class="card bg-info/5 shadow-sm">
      <div class="card-body p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="card-title text-sm text-info-content">📋 Enrichissement DILA (service public)</h3>
          ${dila.url ? `<a href="${esc(dila.url)}" target="_blank" class="link link-info text-xs">Voir ↗</a>` : ''}
        </div>
        ${dila.partenaire ? `<span class="badge badge-soft badge-info badge-xs">via ${esc(dila.partenaire)}</span>` : ''}
        <div class="text-sm space-y-1">${lines.map((l) => `<div>${l}</div>`).join('')}</div>
      </div>
    </div>
  `;
}

function openDetail(item) {
  const f = item.finess;
  const s = item.soliguide;
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.none;
  const scoreTxt = item.score ? ` · score ${(item.score * 100).toFixed(0)}%` : "";

  const sgBlock = s
    ? `
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body p-4 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="card-title text-sm text-primary-content">📍 Soliguide</h3>
            <a href="${esc(s.lien)}" target="_blank" class="link link-primary text-xs">Ouvrir la fiche ↗</a>
          </div>
          <p class="font-medium">${esc(s.nom)}</p>
          <p class="text-sm text-base-content/70">${esc(s.adresse)}</p>
          ${renderAddressBlock("Soliguide", s.banAddress)}
          ${s.description ? `<p class="text-xs text-base-content/60 italic">${esc(s.description)}</p>` : ""}
          ${s.phones?.length ? `<p class="text-sm">📞 ${s.phones.map(esc).join(", ")}</p>` : ""}
          ${s.email ? `<p class="text-sm">✉ <a href="mailto:${esc(s.email)}" class="text-accent-content underline">${esc(s.email)}</a></p>` : ""}
          <div>
            <p class="text-xs font-semibold text-base-content/60 uppercase mb-1">Services (${s.services?.length ?? 0})</p>
            ${renderServicesList(s.services)}
          </div>
        </div>
      </div>`
    : `<div class="alert alert-info text-sm">Aucune fiche Soliguide associée.</div>`;

  $("#detail-modal-body").innerHTML = `
    <div class="space-y-4">
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body p-4 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="card-title text-sm text-primary-content">🏥 FINESS</h3>
            <span class="badge ${status.classes}">${status.label}${scoreTxt}</span>
          </div>
          <p class="font-medium">${esc(f.nom)}</p>
          <p class="text-sm text-base-content/70">${esc(f.adresse)} — ${esc(f.codePostal)} ${esc(f.ville)}</p>
          ${renderAddressBlock("FINESS", f.banAddress)}
          <p class="text-xs text-base-content/60">Catégorie : ${esc(f.categorie)} · FINESS ${esc(f.nofinesset)}</p>
        </div>
      </div>
      ${renderDilaCard(f.dila)}
      ${sgBlock}
    </div>
  `;
  $("#detail-modal").showModal();
}

// ── Events ────────────────────────────────────────────────────────────────────

function setupEvents() {
  $("#menu-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#menu-dropdown").classList.toggle("hidden");
  });
  document.addEventListener("click", () => $("#menu-dropdown").classList.add("hidden"));

  $("#cat-tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-cat]");
    if (!tr) return;
    selectedCategory = tr.dataset.cat;
    renderCategories();
    renderDetail();
  });

  $("#detail-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-detail-idx]");
    if (!btn) return;
    const items = JSON.parse($("#detail-tbody").dataset.items || "[]");
    const item = items[Number(btn.dataset.detailIdx)];
    if (item) openDetail(item);
  });

  $("#search-cat").addEventListener("input", renderCategories);
  $("#filter-status").addEventListener("change", renderDetail);
  $("#search-finess").addEventListener("input", renderDetail);

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortAsc = !sortAsc;
      } else {
        sortKey = key;
        sortAsc = key === "name";
      }
      renderCategories();
    });
  });
}

main().catch((e) => {
  console.error(e);
  $("#loading").innerHTML =
    `<div class="hero-content"><div class="alert alert-error">Erreur de chargement : ${esc(e.message)}</div></div>`;
});
