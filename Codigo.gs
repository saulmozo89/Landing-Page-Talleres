/**
 * Backend de la landing de talleres · Centro Comunitario Cuarta Sección de El Florido A.C.
 *
 * Va pegado (Extensiones → Apps Script) a la hoja "Landing Talleres 2026-2027".
 * Pestañas que usa: Talleres, Aperturas, Inscripciones, Documentos, Configuración.
 *
 *  - doGet:  la landing pide el catálogo. Responde talleres, aperturas con cupos,
 *            documentos y configuración. NUNCA manda nombres ni teléfonos.
 *  - doPost: la landing manda un pre-registro. Revisa cupo y fecha de inicio,
 *            y agrega la fila en Inscripciones como "Pre-registro" o "Lista de espera".
 *
 * Publicar: Implementar → Nueva implementación → Aplicación web
 *           Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 * Cada cambio al código: Implementar → Gestionar implementaciones → ✏️ → Nueva versión.
 */

const CFG = {
  HOJA_TALLERES: 'Talleres',
  HOJA_APERTURAS: 'Aperturas',
  HOJA_INSCRIPCIONES: 'Inscripciones',
  HOJA_DOCUMENTOS: 'Documentos',
  HOJA_CONFIG: 'Configuración',
  ESTADOS_OCUPAN: ['Pre-registro', 'Inscrito'], // estos cuentan contra el cupo
  CACHE_SEGUNDOS: 60,
  CLAVE_CACHE: 'catalogo-v1'
};

// ---------------------------------------------------------------- doGet

function doGet() {
  const cache = CacheService.getScriptCache();
  let json = cache.get(CFG.CLAVE_CACHE);
  if (!json) {
    json = JSON.stringify(armarCatalogo_());
    cache.put(CFG.CLAVE_CACHE, json, CFG.CACHE_SEGUNDOS);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function armarCatalogo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const config = leerConfig_(ss);

  // Talleres publicados
  const talleres = leerTabla_(ss, CFG.HOJA_TALLERES)
    .filter(t => t['Taller'] && esSi_(t['Publicar']))
    .map(t => ({
      id: String(t['Id']),
      nombre: String(t['Taller']).trim(),
      categoria: t['Categoría'] || '',
      grupo: t['Grupo'] || 'Adultos',
      descripcion: t['Descripción'] || '',
      pdf: limpiarLink_(t['PDF requisitos']),
      imagen: limpiarLink_(t['Imagen'])
    }));
  const tallerPorNombre = {};
  talleres.forEach(t => tallerPorNombre[t.nombre] = t);

  // Ocupados por apertura (lo calculamos aquí, no dependemos de las fórmulas)
  const ocupados = contarOcupados_(ss);

  const aperturas = leerTabla_(ss, CFG.HOJA_APERTURAS)
    .filter(a => a['Id apertura'] && esSi_(a['Publicar']) && tallerPorNombre[String(a['Taller']).trim()])
    .map(a => ({
      id: String(a['Id apertura']).trim(),
      taller: tallerPorNombre[String(a['Taller']).trim()].id,
      periodo: a['Periodo'] || '',
      inicio: fechaISO_(a['Fecha inicio'], tz),
      fin: fechaISO_(a['Fecha fin'], tz),
      horario: a['Horario'] || '',
      cupo: Number(a['Cupo']) || 0,
      ocupados: ocupados[String(a['Id apertura']).trim()] || 0
    }))
    .filter(a => a.inicio);

  const documentos = leerTabla_(ss, CFG.HOJA_DOCUMENTOS)
    .filter(d => d['Nombre'])
    .sort((x, y) => (Number(x['Orden']) || 99) - (Number(y['Orden']) || 99))
    .map(d => ({ nombre: d['Nombre'], descripcion: d['Descripción'] || '', pdf: limpiarLink_(d['Link PDF']) }));

  return {
    actualizado: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss"),
    config: config,
    talleres: talleres,
    aperturas: aperturas,
    documentos: documentos
  };
}

// ---------------------------------------------------------------- doPost

function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder_({ ok: false, mensaje: 'Datos inválidos.' });
  }

  const nombre = String(datos.nombre || '').trim().slice(0, 120);
  const telefono = String(datos.telefono || '').replace(/\D/g, '');
  const aperturaId = String(datos.apertura || '').trim();
  const alumno = String(datos.alumno || '').trim().slice(0, 120);
  const edad = String(datos.edad || '').replace(/\D/g, '').slice(0, 2);

  if (!nombre || telefono.length !== 10 || !aperturaId) {
    return responder_({ ok: false, mensaje: 'Faltan datos: nombre y teléfono de 10 dígitos.' });
  }

  // Un solo pre-registro a la vez, para no vender dos veces el último lugar.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return responder_({ ok: false, mensaje: 'El sistema está ocupado, intenta de nuevo.' });
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();
    const aperturas = leerTabla_(ss, CFG.HOJA_APERTURAS).filter(a => a['Id apertura']);
    const ap = aperturas.find(a => String(a['Id apertura']).trim() === aperturaId && esSi_(a['Publicar']));
    if (!ap) return responder_({ ok: false, mensaje: 'Ese taller ya no está disponible.' });

    // ¿Ya se había registrado este teléfono en esta apertura?
    const hojaIns = ss.getSheetByName(CFG.HOJA_INSCRIPCIONES);
    const previas = leerTabla_(ss, CFG.HOJA_INSCRIPCIONES);
    const repetida = previas.find(r => String(r['Teléfono']).replace(/\D/g, '') === telefono &&
      String(r['Id apertura']).trim() === aperturaId && r['Estado'] !== 'Cancelado');
    if (repetida) return responder_({ ok: true, folio: repetida['Folio'], estado: repetida['Estado'], repetido: true });

    // Regla del centro: no se entra a un taller ya comenzado ni lleno → lista de espera.
    const ocupados = contarOcupados_(ss)[aperturaId] || 0;
    const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const comenzado = fechaISO_(ap['Fecha inicio'], tz) <= hoy;
    const lleno = ocupados >= (Number(ap['Cupo']) || 0);
    let estado = 'Pre-registro';
    let destino = aperturaId;
    let nota = '';
    if (comenzado || lleno) {
      estado = 'Lista de espera';
      const sig = siguienteApertura_(aperturas, ap, tz);
      if (sig) {
        destino = String(sig['Id apertura']).trim();
        nota = 'Pidió ' + aperturaId + (comenzado ? ' (ya había comenzado)' : ' (estaba lleno)');
      }
    }

    const fila = hojaIns.getLastRow() + 1;
    const folio = destino + '-' + ('000' + fila).slice(-4);
    const cols = encabezados_(hojaIns);
    const valores = new Array(cols.length).fill('');
    const poner = (nombreCol, valor) => { const i = indice_(cols, nombreCol); if (i >= 0) valores[i] = valor; };
    poner('Folio', folio);
    poner('Fecha', new Date());
    poner('Nombre', nombre);
    poner('Teléfono', "'" + telefono); // el apóstrofo lo guarda como texto
    poner('Id apertura', destino);
    poner('Estado', estado);
    poner('Alumno', alumno);
    poner('Edad', edad);
    poner('Origen', 'Landing');
    poner('Notas', nota);
    hojaIns.getRange(fila, 1, 1, valores.length).setValues([valores]);

    CacheService.getScriptCache().remove(CFG.CLAVE_CACHE);
    return responder_({ ok: true, folio: folio, estado: estado, apertura: destino });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- utilidades

function contarOcupados_(ss) {
  const conteo = {};
  leerTabla_(ss, CFG.HOJA_INSCRIPCIONES).forEach(r => {
    if (CFG.ESTADOS_OCUPAN.indexOf(r['Estado']) >= 0) {
      const id = String(r['Id apertura']).trim();
      conteo[id] = (conteo[id] || 0) + 1;
    }
  });
  return conteo;
}

function siguienteApertura_(aperturas, ap, tz) {
  const inicio = fechaISO_(ap['Fecha inicio'], tz);
  return aperturas
    .filter(a => String(a['Taller']).trim() === String(ap['Taller']).trim() && fechaISO_(a['Fecha inicio'], tz) > inicio)
    .sort((x, y) => fechaISO_(x['Fecha inicio'], tz) < fechaISO_(y['Fecha inicio'], tz) ? -1 : 1)[0] || null;
}

// Lee una pestaña como lista de objetos { encabezado: valor }.
// Las columnas se buscan por nombre, así que se pueden mover o agregar otras sin romper nada.
function leerTabla_(ss, nombreHoja) {
  const hoja = ss.getSheetByName(nombreHoja);
  if (!hoja || hoja.getLastRow() < 2) return [];
  const valores = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  const cols = valores.shift().map(c => String(c).trim());
  return valores.map(fila => {
    const obj = {};
    cols.forEach((c, i) => {
      obj[c] = fila[i];
      // alias corto: "PDF requisitos (link Drive)" también se puede leer como "PDF requisitos"
      const corto = c.replace(/\s*\(.*\)\s*$/, '');
      if (corto !== c) obj[corto] = fila[i];
    });
    return obj;
  });
}

function encabezados_(hoja) {
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(c => String(c).trim());
}

function indice_(cols, nombre) {
  return cols.findIndex(c => c === nombre || c.indexOf(nombre + ' (') === 0);
}

function leerConfig_(ss) {
  const hoja = ss.getSheetByName(CFG.HOJA_CONFIG);
  const config = {};
  if (!hoja) return config;
  hoja.getDataRange().getValues().slice(1).forEach(f => { if (f[0]) config[String(f[0]).trim()] = f[1]; });
  config.whatsapp = String(config.whatsapp || '').replace(/\D/g, '');
  config.diasApartado = Number(config.diasApartado) || 5;
  return config;
}

function fechaISO_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy escrito como texto
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function limpiarLink_(v) {
  const s = String(v || '').trim();
  return /^https?:\/\/\S+$/.test(s) ? s : '#';
}

function esSi_(v) {
  return /^s[ií]$/i.test(String(v || '').trim()) || v === true;
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Para probar desde el editor: Ejecutar → probarCatalogo y revisa el registro.
function probarCatalogo() {
  const c = armarCatalogo_();
  Logger.log('Talleres: %s · Aperturas: %s · Documentos: %s', c.talleres.length, c.aperturas.length, c.documentos.length);
  Logger.log(JSON.stringify(c.aperturas.slice(0, 3), null, 2));
}
