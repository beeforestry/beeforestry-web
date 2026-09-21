(function () {
  var IG = "https://instagram.com/beeforestry";
  var PHONE = "787-598-3543";
  var EMAIL = "Beeforestry@gmail.com";
  var LEAD_URL = "https://formsubmit.co/ajax/" + EMAIL;

  function strip(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[áàäâ]/g, "a")
      .replace(/[éèëê]/g, "e")
      .replace(/[íìïî]/g, "i")
      .replace(/[óòöô]/g, "o")
      .replace(/[úùüû]/g, "u")
      .replace(/ñ/g, "n");
  }

  function replyTo(text) {
    var q = strip(text);
    if (/hola|buenas|saludos|hey/.test(q))
      return "¡Hola! Soy el chat de BeeForestry. ¿En qué le ayudo: rescate de abejas, agroforestería, tienda, guía o escuelas?";
    if (/rescate|remoci|reubic|enjambre|colonia|abeja|panal|quitar/.test(q))
      return "Rescatamos y reubicamos (no exterminamos). Si me deja su teléfono y unas fotos, Sebastian le llama pronto.";
    if (/agro|forest|finca|solar|siembra/.test(q))
      return "Hacemos preparación de agroforestales. Déjeme teléfono y municipio y le contactamos.";
    if (/colmena|caja|tienda|equipo/.test(q))
      return "Tenemos colmenas y cajas según temporada. ¿Me deja un teléfono para confirmarle disponibilidad?";
    if (/guia|digital|pdf|manual|\b20\b/.test(q))
      return "La guía digital cuesta $20. Déjeme nombre y teléfono (y correo si quiere) y coordinamos el envío.";
    if (/escuela|colegio|volunt|colabor|taller/.test(q))
      return "¡Qué bueno! Para escuelas y voluntariado déjeme teléfono y un breve detalle.";
    if (/instagram|\big\b|dm/.test(q))
      return "Estamos en Instagram @beeforestry. También puede dejar teléfono aquí para llamada directa.";
    if (/precio|cuesta|costo|cotiz/.test(q))
      return "Para cotizar bien necesitamos fotos y un teléfono de contacto. ¿Me los puede dejar aquí abajo?";
    if (/extermin|matar|veneno|fumig/.test(q))
      return "No exterminamos: rescatamos y reubicamos. ¿Quiere que le llamemos? Deje su teléfono.";
    if (/gracias/.test(q))
      return "Con gusto. Cuando quiera, deje su teléfono abajo y le llamamos.";
    return "Puedo orientarle sobre rescate, agroforestería, tienda, guía ($20) o escuelas. Si deja su teléfono abajo, Sebastian le llama personalmente.";
  }

  var root = document.createElement("div");
  root.id = "bf-chat";
  root.innerHTML =
    '<button type="button" class="bf-bubble" aria-label="Abrir chat de BeeForestry" aria-expanded="false">' +
      '<span class="bf-bubble-icon" aria-hidden="true">💬</span>' +
      '<span class="bf-bubble-dot" id="bf-dot" aria-hidden="true"></span>' +
    '</button>' +
    '<section class="bf-window" id="bf-window" hidden role="dialog" aria-label="Chat BeeForestry">' +
      '<header class="bf-win-head">' +
        '<div class="bf-win-title">' +
          '<span class="bf-avatar" aria-hidden="true">🐝</span>' +
          '<div><strong>BeeForestry</strong><p>Soporte · suele responder pronto</p></div>' +
        '</div>' +
        '<button type="button" class="bf-win-close" aria-label="Cerrar chat">×</button>' +
      '</header>' +
      '<div class="bf-win-body" id="bf-body"></div>' +
      '<div class="bf-chips" id="bf-chips">' +
        '<button type="button" data-q="Necesito rescate de abejas">Rescate</button>' +
        '<button type="button" data-q="Agroforestería">Agro</button>' +
        '<button type="button" data-q="Colmenas o cajas">Tienda</button>' +
        '<button type="button" data-q="Guía digital $20">Guía</button>' +
        '<button type="button" data-q="Escuela o voluntariado">Escuelas</button>' +
      '</div>' +
      '<form class="bf-contact" id="bf-contact">' +
        '<p class="bf-contact-label">Para llamarle (opcional pero útil)</p>' +
        '<div class="bf-contact-row">' +
          '<input name="nombre" placeholder="Nombre" autocomplete="name" />' +
          '<input name="telefono" type="tel" placeholder="Teléfono" autocomplete="tel" required />' +
        '</div>' +
        '<input name="municipio" placeholder="Municipio (opcional)" />' +
        '<label class="bf-file">Fotos (opcional)<input name="attachment" type="file" accept="image/*" multiple /></label>' +
        '<button type="submit" class="bf-send-lead">Enviar contacto</button>' +
        '<p class="bf-contact-msg" id="bf-contact-msg" hidden></p>' +
      '</form>' +
      '<form class="bf-composer" id="bf-composer">' +
        '<input name="msg" type="text" placeholder="Escriba su mensaje…" autocomplete="off" aria-label="Mensaje" />' +
        '<button type="submit" aria-label="Enviar">➤</button>' +
      '</form>' +
    '</section>';

  function mount() {
    if (!document.body || document.getElementById("bf-chat")) return;
    document.body.appendChild(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  var bubble = root.querySelector(".bf-bubble");
  var win = root.querySelector("#bf-window");
  var body = root.querySelector("#bf-body");
  var dot = root.querySelector("#bf-dot");
  var composer = root.querySelector("#bf-composer");
  var contact = root.querySelector("#bf-contact");
  var contactMsg = root.querySelector("#bf-contact-msg");
  var greeted = false;
  var askedContact = false;

  function addBubble(text, who) {
    var el = document.createElement("div");
    el.className = "bf-line bf-" + who;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function openChat() {
    win.hidden = false;
    bubble.setAttribute("aria-expanded", "true");
    root.classList.add("bf-open");
    if (dot) dot.hidden = true;
    if (!greeted) {
      addBubble("¡Hola! Bienvenido a BeeForestry. ¿En qué podemos ayudarle hoy?", "bot");
      greeted = true;
    }
    composer.msg.focus();
  }

  function closeChat() {
    win.hidden = true;
    bubble.setAttribute("aria-expanded", "false");
    root.classList.remove("bf-open");
  }

  bubble.addEventListener("click", function () {
    if (win.hidden) openChat();
    else closeChat();
  });
  root.querySelector(".bf-win-close").addEventListener("click", function (e) {
    e.stopPropagation();
    closeChat();
  });

  function maybeAskContact() {
    if (askedContact) return;
    askedContact = true;
    setTimeout(function () {
      addBubble(
        "Si quiere que Sebastian le llame personalmente, deje su teléfono (y fotos si tiene) en la tarjeta de abajo. Puede cerrar este chat cuando quiera.",
        "bot"
      );
    }, 450);
  }

  function handleUser(text) {
    addBubble(text, "user");
    setTimeout(function () {
      addBubble(replyTo(text), "bot");
      maybeAskContact();
    }, 350);
  }

  root.querySelectorAll("#bf-chips [data-q]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      handleUser(btn.getAttribute("data-q"));
    });
  });

  composer.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = String(composer.msg.value || "").trim();
    if (!t) return;
    composer.msg.value = "";
    handleUser(t);
  });

  contact.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(contact);
    var nombre = String(fd.get("nombre") || "").trim();
    var telefono = String(fd.get("telefono") || "").trim();
    if (!telefono) {
      contactMsg.hidden = false;
      contactMsg.textContent = "El teléfono es necesario para llamarle.";
      return;
    }
    fd.append("_subject", "BeeForestry chat — LLAMAR cliente");
    fd.append("_template", "table");
    fd.append("fuente", "chat-burbuja");
    fd.append("pagina", location.href);
    if (nombre) fd.set("nombre", nombre);

    var btn = contact.querySelector('button[type="submit"]');
    btn.disabled = true;
    contactMsg.hidden = false;
    contactMsg.textContent = "Enviando…";

    fetch(LEAD_URL, { method: "POST", body: fd, headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("fail");
        contactMsg.textContent = "¡Listo! Le llamaremos pronto.";
        addBubble("Recibimos su teléfono (" + telefono + "). Sebastian le contactará lo antes posible. ¡Gracias!", "bot");
        contact.reset();
      })
      .catch(function () {
        var body =
          "Nombre: " + nombre +
          "\nTeléfono: " + telefono +
          "\nMunicipio: " + (fd.get("municipio") || "") +
          "\n(Fotos por Instagram @beeforestry si no se adjuntaron)";
        location.href =
          "mailto:" + EMAIL +
          "?subject=" + encodeURIComponent("BeeForestry chat — LLAMAR cliente") +
          "&body=" + encodeURIComponent(body);
        contactMsg.textContent = "Si no se abrió el correo, escriba a @beeforestry o llame al " + PHONE;
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
})();
