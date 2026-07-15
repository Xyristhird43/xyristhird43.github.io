/* ============ NexLaunch — AI Quote Estimator ============
   Deterministic launch-cost model built on the fee engines in data.js.
   Production upgrade: send inputs + category benchmarks to Claude for a
   narrative quote; the math below stays as the ground truth. */

(function () {
  const btn = document.getElementById("q-run");
  if (!btn) return;

  // typical COGS as % of sale price per category (sourcing benchmark)
  const COGS_PCT = {
    "Home & Kitchen": 0.24, "Beauty": 0.18, "Electronics": 0.30,
    "Sports & Outdoors": 0.25, "Pet Supplies": 0.24, "Grocery": 0.28,
    "Toys & Games": 0.26, "Office Products": 0.22
  };

  function runQuote() {
    const platform = document.getElementById("q-platform").value;
    const category = document.getElementById("q-category").value;
    const price = parseFloat(document.getElementById("q-price").value) || 29.99;
    const units = Math.max(10, parseInt(document.getElementById("q-units").value) || 500);
    const adsPct = (parseFloat(document.getElementById("q-ads").value) || 15) / 100;
    let cogs = parseFloat(document.getElementById("q-cogs").value);
    if (!cogs || cogs <= 0) cogs = Math.round(price * (COGS_PCT[category] || 0.25) * 100) / 100;

    // per-unit fees (blend when selling on both)
    const amzF = amazonFees(price, 1.2).total;
    const ttF = tiktokFees(price, 0.15).total;
    const feePerUnit = platform === "amz" ? amzF : platform === "tt" ? ttF : (amzF + ttF) / 2;

    const adPerUnit = price * adsPct;
    const profitPerUnit = price - feePerUnit - cogs - adPerUnit;
    const monthlyProfit = profitPerUnit * units;
    const monthlyRevenue = price * units;

    // startup costs
    const firstOrder = cogs * units * 1.5;              // 1.5 months of stock
    const shippingIn = firstOrder * 0.12;               // freight to warehouse/FBA
    const creatorSeeding = platform !== "amz" ? 350 : 0; // TikTok samples to creators
    const launchAds = monthlyRevenue * adsPct * 0.75;    // first-month ad push
    const brandSetup = 300;                              // photos, UPC, misc
    const startup = firstOrder + shippingIn + creatorSeeding + launchAds + brandSetup;

    const breakevenMo = monthlyProfit > 0 ? startup / monthlyProfit : Infinity;
    const marginPct = (profitPerUnit / price) * 100;

    document.getElementById("q-startup").textContent = fmtUSD(Math.round(startup / 50) * 50);
    document.getElementById("q-lines").innerHTML = `
      <div class="q-line"><span>First inventory order (${fmtNum(Math.round(units * 1.5))} units @ ${fmtUSD(cogs, 2)})</span><span class="v">${fmtUSD(firstOrder)}</span></div>
      <div class="q-line"><span>Freight & inbound shipping</span><span class="v">${fmtUSD(shippingIn)}</span></div>
      ${creatorSeeding ? `<div class="q-line"><span>TikTok creator sample seeding</span><span class="v">${fmtUSD(creatorSeeding)}</span></div>` : ""}
      <div class="q-line"><span>Launch ad budget (month 1)</span><span class="v">${fmtUSD(launchAds)}</span></div>
      <div class="q-line"><span>Brand setup (photos, UPC, misc)</span><span class="v">${fmtUSD(brandSetup)}</span></div>
      <div class="q-line"><span>Marketplace fees / unit</span><span class="v">${fmtUSD(feePerUnit, 2)}</span></div>
      <div class="q-line total"><span>Projected profit / month</span><span class="v" style="color:${monthlyProfit > 0 ? "var(--green)" : "var(--red)"}">${fmtUSD(monthlyProfit)} (${marginPct.toFixed(0)}% margin)</span></div>
      <div class="q-line total"><span>Breakeven</span><span class="v">${isFinite(breakevenMo) ? "~" + Math.max(1, Math.ceil(breakevenMo)) + " months" : "not profitable"}</span></div>`;

    const rec = document.getElementById("q-rec");
    const plan = platform === "both" || monthlyRevenue > 40000 ? (monthlyRevenue > 100000 ? "Agency" : "Pro") : platform === "tt" ? "Pro" : "Starter";
    let verdict;
    if (marginPct >= 25 && isFinite(breakevenMo) && breakevenMo <= 4) {
      verdict = "Strong economics — this launch pencils out. ";
    } else if (marginPct >= 12) {
      verdict = "Workable but tight — negotiate unit cost down or raise price ~10%. ";
    } else {
      verdict = "⚠️ These numbers don't survive contact with reality — rework price or sourcing before spending. ";
    }
    rec.style.display = "block";
    rec.innerHTML = `🤖 <strong>Nova's read:</strong> ${verdict}Recommended plan: <strong>${plan}</strong>${platform === "both" ? " (you'll want Trend Radar + dual-marketplace data)" : ""}.`;
    const cta = document.getElementById("q-cta");
    cta.style.display = "flex";
    cta.dataset.plan = plan;
    cta.textContent = `Start My Launch on ${plan} →`;
  }

  btn.addEventListener("click", runQuote);
})();
