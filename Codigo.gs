/**
 * Backend de la landing de talleres · Centro Comunitario Cuarta Sección de El Florido A.C.
 *
 * Va ligado a la hoja "Pre-Registro_2026-2027". Pestañas que usa:
 *   Catálogo, Pre-registros, Auxiliares, Configuración.
 * Lee (sin modificar) el archivo del formato de inscripción, cuyo ID está en
 * Configuración → idFormato. De cada pestaña de taller toma:
 *   A5 fecha de inicio · B5 fecha de fin · D5 cupos totales · F5 cupos ocupados
 *   A7 días que se imparte · B7 horario
 *
 *  - doGet:  la landing pide el catálogo con fechas, horario y cupos. NUNCA manda datos de personas.
 *  - doPost: la landing manda un pre-registro (solo interés, no aparta lugar) y se guarda en Pre-registros.
 *
 * Publicar: Implementar → Gestionar implementaciones → ✏️ → Nueva versión
 * (o con clasp: clasp push  y  clasp deploy -i <idDeLaImplementación>).
 */

const CFG = {
  HOJA_CATALOGO: 'Catálogo',
  HOJA_PRE: 'Pre-registros',
  HOJA_AUX: 'Auxiliares',
  HOJA_CONFIG: 'Configuración',
  RANGO_TALLER: 'A5:H7',        // bloque de encabezado de cada pestaña de taller
  FILA_ALUMNOS: 10,             // en el formato, los alumnos empiezan en la fila 10
  CACHE_SEGUNDOS: 60,
  CLAVE_CACHE: 'catalogo-v2',
  CATEGORIAS: ['Niños y Jóvenes', 'Belleza y Cuidado Personal', 'Cocina y Repostería', 'Tecnología e Innovación',
    'Oficios y Capacitación CECATI', 'Manualidades y Emprendimiento', 'Deportes y Bienestar Adultos'],
  EDAD_TUTOR: 17                // 17 años o menos piden tutor
};

const DOCUMENTOS = [
  ['Acta de nacimiento', 'Acta de nacimiento'],
  ['CURP', 'CURP'],
  ['INE', 'Identificación oficial (INE)'],
  ['Comprobante de domicilio', 'Comprobante de domicilio (no mayor a 3 meses)'],
  ['Boleta o comprobante de estudios', 'Boleta de calificaciones o comprobante de estudios']
];

// ---------------------------------------------------------------- doGet

function doGet() {
  const cache = CacheService.getScriptCache();
  let json = cache.get(CFG.CLAVE_CACHE);
  if (!json) {
    json = JSON.stringify(armarCatalogo_());
    try { cache.put(CFG.CLAVE_CACHE, json, CFG.CACHE_SEGUNDOS); } catch (e) { /* más de 100 KB: sin caché */ }
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function armarCatalogo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const config = leerConfig_(ss);
  const catalogo = leerCatalogo_(ss);

  // Todas las pestañas que hay que leer del formato: las oficiales y sus "extra".
  const pestanas = [];
  catalogo.forEach(t => [t.pestana].concat(t.extras).forEach(p => { if (pestanas.indexOf(p) < 0) pestanas.push(p); }));
  const bloques = leerBloques_(config.idFormato, pestanas);

  const interesados = contarInteresados_(ss);

  const talleres = catalogo.map(t => {
    const b = bloques[t.pestana];
    if (!b) return null; // la pestaña no existe en el formato
    let ocupados = b.ocupados;
    t.extras.forEach(p => { if (bloques[p]) ocupados += bloques[p].ocupados; });
    return {
      pestana: t.pestana,
      nombre: t.nombre,
      categoria: t.categoria,
      edadMin: t.edadMin,
      edadMax: t.edadMax,
      descripcion: t.descripcion,
      requisitos: t.requisitos,
      inicio: fechaISO_(b.inicio, tz),
      fin: fechaISO_(b.fin, tz),
      dias: b.dias,
      horario: b.horario,
      cupo: b.cupo,
      ocupados: ocupados,
      interesados: interesados[t.pestana] || 0
    };
  }).filter(Boolean);

  return {
    actualizado: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss"),
    config: config,
    categorias: CFG.CATEGORIAS,
    auxiliares: leerAuxiliares_(ss),
    talleres: talleres
  };
}

// Lee A5:H7 de muchas pestañas. Con el servicio avanzado de Sheets es una sola llamada;
// si no está activado, lo hace pestaña por pestaña (más lento).
function leerBloques_(idFormato, pestanas) {
  const res = {};
  if (!idFormato || !pestanas.length) return res;
  const crudos = {};
  if (typeof Sheets !== 'undefined') {
    // Se piden de 40 en 40 para no hacer URLs gigantes; una pestaña inexistente haría fallar el lote.
    const existentes = SpreadsheetApp.openById(idFormato).getSheets().map(s => s.getName());
    const validas = pestanas.filter(p => existentes.indexOf(p) >= 0);
    for (let i = 0; i < validas.length; i += 40) {
      const lote = validas.slice(i, i + 40);
      const r = Sheets.Spreadsheets.Values.batchGet(idFormato, {
        ranges: lote.map(p => "'" + p.replace(/'/g, "''") + "'!" + CFG.RANGO_TALLER),
        valueRenderOption: 'FORMATTED_VALUE'
      });
      (r.valueRanges || []).forEach((vr, k) => crudos[lote[k]] = vr.values || []);
    }
  } else {
    const libro = SpreadsheetApp.openById(idFormato);
    pestanas.forEach(p => {
      const h = libro.getSheetByName(p);
      if (h) crudos[p] = h.getRange(CFG.RANGO_TALLER).getDisplayValues();
    });
  }
  Object.keys(crudos).forEach(p => {
    const v = crudos[p];
    const celda = (f, c) => (v[f] && v[f][c] !== undefined) ? String(v[f][c]).trim() : '';
    // v[0] = fila 5, v[2] = fila 7 · columnas A=0 B=1 D=3 F=5
    res[p] = {
      inicio: celda(0, 0),
      fin: celda(0, 1),
      cupo: numero_(celda(0, 3)),
      ocupados: numero_(celda(0, 5)),
      dias: celda(2, 0),
      horario: celda(2, 1)
    };
  });
  return res;
}

function leerCatalogo_(ss) {
  return leerTabla_(ss, CFG.HOJA_CATALOGO)
    .filter(t => t['Pestaña en el formato'] && esSi_(t['Publicar']))
    .map(t => ({
      pestana: String(t['Pestaña en el formato']).trim(),
      nombre: String(t['Taller'] || t['Pestaña en el formato']).trim(),
      categoria: String(t['Categoría'] || '').trim(),
      edadMin: numero_(t['Edad mínima']) || 0,
      edadMax: numero_(t['Edad máxima']) || 0,
      descripcion: String(t['Descripción breve'] || '').trim(),
      requisitos: DOCUMENTOS.filter(d => /^s[ií]/i.test(String(t[d[0]] || '').trim()))
        .map(d => { const m = String(t[d[0]]).match(/\((.+)\)/); return d[1] + (m ? ' ' + m[1] : ''); }),
      extras: String(t['Pestañas extra a contar'] || '').split('|').map(s => s.trim()).filter(Boolean)
    }));
}

function leerAuxiliares_(ss) {
  return leerTabla_(ss, CFG.HOJA_AUX)
    .filter(a => a['Auxiliar'] && (a['Activa'] === '' || esSi_(a['Activa'])))
    .map(a => String(a['Auxiliar']).trim());
}

function contarInteresados_(ss) {
  const conteo = {};
  leerTabla_(ss, CFG.HOJA_PRE).forEach(r => {
    if (r['Estado'] === 'Interesado') {
      const p = String(r['Pestaña del taller']).trim();
      conteo[p] = (conteo[p] || 0) + 1;
    }
  });
  return conteo;
}

// ---------------------------------------------------------------- doPost

function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder_({ ok: false, mensaje: 'Datos inválidos.' });
  }

  const limpiar = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n || 120);
  const pestana = limpiar(d.pestana, 150);
  const participante = limpiar(d.participante);
  const tutor = limpiar(d.tutor);
  const comunidad = limpiar(d.comunidad);
  const auxiliar = limpiar(d.auxiliar);
  const telefono = String(d.telefono || '').replace(/\D/g, '');
  const edad = parseInt(String(d.edad || '').replace(/\D/g, ''), 10);
  const condicion = d.condicion === true || esSi_(d.condicion);
  const condicionCual = condicion ? limpiar(d.condicionCual, 300) : '';

  if (!pestana || !participante || !comunidad || !auxiliar || telefono.length !== 10 || !(edad > 0 && edad < 110)) {
    return responder_({ ok: false, mensaje: 'Faltan datos: nombre, edad, comunidad, teléfono de 10 dígitos y auxiliar.' });
  }
  const esMenor = edad <= CFG.EDAD_TUTOR;
  if (esMenor && !tutor) return responder_({ ok: false, mensaje: 'Para menores de 18 años falta el nombre del tutor.' });
  if (condicion && !condicionCual) return responder_({ ok: false, mensaje: 'Especifica cuál es la condición.' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return responder_({ ok: false, mensaje: 'El sistema está ocupado, intenta de nuevo.' });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = leerConfig_(ss);
    const taller = leerCatalogo_(ss).find(t => t.pestana === pestana);
    if (!taller) return responder_({ ok: false, mensaje: 'Ese taller ya no está disponible.' });
    if (leerAuxiliares_(ss).indexOf(auxiliar) < 0) return responder_({ ok: false, mensaje: 'Elige una auxiliar de la lista.' });

    // Regla de edad (cursos generales / CECATI): si no cumple, no se registra.
    if (taller.edadMin && edad < taller.edadMin) {
      return responder_({ ok: false, mensaje: 'Este taller es a partir de ' + taller.edadMin + ' años.' });
    }
    if (taller.edadMax && edad > taller.edadMax) {
      return responder_({ ok: false, mensaje: 'Este taller es hasta los ' + taller.edadMax + ' años.' });
    }

    // ¿Ya existe este pre-registro?
    const hoja = ss.getSheetByName(CFG.HOJA_PRE);
    const previo = leerTabla_(ss, CFG.HOJA_PRE).find(r =>
      String(r['Teléfono']).replace(/\D/g, '') === telefono &&
      String(r['Pestaña del taller']).trim() === pestana &&
      String(r['Nombre del participante']).trim().toLowerCase() === participante.toLowerCase() &&
      r['Estado'] !== 'Cancelado');
    if (previo) return responder_({ ok: true, folio: previo['Folio'], repetido: true, aviso: config.aviso, requisitos: taller.requisitos });

    const fila = hoja.getLastRow() + 1;
    const folio = 'PR-' + ('0000' + (fila - 1)).slice(-4);
    const cols = encabezados_(hoja);
    const valores = new Array(cols.length).fill('');
    const poner = (col, v) => { const i = cols.indexOf(col); if (i >= 0) valores[i] = v; };
    poner('Folio', folio);
    poner('Fecha', new Date());
    poner('Pestaña del taller', pestana);
    poner('Taller', taller.nombre);
    poner('Categoría', taller.categoria);
    poner('Tipo', esMenor ? 'Niño' : 'Adulto');
    poner('Nombre del tutor', esMenor ? tutor : '');
    poner('Nombre del participante', participante);
    poner('Edad', edad);
    poner('Comunidad', comunidad);
    poner('Teléfono', "'" + telefono); // el apóstrofo lo guarda como texto
    poner('Condición especial', condicion ? 'Sí' : 'No');
    poner('¿Cuál condición?', condicionCual);
    poner('Auxiliar', auxiliar);
    poner('Estado', 'Interesado');
    poner('Valoración psicopedagogía', condicion ? 'Pendiente' : 'No aplica');
    hoja.getRange(fila, 1, 1, valores.length).setValues([valores]);

    CacheService.getScriptCache().remove(CFG.CLAVE_CACHE);
    return responder_({ ok: true, folio: folio, aviso: config.aviso, requisitos: taller.requisitos });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- cierre de ciclo

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Talleres')
    .addItem('Cerrar ciclo de un taller…', 'cerrarCicloDialogo')
    .addItem('Actualizar la landing ahora', 'limpiarCache')
    .addToUi();
}

function limpiarCache() {
  CacheService.getScriptCache().remove(CFG.CLAVE_CACHE);
  SpreadsheetApp.getActiveSpreadsheet().toast('Listo, la landing tomará los datos nuevos.');
}

// Copia la pestaña del taller (y sus pestañas extra) al archivo Historico y luego
// borra solo la lista de alumnos (fila 10 hacia abajo). Encabezado, fechas y cupos se quedan.
function cerrarCicloDialogo() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Cerrar ciclo', 'Escribe el nombre exacto de la pestaña del taller (como está en el Catálogo):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const pestana = r.getResponseText().trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taller = leerCatalogo_(ss).find(t => t.pestana === pestana);
  if (!taller) { ui.alert('No encontré "' + pestana + '" en el Catálogo.'); return; }
  const todas = [taller.pestana].concat(taller.extras);
  const ok = ui.alert('Cerrar ciclo de ' + taller.nombre,
    'Se respaldará en Historico y luego se borrará la lista de alumnos de: ' + todas.join(', ') + '. ¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  const msg = cerrarCiclo_(todas);
  ui.alert(msg);
}

function cerrarCiclo_(pestanas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = leerConfig_(ss);
  const formato = SpreadsheetApp.openById(config.idFormato);
  const historico = SpreadsheetApp.openById(config.idHistorico);
  const fecha = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const hechas = [];
  pestanas.forEach(p => {
    const h = formato.getSheetByName(p);
    if (!h) return;
    const copia = h.copyTo(historico);
    copia.setName((p + ' · cierre ' + fecha).slice(0, 99));
    // copyTo deja fórmulas: se convierten a valores para que el respaldo no cambie.
    const rango = copia.getDataRange();
    rango.setValues(rango.getValues());
    const ultima = h.getLastRow();
    if (ultima >= CFG.FILA_ALUMNOS) {
      h.getRange(CFG.FILA_ALUMNOS, 1, ultima - CFG.FILA_ALUMNOS + 1, h.getLastColumn()).clearContent();
    }
    hechas.push(p);
  });
  CacheService.getScriptCache().remove(CFG.CLAVE_CACHE);
  return hechas.length ? 'Ciclo cerrado y respaldado: ' + hechas.join(', ') : 'No se encontró ninguna pestaña.';
}

// ---------------------------------------------------------------- utilidades

// Lee una pestaña como lista de objetos { encabezado: valor }.
// Las columnas se buscan por nombre; "Pestaña en el formato (no cambiar)" también se lee como "Pestaña en el formato".
function leerTabla_(ss, nombreHoja) {
  const hoja = ss.getSheetByName(nombreHoja);
  if (!hoja || hoja.getLastRow() < 2) return [];
  const valores = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  const cols = valores.shift().map(c => String(c).trim());
  return valores.map(fila => {
    const obj = {};
    cols.forEach((c, i) => {
      obj[c] = fila[i];
      const corto = c.replace(/\s*\(.*\)\s*$/, '');
      if (corto !== c) obj[corto] = fila[i];
    });
    return obj;
  });
}

function encabezados_(hoja) {
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(c => String(c).trim());
}

function leerConfig_(ss) {
  const hoja = ss.getSheetByName(CFG.HOJA_CONFIG);
  const config = {};
  if (!hoja) return config;
  hoja.getDataRange().getValues().slice(1).forEach(f => { if (f[0]) config[String(f[0]).trim()] = f[1]; });
  config.whatsapp = String(config.whatsapp || '').replace(/\D/g, '');
  config.idFormato = String(config.idFormato || '').trim();
  config.idHistorico = String(config.idHistorico || '').trim();
  delete config.diasApartado;
  return config;
}

function fechaISO_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function numero_(v) {
  const n = Number(String(v === undefined || v === null ? '' : v).replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : 0;
}

function esSi_(v) {
  return /^s[ií]$/i.test(String(v || '').trim()) || v === true;
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Para probar desde el editor: Ejecutar → probarCatalogo y revisa el registro.
function probarCatalogo() {
  const t0 = Date.now();
  const c = armarCatalogo_();
  Logger.log('Talleres: %s · Auxiliares: %s · %s ms', c.talleres.length, c.auxiliares.length, Date.now() - t0);
  Logger.log(JSON.stringify(c.talleres.slice(0, 3), null, 2));
}
