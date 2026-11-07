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

  /* Enquiry form — frontend validation + local success state */
  const form = document.getElementById("enquiry-form");
  const success = document.getElementById("form-success");
  const resetBtn = document.querySelector("[data-reset-form]");

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

  if (form && success) {
    form.addEventListener("input", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.name || !validators[target.name]) return;
      setError(target.name, validators[target.name](target.value));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateForm()) {
        const firstInvalid = form.querySelector(".field.is-invalid input, .field.is-invalid select");
        firstInvalid?.focus();
        return;
      }

      // No network request — ready for Formspree / backend later.
      form.hidden = true;
      success.hidden = false;
      success.focus?.();
      success.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  if (resetBtn && form && success) {
    resetBtn.addEventListener("click", () => {
      form.reset();
      Object.keys(validators).forEach((name) => setError(name, ""));
      success.hidden = true;
      form.hidden = false;
      form.querySelector("#fullName")?.focus();
    });
  }
})();
