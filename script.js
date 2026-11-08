(() => {
  const config = window.SITE_CONFIG || {};

  const applyConfig = () => {
    document.querySelectorAll('[data-config="email"]').forEach((el) => {
      el.textContent = config.email || el.textContent;
    });
    document.querySelectorAll('[data-config="email-link"]').forEach((el) => {
      if (config.email) el.setAttribute("href", `mailto:${config.email}`);
    });
    document.querySelectorAll('[data-config="phone"]').forEach((el) => {
      el.textContent = config.phoneDisplay || el.textContent;
    });
    document.querySelectorAll('[data-config="phone-link"]').forEach((el) => {
      if (config.phoneTel) el.setAttribute("href", `tel:${config.phoneTel}`);
    });
    document.querySelectorAll('[data-config="instagram"]').forEach((el) => {
      el.textContent = config.instagramHandle || el.textContent;
    });
    document.querySelectorAll('[data-config="instagram-link"]').forEach((el) => {
      if (config.instagramUrl) el.setAttribute("href", config.instagramUrl);
    });
    document.querySelectorAll('[data-config="address"]').forEach((el) => {
      el.textContent = config.address || el.textContent;
    });
    document.querySelectorAll('[data-config="tagline"]').forEach((el) => {
      el.textContent = config.tagline || el.textContent;
    });

    const yearEls = document.querySelectorAll("[data-year]");
    const year = String(new Date().getFullYear());
    yearEls.forEach((el) => {
      el.textContent = year;
    });

    const wa = document.querySelector("[data-whatsapp-float]");
    if (wa && config.whatsappNumber) {
      const message = encodeURIComponent(config.whatsappMessage || "");
      wa.setAttribute(
        "href",
        `https://wa.me/${config.whatsappNumber}${message ? `?text=${message}` : ""}`
      );
    }
  };

  applyConfig();

  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.getElementById("primary-nav");

  const closeMenu = () => {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });

    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeMenu();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    window.addEventListener(
      "resize",
      () => {
        if (window.matchMedia("(min-width: 1080px)").matches) closeMenu();
      },
      { passive: true }
    );
  }

  const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const pageFile = !currentPage || currentPage === "/" ? "index.html" : currentPage;
  const isHome = pageFile === "index.html";
  const navLinks = [...document.querySelectorAll(".nav-links a:not(.nav-cta)")];
  const hashLinks = navLinks.filter((link) => (link.getAttribute("href") || "").startsWith("#"));
  const sections = hashLinks
    .map((link) => {
      const id = link.getAttribute("href");
      return id && id !== "#top" ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  const setActiveNav = (matcher) => {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const on = matcher(href);
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  if (!isHome) {
    setActiveNav((href) => {
      const file = href.split("#")[0].toLowerCase();
      return file === pageFile;
    });
  }

  const onScroll = () => {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 16);

    if (!isHome || !sections.length) return;

    const marker = window.innerHeight * 0.35;
    let activeId = null;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) {
        activeId = section.id;
        break;
      }
    }

    setActiveNav((href) => {
      if (href === `#${activeId}`) return true;
      return activeId === null && (href === "#top" || href === "index.html") && window.scrollY < 120;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Scroll reveals */
  const reveals = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* FAQ: one open at a time (optional polish) */
  const faqRoot = document.querySelector("[data-faq]");
  if (faqRoot) {
    faqRoot.addEventListener("toggle", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      faqRoot.querySelectorAll("details[open]").forEach((item) => {
        if (item !== target) item.open = false;
      });
    }, true);
  }

  /* Enquiry form — validate, email via FormSubmit, show success/error */
  const form = document.getElementById("enquiry-form");
  const success = document.getElementById("form-success");
  const formStatus = document.getElementById("form-status");
  const resetBtn = document.querySelector("[data-reset-form]");
  const submitBtn = form?.querySelector('button[type="submit"]');
  const submitLabel = submitBtn?.textContent || "Let's Plan My Trip";
  const inbox = config.email || "backpackyourtrip@gmail.com";

  const validators = {
    fullName: (v) => (v.trim().length >= 2 ? "" : "Please enter your full name."),
    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email address.",
    whatsapp: (v) =>
      v.replace(/[^\d+]/g, "").length >= 8 ? "" : "Enter a valid WhatsApp number.",
    departureCity: (v) => (v.trim() ? "" : "Enter your departure city."),
    destination: (v) => (v.trim() ? "" : "Tell us where you'd like to go."),
    travelDates: (v) => (v.trim() ? "" : "Share your tentative travel dates."),
    travellers: (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 ? "" : "Enter number of travellers.";
    },
    budget: (v) => (v.trim() ? "" : "Share an approximate budget."),
    travelType: (v) => (v ? "" : "Select a travel type."),
  };

  const setError = (name, message) => {
    const field = form?.querySelector(`[name="${name}"]`)?.closest(".field");
    const error = form?.querySelector(`[data-error-for="${name}"]`);
    if (!field || !error) return;
    field.classList.toggle("is-invalid", Boolean(message));
    error.textContent = message || "";
  };

  const setFormStatus = (message, tone = "") => {
    if (!formStatus) return;
    formStatus.hidden = !message;
    formStatus.textContent = message || "";
    formStatus.classList.toggle("is-error", tone === "error");
    formStatus.classList.toggle("is-info", tone === "info");
  };

  const setSubmitting = (busy) => {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-busy", busy ? "true" : "false");
    submitBtn.textContent = busy ? "Sending…" : submitLabel;
  };

  const validateForm = () => {
    let valid = true;
    Object.keys(validators).forEach((name) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      const message = validators[name](input.value);
      setError(name, message);
      if (message) valid = false;
    });
    return valid;
  };

  const buildPayload = () => {
    const data = new FormData(form);
    const fullName = String(data.get("fullName") || "").trim();
    const email = String(data.get("email") || "").trim();

    return {
      name: fullName,
      email,
      _replyto: email,
      WhatsApp: String(data.get("whatsapp") || "").trim(),
      "Departure City": String(data.get("departureCity") || "").trim(),
      Destination: String(data.get("destination") || "").trim(),
      "Travel Dates": String(data.get("travelDates") || "").trim(),
      Travellers: String(data.get("travellers") || "").trim(),
      Budget: String(data.get("budget") || "").trim(),
      "Travel Type": String(data.get("travelType") || "").trim(),
      Notes: String(data.get("notes") || "").trim(),
      _subject: `New trip enquiry from ${fullName}`,
      _template: "table",
      _captcha: "false",
      _honey: String(data.get("_honey") || ""),
      _url: window.location.href,
    };
  };

  const showSuccess = () => {
    setFormStatus("");
    form.hidden = true;
    success.hidden = false;
    success.focus?.();
    success.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (form && success) {
    form.addEventListener("input", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.name || !validators[target.name]) return;
      setError(target.name, validators[target.name](target.value));
      setFormStatus("");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm()) {
        const firstInvalid = form.querySelector(".field.is-invalid input, .field.is-invalid select");
        firstInvalid?.focus();
        return;
      }

      // Honeypot filled → treat as success without sending
      if (String(new FormData(form).get("_honey") || "").trim()) {
        showSuccess();
        return;
      }

      setSubmitting(true);
      setFormStatus("");

      try {
        const response = await fetch(
          `https://formsubmit.co/ajax/${encodeURIComponent(inbox)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(buildPayload()),
          }
        );

        const result = await response.json().catch(() => ({}));
        const ok = String(result.success) === "true";
        // First-ever submit asks the inbox to activate; FormSubmit keeps those
        // submissions and delivers them after confirmation.
        const pendingActivation = /activat/i.test(String(result.message || ""));

        if (!ok && !pendingActivation) {
          throw new Error(
            result.message || "We couldn't send your enquiry. Please try again."
          );
        }

        showSuccess();
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "We couldn't send your enquiry. Please try again or email us directly.";
        setFormStatus(message, "error");
        formStatus?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } finally {
        setSubmitting(false);
      }
    });
  }

  if (resetBtn && form && success) {
    resetBtn.addEventListener("click", () => {
      form.reset();
      Object.keys(validators).forEach((name) => setError(name, ""));
      setFormStatus("");
      success.hidden = true;
      form.hidden = false;
      form.querySelector("#fullName")?.focus();
    });
  }
})();
