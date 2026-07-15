/* ============ NexLaunch — landing page ============ */

/* Market table: mix Amazon + TikTok demo rows */
(function renderMarketTable() {
  const tbody = document.querySelector("#market-table tbody");
  if (!tbody) return;

  const amzRows = AMZ_PRODUCTS.slice(0, 5).map(p => {
    const sales = estimateSalesFromBSR(p.bsr, p.category);
    return {
      emoji: p.emoji, name: p.name, cat: `${p.category} › ${p.sub}`,
      platform: "amz", price: p.price, rank: "#" + fmtNum(p.bsr),
      reviews: fmtNum(p.reviews), revenue: sales * p.price, sales, trend: p.trend
    };
  });

  const ttRows = TT_PRODUCTS.slice(0, 3).map(p => ({
    emoji: p.emoji, name: p.name, cat: `${p.category} › TikTok Shop`,
    platform: "tt", price: p.price, rank: (p.views7d / 1e6).toFixed(1) + "M views",
    reviews: fmtNum(p.creators) + " creators", revenue: p.unitsMo * p.price,
    sales: p.unitsMo, trend: p.trend
  }));

  const rows = [...amzRows, ...ttRows].sort((a, b) => b.revenue - a.revenue);

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><div class="prod-cell"><span class="thumb">${r.emoji}</span>
        <div><div class="t">${r.name}</div><div class="c">${r.cat}</div></div></div></td>
      <td><span class="platform-pill ${r.platform}">${r.platform === "amz" ? "AMAZON" : "TIKTOK"}</span></td>
      <td class="mono">${fmtUSD(r.price, 2)}</td>
      <td class="mono">${r.rank}</td>
      <td class="mono">${r.reviews}</td>
      <td><span class="rev-green">${fmtUSD(r.revenue)}</span><span style="color:var(--muted);font-size:12px">/mo</span></td>
      <td class="mono">${fmtNum(r.sales)}<span style="color:var(--muted);font-size:12px">/mo</span></td>
      <td><span class="${r.trend >= 0 ? "trend-up" : "trend-down"}">${r.trend >= 0 ? "▲" : "▼"} ${Math.abs(r.trend).toFixed(1)}%</span></td>
    </tr>`).join("");
})();

/* Signup modal — every pricing/get-started button works */
(function signupModal() {
  const overlay = document.getElementById("signup-modal");
  const planEl = document.getElementById("modal-plan");
  const form = document.getElementById("signup-form");
  const msg = document.getElementById("signup-msg");

  document.querySelectorAll("[data-signup]").forEach(btn => {
    btn.addEventListener("click", () => {
      planEl.textContent = btn.dataset.plan || "Pro";
      overlay.classList.add("open");
      document.getElementById("su-name").focus();
    });
  });

  overlay.addEventListener("click", e => {
    if (e.target === overlay || e.target.hasAttribute("data-close")) overlay.classList.remove("open");
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") overlay.classList.remove("open"); });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const account = {
      name: document.getElementById("su-name").value.trim(),
      email: document.getElementById("su-email").value.trim(),
      plan: planEl.textContent,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem("nexlaunch_account", JSON.stringify(account));
    msg.classList.add("ok");
    setTimeout(() => { window.location.href = "app.html"; }, 900);
  });
})();
