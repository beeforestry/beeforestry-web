const KEY = "beeforestry-leads-v2";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

function pushLead(row) {
  const rows = load();
  rows.unshift({ ...row, at: new Date().toISOString() });
  save(rows);
  console.log("[BeeForestry lead]", row);
}

function show(el, text) {
  el.hidden = false;
  el.textContent = text;
}

document.querySelectorAll("[data-interest]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const product = btn.getAttribute("data-interest");
    pushLead({ type: "interes-tienda", product });
    show(
      document.querySelector("#shop-msg"),
      `Gracias. Anotamos su interés en: ${product}. Escríbanos al 787-598-3543 o use el formulario de cotización.`
    );
  });
});

document.querySelector("#digital-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  pushLead({ type: "compra-guia-digital", product: "Guía BeeForestry $20", ...data });
  e.target.reset();
  show(
    document.querySelector("#digital-msg"),
    "Pedido registrado. Le contactamos para coordinar el pago (ATH Móvil, cash o cheque) y enviarle el PDF."
  );
});

document.querySelector("#collab-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  pushLead({ type: "colaboracion", ...data });
  e.target.reset();
  show(
    document.querySelector("#collab-msg"),
    "Propuesta recibida. BeeForestry le escribirá pronto. ¡Gracias por sumarse!"
  );
});

document.querySelector("#quote-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  pushLead({ type: "cotizacion-servicio", ...data });
  e.target.reset();
  show(
    document.querySelector("#form-msg"),
    "Solicitud enviada. Para cotizarle mejor, si es rescate de abejas, también puede escribirnos por Instagram @beeforestry con fotos."
  );
});
