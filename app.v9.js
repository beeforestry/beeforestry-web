/* BeeForestry — envío de formularios (cotización y colabora)
 * Envía por FormSubmit (AJAX) a Beeforestry@gmail.com y solo muestra éxito si
 * FormSubmit confirma el envío. Si falla, ofrece WhatsApp con los datos ya escritos.
 */
(function () {
  "use strict";

  var EMAIL = "Beeforestry@gmail.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + EMAIL;
  var WA_NUMBER = "17875983543";
  var PHONE_DISPLAY = "787-598-3543";
  var PHONE_TEL = "tel:+17875983543";
  var TIMEOUT_MS = 15000;

  var FORMS = {
    "quote-form": {
      msg: "form-msg",
      subject: "BeeForestry web — Nueva solicitud de cotización",
      fuente: "formulario-cotizacion",
      waTitle: "Hola BeeForestry, quiero una cotización (enviado desde la web):",
      fields: [
        ["nombre", "Nombre"],
        ["telefono", "Teléfono / WhatsApp"],
        ["municipio", "Municipio"],
        ["ubicacion", "Ubicación"],
        ["servicio", "Servicio"],
        ["detalle", "Descripción"],
        ["fotos_url", "Enlace a fotos"]
      ],
      ok: "¡Solicitud enviada! BeeForestry le llamará pronto.",
      okPhotos: true
    },
    "collab-form": {
      msg: "collab-msg",
      subject: "BeeForestry web — Propuesta de colaboración",
      fuente: "formulario-colabora",
      waTitle: "Hola BeeForestry, quiero colaborar (enviado desde la web):",
      fields: [
        ["nombre", "Nombre / institución"],
        ["tipo", "Tipo"],
        ["municipio", "Municipio"],
        ["contacto", "Correo o teléfono"],
        ["mensaje", "Propuesta o necesidad"]
      ],
      ok: "¡Propuesta enviada! BeeForestry le escribirá pronto. ¡Gracias por sumarse!",
      okPhotos: false
    }
  };

  function waLink(text) {
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
  }

  function collect(form, cfg) {
    var fd = new FormData(form);
    return cfg.fields.map(function (f) {
      return { key: f[0], label: f[1], value: String(fd.get(f[0]) || "").trim() };
    });
  }

  function waText(cfg, entries, extra) {
    var lines = [cfg.waTitle];
    entries.forEach(function (e) {
      if (e.value) lines.push(e.label + ": " + e.value);
    });
    if (extra) lines.push(extra);
    return lines.join("\n");
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  function waButton(label, href) {
    var a = el("a", { class: "btn btn-wa", href: href, target: "_blank", rel: "noopener", "data-wa-link": "" });
    a.textContent = label;
    return a;
  }

  function showMsg(box, kind, text, actions) {
    box.hidden = false;
    box.className = "form-msg form-msg-" + kind;
    box.textContent = "";
    box.appendChild(el("p", {}, text));
    if (actions && actions.length) {
      var row = el("div", { class: "form-msg-actions" });
      actions.forEach(function (a) { row.appendChild(a); });
      box.appendChild(row);
    }
  }

  function validate(form) {
    if (form.checkValidity()) return true;
    form.reportValidity();
    return false;
  }

  function buildPayload(form, cfg, entries) {
    var payload = {
      _subject: cfg.subject,
      _template: "table",
      _captcha: "false",
      _honey: String(new FormData(form).get("_honey") || "")
    };
    entries.forEach(function (e) { payload[e.label] = e.value || "—"; });
    var contact = entries.filter(function (e) { return /@/.test(e.value); })[0];
    if (contact) payload._replyto = contact.value;
    payload["Fuente"] = cfg.fuente;
    payload["Página"] = location.href;
    return payload;
  }

  function send(payload) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          // FormSubmit responde {"success":"true"} cuando el correo sale de verdad.
          var ok = r.ok && (data.success === true || data.success === "true");
          if (!ok) throw new Error((data && data.message) || "HTTP " + r.status);
          return data;
        });
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  Object.keys(FORMS).forEach(function (id) {
    var form = document.getElementById(id);
    if (!form) return;
    var cfg = FORMS[id];
    var box = document.getElementById(cfg.msg);
    var submitBtn = form.querySelector('button[type="submit"]');
    var submitLabel = submitBtn.textContent;

    // Opción directa: "Enviar por WhatsApp"
    var waBtn = form.querySelector("[data-wa-send]");
    if (waBtn) {
      waBtn.addEventListener("click", function () {
        if (!validate(form)) return;
        var entries = collect(form, cfg);
        var extra = cfg.okPhotos ? "(Le envío las fotos del caso por aquí.)" : "";
        var href = waLink(waText(cfg, entries, extra));
        window.open(href, "_blank", "noopener");
        showMsg(box, "info", "Abrimos WhatsApp con su solicitud ya escrita. Solo tiene que tocar Enviar" +
          (cfg.okPhotos ? " y adjuntar las fotos." : "."), [waButton("Abrir WhatsApp otra vez", href)]);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var entries = collect(form, cfg);
      var payload = buildPayload(form, cfg, entries);

      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";
      showMsg(box, "info", "Enviando su solicitud…");

      send(payload)
        .then(function () {
          var nombre = entries[0].value;
          var muni = (entries.filter(function (x) { return x.key === "municipio"; })[0] || {}).value || "";
          var actions = [];
          var text = cfg.ok;
          if (cfg.okPhotos) {
            text += " Para cotizar más rápido, mándenos las fotos del caso por WhatsApp.";
            actions.push(waButton("Enviar fotos por WhatsApp", waLink(
              "Hola BeeForestry, acabo de enviar una solicitud de cotización desde la web. Nombre: " +
              nombre + (muni ? ". Municipio: " + muni : "") + ". Aquí le envío las fotos del caso.")));
          }
          form.reset();
          showMsg(box, "ok", text, actions);
        })
        .catch(function (err) {
          if (window.console) console.warn("[BeeForestry] envío falló:", err && err.message);
          var call = el("a", { class: "btn btn-ghost", href: PHONE_TEL }, "📞 Llamar " + PHONE_DISPLAY);
          showMsg(box, "error",
            "No pudimos enviar su solicitud en este momento. No se preocupe: envíela por WhatsApp con un toque (ya va con sus datos) o llámenos.",
            [waButton("Enviar por WhatsApp", waLink(waText(cfg, entries))), call]);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        });
    });
  });
})();
