/* ============ NexLaunch — AI Receptionist "Nova" ============
   Self-injecting chat widget. Demo brain = intent matcher below.
   Production: replace matchIntent() with a POST to your Claude proxy
   (system prompt: NexLaunch receptionist; tools: bookDemo, saveLead). */

(function () {
  /* ---------- knowledge base ---------- */
  const INTENTS = [
    {
      k: ["price", "pricing", "cost", "plan", "how much", "subscription"],
      a: "Our plans:\n\n• Starter — $29/mo (50 X-Rays, Amazon data)\n• Pro — $79/mo (unlimited X-Rays, Amazon + TikTok, Trend Radar) ← most popular\n• Agency — $199/mo (5 seats, API, 200 competitor slots)\n\nAll month-to-month, cancel anytime. Want a personalized launch quote? Try the Quote Estimator on this page, or type \"demo\" to book a walkthrough.",
      chips: ["Book a demo", "What's in Pro?", "Run a quote"]
    },
    {
      k: ["pro?", "what's in pro", "whats in pro"],
      a: "Pro ($79/mo) includes unlimited X-Ray scans, Amazon + TikTok Shop market data, the TikTok Trend Radar, 100 AI listings a month, tracking for 25 competitors, and full Seller Academy access. It's the right plan if you're actively launching.",
      chips: ["Book a demo", "Start free trial"]
    },
    {
      k: ["xray", "x-ray", "x ray", "revenue", "estimate"],
      a: "Product X-Ray lets you paste any ASIN, Amazon URL, or product name and instantly see estimated monthly revenue, sales velocity, BSR trend, and a per-unit profit breakdown after all fees — with a clear ✅ launch / ❌ pass verdict.",
      chips: ["Try the dashboard", "Pricing"]
    },
    {
      k: ["tiktok", "tik tok", "trend"],
      a: "The TikTok Trend Radar tracks products gaining video velocity on TikTok Shop — 7-day views, creator counts, and commission rates — so you can spot winners before they saturate. It's included in Pro and Agency.",
      chips: ["Pricing", "Book a demo"]
    },
    {
      k: ["trial", "free"],
      a: "Yes — the dashboard is free to explore right now, no card required. Hit \"Launch Dashboard\" at the top of the page and you're in.",
      chips: ["Pricing", "Book a demo"]
    },
    {
      k: ["cancel", "refund"],
      a: "All plans are month-to-month with no contracts. Cancel in one click from account settings and you keep access through the end of your billing period.",
      chips: ["Pricing"]
    },
    {
      k: ["amazon", "fba", "seller account"],
      a: "You don't need an Amazon or TikTok seller account to research with NexLaunch — you only need one when you're ready to actually list products. We cover FBA fees, referral fees, and TikTok commissions in every profit calculation.",
      chips: ["What is X-Ray?", "Pricing"]
    },
    {
      k: ["demo", "call", "walkthrough", "book", "talk", "meeting"],
      a: "__BOOK_DEMO__"
    },
    {
      k: ["human", "person", "support", "help", "agent", "contact", "email"],
      a: "__HANDOFF__"
    },
    {
      k: ["hi", "hello", "hey", "yo", "sup"],
      a: "Hey! 👋 I'm Nova, NexLaunch's AI receptionist. I can explain features and pricing, book you a demo, or get a launch quote started. What are you selling — or planning to sell?",
      chips: ["Pricing", "What is X-Ray?", "Book a demo"]
    }
  ];
  const FALLBACK = {
    a: "Good question — I want to make sure you get a proper answer. I can cover pricing, features (X-Ray, Trend Radar, AI listings), or book you a demo with the founder. Which would help?",
    chips: ["Pricing", "Book a demo", "Talk to a human"]
  };

  function matchIntent(text) {
    const t = " " + text.toLowerCase().trim() + " ";
    let best = null, bestScore = 0;
    for (const it of INTENTS) {
      const score = it.k.filter(k => t.includes(k)).length;
      if (score > bestScore) { best = it; bestScore = score; }
    }
    return best || FALLBACK;
  }

  /* ---------- state ---------- */
  let mode = "chat"; // chat | awaitEmail
  let pendingLeadType = null;

  function saveLead(email, type) {
    const leads = JSON.parse(localStorage.getItem("nexlaunch_leads") || "[]");
    leads.push({ email, type, page: location.pathname, at: new Date().toISOString() });
    localStorage.setItem("nexlaunch_leads", JSON.stringify(leads));
  }

  /* ---------- DOM ---------- */
  const root = document.createElement("div");
  root.innerHTML = `
    <button class="nova-fab" id="nova-fab" aria-label="Chat with Nova">
      <span class="nova-fab-icon">💬</span>
      <span class="nova-fab-badge">1</span>
    </button>
    <div class="nova-panel" id="nova-panel">
      <div class="nova-head">
        <div class="nova-avatar">N</div>
        <div>
          <div class="nova-name">Nova · AI Receptionist</div>
          <div class="nova-status"><span class="dot"></span>Online — replies instantly</div>
        </div>
        <button class="nova-close" id="nova-close" aria-label="Close chat">×</button>
      </div>
      <div class="nova-body" id="nova-body"></div>
      <div class="nova-chips" id="nova-chips"></div>
      <form class="nova-input" id="nova-form">
        <input id="nova-text" type="text" placeholder="Ask about pricing, features, demos…" autocomplete="off">
        <button type="submit" class="nova-send">➤</button>
      </form>
    </div>`;
  document.body.appendChild(root);

  const panel = document.getElementById("nova-panel");
  const body = document.getElementById("nova-body");
  const chipsEl = document.getElementById("nova-chips");
  const input = document.getElementById("nova-text");
  const fab = document.getElementById("nova-fab");

  function addMsg(text, who) {
    const el = document.createElement("div");
    el.className = "nova-msg " + who;
    el.innerHTML = text.replace(/\n/g, "<br>");
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }
  function setChips(chips) {
    chipsEl.innerHTML = (chips || []).map(c => `<button class="nova-chip">${c}</button>`).join("");
    chipsEl.querySelectorAll(".nova-chip").forEach(b =>
      b.addEventListener("click", () => handleUser(b.textContent)));
  }
  function botReply(text, chips) {
    const typing = document.createElement("div");
    typing.className = "nova-msg bot typing";
    typing.textContent = "…";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      typing.remove();
      addMsg(text, "bot");
      setChips(chips);
    }, 450 + Math.random() * 500);
  }

  function handleUser(text) {
    if (!text.trim()) return;
    addMsg(text, "user");
    setChips([]);

    if (mode === "awaitEmail") {
      const email = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      if (email) {
        saveLead(email[0], pendingLeadType);
        mode = "chat";
        botReply(
          pendingLeadType === "demo"
            ? `Locked in ✅ We'll email <strong>${email[0]}</strong> within one business day with demo times. Meanwhile, the dashboard is open — go X-Ray something!`
            : `Got it ✅ A human will reach out to <strong>${email[0]}</strong> shortly. Anything else I can answer in the meantime?`,
          ["Pricing", "What is X-Ray?"]
        );
      } else {
        botReply("That doesn't look like an email — mind trying again? (e.g. you@example.com)");
      }
      return;
    }

    const intent = matchIntent(text);
    if (intent.a === "__BOOK_DEMO__") {
      mode = "awaitEmail"; pendingLeadType = "demo";
      botReply("Love it — I'll set that up. What's the best email to send demo times to?");
    } else if (intent.a === "__HANDOFF__") {
      mode = "awaitEmail"; pendingLeadType = "support";
      botReply("No problem — I'll flag a human for you. What email should they reach you at?");
    } else {
      botReply(intent.a, intent.chips);
    }
  }

  /* ---------- events ---------- */
  fab.addEventListener("click", () => {
    panel.classList.toggle("open");
    fab.querySelector(".nova-fab-badge").style.display = "none";
    if (panel.classList.contains("open") && !body.children.length) {
      botReply("Hey! 👋 I'm Nova. Ask me anything about NexLaunch — or tap a shortcut below.",
        ["Pricing", "What is X-Ray?", "Book a demo"]);
    }
    if (panel.classList.contains("open")) input.focus();
  });
  document.getElementById("nova-close").addEventListener("click", () => panel.classList.remove("open"));
  document.getElementById("nova-form").addEventListener("submit", e => {
    e.preventDefault();
    handleUser(input.value);
    input.value = "";
  });
})();
