(function () {
  const IG = "https://instagram.com/beeforestry";
  const PHONE = "787-598-3543";
  const EMAIL = "Beeforestry@gmail.com";
  const LEAD_ENDPOINT = "https://formsubmit.co/ajax/" + EMAIL;

  const replies = [
    {
      keys: ["hola", "buenas", "saludos", "hey"],
      text: "¡Hola! Déjeme su nombre y teléfono abajo para que BeeForestry le llame lo antes posible. Mientras, ¿es rescate de abejas, agroforestería, tienda, guía o escuela?",
    },
    {
      keys: ["rescate", "remoci", "reubic", "enjambre", "colonia", "abeja", "panal", "quitar"],
      text: "Rescatamos y reubicamos (no exterminamos). Deje su teléfono abajo y le llamamos. Si puede, diga municipio y dónde están las abejas; fotos por Instagram @beeforestry ayudan.",
    },
    {
      keys: ["agro", "forest", "finca", "solar", "siembra"],
      text: "Preparación de agroforestales: deje nombre y teléfono abajo y le contactamos. Incluya municipio y tamaño aproximado del terreno si puede.",
    },
    {
      keys: ["colmena", "caja", "apiario", "equipo", "tienda"],
      text: "Colmenas y cajas según temporada. Deje su teléfono abajo para confirmarle disponibilidad y precio.",
    },
    {
      keys: ["guía", "guia", "digital", "pdf", "manual", "20", "comprar"],
      text: "La guía digital cuesta $20. Deje nombre, teléfono y correo abajo (o use la sección de la guía) y le coordinamos el pago y el PDF.",
    },
    {
      keys: ["escuela", "colegio", "volunt", "colabor", "taller", "alianza"],
      text: "Colaboraciones y escuelas: deje teléfono abajo y un resumen breve; también está el formulario de colaboraciones en la página.",
    },
    {
      keys: ["precio", "cuesta", "costo", "tarifa", "cotiz"],
      text: "Para cotizarle bien necesitamos su teléfono (y fotos si es rescate). La guía digital está en $20. Deje sus datos abajo y le llamamos.",
    },
    {
      keys: ["instagram", "ig", "dm", "mensaje"],
      text: "Instagram @beeforestry: " + IG + ". Aun así, déjenos teléfono aquí por si el mensaje se pierde — así le podemos llamar.",
    },
    {
      keys: ["teléfono", "telefono", "llamar", "whatsapp", "contacto", "correo", "email"],
      text: "Puede llamarnos al " + PHONE + " o escribir a " + EMAIL + ". Lo más rápido: deje su número en el formulario de esta burbuja y le devolvemos la llamada.",
    },
    {
      keys: ["extermin", "matar", "veneno", "fumig"],
      text: "No exterminamos: rescatamos y reubicamos. Deje su teléfono abajo y le orientamos el rescate seguro.",
    },
  ];

  const fallback =
    "Para no perdernos: deje su nombre y teléfono abajo y BeeForestry le llama. Mientras, puedo orientarle sobre rescate, agroforestería, tienda, guía ($20) o escuelas.";

  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
  }

  function answer(input) {
    const q = normalize(input);
    if (!q.trim()) return "¿En qué le puedo ayudar? Recuerde dejar su teléfono abajo.";
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
          <p>Deje su teléfono — le llamamos</p>
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
      </div>
      <form class="bf-lead" id="bf-lead">
        <p class="bf-lead-title">Para llamarle personalmente</p>
        <input name="nombre" required placeholder="Su nombre" autocomplete="name" />
        <input name="telefono" required type="tel" placeholder="Teléfono (requerido)" autocomplete="tel" />
        <input name="municipio" placeholder="Municipio (opcional)" />
        <select name="motivo">
          <option value="Rescate / reubicación">Rescate / reubicación</option>
          <option value="Agroforestería">Agroforestería</option>
          <option value="Colmenas / cajas">Colmenas / cajas</option>
          <option value="Guía digital $20">Guía digital $20</option>
          <option value="Escuela / voluntariado">Escuela / voluntariado</option>
          <option value="Otro">Otro</option>
        </select>
        <textarea name="detalle" rows="2" placeholder="Detalle breve (opcional)"></textarea>
        <button class="btn" type="submit">Enviar para que me llamen</button>
        <p class="bf-lead-msg" id="bf-lead-msg" hidden></p>
      </form>
      <form class="bf-form">
        <input type="text" name="msg" autocomplete="off" placeholder="O escriba una pregunta…" aria-label="Mensaje" />
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
  const leadForm = root.querySelector("#bf-lead");
  const leadMsg = root.querySelector("#bf-lead-msg");

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
        "¡Hola! Si necesita ayuda, deje su nombre y teléfono abajo. BeeForestry le llama lo antes posible — así no se pierde si cierra la página.",
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

  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(leadForm).entries());
    const telefono = (data.telefono || "").trim();
    const nombre = (data.nombre || "").trim();
    if (!nombre || !telefono) {
      leadMsg.hidden = false;
      leadMsg.textContent = "Nombre y teléfono son necesarios para llamarle.";
      return;
    }

    const payload = {
      _subject: "BeeForestry web — llamar al cliente",
      nombre,
      telefono,
      municipio: data.municipio || "",
      motivo: data.motivo || "",
      detalle: data.detalle || "",
      fuente: "burbuja-website",
      pagina: location.href,
    };

    try {
      localStorage.setItem(
        "beeforestry-web-leads",
        JSON.stringify(
          [{ ...payload, at: new Date().toISOString() }].concat(
            JSON.parse(localStorage.getItem("beeforestry-web-leads") || "[]")
          ).slice(0, 50)
        )
      );
    } catch (_) {}

    const btn = leadForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Enviando…";
    leadMsg.hidden = false;
    leadMsg.textContent = "Enviando su contacto…";

    try {
      const res = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("send failed");
      leadMsg.textContent =
        "Gracias. Ya enviamos su teléfono a BeeForestry para que le llamen pronto.";
      addMsg(
        "Recibimos su contacto (" + telefono + "). El equipo le llamará lo antes posible.",
        "bot"
      );
      leadForm.reset();
    } catch (_) {
      const body =
        "Nombre: " +
        nombre +
        "\nTeléfono: " +
        telefono +
        "\nMunicipio: " +
        (data.municipio || "") +
        "\nMotivo: " +
        (data.motivo || "") +
        "\nDetalle: " +
        (data.detalle || "") +
        "\nPágina: " +
        location.href;
      window.location.href =
        "mailto:" +
        EMAIL +
        "?subject=" +
        encodeURIComponent("BeeForestry web — llamar al cliente") +
        "&body=" +
        encodeURIComponent(body);
      leadMsg.textContent =
        "Si no se abrió el correo, anote el " +
        PHONE +
        " o Instagram @beeforestry. Su número quedó guardado en este navegador.";
      addMsg(
        "Intentamos avisarle al equipo. Si puede, escríbanos también por Instagram @beeforestry con su teléfono.",
        "bot"
      );
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar para que me llamen";
    }
  });
})();
