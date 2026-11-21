// Lógica de la landing: estados y cupos, filtros por categoría, detalle,
// formulario de pre-registro (solo interés) y catálogo en PDF.

const URL_API = "https://script.google.com/macros/s/AKfycbxxAGCWZv0G1L5NnFexd7EhV5d-GipMzONM6tb2uYL10yF0jKAHtFm7xbdPzqxVAFS7/exec";
const CLAVE_COPIA = "talleres-copia-v2";
const EDAD_TUTOR = 17; // 17 años o menos: se piden datos del tutor
const HOY = new Date();

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const aFecha = (s) => new Date(s + "T12:00:00");
const fechaLarga = (s) => { if (!s) return "Por definir"; const d = aFecha(s); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const fechaCorta = (s) => { if (!s) return "por definir"; const d = aFecha(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}.`; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const leer = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };

const ICONO_CAT = {
  "Niños y Jóvenes": "", "Belleza y Cuidado Personal": "", "Cocina y Repostería": "",
  "Tecnología e Innovación": "", "Oficios y Capacitación CECATI": "",
  "Manualidades y Emprendimiento": "", "Deportes y Bienestar Adultos": ""
};

// Estado de cada taller según sus fechas y cupos (vienen de la pestaña del taller).
function calcular(t) {
  const disponibles = Math.max((t.cupo || 0) - (t.ocupados || 0), 0);
  let estado = "Disponible";
  if (!t.inicio) estado = "Por definir";
  else if (t.fin && aFecha(t.fin) < HOY) estado = "Terminado";
  else if (aFecha(t.inicio) <= HOY) estado = "En curso";
  else if (disponibles === 0) estado = "Cupo lleno";
  else if (disponibles <= 3) estado = "Últimos lugares";
  return { ...t, id: t.pestana, disponibles, estado, conLugares: estado === "Disponible" || estado === "Últimos lugares" };
}

const ESTILO_ESTADO = {
  "Disponible": "bg-emerald-100 text-emerald-800",
  "Últimos lugares": "bg-amber-100 text-amber-800",
  "Cupo lleno": "bg-rose-100 text-rose-800",
  "En curso": "bg-sky-100 text-sky-800",
  "Terminado": "bg-slate-200 text-slate-700",
  "Por definir": "bg-slate-100 text-slate-600"
};
const COLOR_BARRA = { "Disponible": "bg-emerald-500", "Últimos lugares": "bg-amber-500", "Cupo lleno": "bg-rose-500", "En curso": "bg-sky-500", "Terminado": "bg-slate-400", "Por definir": "bg-slate-300" };

let datos = null;
let filtro = "Todos";
let busqueda = "";

async function cargar() {
  try {
    const r = await fetch(URL_API);
    const j = await r.json();
    if (!j.talleres) throw new Error("respuesta sin talleres");
    datos = j;
    guardar(CLAVE_COPIA, JSON.stringify(datos));
  } catch (e) {
    // Sin señal: usar la última copia guardada, o los datos de ejemplo.
    let copia = null;
    try { copia = JSON.parse(leer(CLAVE_COPIA)); } catch (_) {}
    datos = copia || structuredClone(DATOS_EJEMPLO);
    datos.sinConexion = true;
  }
  const orden = { "Disponible": 0, "Últimos lugares": 1, "Cupo lleno": 2, "En curso": 3, "Por definir": 4, "Terminado": 5 };
  datos.talleres = datos.talleres.map(calcular)
    .sort((a, b) => (orden[a.estado] - orden[b.estado]) || (a.inicio || "9").localeCompare(b.inicio || "9") || a.nombre.localeCompare(b.nombre));
  pintarTodo();
}

function linkWhatsApp(texto) {
  texto = texto || `¡Hola! Tengo dudas sobre los talleres del ${datos.config.centro}.`;
  return `https://wa.me/${datos.config.whatsapp}?text=${encodeURIComponent(texto)}`;
}

function pintarTodo() {
  const conLugares = datos.talleres.filter(t => t.conLugares);
  document.getElementById("num-talleres").textContent = `${datos.talleres.length} talleres · ${conLugares.length} con lugares`;
  document.getElementById("actualizado").textContent =
    (datos.sinConexion ? "Sin conexión · copia del " : "Actualizado ") +
    new Date(datos.actualizado).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  document.querySelectorAll("[data-wa-general]").forEach(a => a.href = linkWhatsApp());
  document.getElementById("maps").href = datos.config.maps;
  document.getElementById("direccion").textContent = datos.config.direccion;
  document.getElementById("telefono").textContent = "Teléfono: " + datos.config.telefono;
  ["facebook","instagram","youtube"].forEach(r => document.getElementById(r).href = datos.config[r]);
  document.querySelectorAll("[data-aviso]").forEach(e => e.textContent = datos.config.aviso || "");
  document.getElementById("pdf-categoria").innerHTML = `<option value="">Todas las categorías</option>` +
    datos.categorias.map(c => `<option>${esc(c)}</option>`).join("");
  const destacado = conLugares[0] || datos.talleres[0];
  if (destacado) { pintarResumen(destacado); mostrarDetalle(destacado.id); }
  pintarFiltros();
  pintarTarjetas();
}

function pintarResumen(t) {
  document.getElementById("resumen").innerHTML = `
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold tracking-widest text-slate-500">PRÓXIMO TALLER CON LUGARES</p>
      <span class="text-xs text-emerald-700">● Actualizado</span>
    </div>
    <p class="mt-3 text-xl font-bold">${esc(t.nombre)}</p>
    <p class="text-sm text-slate-500">${esc(t.categoria)} · Inicia ${fechaCorta(t.inicio)}</p>
    <p class="text-sm text-slate-500">${esc(t.dias)} · ${esc(t.horario)}</p>
    <div class="mt-4 grid grid-cols-3 gap-3 text-center">
      <div class="rounded-xl bg-slate-100 p-3"><p class="text-2xl font-bold">${t.cupo}</p><p class="text-xs text-slate-500">Cupo total</p></div>
      <div class="rounded-xl bg-slate-100 p-3"><p class="text-2xl font-bold">${t.ocupados}</p><p class="text-xs text-slate-500">Inscritos</p></div>
      <div class="rounded-xl bg-emerald-50 p-3"><p class="text-2xl font-bold text-emerald-700">${t.disponibles}</p><p class="text-xs text-slate-500">Disponibles</p></div>
    </div>
    <button onclick="abrirFormulario('${esc(t.id)}')" class="mt-4 w-full rounded-xl bg-indigo-700 py-2.5 font-semibold text-white hover:bg-indigo-800">Pre-registrarme</button>`;
}

function filtros() {
  const f = { "Todos": () => true, "Con lugares": t => t.conLugares };
  datos.categorias.forEach(c => f[c] = t => t.categoria === c);
  return f;
}

function pintarFiltros() {
  document.getElementById("filtros").innerHTML = Object.keys(filtros()).map(f => `
    <button onclick="cambiarFiltro(this.dataset.f)" data-f="${esc(f)}"
      class="rounded-full px-4 py-1.5 text-sm font-medium transition ${f === filtro ? "bg-indigo-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}">${ICONO_CAT[f] ? ICONO_CAT[f] + " " : ""}${esc(f)}</button>`).join("");
}

function cambiarFiltro(f) { filtro = f; pintarFiltros(); pintarTarjetas(); }
function buscar(v) { busqueda = v.trim().toLowerCase(); pintarTarjetas(); }
const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function pintarTarjetas() {
  const q = sinAcentos(busqueda);
  const lista = datos.talleres.filter(filtros()[filtro]).filter(t => !q || sinAcentos(t.nombre + " " + t.categoria).includes(q));
  document.getElementById("tarjetas").innerHTML = lista.length ? lista.map(t => {
    const pct = t.cupo ? Math.min(100, Math.round(t.ocupados / t.cupo * 100)) : 0;
    const nota = t.conLugares ? `Inicia el ${fechaCorta(t.inicio)}`
      : t.estado === "Por definir" ? "Fechas por definir"
      : "Puedes pre-registrarte como interesado para el siguiente ciclo";
    return `
    <article class="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">${ICONO_CAT[t.categoria] || ""} ${esc(t.categoria)}</p>
        <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO_ESTADO[t.estado]}">${t.estado}</span>
      </div>
      <h3 class="mt-2 text-lg font-bold">${esc(t.nombre)}</h3>
      <p class="text-sm text-slate-600">${fechaCorta(t.inicio)} al ${fechaCorta(t.fin)}</p>
      <p class="text-sm text-slate-600">${esc(t.dias)}${t.horario ? " · " + esc(t.horario) : ""}</p>
      <div class="mt-4 h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full ${COLOR_BARRA[t.estado]}" style="width:${pct}%"></div></div>
      <p class="mt-2 text-sm"><b>${t.disponibles}/${t.cupo}</b> lugares disponibles</p>
      <p class="mt-1 text-xs text-slate-500">${nota}</p>
      <div class="mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
        <button onclick="verDetalle(this.dataset.id)" data-id="${esc(t.id)}" class="font-semibold text-indigo-700 hover:underline">Ver detalle</button>
        <button onclick="abrirFormulario(this.dataset.id)" data-id="${esc(t.id)}" class="rounded-lg bg-indigo-700 px-3 py-1.5 font-semibold text-white hover:bg-indigo-800">Pre-registro</button>
      </div>
    </article>`;
  }).join("") : `<p class="text-slate-500">No hay talleres con este filtro.</p>`;
}

function verDetalle(id) {
  document.getElementById("detalle-modal-cuerpo").innerHTML = htmlDetalle(buscarTaller(id));
  document.getElementById("modal-detalle").showModal();
}
function cerrarDetalle() { document.getElementById("modal-detalle").close(); }
function mostrarDetalle(id) { document.getElementById("detalle").innerHTML = htmlDetalle(buscarTaller(id)); }
const buscarTaller = (id) => datos.talleres.find(x => x.id === id);

function textoEdad(t) {
  if (t.edadMin && t.edadMax) return `De ${t.edadMin} a ${t.edadMax} años`;
  if (t.edadMin) return `A partir de ${t.edadMin} años`;
  return "Todas las edades";
}

function htmlDetalle(t) {
  const pct = t.cupo ? Math.min(100, Math.round(t.ocupados / t.cupo * 100)) : 0;
  const aviso = t.conLugares ? "" : `
    <p class="mt-6 rounded-xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
      ${t.estado === "Cupo lleno" ? "Este grupo ya no tiene lugares." : t.estado === "Por definir" ? "Las fechas de este taller todavía no se publican." : "Este grupo ya comenzó."}
      Puedes dejar tu pre-registro como interesado y te tomaremos en cuenta para el siguiente ciclo.
    </p>`;
  return `
    <div class="flex flex-wrap items-start justify-between gap-2 pr-8">
      <div><h3 class="text-2xl font-bold">${esc(t.nombre)}</h3><p class="font-medium text-indigo-700">${ICONO_CAT[t.categoria] || ""} ${esc(t.categoria)}</p><p class="text-sm text-slate-500">${esc(textoEdad(t))}</p></div>
      <span class="rounded-full px-3 py-1 text-sm font-medium ${ESTILO_ESTADO[t.estado]}">● ${t.estado}</span>
    </div>
    <p class="mt-4 text-slate-700">${esc(t.descripcion)}</p>
    <dl class="mt-6 grid gap-5 sm:grid-cols-2">
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">FECHA DE INICIO</dt><dd class="mt-1 font-semibold">${fechaLarga(t.inicio)}</dd></div>
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">FECHA DE TÉRMINO</dt><dd class="mt-1 font-semibold">${fechaLarga(t.fin)}</dd></div>
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">DÍAS Y HORARIO</dt><dd class="mt-1 font-semibold">${esc(t.dias) || "Por definir"}${t.horario ? " · " + esc(t.horario) : ""}</dd></div>
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">LUGARES DISPONIBLES</dt><dd class="mt-1 font-semibold">${t.disponibles} de ${t.cupo}</dd></div>
    </dl>
    <div class="mt-6 h-2.5 rounded-full bg-slate-100"><div class="h-2.5 rounded-full ${COLOR_BARRA[t.estado]}" style="width:${pct}%"></div></div>
    <div class="mt-2 flex justify-between text-sm text-slate-600"><span>${t.ocupados} inscritos</span><span>${pct}% del cupo</span></div>
    ${aviso}
    <div class="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p class="text-sm font-semibold">Documentos para terminar la inscripción en el centro</p>
      <ul class="mt-2 list-inside list-disc text-sm text-slate-600">${(t.requisitos || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    </div>
    <button onclick="abrirFormulario(this.dataset.id)" data-id="${esc(t.id)}" class="mt-6 w-full rounded-xl bg-indigo-700 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-800">Pre-registro</button>`;
}

// ---------- Formulario de pre-registro ----------

let tallerForm = null;

function abrirFormulario(id) {
  const det = document.getElementById("modal-detalle");
  if (det.open) det.close();
  tallerForm = buscarTaller(id);
  const t = tallerForm;
  const f = document.getElementById("form-preregistro");
  f.reset();
  document.getElementById("form-taller").textContent = t.nombre;
  document.getElementById("form-edad-texto").textContent = textoEdad(t);
  f.auxiliar.innerHTML = `<option value="">Elige tu nombre…</option>` + datos.auxiliares.map(a => `<option>${esc(a)}</option>`).join("");
  ajustarPorEdad();
  ajustarCondicion();
  document.getElementById("form-error").classList.add("hidden");
  document.getElementById("paso-form").classList.remove("hidden");
  document.getElementById("paso-listo").classList.add("hidden");
  document.getElementById("modal").showModal();
}

function cerrarFormulario() { document.getElementById("modal").close(); }

// 17 años o menos: aparece el nombre del tutor.
function ajustarPorEdad() {
  const f = document.getElementById("form-preregistro");
  const edad = parseInt(f.edad.value, 10);
  const menor = edad > 0 && edad <= EDAD_TUTOR;
  document.getElementById("campo-tutor").classList.toggle("hidden", !menor);
  f.tutor.required = menor;
  document.getElementById("lbl-participante").textContent = menor ? "Nombre completo del niño, niña o joven" : "Nombre completo";
  document.getElementById("lbl-telefono").textContent = menor ? "Teléfono del tutor (10 dígitos)" : "Teléfono (10 dígitos)";
}

function ajustarCondicion() {
  const f = document.getElementById("form-preregistro");
  const si = f.condicion.checked;
  document.getElementById("campo-condicion").classList.toggle("hidden", !si);
  f.condicionCual.required = si;
}

function errorForm(msg) {
  const e = document.getElementById("form-error");
  e.textContent = msg; e.classList.remove("hidden");
}

async function enviarPreregistro(ev) {
  ev.preventDefault();
  const f = ev.target;
  const t = tallerForm;
  const tel = f.telefono.value.replace(/\D/g, "");
  const edad = parseInt(f.edad.value, 10);
  if (!(edad > 0)) return errorForm("Escribe la edad.");
  if (t.edadMin && edad < t.edadMin) return errorForm(`Este taller es a partir de ${t.edadMin} años.`);
  if (t.edadMax && edad > t.edadMax) return errorForm(`Este taller es hasta los ${t.edadMax} años.`);
  if (tel.length !== 10) return errorForm("Escribe un teléfono de 10 dígitos.");
  if (!navigator.onLine) return errorForm("Se necesita internet para enviar el pre-registro. Intenta de nuevo cuando haya señal.");

  const registro = {
    pestana: t.pestana,
    participante: f.participante.value.trim(),
    tutor: edad <= EDAD_TUTOR ? f.tutor.value.trim() : "",
    edad: edad,
    comunidad: f.comunidad.value.trim(),
    telefono: tel,
    condicion: f.condicion.checked,
    condicionCual: f.condicion.checked ? f.condicionCual.value.trim() : "",
    auxiliar: f.auxiliar.value
  };

  const boton = document.getElementById("btn-enviar");
  boton.disabled = true; boton.textContent = "Enviando…";
  try {
    // text/plain evita el bloqueo de CORS con Apps Script; doPost lee e.postData.contents.
    const r = await fetch(URL_API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(registro) });
    const resp = await r.json();
    if (!resp.ok) throw new Error(resp.mensaje || "No se pudo guardar");
    mostrarListo(registro, resp);
  } catch (e) {
    errorForm(e.message && !/fetch|json/i.test(e.message) ? e.message : "No pudimos guardar el pre-registro. Intenta otra vez.");
  } finally {
    boton.disabled = false; boton.textContent = "Enviar pre-registro";
  }
}

function mostrarListo(r, resp) {
  const t = tallerForm;
  const requisitos = resp.requisitos || t.requisitos;
  document.getElementById("listo-titulo").textContent = resp.repetido ? "Este pre-registro ya existía" : "¡Pre-registro enviado!";
  document.getElementById("listo-texto").innerHTML =
    `<b>${esc(r.participante)}</b> quedó como interesado en <b>${esc(t.nombre)}</b>.` +
    (r.condicion ? ` Como indicó una condición especial, el centro lo canalizará a valoración con psicopedagogía antes de la inscripción.` : "");
  document.getElementById("listo-folio").textContent = resp.folio;
  document.getElementById("listo-docs").innerHTML = requisitos.map(x => `<li>${esc(x)}</li>`).join("");
  document.getElementById("paso-form").classList.add("hidden");
  document.getElementById("paso-listo").classList.remove("hidden");
}

function otroPreregistro() { abrirFormulario(tallerForm.id); }

// ---------- Catálogo en PDF (se arma con los datos actuales y se usa "Guardar como PDF") ----------

function descargarPDF() {
  const cat = document.getElementById("pdf-categoria").value;
  const c = datos.config;
  const lista = datos.talleres.filter(t => t.estado !== "Terminado" && (!cat || t.categoria === cat));
  const fecha = new Date(datos.actualizado).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const secciones = datos.categorias.filter(k => lista.some(t => t.categoria === k)).map(k => `
    <section class="pdf-seccion">
      <h2>${ICONO_CAT[k] || ""} ${esc(k)}</h2>
      ${lista.filter(t => t.categoria === k).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => `
        <div class="pdf-ficha">
          <div class="pdf-fila"><h3>${esc(t.nombre)}</h3><span>${t.estado === "Cupo lleno" ? "Cupo lleno" : `${t.disponibles} de ${t.cupo} lugares`}</span></div>
          <p>${esc(t.descripcion)}</p>
          <p><b>Fechas:</b> ${fechaLarga(t.inicio)} al ${fechaLarga(t.fin)} · <b>Días y horario:</b> ${esc(t.dias) || "Por definir"}${t.horario ? ", " + esc(t.horario) : ""}</p>
          <p><b>Edad:</b> ${esc(textoEdad(t))} · <b>Lleva:</b> ${esc((t.requisitos || []).join(", "))}</p>
        </div>`).join("")}
    </section>`).join("");
  document.getElementById("imprimible").innerHTML = `
    <div class="pdf-portada">
      <h1>Talleres disponibles</h1>
      <p class="pdf-centro">${esc(c.centro)}</p>
      <p>${cat ? esc(cat) + " · " : ""}Actualizado al ${fecha}${datos.sinConexion ? " (sin conexión: últimos datos guardados)" : ""}</p>
      <p>${esc(c.direccion)} · WhatsApp ${esc(c.telefono)}</p>
    </div>
    ${secciones || "<p>No hay talleres en esta categoría.</p>"}
    <p class="pdf-aviso"><b>AVISO IMPORTANTE:</b> ${esc(c.aviso)}</p>`;
  window.print();
}

// ---------- Conexión y PWA ----------

function avisoConexion() { document.getElementById("sin-senal").classList.toggle("hidden", navigator.onLine); }
window.addEventListener("online", avisoConexion);
window.addEventListener("offline", avisoConexion);

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}

document.getElementById("form-preregistro").addEventListener("submit", enviarPreregistro);
avisoConexion();
cargar();
