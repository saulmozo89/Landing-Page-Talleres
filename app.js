// Lógica de la landing: calcula cupos y estados, pinta tarjetas, filtros,
// detalle y el formulario de pre-registro / lista de espera.

// Cuando exista el backend, poner aquí la URL de Apps Script y listo.
const URL_API = "https://script.google.com/macros/s/AKfycbxxAGCWZv0G1L5NnFexd7EhV5d-GipMzONM6tb2uYL10yF0jKAHtFm7xbdPzqxVAFS7/exec";
const CLAVE_COPIA = "talleres-copia";
// Sin backend se usa una fecha fija para que los datos de ejemplo se vean bien.
const HOY = URL_API ? new Date() : new Date("2026-10-30T12:00:00");

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const aFecha = (s) => new Date(s + "T12:00:00");
const fechaLarga = (s) => { const d = aFecha(s); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const fechaCorta = (s) => { const d = aFecha(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}.`; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Estado de cada apertura. Esto mismo lo hará Apps Script en la versión real.
// Regla del centro: no se entra a un taller ya comenzado; va a lista de espera.
function calcular(a) {
  const taller = datos.talleres.find(t => t.id === a.taller);
  const disponibles = Math.max(a.cupo - a.ocupados, 0);
  const comenzado = aFecha(a.inicio) <= HOY;
  let estado = "Disponible";
  if (comenzado) estado = "En curso";
  else if (disponibles === 0) estado = "Cupo lleno";
  else if (disponibles <= 3) estado = "Últimos lugares";
  const diasParaIniciar = (aFecha(a.inicio) - HOY) / 86400000;
  return {
    ...a, taller: taller, nombre: `${taller.nombre} · ${a.periodo}`,
    disponibles, estado,
    abierto: !comenzado && disponibles > 0,
    proximo: !comenzado && disponibles > 0 && diasParaIniciar <= 14
  };
}

// La siguiente apertura del mismo taller (para la lista de espera).
function siguienteApertura(a) {
  return datos.aperturas
    .filter(x => x.taller.id === a.taller.id && aFecha(x.inicio) > aFecha(a.inicio))
    .sort((x, y) => aFecha(x.inicio) - aFecha(y.inicio))[0] || null;
}

const ESTILO_ESTADO = {
  "Disponible": "bg-emerald-100 text-emerald-800",
  "Últimos lugares": "bg-amber-100 text-amber-800",
  "Cupo lleno": "bg-rose-100 text-rose-800",
  "En curso": "bg-sky-100 text-sky-800"
};
const COLOR_BARRA = { "Disponible": "bg-emerald-500", "Últimos lugares": "bg-amber-500", "Cupo lleno": "bg-rose-500", "En curso": "bg-sky-500" };

let datos = null;
let filtro = "Todos";

async function cargar() {
  try {
    if (!URL_API) throw new Error("sin backend todavía");
    const r = await fetch(URL_API);
    datos = await r.json();
    localStorage.setItem(CLAVE_COPIA, JSON.stringify(datos));
  } catch (e) {
    // Sin backend o sin señal: usar la última copia guardada, o los datos de ejemplo.
    let copia = null;
    try { copia = JSON.parse(localStorage.getItem(CLAVE_COPIA)); } catch (_) {}
    datos = copia || structuredClone(DATOS_EJEMPLO);
  }
  // Primero las que aceptan pre-registro; los grupos en curso o llenos van al final.
  datos.aperturas = datos.aperturas.map(calcular)
    .sort((a, b) => (b.abierto - a.abierto) || (aFecha(a.inicio) - aFecha(b.inicio)));
  pintarTodo();
}

function linkWhatsApp(texto) {
  texto = texto || `¡Hola! Tengo dudas sobre los talleres del ${datos.config.centro}.`;
  return `https://wa.me/${datos.config.whatsapp}?text=${encodeURIComponent(texto)}`;
}

function pintarTodo() {
  const abiertas = datos.aperturas.filter(a => a.abierto);
  document.getElementById("num-talleres").textContent = `${datos.talleres.length} talleres · ${abiertas.length} con lugares`;
  document.getElementById("actualizado").textContent =
    "Actualizado " + new Date(datos.actualizado).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  document.querySelectorAll("[data-wa-general]").forEach(a => a.href = linkWhatsApp());
  document.getElementById("maps").href = datos.config.maps;
  document.getElementById("direccion").textContent = datos.config.direccion;
  document.getElementById("telefono").textContent = "Teléfono: " + datos.config.telefono;
  document.querySelectorAll("[data-dias-apartado]").forEach(e => e.textContent = datos.config.diasApartado);
  ["facebook","instagram","youtube"].forEach(r => document.getElementById(r).href = datos.config[r]);
  const destacada = abiertas[0] || datos.aperturas[0];
  pintarResumen(destacada);
  pintarFiltros();
  pintarTarjetas();
  pintarDocumentos();
  mostrarDetalle(destacada.id);
}

function pintarResumen(a) {
  document.getElementById("resumen").innerHTML = `
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold tracking-widest text-slate-500">PRÓXIMO TALLER CON LUGARES</p>
      <span class="text-xs text-emerald-700">● Actualizado</span>
    </div>
    <p class="mt-3 text-xl font-bold">${esc(a.taller.nombre)}</p>
    <p class="text-sm text-slate-500">${esc(a.periodo)} · Inicia ${fechaCorta(a.inicio)}</p>
    <div class="mt-4 grid grid-cols-3 gap-3 text-center">
      <div class="rounded-xl bg-slate-100 p-3"><p class="text-2xl font-bold">${a.cupo}</p><p class="text-xs text-slate-500">Cupo total</p></div>
      <div class="rounded-xl bg-slate-100 p-3"><p class="text-2xl font-bold">${a.ocupados}</p><p class="text-xs text-slate-500">Ocupados</p></div>
      <div class="rounded-xl bg-emerald-50 p-3"><p class="text-2xl font-bold text-emerald-700">${a.disponibles}</p><p class="text-xs text-slate-500">Disponibles</p></div>
    </div>
    <button onclick="abrirFormulario('${a.id}')" class="mt-4 w-full rounded-xl bg-indigo-700 py-2.5 font-semibold text-white hover:bg-indigo-800">Pre-registrarme</button>`;
}

const FILTROS = {
  "Todos": () => true,
  "Adultos": a => a.taller.grupo === "Adultos",
  "Niños": a => a.taller.grupo === "Niños",
  "Con lugares": a => a.abierto,
  "Próximos a iniciar": a => a.proximo
};

function pintarFiltros() {
  document.getElementById("filtros").innerHTML = Object.keys(FILTROS).map(f => `
    <button onclick="cambiarFiltro('${f}')"
      class="rounded-full px-4 py-1.5 text-sm font-medium transition ${f === filtro ? "bg-indigo-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}">${f}</button>`).join("");
}

function cambiarFiltro(f) { filtro = f; pintarFiltros(); pintarTarjetas(); }

function botonAccion(a, clases) {
  return a.abierto
    ? `<button onclick="abrirFormulario('${a.id}')" class="${clases} bg-indigo-700 text-white hover:bg-indigo-800">Pre-registro</button>`
    : `<button onclick="abrirFormulario('${a.id}')" class="${clases} bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">Lista de espera</button>`;
}

function pintarTarjetas() {
  const lista = datos.aperturas.filter(FILTROS[filtro]);
  document.getElementById("tarjetas").innerHTML = lista.length ? lista.map(a => {
    const pct = Math.round(a.ocupados / a.cupo * 100);
    const nota = a.estado === "En curso" ? "Ya comenzó · entra a la siguiente apertura"
      : a.estado === "Cupo lleno" ? "Sin lugares · lista de espera"
      : `Pre-registro hasta el ${fechaCorta(a.inicio)}`;
    return `
    <article class="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">${esc(a.taller.categoria)} · ${esc(a.taller.grupo)}</p>
        <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO_ESTADO[a.estado]}">${a.estado}</span>
      </div>
      <h3 class="mt-2 text-lg font-bold">${esc(a.taller.nombre)}</h3>
      <p class="text-sm font-medium text-indigo-700">${esc(a.periodo)}</p>
      <p class="mt-1 text-sm text-slate-600">Inicia ${fechaCorta(a.inicio)} · Termina ${fechaCorta(a.fin)}</p>
      <p class="text-sm text-slate-600">${esc(a.horario)}</p>
      <div class="mt-4 h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full ${COLOR_BARRA[a.estado]}" style="width:${pct}%"></div></div>
      <div class="mt-2 flex justify-between text-sm">${a.estado === "En curso"
        ? `<span>Grupo en curso</span>`
        : `<span><b>${a.disponibles}/${a.cupo}</b> lugares disponibles</span>`}</div>
      <p class="mt-1 text-sm text-slate-600">👥 <b>${a.ocupados}</b> ${a.ocupados === 1 ? "alumno inscrito" : "alumnos inscritos"}</p>
      <p class="mt-1 text-xs text-slate-500">${nota}</p>
      <div class="mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
        <button onclick="verDetalle('${a.id}')" class="font-semibold text-indigo-700 hover:underline">Ver detalle</button>
        ${botonAccion(a, "rounded-lg px-3 py-1.5 font-semibold")}
      </div>
    </article>`;
  }).join("") : `<p class="text-slate-500">No hay talleres con este filtro.</p>`;
}

// Ventanita con el detalle, encima de las tarjetas (no mueve la página).
function verDetalle(id) {
  const a = datos.aperturas.find(x => x.id === id);
  document.getElementById("detalle-modal-cuerpo").innerHTML = htmlDetalle(a);
  document.getElementById("modal-detalle").showModal();
}

function cerrarDetalle() { document.getElementById("modal-detalle").close(); }

// Detalle fijo de la sección "Información clara antes de venir".
function mostrarDetalle(id) {
  const a = datos.aperturas.find(x => x.id === id);
  document.getElementById("detalle").innerHTML = htmlDetalle(a);
}

function htmlDetalle(a) {
  const pct = Math.round(a.ocupados / a.cupo * 100);
  const sig = a.abierto ? null : siguienteApertura(a);
  const aviso = a.abierto ? "" : `
    <p class="mt-6 rounded-xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
      ${a.estado === "En curso" ? "Este grupo ya comenzó y no se aceptan nuevos alumnos." : "Este grupo ya no tiene lugares."}
      Puedes anotarte en la <b>lista de espera</b> y tendrás prioridad para
      ${sig ? `<b>${esc(sig.periodo)}</b> (inicia ${fechaLarga(sig.inicio)})` : "la siguiente apertura"}.
    </p>`;
  return `
    <div class="flex flex-wrap items-start justify-between gap-2 pr-8">
      <div><h3 class="text-2xl font-bold">${esc(a.taller.nombre)}</h3><p class="font-medium text-indigo-700">${esc(a.periodo)}</p><p class="text-sm text-slate-500">${esc(datos.config.centro)}</p></div>
      <span class="rounded-full px-3 py-1 text-sm font-medium ${ESTILO_ESTADO[a.estado]}">● ${a.estado}</span>
    </div>
    <dl class="mt-6 grid gap-5 sm:grid-cols-2">
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">FECHA DE INICIO</dt><dd class="mt-1 font-semibold">${fechaLarga(a.inicio)}</dd></div>
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">FECHA DE TÉRMINO</dt><dd class="mt-1 font-semibold">${fechaLarga(a.fin)}</dd></div>
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">HORARIO DEL TALLER</dt><dd class="mt-1 font-semibold">${esc(a.horario)}</dd></div>
      <div><dt class="text-xs font-semibold tracking-wider text-slate-500">LUGARES DISPONIBLES</dt><dd class="mt-1 font-semibold">${a.disponibles} de ${a.cupo}</dd></div>
    </dl>
    <div class="mt-6 h-2.5 rounded-full bg-slate-100"><div class="h-2.5 rounded-full ${COLOR_BARRA[a.estado]}" style="width:${pct}%"></div></div>
    <div class="mt-2 flex justify-between text-sm text-slate-600"><span>${a.ocupados} lugares ocupados</span><span>${pct}% del cupo</span></div>
    ${aviso}
    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <a href="${esc(a.taller.pdf)}" target="_blank" class="flex-1 rounded-xl px-4 py-3 text-center font-semibold ring-1 ring-slate-300 hover:bg-slate-50">📄 Requisitos PDF</a>
      ${botonAccion(a, "flex-1 rounded-xl px-4 py-3 text-center font-semibold")}
    </div>`;
}

function pintarDocumentos() {
  document.getElementById("lista-docs").innerHTML = datos.documentos.map(d => `
    <article class="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <span class="w-fit rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">PDF</span>
      <h3 class="mt-3 font-bold">${esc(d.nombre)}</h3>
      <p class="mt-1 text-sm text-slate-600">${esc(d.descripcion)}</p>
      <a href="${esc(d.pdf)}" target="_blank" class="mt-auto pt-4 text-sm font-semibold text-indigo-700 hover:underline">Descargar documento</a>
    </article>`).join("");
}

// ---------- Formulario de pre-registro / lista de espera ----------

let aperturaForm = null;

function abrirFormulario(id) {
  const det = document.getElementById("modal-detalle");
  if (det.open) det.close();
  aperturaForm = datos.aperturas.find(x => x.id === id);
  const a = aperturaForm;
  const espera = !a.abierto;
  const sig = espera ? siguienteApertura(a) : null;
  const ninos = a.taller.grupo === "Niños";
  document.getElementById("form-titulo").textContent = espera ? "Lista de espera" : "Pre-registro";
  document.getElementById("form-taller").textContent = `${a.taller.nombre} · ${a.periodo}`;
  document.getElementById("form-explica").innerHTML = espera
    ? `Te anotamos con prioridad para ${sig ? `<b>${esc(sig.periodo)}</b> (inicia ${fechaLarga(sig.inicio)})` : "la siguiente apertura de este taller"}. Te llamaremos cuando abra.`
    : `Apartamos tu lugar por <b>${datos.config.diasApartado} días</b>. Te llamaremos para decirte qué llevar y terminas tu inscripción en el centro.`;
  document.getElementById("campos-nino").classList.toggle("hidden", !ninos);
  document.querySelectorAll("#campos-nino input").forEach(i => i.required = ninos);
  document.getElementById("lbl-nombre").textContent = ninos ? "Nombre de la mamá, papá o tutor" : "Nombre completo";
  document.getElementById("lbl-telefono").textContent = ninos ? "Teléfono del tutor (10 dígitos)" : "Teléfono (10 dígitos)";
  document.getElementById("btn-enviar").textContent = espera ? "Anotarme en lista de espera" : "Apartar mi lugar";
  document.getElementById("form-preregistro").reset();
  document.getElementById("form-error").classList.add("hidden");
  document.getElementById("paso-form").classList.remove("hidden");
  document.getElementById("paso-listo").classList.add("hidden");
  document.getElementById("modal").showModal();
}

function cerrarFormulario() { document.getElementById("modal").close(); }

async function enviarPreregistro(ev) {
  ev.preventDefault();
  const f = ev.target;
  const error = document.getElementById("form-error");
  const tel = f.telefono.value.replace(/\D/g, "");
  if (tel.length !== 10) { error.textContent = "Escribe un teléfono de 10 dígitos."; error.classList.remove("hidden"); return; }
  if (!navigator.onLine) { error.textContent = "Necesitas internet para pre-registrarte. Intenta de nuevo cuando tengas señal."; error.classList.remove("hidden"); return; }

  const a = aperturaForm;
  const registro = {
    apertura: a.id,
    estado: a.abierto ? "Pre-registro" : "Lista de espera",
    nombre: f.nombre.value.trim(),
    telefono: tel,
    alumno: f.alumno.value.trim(),
    edad: f.edad.value
  };

  const boton = document.getElementById("btn-enviar");
  boton.disabled = true; boton.textContent = "Enviando…";
  try {
    let folio;
    if (URL_API) {
      // text/plain evita el bloqueo de CORS con Apps Script; doPost lee e.postData.contents.
      const r = await fetch(URL_API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(registro) });
      const resp = await r.json();
      if (!resp.ok) throw new Error(resp.mensaje || "No se pudo guardar");
      folio = resp.folio;
      registro.estado = resp.estado; // el servidor decide si fue pre-registro o lista de espera
      cargar();                      // refresca cupos
    } else {
      // Prototipo: simula que se guardó.
      await new Promise(r => setTimeout(r, 600));
      folio = a.id + "-" + String(Math.floor(Math.random() * 900) + 100);
      if (registro.estado === "Pre-registro") { a.ocupados++; Object.assign(a, calcular({ ...a, taller: a.taller.id })); pintarTarjetas(); mostrarDetalle(a.id); }
    }
    mostrarListo(registro, folio);
  } catch (e) {
    error.textContent = "No pudimos guardar tu registro. Intenta otra vez o escríbenos por WhatsApp.";
    error.classList.remove("hidden");
  } finally {
    boton.disabled = false; boton.textContent = a.abierto ? "Apartar mi lugar" : "Anotarme en lista de espera";
  }
}

function mostrarListo(r, folio) {
  const a = aperturaForm;
  const espera = r.estado === "Lista de espera";
  document.getElementById("listo-titulo").textContent = espera ? "¡Quedaste en lista de espera!" : "¡Listo, apartamos tu lugar!";
  document.getElementById("listo-texto").innerHTML = espera
    ? `Te llamaremos al <b>${r.telefono}</b> cuando abra la siguiente apertura de <b>${esc(a.taller.nombre)}</b>. Tendrás prioridad por haberte anotado.`
    : `Te llamaremos al <b>${r.telefono}</b> para decirte qué documentos llevar. Acude al centro en los próximos <b>${datos.config.diasApartado} días</b> para terminar tu inscripción de <b>${esc(a.taller.nombre)} · ${esc(a.periodo)}</b>.`;
  document.getElementById("listo-folio").textContent = folio;
  document.getElementById("listo-wa").href = linkWhatsApp(`¡Hola! Hice mi ${espera ? "registro en lista de espera" : "pre-registro"} para ${a.taller.nombre} · ${a.periodo}. Mi folio es ${folio}.`);
  document.getElementById("paso-form").classList.add("hidden");
  document.getElementById("paso-listo").classList.remove("hidden");
}

// Aviso de "sin señal"
function avisoConexion() { document.getElementById("sin-senal").classList.toggle("hidden", navigator.onLine); }
window.addEventListener("online", avisoConexion);
window.addEventListener("offline", avisoConexion);

// Registrar la PWA (solo funciona abriendo con Live Server o en Vercel, no con doble clic)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}

document.getElementById("form-preregistro").addEventListener("submit", enviarPreregistro);
avisoConexion();
cargar();
