/* ============ NexLaunch — dashboard app ============ */

/* ---------- account / topbar ---------- */
(function initAccount() {
  try {
    const acct = JSON.parse(localStorage.getItem("nexlaunch_account") || "null");
    if (acct && acct.name) {
      document.getElementById("user-name").textContent = acct.name;
      document.getElementById("user-avatar").textContent = acct.name.trim()[0].toUpperCase();
      if (acct.plan) document.getElementById("side-plan").textContent = acct.plan + " (trial)";
    }
  } catch (e) { /* fresh visitor */ }
})();

/* ---------- view routing ---------- */
const VIEW_TITLES = {
  overview: "Overview", xray: "Product X-Ray", research: "Product Research",
  tiktok: "TikTok Trend Radar", listings: "AI Listing Builder", academy: "Seller Academy"
};
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".side-link").forEach(l => l.classList.toggle("active", l.dataset.view === id));
  document.getElementById("view-" + id).classList.add("active");
  document.getElementById("view-title").textContent = VIEW_TITLES[id];
}
document.querySelectorAll(".side-link").forEach(l => l.addEventListener("click", () => showView(l.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => showView(b.dataset.goto)));

/* ---------- unified product rows (research + overview) ---------- */
function amzRow(p) {
  const sales = estimateSalesFromBSR(p.bsr, p.category);
  const fees = amazonFees(p.price, p.weight);
  const profit = p.price - fees.total - p.cost;
  return {
    platform: "amz", emoji: p.emoji, name: p.name, category: p.category,
    price: p.price, sales, revenue: sales * p.price,
    margin: profit / p.price, trend: p.trend
  };
}
function ttRow(p) {
  const fees = tiktokFees(p.price, p.commission);
  const profit = p.price - fees.total - p.cost - 2.2; // + shipping
  return {
    platform: "tt", emoji: p.emoji, name: p.name, category: p.category,
    price: p.price, sales: p.unitsMo, revenue: p.unitsMo * p.price,
    margin: profit / p.price, trend: p.trend
  };
}
const ALL_ROWS = [...AMZ_PRODUCTS.map(amzRow), ...TT_PRODUCTS.map(ttRow)];

/* ---------- overview ---------- */
(function renderOverview() {
  const amzBest = [...AMZ_PRODUCTS.map(amzRow)].sort((a, b) => b.revenue - a.revenue)[0];
  const ttBest = [...TT_PRODUCTS].sort((a, b) => b.trend - a.trend)[0];
  document.getElementById("ov-amz-top").textContent = fmtUSD(amzBest.revenue / 1000) + "k/mo";
  document.getElementById("ov-amz-top-name").textContent = amzBest.name;
  document.getElementById("ov-tt-top").textContent = "▲ " + ttBest.trend.toFixed(1) + "%";
  document.getElementById("ov-tt-top-name").textContent = ttBest.name;

  const opps = [...ALL_ROWS].sort((a, b) => (b.revenue * b.margin) - (a.revenue * a.margin)).slice(0, 5);
  document.getElementById("ov-opps").innerHTML = opps.map(r => `
    <div class="comp-row">
      <span class="name"><span class="thumb" style="display:grid;place-items:center">${r.emoji}</span>
        <span>${r.name}<br><span style="font-size:11px;color:var(--muted)">${r.platform === "amz" ? "Amazon" : "TikTok Shop"} · ${Math.round(r.margin * 100)}% margin</span></span></span>
      <span class="rev">${fmtUSD(r.revenue / 1000)}k/mo</span>
    </div>`).join("");
})();

/* ---------- X-Ray ---------- */
function runXray() {
  const q = document.getElementById("xray-input").value.trim();
  if (!q) return;
  const p = xrayLookup(q);
  const sales = estimateSalesFromBSR(p.bsr, p.category);
  const revenue = sales * p.price;
  const fees = amazonFees(p.price, p.weight);
  const profit = p.price - fees.total - p.cost;
  const marginPct = (profit / p.price) * 100;

  document.getElementById("xr-emoji").textContent = p.emoji;
  document.getElementById("xr-name").textContent = p.name;
  document.getElementById("xr-asin").textContent = p.asin;
  document.getElementById("xr-cat").textContent = p.category + " › " + p.sub;
  document.getElementById("xr-src").textContent = p.source === "demo" ? "verified demo data" : "modeled estimate";
  document.getElementById("xr-rev").textContent = fmtUSD(revenue);
  document.getElementById("xr-sales").textContent = fmtNum(sales);
  document.getElementById("xr-bsr").textContent = "#" + fmtNum(p.bsr);
  const tEl = document.getElementById("xr-trend");
  tEl.textContent = (p.trend >= 0 ? "▲ " : "▼ ") + Math.abs(p.trend).toFixed(1) + "% 30d";
  tEl.className = "k-delta " + (p.trend >= 0 ? "up" : "down");
  document.getElementById("xr-reviews").textContent = fmtNum(p.reviews);
  document.getElementById("xr-rating").textContent = "★ " + p.rating.toFixed(1) + " avg";

  document.getElementById("xr-fees").innerHTML = `
    <tr><td>Sale price</td><td>${fmtUSD(p.price, 2)}</td></tr>
    <tr><td>Referral fee (15%)</td><td style="color:var(--red)">−${fmtUSD(fees.referral, 2)}</td></tr>
    <tr><td>FBA fulfillment</td><td style="color:var(--red)">−${fmtUSD(fees.fba, 2)}</td></tr>
    <tr><td>Est. landed cost</td><td style="color:var(--red)">−${fmtUSD(p.cost, 2)}</td></tr>
    <tr><td>Net profit / unit</td><td style="color:${profit > 0 ? "var(--green)" : "var(--red)"}">${fmtUSD(profit, 2)} (${marginPct.toFixed(0)}%)</td></tr>`;

  const v = document.getElementById("xr-verdict");
  if (marginPct >= 30 && revenue >= 50000) {
    v.innerHTML = `<span class="verdict good">✅ Strong opportunity — healthy margin at scale</span>`;
  } else if (marginPct >= 18) {
    v.innerHTML = `<span class="verdict mid">⚠️ Workable — margin is thin, negotiate COGS or bundle</span>`;
  } else {
    v.innerHTML = `<span class="verdict bad">❌ Pass — margin won't survive ad spend and returns</span>`;
  }

  // 12-month modeled trend bars
  const rnd = seededFrom(p.asin);
  const chart = document.getElementById("xr-chart");
  const monthly = [];
  let base = sales * 0.6;
  for (let i = 0; i < 12; i++) {
    base *= 1 + (p.trend / 100) / 6 + (rnd() - 0.45) * 0.18;
    monthly.push(Math.max(base, sales * 0.15));
  }
  const max = Math.max(...monthly);
  chart.innerHTML = monthly.map(m =>
    `<div class="bar" style="height:${Math.round((m / max) * 100)}%" title="${fmtNum(Math.round(m))} units"></div>`).join("");
  const months = ["Aug '25","Sep","Oct","Nov","Dec","Jan '26","Feb","Mar","Apr","May","Jun","Jul"];
  document.getElementById("xr-chart-start").textContent = months[0];
  document.getElementById("xr-chart-end").textContent = months[11];

  document.getElementById("xray-result").classList.add("show");
}
document.getElementById("xray-btn").addEventListener("click", runXray);
document.getElementById("xray-input").addEventListener("keydown", e => { if (e.key === "Enter") runXray(); });

/* ---------- research table ---------- */
let sortKey = "revenue", sortDir = -1;
(function initResearch() {
  const catSel = document.getElementById("f-category");
  [...new Set(ALL_ROWS.map(r => r.category))].sort().forEach(c => {
    const o = document.createElement("option"); o.value = c; o.textContent = c; catSel.appendChild(o);
  });
  ["f-platform", "f-category", "f-minrev", "f-maxprice", "f-search"].forEach(id =>
    document.getElementById(id).addEventListener("input", renderResearch));
  document.querySelectorAll("#research-table th.sortable").forEach(th =>
    th.addEventListener("click", () => {
      if (sortKey === th.dataset.sort) sortDir *= -1;
      else { sortKey = th.dataset.sort; sortDir = -1; }
      document.querySelectorAll("#research-table th.sortable .arrow").forEach(a => a.textContent = "");
      th.querySelector(".arrow").textContent = sortDir === -1 ? "▼" : "▲";
      renderResearch();
    }));
  renderResearch();
})();

function renderResearch() {
  const plat = document.getElementById("f-platform").value;
  const cat = document.getElementById("f-category").value;
  const minRev = parseFloat(document.getElementById("f-minrev").value) || 0;
  const maxPrice = parseFloat(document.getElementById("f-maxprice").value) || Infinity;
  const q = document.getElementById("f-search").value.trim().toLowerCase();

  const rows = ALL_ROWS
    .filter(r => (plat === "all" || r.platform === plat)
      && (cat === "all" || r.category === cat)
      && r.revenue >= minRev && r.price <= maxPrice
      && (!q || r.name.toLowerCase().includes(q)))
    .sort((a, b) => sortDir === -1 ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

  document.querySelector("#research-table tbody").innerHTML = rows.map(r => `
    <tr>
      <td><div class="prod-cell"><span class="thumb">${r.emoji}</span>
        <div><div class="t">${r.name}</div><div class="c">${r.category}</div></div></div></td>
      <td><span class="platform-pill ${r.platform}">${r.platform === "amz" ? "AMAZON" : "TIKTOK"}</span></td>
      <td class="mono">${fmtUSD(r.price, 2)}</td>
      <td><span class="rev-green">${fmtUSD(r.revenue)}</span><span style="color:var(--muted);font-size:12px">/mo</span></td>
      <td class="mono">${fmtNum(r.sales)}/mo</td>
      <td class="mono" style="color:${r.margin >= 0.3 ? "var(--green)" : r.margin >= 0.18 ? "#fbbf24" : "var(--red)"}">${Math.round(r.margin * 100)}%</td>
      <td><span class="${r.trend >= 0 ? "trend-up" : "trend-down"}">${r.trend >= 0 ? "▲" : "▼"} ${Math.abs(r.trend).toFixed(1)}%</span></td>
    </tr>`).join("");
  document.getElementById("research-count").textContent =
    rows.length + " of " + ALL_ROWS.length + " products shown · demo dataset";
}

/* ---------- tiktok trends ---------- */
(function renderTikTok() {
  const grid = document.getElementById("tt-grid");
  const rows = [...TT_PRODUCTS].sort((a, b) => b.trend - a.trend);
  grid.innerHTML = rows.map(p => {
    const heat = p.trend >= 25 ? ["hot", "🔥 HOT"] : p.trend >= 10 ? ["warm", "📈 RISING"] : ["cool", "🧊 STEADY"];
    const rev = p.unitsMo * p.price;
    return `
    <div class="tt-card">
      <div class="head">
        <span class="thumb">${p.emoji}</span>
        <div><h3>${p.name}</h3><div class="cat">${p.category} · ${fmtUSD(p.price, 2)}</div></div>
        <span class="heat ${heat[0]}">${heat[1]}</span>
      </div>
      <div class="tt-stats">
        <div class="tt-stat"><div class="l">7d Views</div><div class="v pink">${(p.views7d / 1e6).toFixed(1)}M</div></div>
        <div class="tt-stat"><div class="l">Videos 7d</div><div class="v">${fmtNum(p.videos7d)}</div></div>
        <div class="tt-stat"><div class="l">Creators</div><div class="v">${fmtNum(p.creators)}</div></div>
        <div class="tt-stat"><div class="l">Commission</div><div class="v">${Math.round(p.commission * 100)}%</div></div>
        <div class="tt-stat"><div class="l">Est. Units/mo</div><div class="v">${fmtNum(p.unitsMo)}</div></div>
        <div class="tt-stat"><div class="l">Est. Revenue</div><div class="v green">${fmtUSD(rev / 1000)}k/mo</div></div>
      </div>
    </div>`;
  }).join("");
})();

/* ---------- AI listing builder ----------
   Demo template engine. Production: POST {name, keywords, features, mode}
   to your Claude proxy (same pattern as Pluto X ATS server.py) and render
   the response into #listing-out. */
let listingMode = "amz";
document.getElementById("mode-amz").addEventListener("click", () => setMode("amz"));
document.getElementById("mode-tt").addEventListener("click", () => setMode("tt"));
function setMode(m) {
  listingMode = m;
  document.getElementById("mode-amz").className = m === "amz" ? "active" : "";
  document.getElementById("mode-tt").className = m === "tt" ? "active tt" : "";
}

document.getElementById("l-generate").addEventListener("click", () => {
  const name = document.getElementById("l-name").value.trim() || "Premium Product";
  const keywords = document.getElementById("l-keywords").value.split(",").map(k => k.trim()).filter(Boolean);
  const features = document.getElementById("l-features").value.split("\n").map(f => f.trim()).filter(Boolean);
  const out = document.getElementById("listing-out");
  const kw = keywords.length ? keywords : ["premium quality", "best seller"];
  const ft = features.length ? features : ["Built to last with premium materials", "Designed for everyday use"];

  if (listingMode === "amz") {
    const title = `${name} — ${kw.slice(0, 3).map(cap).join(", ")} | ${cap(kw[0])} for Home, Travel & More`;
    const bullets = ft.slice(0, 5).map(f =>
      `<li><strong>${cap(f.split(" ").slice(0, 3).join(" "))}:</strong> ${f}${f.endsWith(".") ? "" : "."} Ideal for anyone searching for ${kw[Math.floor(Math.random() * kw.length)]}.</li>`).join("");
    const desc = `Meet the ${name} — engineered for people who refuse to compromise. ` +
      ft.map(f => f.replace(/\.$/, "")).join(". ") + ". " +
      `Whether you need ${kw.join(", ")}, or all of the above, this is the last one you'll ever buy. Backed by our satisfaction guarantee — add to cart today.`;
    out.innerHTML = `
      <button class="btn btn-ghost btn-sm copy-btn" onclick="copyListing(this)">📋 Copy All</button>
      <h4>Title (${title.length} chars)</h4><div class="block">${title}</div>
      <h4>Bullet Points</h4><ul>${bullets}</ul>
      <h4>Description</h4><div class="block">${desc}</div>
      <h4>Backend Keywords</h4><div class="block mono" style="font-size:13px">${kw.join(" ")} ${name.toLowerCase().split(" ").join(" ")}</div>`;
  } else {
    const hook = `POV: you finally found the ${name.toLowerCase()} everyone's been talking about 👀`;
    const captions = [
      `${hook}\n\n${ft[0]} 🤯 ${kw.slice(0, 2).map(k => "#" + k.replace(/\s+/g, "")).join(" ")} #TikTokMadeMeBuyIt #tiktokshopfinds`,
      `I was today years old when I learned a ${name.toLowerCase()} could do THIS ⬇️\n\n✅ ${ft.join("\n✅ ")}\n\nRunning a launch discount this week only 🏃`,
      `Things in my cart that just make sense, part 7 🛒\n\nThe ${name}: ${ft[0].toLowerCase()} — and it's under ${"$" + Math.ceil(20 + Math.random() * 20)}.`
    ];
    out.innerHTML = `
      <button class="btn btn-ghost btn-sm copy-btn" onclick="copyListing(this)">📋 Copy All</button>
      <h4>Shop Listing Title</h4><div class="block">${name} · ${kw.slice(0, 2).map(cap).join(" · ")} 🔥 Viral ${cap(kw[0])}</div>
      <h4>Product Description</h4><div class="block">${ft.map(f => "✨ " + f).join("\n")}\n\n🚚 Ships fast · 💯 Buyer protection · ⭐ As seen on TikTok</div>
      <h4>3 Creator Video Captions</h4>${captions.map(c => `<div class="block" style="border:1px solid var(--line-soft);border-radius:10px;padding:14px;margin-bottom:10px">${c.replace(/\n/g, "<br>")}</div>`).join("")}
      <h4>Suggested Creator Commission</h4><div class="block">15–20% — high enough to attract mid-tier creators (10k–100k followers) who drive most TikTok Shop volume.</div>`;
  }
  out.classList.add("show");
});
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function copyListing(btn) {
  const text = btn.parentElement.innerText.replace("📋 Copy All", "").trim();
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "✅ Copied";
    setTimeout(() => (btn.textContent = "📋 Copy All"), 1500);
  });
}

/* ---------- automations ----------
   Demo: rules persist to localStorage, trigger feed is simulated from the
   demo dataset. Production: each rule becomes a scheduled job against live
   Keepa/TikTok feeds, firing email/Telegram (reuse the signal-bot pipeline). */
const TRIGGER_LABELS = {
  "tt-spike": t => `TikTok trend spikes above +${t}%`,
  "bsr-improve": t => `BSR improves past #${fmtNum(t)}`,
  "price-drop": t => `Competitor price drops below ${fmtUSD(t, 2)}`,
  "rev-cross": t => `Niche revenue crosses ${fmtUSD(t)}/mo`,
  "new-comp": () => `New competitor enters niche`
};
const ACTION_LABELS = {
  email: "📧 Email me", telegram: "📲 Telegram alert",
  listing: "🧠 Auto-draft AI listing", watch: "👁 Watchlist + daily digest"
};

function loadRules() { return JSON.parse(localStorage.getItem("nexlaunch_automations") || "[]"); }
function saveRules(r) { localStorage.setItem("nexlaunch_automations", JSON.stringify(r)); }

function renderRules() {
  const rules = loadRules();
  const list = document.getElementById("a-list");
  document.getElementById("a-count").textContent = rules.length
    ? rules.filter(r => r.on).length + " active · " + rules.length + " total"
    : "No automations yet — create your first on the left.";
  list.innerHTML = rules.map((r, i) => `
    <div class="auto-rule">
      <label class="switch"><input type="checkbox" data-idx="${i}" ${r.on ? "checked" : ""}><span class="track"></span></label>
      <div class="desc">
        <div>When ${TRIGGER_LABELS[r.trigger](r.threshold)} <span style="color:var(--muted)">(${r.scope})</span></div>
        <div class="then">→ ${ACTION_LABELS[r.action]}</div>
      </div>
      <button class="kill" data-kill="${i}" title="Delete">🗑</button>
    </div>`).join("");
  list.querySelectorAll(".switch input").forEach(sw => sw.addEventListener("change", () => {
    const rules = loadRules(); rules[sw.dataset.idx].on = sw.checked; saveRules(rules); renderRules();
  }));
  list.querySelectorAll("[data-kill]").forEach(b => b.addEventListener("click", () => {
    const rules = loadRules(); rules.splice(b.dataset.kill, 1); saveRules(rules); renderRules();
  }));
}

document.getElementById("a-create").addEventListener("click", () => {
  const rules = loadRules();
  rules.push({
    trigger: document.getElementById("a-trigger").value,
    threshold: parseFloat(document.getElementById("a-threshold").value) || 25,
    scope: document.getElementById("a-scope").value,
    action: document.getElementById("a-action").value,
    on: true,
    createdAt: new Date().toISOString()
  });
  saveRules(rules);
  renderRules();
});

(function renderFeed() {
  const hot = [...TT_PRODUCTS].sort((a, b) => b.trend - a.trend);
  const amz = [...AMZ_PRODUCTS].sort((a, b) => b.trend - a.trend);
  const items = [
    { when: "2h ago", hot: true, html: `<strong>${hot[0].name}</strong> trend hit ▲${hot[0].trend.toFixed(1)}% (7d) — creator count up to ${fmtNum(hot[0].creators)}. Telegram alert sent.` },
    { when: "9h ago", hot: false, html: `<strong>${amz[0].name}</strong> BSR improved to #${fmtNum(amz[0].bsr)} in ${amz[0].category}. Added to watchlist.` },
    { when: "1d ago", hot: true, html: `<strong>${hot[1].name}</strong> crossed ${fmtUSD(hot[1].unitsMo * hot[1].price / 1000)}k/mo est. revenue. AI listing draft queued.` },
    { when: "2d ago", hot: false, html: `Competitor price drop detected in <strong>${amz[2].category}</strong>: ${amz[2].name} now ${fmtUSD(amz[2].price - 3, 2)}. Email sent.` },
    { when: "4d ago", hot: false, html: `<strong>${amz[1].name}</strong> review velocity +${Math.round(amz[1].trend * 10)} reviews/day — niche heating up.` }
  ];
  document.getElementById("a-feed").innerHTML = items.map(i => `
    <div class="feed-item ${i.hot ? "hot" : ""}"><span class="when">${i.when}</span><div class="what">${i.html}</div></div>`).join("");
})();

renderRules();
VIEW_TITLES.automations = "Automations";
