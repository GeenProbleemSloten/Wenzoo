// Wenzoo — mobiel menu, scroll-interactie en contactformulier

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobiel menu ---------- */
  var navBar = document.getElementById("navBar");
  var navToggle = document.getElementById("navToggle");

  if (navBar && navToggle) {
    var closeMenu = function (returnFocus) {
      navBar.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Menu openen");
      if (returnFocus) navToggle.focus();
    };

    navToggle.addEventListener("click", function () {
      var isOpen = navBar.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.setAttribute("aria-label", isOpen ? "Menu sluiten" : "Menu openen");
      document.body.classList.toggle("menu-open", isOpen);
      if (isOpen) {
        var firstLink = navBar.querySelector(".nav-links a");
        if (firstLink) firstLink.focus();
      }
    });

    navBar.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navBar.classList.contains("is-open")) {
        closeMenu(true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860 && navBar.classList.contains("is-open")) closeMenu(false);
    }, { passive: true });
  }

  /* ---------- Sticky header: subtiele verdichting bij scrollen ---------- */
  if (navBar) {
    var updateHeaderState = function () {
      navBar.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  }

  /* ---------- Scroll-reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    // Gestaffelde reveal: items binnen dezelfde groep glijden na elkaar in beeld
    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      if (!parent) return;
      var group = Array.prototype.filter.call(parent.children, function (c) {
        return c.classList && c.classList.contains("reveal");
      });
      var idx = group.indexOf(el);
      if (idx > 0) {
        el.style.transitionDelay = Math.min(idx * 90, 450) + "ms";
      }
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
      );
      revealEls.forEach(function (el) {
        revealObserver.observe(el);
      });
    }
  }

  /* ---------- Actieve sectie in de navigatie ---------- */
  var navLinks = document.querySelectorAll(".nav-links a[href^='#']");
  if (navLinks.length && "IntersectionObserver" in window) {
    var sections = [];
    navLinks.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var section = document.getElementById(id);
      if (section) sections.push({ link: link, section: section });
    });

    if (sections.length) {
      var sectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var match = sections.find(function (item) {
              return item.section === entry.target;
            });
            if (!match) return;
            if (entry.isIntersecting) {
              navLinks.forEach(function (l) {
                l.classList.remove("is-active");
              });
              match.link.classList.add("is-active");
            }
          });
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      sections.forEach(function (item) {
        sectionObserver.observe(item.section);
      });
    }
  }

  /* ---------- FAQ: animated accordion (progressive enhancement) ---------- */
  var faqList = document.querySelector(".faq-list");
  if (faqList) {
    faqList.classList.add("js-faq");

    faqList.querySelectorAll(".faq-item").forEach(function (details) {
      var summary = details.querySelector("summary");
      var answer = details.querySelector(".faq-answer");
      if (!summary || !answer) return;

      details.open = details.classList.contains("is-open");

      if (summary.getAttribute("aria-expanded") === "true") {
        details.classList.add("is-open");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }

      answer.addEventListener("transitionend", function (event) {
        if (event.propertyName === "max-height" && details.classList.contains("is-open")) {
          answer.style.maxHeight = "none";
        } else if (event.propertyName === "max-height" && !details.classList.contains("is-open")) {
          details.open = false;
        }
      });

      summary.addEventListener("click", function (event) {
        event.preventDefault();
        var isOpen = details.classList.contains("is-open");

        if (isOpen) {
          answer.style.maxHeight = answer.scrollHeight + "px";
          requestAnimationFrame(function () {
            answer.style.maxHeight = "0px";
          });
          details.classList.remove("is-open");
          summary.setAttribute("aria-expanded", "false");
        } else {
          details.open = true;
          details.classList.add("is-open");
          summary.setAttribute("aria-expanded", "true");
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------- Waarom Wenzoo: uitklapbare checklist (progressive enhancement) ---------- */
  var whyList = document.getElementById("whyList");
  if (whyList) {
    whyList.classList.add("js-why");

    whyList.querySelectorAll(".why-item").forEach(function (item) {
      var trigger = item.querySelector(".why-trigger");
      var answer = item.querySelector(".why-answer");
      if (!trigger || !answer) return;

      if (item.classList.contains("is-open")) {
        answer.style.maxHeight = answer.scrollHeight + "px";
      }

      answer.addEventListener("transitionend", function (event) {
        if (event.propertyName === "max-height" && item.classList.contains("is-open")) {
          answer.style.maxHeight = "none";
        }
      });

      trigger.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");

        if (isOpen) {
          answer.style.maxHeight = answer.scrollHeight + "px";
          requestAnimationFrame(function () {
            answer.style.maxHeight = "0px";
          });
          item.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------- Contactformulier ---------- */
  var form = document.getElementById("contactForm");
  if (!form) return;

  var statusBox = document.getElementById("formStatus");
  var submitBtn = form.querySelector('button[type="submit"]');

  /* ---------- Projectplanner meenemen naar contact ---------- */
  try {
    var projectSummary = sessionStorage.getItem("wenzooProjectSummary");
    if (projectSummary) {
      var storedName = sessionStorage.getItem("wenzooProjectName") || "";
      var storedEmail = sessionStorage.getItem("wenzooProjectEmail") || "";
      var storedPhone = sessionStorage.getItem("wenzooProjectPhone") || "";
      if (form.elements.naam && !form.elements.naam.value) form.elements.naam.value = storedName;
      if (form.elements.email && !form.elements.email.value) form.elements.email.value = storedEmail;
      if (form.elements.telefoon && !form.elements.telefoon.value) form.elements.telefoon.value = storedPhone;
      if (form.elements.bericht && !form.elements.bericht.value) form.elements.bericht.value = projectSummary;
      if (statusBox) {
        statusBox.textContent = "Uw projectoverzicht is vanuit de planner ingevuld. Controleer het en verstuur daarna uw aanvraag.";
        statusBox.className = "form-status is-visible success";
      }
    }
  } catch (error) {
    /* De planner blijft bruikbaar wanneer browseropslag is uitgeschakeld. */
  }

  var validators = {
    naam: function (value) {
      return value.trim().length >= 2 ? "" : "Vul uw naam in.";
    },
    email: function (value) {
      var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(value.trim()) ? "" : "Vul een geldig e-mailadres in.";
    },
    telefoon: function () {
      return "";
    },
    bericht: function (value) {
      return value.trim().length >= 10 ? "" : "Vertel iets meer, zodat ik gericht kan reageren.";
    }
  };

  function showFieldError(name, message) {
    var el = form.querySelector('[data-error-for="' + name + '"]');
    if (el) el.textContent = message;
  }

  function validateForm() {
    var valid = true;
    Object.keys(validators).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      var message = validators[name](field.value);
      showFieldError(name, message);
      if (message) valid = false;
    });
    return valid;
  }

  Object.keys(validators).forEach(function (name) {
    var field = form.elements[name];
    if (!field) return;
    field.addEventListener("blur", function () {
      showFieldError(name, validators[name](field.value));
    });
  });

  function setStatus(type, message) {
    statusBox.textContent = message;
    statusBox.className = "form-status is-visible " + type;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateForm()) {
      setStatus("error", "Controleer de gemarkeerde velden en probeer het opnieuw.");
      return;
    }

    var actionUrl = form.getAttribute("action") || "";
    if (!actionUrl) {
      setStatus(
        "error",
        "Online verzenden is nog niet geactiveerd. Koppel vóór publicatie een formulierdienst aan dit formulier."
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Versturen...";

    fetch(actionUrl, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (response.ok) {
          setStatus("success", "Bedankt voor uw bericht. Ik neem binnen één werkdag contact met u op.");
          form.reset();
        } else {
          setStatus("error", "Er ging iets mis bij het versturen. Probeert u het straks nog eens, of mail rechtstreeks.");
        }
      })
      .catch(function () {
        setStatus("error", "Er ging iets mis bij het versturen. Controleer uw internetverbinding en probeer het opnieuw.");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Verstuur uw aanvraag";
      });
  });
})();
