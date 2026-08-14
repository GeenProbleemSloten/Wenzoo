// Wenzoo — interactieve projectplanner
(function () {
  "use strict";

  var form = document.getElementById("projectPlannerForm");
  if (!form) return;

  var currentStep = 1;
  var totalSteps = 4;
  var panels = Array.prototype.slice.call(form.querySelectorAll(".planner-step-panel"));
  var indicators = Array.prototype.slice.call(document.querySelectorAll("[data-step-indicator]"));
  var backButton = document.getElementById("plannerBack");
  var nextButton = document.getElementById("plannerNext");
  var finishButton = document.getElementById("plannerFinish");
  var progress = document.getElementById("plannerProgress");
  var result = document.getElementById("plannerResult");
  var summaryBox = document.getElementById("plannerSummary");
  var copyStatus = document.getElementById("copyStatus");
  var generatedSummary = "";

  function checkedValues(name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function setError(step, message) {
    var error = form.querySelector('[data-step-error="' + step + '"]');
    if (error) error.textContent = message || "";
  }

  function validateStep(step) {
    setError(step, "");
    if (step === 1 && !form.querySelector('input[name="projecttype"]:checked')) {
      setError(1, "Kies welk type project het beste past.");
      return false;
    }
    if (step === 2 && checkedValues("doelen").length === 0) {
      setError(2, "Kies minimaal één doel voor de website.");
      return false;
    }
    if (step === 4) {
      var name = form.elements.naam.value.trim();
      var email = form.elements.email.value.trim();
      if (name.length < 2) {
        setError(4, "Vul uw naam in.");
        form.elements.naam.focus();
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError(4, "Vul een geldig e-mailadres in.");
        form.elements.email.focus();
        return false;
      }
    }
    return true;
  }

  function updateStep(nextStep, focusHeading) {
    currentStep = Math.max(1, Math.min(totalSteps, nextStep));
    panels.forEach(function (panel) {
      var active = Number(panel.getAttribute("data-step")) === currentStep;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    indicators.forEach(function (item) {
      var step = Number(item.getAttribute("data-step-indicator"));
      item.classList.toggle("is-current", step === currentStep);
      item.classList.toggle("is-complete", step < currentStep);
    });
    backButton.hidden = currentStep === 1;
    nextButton.hidden = currentStep === totalSteps;
    finishButton.hidden = currentStep !== totalSteps;
    progress.style.width = (currentStep / totalSteps * 100) + "%";
    if (focusHeading) {
      var heading = panels[currentStep - 1].querySelector("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
      panels[currentStep - 1].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function value(name) {
    return form.elements[name] ? form.elements[name].value.trim() : "";
  }

  function listOrDefault(values, fallback) {
    return values.length ? values.map(function (item) { return "- " + item; }).join("\n") : "- " + fallback;
  }

  function buildSummary() {
    var projectType = form.querySelector('input[name="projecttype"]:checked').value;
    return [
      "PROJECTOVERZICHT WENZOO",
      "",
      "Contact",
      "Naam: " + value("naam"),
      "E-mail: " + value("email"),
      "Telefoon: " + (value("telefoon") || "Niet ingevuld"),
      "",
      "Project",
      "Type: " + projectType,
      "Omvang: " + value("paginaomvang"),
      "Gewenste start: " + value("planning"),
      "",
      "Doelen",
      listOrDefault(checkedValues("doelen"), "Nog te bespreken"),
      "",
      "Gewenste functies",
      listOrDefault(checkedValues("functies"), "Geen specifieke functies gekozen"),
      "",
      "Over het bedrijf of idee",
      value("projectverhaal") || "Nog te bespreken",
      "",
      "Aanvullende opmerking",
      value("opmerking") || "Geen aanvullende opmerking"
    ].join("\n");
  }

  nextButton.addEventListener("click", function () {
    if (validateStep(currentStep)) updateStep(currentStep + 1, true);
  });

  backButton.addEventListener("click", function () {
    updateStep(currentStep - 1, true);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateStep(4)) return;
    generatedSummary = buildSummary();
    summaryBox.textContent = generatedSummary;
    form.hidden = true;
    result.hidden = false;
    try {
      sessionStorage.setItem("wenzooProjectSummary", generatedSummary);
      sessionStorage.setItem("wenzooProjectName", value("naam"));
      sessionStorage.setItem("wenzooProjectEmail", value("email"));
      sessionStorage.setItem("wenzooProjectPhone", value("telefoon"));
    } catch (error) {
      /* Downloaden en kopiëren blijven werken wanneer browseropslag uitstaat. */
    }
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("copySummary").addEventListener("click", function () {
    if (!navigator.clipboard) {
      copyStatus.textContent = "Selecteer het overzicht hierboven om het handmatig te kopiëren.";
      return;
    }
    navigator.clipboard.writeText(generatedSummary).then(function () {
      copyStatus.textContent = "Het overzicht is gekopieerd.";
    }).catch(function () {
      copyStatus.textContent = "Kopiëren lukte niet. Selecteer het overzicht hierboven handmatig.";
    });
  });

  document.getElementById("downloadSummary").addEventListener("click", function () {
    var blob = new Blob([generatedSummary], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "wenzoo-projectoverzicht.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("continueToContact").addEventListener("click", function () {
    try {
      sessionStorage.setItem("wenzooProjectSummary", generatedSummary);
    } catch (error) {
      /* Het contactformulier blijft bereikbaar zonder browseropslag. */
    }
  });

  document.getElementById("plannerReset").addEventListener("click", function () {
    form.reset();
    generatedSummary = "";
    copyStatus.textContent = "";
    result.hidden = true;
    form.hidden = false;
    try {
      sessionStorage.removeItem("wenzooProjectSummary");
    } catch (error) {
      /* Geen actie nodig wanneer browseropslag niet beschikbaar is. */
    }
    updateStep(1, true);
  });

  updateStep(1, false);
})();
