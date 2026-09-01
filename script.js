"use strict";

document.documentElement.classList.add("js");

const body = document.body;
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const navPanel = document.querySelector(".nav-panel");
const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = [...document.querySelectorAll("main section[id]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* =========================
   MENU MOBILE
========================= */
const setMenuState = (isOpen) => {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Chiudi il menu di navigazione" : "Apri il menu di navigazione");
  navPanel.classList.toggle("is-open", isOpen);
  body.classList.toggle("menu-open", isOpen);
};

menuToggle.addEventListener("click", () => {
  setMenuState(menuToggle.getAttribute("aria-expanded") !== "true");
});

navPanel.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuState(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    setMenuState(false);
    menuToggle.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) setMenuState(false);
});

/* =========================
   NAVBAR E SEZIONE ATTIVA
========================= */
const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const activeSectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  });
}, {
  rootMargin: "-38% 0px -52% 0px",
  threshold: 0
});

sections.forEach((section) => activeSectionObserver.observe(section));

/* =========================
   ANIMAZIONI ALLO SCORRIMENTO
========================= */
const revealElements = [...document.querySelectorAll(".reveal, .reveal-item")];

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  document.querySelectorAll(".reveal-stagger").forEach((group) => {
    group.querySelectorAll(".reveal-item").forEach((item, index) => {
      item.style.transitionDelay = `${index * 90}ms`;
    });
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -8% 0px"
  });

  revealElements.forEach((element) => revealObserver.observe(element));
}

/* =========================
   BAGLIORE DEL PUNTATORE
========================= */
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

if (finePointer.matches && !reduceMotion.matches) {
  let pointerFrame;

  window.addEventListener("pointermove", (event) => {
    if (pointerFrame) return;

    pointerFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
      body.classList.add("has-pointer");
      pointerFrame = null;
    });
  }, { passive: true });
}

/* =========================
   MODULO DI CONTATTO
========================= */
const form = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const submitButton = form.querySelector("button[type='submit']");

const validators = {
  name: (field) => field.value.trim().length >= 2 ? "" : "Inserisci il tuo nome.",
  email: (field) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()) ? "" : "Inserisci un indirizzo email valido.",
  message: (field) => field.value.trim().length >= 15 ? "" : "Aggiungi almeno qualche dettaglio sul tuo progetto."
};

const validateField = (field) => {
  const error = validators[field.name](field);
  const fieldWrap = field.closest(".field");
  const errorElement = fieldWrap.querySelector(".field-error");

  fieldWrap.classList.toggle("has-error", Boolean(error));
  field.setAttribute("aria-invalid", String(Boolean(error)));
  errorElement.textContent = error;
  return !error;
};

Object.keys(validators).forEach((name) => {
  const field = form.elements[name];
  field.addEventListener("blur", () => validateField(field));
  field.addEventListener("input", () => {
    if (field.closest(".field").classList.contains("has-error")) validateField(field);
  });
  field.addEventListener("change", () => {
    if (field.closest(".field").classList.contains("has-error")) validateField(field);
  });
});

const defaultButtonMarkup = submitButton.innerHTML;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  formStatus.textContent = "";
  formStatus.dataset.state = "";

  const fields = Object.keys(validators).map(
    (name) => form.elements[name]
  );

  const isValid = fields.map(validateField).every(Boolean);

  if (!isValid) {
    formStatus.textContent = "Controlla i campi evidenziati.";
    formStatus.dataset.state = "error";
    form.querySelector("[aria-invalid='true']")?.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.classList.remove("is-sent");
  submitButton.innerHTML =
    "Invio in corso <span aria-hidden='true'>…</span>";

  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: {
        Accept: "application/json"
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = result.errors
        ?.map((error) => error.message)
        .join(" ");

      throw new Error(errorMessage || "Invio non riuscito.");
    }

    form.reset();

    form.querySelectorAll("[aria-invalid]").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });

    form.querySelectorAll(".field").forEach((field) => {
      field.classList.remove("has-error");
    });

    submitButton.classList.add("is-sent");
    submitButton.innerHTML =
      "Messaggio inviato <span aria-hidden='true'>✓</span>";

    formStatus.textContent =
      "Grazie! Ho ricevuto la tua richiesta e ti risponderò al più presto.";

    formStatus.dataset.state = "success";

    window.setTimeout(() => {
      submitButton.disabled = false;
      submitButton.classList.remove("is-sent");
      submitButton.innerHTML = defaultButtonMarkup;
    }, 4500);
  } catch (error) {
    console.error("Errore durante l’invio:", error);

    submitButton.disabled = false;
    submitButton.classList.remove("is-sent");
    submitButton.innerHTML = defaultButtonMarkup;

    formStatus.textContent =
      "Non è stato possibile inviare il messaggio. Riprova oppure contattami direttamente via email.";

    formStatus.dataset.state = "error";
  }
});

/* =========================
   PIÈ DI PAGINA
========================= */
document.querySelector("#current-year").textContent = new Date().getFullYear();
