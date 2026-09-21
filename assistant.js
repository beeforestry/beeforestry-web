(function () {
  const IG = "https://instagram.com/beeforestry";
  const PHONE = "787-598-3543";
  const EMAIL = "Beeforestry@gmail.com";

  const replies = [
    {
      keys: ["hola", "buenas", "saludos", "hey"],
      text: "¡Hola! Soy el asistente de BeeForestry. ¿Le ayudo con rescate de abejas, agroforestería, colmenas/cajas, la guía digital o una colaboración/escuela?",
    },
    {
      keys: ["rescate", "remoci", "reubic", "enjambre", "colonia", "abeja", "panal", "quitar"],
      text: `Rescatamos y reubicamos abejas en Puerto Rico (no exterminamos). Para cotizarle mejor: municipio, dónde están (techo, pared, árbol…) y fotos. Escríbanos por Instagram ${IG} o llame al ${PHONE}. También puede usar el formulario de cotización en esta página.`,
    },
    {
      keys: ["agro", "forest", "finca", "solar", "siembra"],
      text: `Ofrecemos preparación de sistemas agroforestales (diagnóstico, diseño e instalación guiada, con colmenas si aplica). Cuéntenos municipio y tamaño aproximado del terreno en el formulario de cotización, o por Instagram @beeforestry.`,
    },
    {
      keys: ["colmena", "caja", "apiario", "equipo", "tienda"],
      text: "Vendemos colmenas y cajas de abejas según temporada y modelo. Pulse “Me interesa” en la tienda o escríbanos a Instagram @beeforestry / " + PHONE + " para disponibilidad y precio.",
    },
    {
      keys: ["guía", "guia", "digital", "pdf", "manual", "20", "comprar"],
      text: "La Guía BeeForestry (agroforestería + abejas en PR) cuesta $20 en descarga digital. Puede reservarla en la sección de la guía; coordinamos el pago (ATH Móvil, cash o cheque) y le enviamos el PDF.",
    },
    {
      keys: ["escuela", "colegio", "volunt", "colabor", "taller", "alianza"],
      text: "Recibimos propuestas de colaboración, voluntariado y escuelas. Use el formulario de colaboraciones en esta página con fechas y objetivos, o escríbanos por Instagram @beeforestry.",
    },
    {
      keys: ["precio", "cuesta", "costo", "tarifa", "cotiz"],
      text: "El precio del rescate depende de acceso, altura y tipo de colonia; no cotizamos a ciegas. Envíe municipio + fotos por Instagram o el formulario. La guía digital está fija en $20. Colmenas y cajas se cotizan según modelo.",
    },
    {
      keys: ["instagram", "ig", "dm", "mensaje"],
      text: `Nuestro Instagram es @beeforestry: ${IG}. Ahí atendemos cotizaciones de remoción y reubicación, y compartimos rescates en Puerto Rico.`,
    },
    {
      keys: ["teléfono", "telefono", "llamar", "whatsapp", "contacto", "correo", "email"],
      text: `Contacto BeeForestry: ${PHONE} · ${EMAIL} · Instagram @beeforestry (${IG}).`,
    },
    {
      keys: ["extermin", "matar", "veneno", "fumig"],
      text: "BeeForestry no extermina. Rescatamos y reubicamos: protege a su familia y a las abejas. Si tiene un enjambre o colonia, le orientamos el rescate seguro.",
    },
  ];

  const fallback =
    "Puedo orientarle sobre rescate, agroforestería, colmenas/cajas, la guía ($20), escuelas/voluntariado o contacto. Si prefiere hablar con el equipo: Instagram @beeforestry o " +
    PHONE +
    ".";

  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
  }

  function answer(input) {
    const q = normalize(input);
    if (!q.trim()) return "¿En qué le puedo ayudar?";
    for (const row of replies) {
      if (row.keys.some((k) => q.includes(normalize(k)))) return row.text;
    }
    return fallback;
  }

  const root = document.createElement("div");
  root.id = "bf-assistant";
  root.innerHTML = `
    <button type="button" class="bf-fab" aria-label="Abrir asistente BeeForestry" title="Asistente BeeForestry">
      <span class="bf-fab-icon" aria-hidden="true">🐝</span>
      <span class="bf-fab-label">Ayuda</span>
    </button>
    <div class="bf-panel" hidden role="dialog" aria-label="Asistente BeeForestry">
      <header class="bf-head">
        <div>
          <strong>Asistente BeeForestry</strong>
          <p>Respuestas rápidas · usted</p>
        </div>
        <button type="button" class="bf-close" aria-label="Cerrar">×</button>
      </header>
      <div class="bf-msgs" id="bf-msgs"></div>
      <div class="bf-quick">
        <button type="button" data-q="Necesito rescate de abejas">Rescate</button>
        <button type="button" data-q="Agroforestería">Agro</button>
        <button type="button" data-q="Colmenas o cajas">Tienda</button>
        <button type="button" data-q="Guía digital">Guía $20</button>
        <button type="button" data-q="Escuela o voluntariado">Escuelas</button>
        <button type="button" data-q="Instagram">Instagram</button>
      </div>
      <form class="bf-form">
        <input type="text" name="msg" autocomplete="off" placeholder="Escriba su pregunta…" aria-label="Mensaje" />
        <button type="submit" class="btn">Enviar</button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector(".bf-fab");
  const panel = root.querySelector(".bf-panel");
  const closeBtn = root.querySelector(".bf-close");
  const msgs = root.querySelector("#bf-msgs");
  const form = root.querySelector(".bf-form");

  function addMsg(text, who) {
    const el = document.createElement("div");
    el.className = "bf-msg bf-" + who;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function open() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    if (!msgs.dataset.greeted) {
      addMsg(
        "¡Hola! Soy el asistente del website BeeForestry. Pregunte por rescate, agroforestería, tienda, guía ($20) o colaboraciones. Para el equipo: Instagram @beeforestry.",
        "bot"
      );
      msgs.dataset.greeted = "1";
    }
  }

  function close() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
  }

  fab.addEventListener("click", () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener("click", close);

  root.querySelectorAll(".bf-quick [data-q]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-q");
      addMsg(q, "user");
      addMsg(answer(q), "bot");
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.msg;
    const q = input.value.trim();
    if (!q) return;
    addMsg(q, "user");
    addMsg(answer(q), "bot");
    input.value = "";
  });
})();
