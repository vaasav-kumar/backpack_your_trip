/**
 * WhatsApp group-chat export → travel planning summary.
 * Runs entirely in the browser — no chat text leaves the device until the customer emails it.
 */
(() => {
  const config = window.SITE_CONFIG || {};
  const toEmail = config.email || "backpackyourtrip@gmail.com";

  const SYSTEM_PATTERNS = [
    /messages? and calls are end-to-end encrypted/i,
    /created (this )?group/i,
    /added .+ to the group/i,
    /left$/i,
    /changed the (group )?subject/i,
    /changed this group's icon/i,
    /security code changed/i,
    /you're now an admin/i,
    /joined using this group's invite link/i,
    /turned on disappearing messages/i,
    /waiting for this message/i,
  ];

  const MEDIA_OMIT = /^(image|video|audio|sticker|gif|document|contact card|location omitted|<media omitted>|‎?<attached:)/i;

  const DESTINATIONS = [
    "japan", "tokyo", "osaka", "kyoto", "hokkaido", "okinawa",
    "south korea", "korea", "seoul", "busan", "jeju",
    "kazakhstan", "almaty", "astana", "uzbekistan", "samarkand", "tashkent", "bukhara",
    "sri lanka", "colombo", "kandy", "galle", "ella", "sigiriya",
    "bali", "indonesia", "jakarta", "lombok", "thailand", "bangkok", "phuket", "chiang mai", "krabi",
    "vietnam", "hanoi", "ho chi minh", "da nang", "halong", "europe", "italy", "rome", "florence",
    "france", "paris", "spain", "barcelona", "madrid", "portugal", "lisbon", "switzerland",
    "greece", "dubai", "uae", "abu dhabi", "oman", "turkey", "istanbul", "cappadocia",
    "india", "goa", "kerala", "rajasthan", "ladakh", "manali", "himachal", "spiti",
    "singapore", "malaysia", "kuala lumpur", "maldives", "mauritius", "georgia", "tbilisi",
    "armenia", "azerbaijan", "nepal", "bhutan", "australia", "new zealand", "iceland",
    "croatia", "montenegro", "albania", "morocco", "egypt", "jordan", "kenya", "tanzania",
  ];

  const PREFERENCE_RE =
    /\b(want|wanna|prefer|love|like|must[- ]?see|must[- ]?do|hate|avoid|don't want|do not want|interested|vibe|pace|food|cuisine|hotel|hostel|resort|airbnb|stay|flight|train|road trip|hiking|trek|beach|nightlife|museum|temple|shopping|relax|adventure|budget|luxury|mid[- ]?range)\b/i;

  const DECISION_RE =
    /\b(decided|decision|finali[sz]e|final|confirmed|confirm|agreed|let'?s go with|go with|settled on|locked in|booked|shortlist)\b/i;

  const BUDGET_RE =
    /(?:₹|rs\.?|inr|usd|\$|€|£)\s?[\d,.]+(?:\s?(?:k|l|lac|lakh|lakhs|cr|crore))?|\b[\d,.]+\s?(?:k|l|lac|lakh|lakhs)\b|\bbudget\b.{0,40}|\bcost\b.{0,40}|\bper (?:person|head|pax)\b.{0,30}/i;

  const DATE_RE =
    /\b(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\.\d{1,2}\.\d{2,4}|\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s\d{4}|(?:mid|early|late)\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(?:next|this|end of|mid)\s(?:month|year|week)|(?:\d{1,2})\s*(?:days?|nights?|weeks?))\b/gi;

  const TRAVELLER_RE =
    /\b(\d+)\s*(?:people|persons?|travellers?|travelers?|pax|of us|friends|family members?)\b|\b(couple|honeymoon|solo|family|friends group|bachelor)\b/i;

  /** Parse common WhatsApp .txt export formats into message objects. */
  function parseWhatsAppExport(rawText) {
    const text = String(rawText || "")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const lineStart =
      /^(?:\[?(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]?\s*(?:[-–—]\s*)?|(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\s*[-–—]\s*)/;

    const lines = text.split("\n");
    const messages = [];
    let current = null;

    for (const line of lines) {
      const match = line.match(lineStart);
      if (match) {
        if (current) messages.push(current);

        const date = match[1] || match[3] || "";
        const time = match[2] || match[4] || "";
        const rest = line.slice(match[0].length);
        const colon = rest.indexOf(": ");

        let sender = "";
        let body = rest;

        if (colon > 0 && colon < 80) {
          sender = rest.slice(0, colon).trim();
          body = rest.slice(colon + 2);
        } else {
          sender = "";
          body = rest.trim();
        }

        current = {
          date,
          time,
          sender: sender.replace(/^\u200e|\u200f/g, "").trim(),
          body: body.replace(/^\u200e|\u200f/g, "").trim(),
        };
      } else if (current) {
        current.body += `\n${line}`;
      }
    }

    if (current) messages.push(current);

    return messages
      .map((m) => ({ ...m, body: m.body.trim() }))
      .filter((m) => m.body.length > 0);
  }

  function isSystemMessage(msg) {
    if (!msg.sender) return true;
    return SYSTEM_PATTERNS.some((re) => re.test(msg.body));
  }

  function isMediaPlaceholder(body) {
    return MEDIA_OMIT.test(body.trim());
  }

  function uniquePreserve(items, limit = 12) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Drop shorter place names already covered by a longer one (e.g. Korea ⊂ South Korea). */
  function preferLongerPlaces(places) {
    const unique = uniquePreserve(places, 40);
    return unique.filter(
      (place) =>
        !unique.some(
          (other) =>
            other !== place &&
            other.toLowerCase().includes(place.toLowerCase()) &&
            other.length > place.length
        )
    );
  }

  function clip(text, max = 160) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1).trim()}…`;
  }

  function findDestinations(body) {
    const lower = body.toLowerCase();
    return DESTINATIONS.filter((d) => {
      const re = new RegExp(`\\b${d.replace(/\s+/g, "\\s+")}\\b`, "i");
      return re.test(lower);
    }).map((d) => d.replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  function scoreMessage(msg) {
    const body = msg.body;
    let score = 0;
    if (findDestinations(body).length) score += 3;
    if (BUDGET_RE.test(body)) score += 3;
    if (DATE_RE.test(body)) {
      DATE_RE.lastIndex = 0;
      score += 2;
    }
    if (TRAVELLER_RE.test(body)) score += 2;
    if (DECISION_RE.test(body)) score += 3;
    if (PREFERENCE_RE.test(body)) score += 2;
    if (body.includes("?")) score += 1;
    if (body.length > 40 && body.length < 280) score += 1;
    return score;
  }

  /**
   * Build a structured travel-planning summary from parsed WhatsApp messages.
   * @param {Array<{date:string,time:string,sender:string,body:string}>} messages
   * @param {{fileName?: string}} [meta]
   * @returns {{ text: string, stats: object, structured: object }}
   */
  function summarizeChat(messages, meta = {}) {
    const chatMessages = messages.filter((m) => !isSystemMessage(m) && !isMediaPlaceholder(m.body));
    const participants = uniquePreserve(
      chatMessages.map((m) => m.sender).filter(Boolean),
      30
    );

    const destinations = [];
    const dates = [];
    const budgets = [];
    const travellers = [];
    const preferences = [];
    const decisions = [];
    const questions = [];
    const highlights = [];

    for (const msg of chatMessages) {
      const { body, sender } = msg;
      const label = sender || "Someone";

      findDestinations(body).forEach((d) => destinations.push(d));

      const dateHits = body.match(DATE_RE);
      if (dateHits) {
        dateHits.forEach((d) => dates.push(d));
        DATE_RE.lastIndex = 0;
      }

      const budgetHit = body.match(BUDGET_RE);
      if (budgetHit) budgets.push(`${label}: ${clip(body, 140)}`);

      const travellerHit = body.match(TRAVELLER_RE);
      if (travellerHit) travellers.push(`${label}: ${clip(body, 140)}`);

      if (DECISION_RE.test(body)) decisions.push(`${label}: ${clip(body, 160)}`);
      else if (PREFERENCE_RE.test(body) && body.length > 18) {
        preferences.push(`${label}: ${clip(body, 160)}`);
      }

      if (body.includes("?") && body.length > 12 && body.length < 220) {
        questions.push(`${label}: ${clip(body, 160)}`);
      }

      const s = scoreMessage(msg);
      if (s >= 4) highlights.push({ score: s, line: `${label}: ${clip(body, 180)}` });
    }

    highlights.sort((a, b) => b.score - a.score);

    const firstDate = chatMessages[0]?.date || "—";
    const lastDate = chatMessages[chatMessages.length - 1]?.date || "—";

    const structured = {
      fileName: meta.fileName || "chat export",
      messageCount: chatMessages.length,
      participants,
      dateRange: `${firstDate} → ${lastDate}`,
      destinations: preferLongerPlaces(destinations).slice(0, 12),
      dates: uniquePreserve(dates, 10),
      budgets: uniquePreserve(budgets, 8),
      travellers: uniquePreserve(travellers, 6),
      preferences: uniquePreserve(preferences, 10),
      decisions: uniquePreserve(decisions, 8),
      questions: uniquePreserve(questions, 8),
      highlights: uniquePreserve(
        highlights.map((h) => h.line),
        8
      ),
    };

    const section = (title, items, empty = "Not clearly mentioned in the chat.") => {
      if (!items.length) return `${title}\n- ${empty}`;
      return `${title}\n${items.map((i) => `- ${i}`).join("\n")}`;
    };

    const text = [
      "Trip Planning Chat Summary",
      "==========================",
      `Source file: ${structured.fileName}`,
      `Messages analysed: ${structured.messageCount}`,
      `Participants: ${structured.participants.join(", ") || "Unknown"}`,
      `Chat date range: ${structured.dateRange}`,
      "",
      section("Destinations discussed", structured.destinations),
      "",
      section("Dates & duration cues", structured.dates),
      "",
      section("Group / travellers", structured.travellers),
      "",
      section("Budget mentions", structured.budgets),
      "",
      section("Preferences & interests", structured.preferences),
      "",
      section("Decisions / agreements", structured.decisions),
      "",
      section("Open questions", structured.questions, "No clear open questions detected."),
      "",
      section("High-signal excerpts", structured.highlights, "Upload a longer planning chat for richer excerpts."),
      "",
      "Notes for BackpackYourTrip",
      "- (Edit this section before sending — add must-haves, constraints, or clarifications.)",
      "",
      "Generated on this device. Please review and edit before emailing.",
    ].join("\n");

    return {
      text,
      structured,
      stats: {
        messages: structured.messageCount,
        participants: structured.participants.length,
        destinations: structured.destinations.length,
        dateRange: structured.dateRange,
      },
    };
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ——— UI wiring ——— */
  const dropzone = document.querySelector("[data-chat-dropzone]");
  const fileInput = document.querySelector("[data-chat-file]");
  const browseBtn = document.querySelector("[data-chat-browse]");
  const statusEl = document.querySelector("[data-chat-status]");
  const errorEl = document.querySelector("[data-chat-error]");
  const results = document.querySelector("[data-chat-results]");
  const editor = document.querySelector("[data-chat-editor]");
  const statsEl = document.querySelector("[data-chat-stats]");
  const customerName = document.querySelector("#customerName");
  const customerEmail = document.querySelector("#customerEmail");
  const sendBtn = document.querySelector("[data-chat-send]");
  const copyBtn = document.querySelector("[data-chat-copy]");
  const resetBtn = document.querySelector("[data-chat-reset]");
  const charCount = document.querySelector("[data-chat-chars]");

  if (!dropzone || !fileInput || !editor) return;

  const setError = (message) => {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  };

  const setStatus = (message) => {
    if (!statusEl) return;
    statusEl.textContent = message || "";
  };

  const updateCharCount = () => {
    if (!charCount) return;
    const n = editor.value.length;
    charCount.textContent = `${n.toLocaleString()} characters`;
  };

  const renderStats = (stats, file) => {
    if (!statsEl) return;
    statsEl.innerHTML = [
      `<li><strong>${stats.messages}</strong> messages</li>`,
      `<li><strong>${stats.participants}</strong> people</li>`,
      `<li><strong>${stats.destinations}</strong> destinations</li>`,
      `<li>${stats.dateRange}</li>`,
      file ? `<li>${file.name} · ${formatBytes(file.size)}</li>` : "",
    ]
      .filter(Boolean)
      .join("");
  };

  const showResults = (summary, file) => {
    editor.value = summary.text;
    updateCharCount();
    renderStats(summary.stats, file);
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.focus();
  };

  const processText = (text, file) => {
    setError("");
    setStatus("Parsing chat…");

    const messages = parseWhatsAppExport(text);
    if (messages.length < 2) {
      setStatus("");
      setError(
        "Could not read WhatsApp messages from this file. Export the chat as a .txt file (without media) and try again."
      );
      return;
    }

    setStatus("Building summary…");
    const summary = summarizeChat(messages, { fileName: file?.name || "chat.txt" });
    setStatus(`Ready — ${summary.stats.messages} messages summarised. Edit below, then email us.`);
    showResults(summary, file);
  };

  const readFile = (file) => {
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && file.type && !file.type.startsWith("text/")) {
      setError("Please upload a WhatsApp chat export as a .txt file (export without media).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("File is larger than 8 MB. Export without media, or trim older messages.");
      return;
    }

    setError("");
    setStatus(`Reading ${file.name}…`);

    const reader = new FileReader();
    reader.onload = () => {
      processText(String(reader.result || ""), file);
    };
    reader.onerror = () => {
      setStatus("");
      setError("Could not read that file. Please try again.");
    };
    reader.readAsText(file);
  };

  browseBtn?.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    readFile(file);
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    readFile(file);
  });

  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  editor.addEventListener("input", updateCharCount);

  copyBtn?.addEventListener("click", async () => {
    const text = editor.value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Summary copied to clipboard.");
    } catch {
      editor.select();
      setStatus("Select the text and copy manually (⌘/Ctrl + C).");
    }
  });

  sendBtn?.addEventListener("click", () => {
    const summary = editor.value.trim();
    if (!summary) {
      setError("Generate or write a summary before sending.");
      return;
    }

    const name = customerName?.value.trim() || "";
    const email = customerEmail?.value.trim() || "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address, or leave it blank.");
      customerEmail?.focus();
      return;
    }

    setError("");

    const subject = encodeURIComponent(
      `Group chat trip summary${name ? ` — ${name}` : ""}`
    );
    const body = encodeURIComponent(
      [
        "Hi BackpackYourTrip,",
        "",
        "Please find our group chat trip summary below (edited by us).",
        name ? `Name: ${name}` : null,
        email ? `Reply-to: ${email}` : null,
        "",
        "-----",
        "",
        summary,
        "",
        "-----",
        "",
        "Sent from the Chat Summary page on backpackyourtrip.com",
      ]
        .filter((line) => line !== null)
        .join("\n")
    );

    // mailto opens the customer's email app — they review and send.
    window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
    setStatus(`Opening your email app to send to ${toEmail}…`);
  });

  resetBtn?.addEventListener("click", () => {
    fileInput.value = "";
    editor.value = "";
    if (customerName) customerName.value = "";
    if (customerEmail) customerEmail.value = "";
    if (statsEl) statsEl.innerHTML = "";
    if (results) results.hidden = true;
    setError("");
    setStatus("");
    updateCharCount();
    dropzone.focus();
  });

  // Expose for debugging / future API swap
  window.ChatSummary = {
    parseWhatsAppExport,
    summarizeChat,
  };
})();
