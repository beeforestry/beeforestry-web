(function () {
  var IG = "https://instagram.com/beeforestry";
  var PHONE = "787-598-3543";
  var EMAIL = "Beeforestry@gmail.com";
  var LEAD_URL = "https://formsubmit.co/ajax/" + EMAIL;

  function stripAccents(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[áàäâ]/g, "a")
      .replace(/[éèëê]/g, "e")
      .replace(/[íìïî]/g, "i")
      .replace(/[óòöô]/g, "o")
      .replace(/[úùüû]/g, "u")
      .replace(/ñ/g, "n");
  }

  function answer(input) {
    var q = stripAccents(input);
    if (!q.trim()) return "Complete el formulario con su teléfono y, si puede, fotos. Así BeeForestry le llama.";
    if (/rescate|remoci|reubic|enjambre|colonia|abeja|panal|quitar/.test(q))
      return "Rescate/reubicación (sin exterminio). Deje teléfono y fotos abajo; le llamamos pronto.";
    if (/agro|forest|finca|solar|siembra/.test(q))
      return "Agroforestería: deje nombre, teléfono y municipio abajo. Fotos del terreno ayudan.";
    if (/colmena|caja|apiario|tienda|equipo/.test(q))
      return "Colmenas/cajas: deje su teléfono abajo para confirmar disponibilidad.";
    if (/guia|digital|pdf|manual|\b20\b/.test(q))
      return "Guía digital $20: deje nombre, teléfono y correo abajo y coordinamos el envío.";
    if (/escuela|colegio|volunt|colabor|taller/.test(q))
      return "Escuelas/voluntariado: deje teléfono y un breve detalle abajo.";
    if (/instagram|\big\b|\bdm\b/.test(q))
      return "Instagram @beeforestry — " + IG + ". Aun así, deje teléfono aquí para poder llamarle.";
    if (/precio|cuesta|costo|cotiz/.test(q))
      return "Para cotizar necesitamos teléfono y fotos. Complételos abajo y le llamamos.";
    if (/extermin|matar|veneno|fumig/.test(q))
      return "No exterminamos: rescatamos y reubicamos. Deje teléfono y fotos abajo.";
    return "Deje su teléfono y fotos abajo para que BeeForestry le contacte. También: " + PHONE + " · @beeforestry";
  }

  var root = document.createElement("div");
  root.id = "bf-assistant";
  root.innerHTML =
    '<button type="button" class="bf-hex" aria-label="Abrir mensaje de BeeForestry" aria-expanded="false">' +
      '<span class="bf-hex-shape" aria-hidden="true">' +
        '<span class="bf-hex-bee">🐝</span>' +
        '<span class="bf-badge" id="bf-badge">1</span>' +
      '</span>' +
      '<span class="bf-hex-hint">1 mensaje</span>' +
    '</button>' +
    '<div class="bf-panel" id="bf-panel" hidden role="dialog" aria-label="Contacto BeeForestry">' +
      '<header class="bf-head">' +
        '<div><strong>BeeForestry</strong><p>Teléfono y fotos para atenderle</p></div>' +
        '<button type="button" class="bf-close" aria-label="Cerrar">×</button>' +
      '</header>' +
      '<div class="bf-msgs" id="bf-msgs"></div>' +
      '<form class="bf-lead" id="bf-lead">' +
        '<p class="bf-lead-title">Para llamarle lo antes posible</p>' +
        '<input name="nombre" required placeholder="Su nombre *" autocomplete="name" />' +
        '<input name="telefono" required type="tel" placeholder="Teléfono / celular *" autocomplete="tel" />' +
        '<input name="municipio" placeholder="Municipio" />' +
        '<select name="motivo">' +
          '<option value="Rescate / reubicación">Rescate / reubicación</option>' +
          '<option value="Agroforestería">Agroforestería</option>' +
          '<option value="Colmenas / cajas">Colmenas / cajas</option>' +
          '<option value="Guía digital $20">Guía digital $20</option>' +
          '<option value="Escuela / voluntariado">Escuela / voluntariado</option>' +
          '<option value="Otro">Otro</option>' +
        '</select>' +
        '<label class="bf-photos-label">Fotos del caso (recomendadas)' +
          '<input name="attachment" type="file" accept="image/*" multiple />' +
        '</label>' +
        '<textarea name="detalle" rows="2" placeholder="¿Dónde están las abejas u otro detalle?"></textarea>' +
        '<button class="btn" type="submit">Enviar para que me llamen</button>' +
        '<p class="bf-lead-msg" id="bf-lead-msg" hidden></p>' +
        '<p class="bf-fine">También: ' + PHONE + ' · <a href="' + IG + '" target="_blank" rel="noopener">@beeforestry</a></p>' +
      '</form>' +
    '</div>';

  function mount() {
    if (!document.body || document.getElementById("bf-assistant")) return;
    document.body.appendChild(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  var fab = root.querySelector(".bf-hex");
  var panel = root.querySelector("#bf-panel");
  var badge = root.querySelector("#bf-badge");
  var hint = root.querySelector(".bf-hex-hint");
  var msgs = root.querySelector("#bf-msgs");
  var leadForm = root.querySelector("#bf-lead");
  var leadMsg = root.querySelector("#bf-lead-msg");
  var openedOnce = false;

  function addMsg(text, who) {
    var el = document.createElement("div");
    el.className = "bf-msg bf-" + who;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function openPanel() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    root.classList.add("bf-open");
    if (badge) badge.hidden = true;
    if (hint) hint.textContent = "BeeForestry";
    if (!openedOnce) {
      addMsg(
        "Para atenderle rápido necesitamos su teléfono y, si puede, fotos del enjambre o del lugar. Complete el formulario y BeeForestry le llama.",
        "bot"
      );
      openedOnce = true;
    }
    var tel = leadForm.querySelector('[name="telefono"]');
    if (tel) setTimeout(function () { tel.focus(); }, 150);
  }

  function closePanel() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    root.classList.remove("bf-open");
  }

  fab.addEventListener("click", function () {
    if (panel.hidden) openPanel();
    else closePanel();
  });
  root.querySelector(".bf-close").addEventListener("click", closePanel);

  setTimeout(function () {
    try {
      if (!sessionStorage.getItem("bf-assist-opened")) {
        openPanel();
        sessionStorage.setItem("bf-assist-opened", "1");
      }
    } catch (e) {
      openPanel();
    }
  }, 800);

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(leadForm);
    var nombre = String(fd.get("nombre") || "").trim();
    var telefono = String(fd.get("telefono") || "").trim();
    if (!nombre || !telefono) {
      leadMsg.hidden = false;
      leadMsg.textContent = "Nombre y teléfono son obligatorios.";
      return;
    }

    fd.append("_subject", "BeeForestry web — LLAMAR cliente");
    fd.append("_template", "table");
    fd.append("fuente", "burbuja-hexagono");
    fd.append("pagina", location.href);
    fd.append("nota_asistente", answer(String(fd.get("motivo") || "") + " " + String(fd.get("detalle") || "")));

    try {
      localStorage.setItem(
        "beeforestry-web-leads",
        JSON.stringify(
          [{
            nombre: nombre,
            telefono: telefono,
            municipio: fd.get("municipio"),
            motivo: fd.get("motivo"),
            detalle: fd.get("detalle"),
            at: new Date().toISOString()
          }].concat(JSON.parse(localStorage.getItem("beeforestry-web-leads") || "[]")).slice(0, 40)
        )
      );
    } catch (err) {}

    var btn = leadForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Enviando…";
    leadMsg.hidden = false;
    leadMsg.textContent = "Enviando su contacto…";

    fetch(LEAD_URL, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("fail");
        leadMsg.textContent = "Gracias. Ya tenemos su teléfono — BeeForestry le llamará pronto.";
        addMsg("Recibimos su número (" + telefono + "). Si adjuntó fotos, también nos llegan. ¡Gracias!", "bot");
        leadForm.reset();
        if (badge) badge.hidden = true;
      })
      .catch(function () {
        var body =
          "Nombre: " + nombre +
          "\nTeléfono: " + telefono +
          "\nMunicipio: " + (fd.get("municipio") || "") +
          "\nMotivo: " + (fd.get("motivo") || "") +
          "\nDetalle: " + (fd.get("detalle") || "") +
          "\n(Envíe fotos por Instagram @beeforestry si no se adjuntaron)";
        window.location.href =
          "mailto:" + EMAIL +
          "?subject=" + encodeURIComponent("BeeForestry web — LLAMAR cliente") +
          "&body=" + encodeURIComponent(body);
        leadMsg.textContent = "Si no se abrió el correo, llame al " + PHONE + " o Instagram @beeforestry.";
        addMsg("También puede enviarnos fotos por Instagram @beeforestry con su teléfono en el mensaje.", "bot");
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Enviar para que me llamen";
      });
  });
})();
