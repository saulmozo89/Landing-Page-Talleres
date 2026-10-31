// Datos de ejemplo. Tienen la misma forma que tendrá el JSON que devolverá
// Apps Script más adelante, así que después solo se cambia de dónde se leen.
// En la hoja de Sheets: "talleres" = pestaña Talleres, "aperturas" = pestaña Aperturas.
// "ocupados" lo calcula la hoja (pre-registros + inscritos de esa apertura).
const DATOS_EJEMPLO = {
  actualizado: "2026-10-30T09:00:00",
  config: {
    centro: "Centro Comunitario Cuarta Sección de El Florido A.C.",
    whatsapp: "5216644486948", // con código de país
    diasApartado: 5,           // días que se guarda el lugar de un pre-registro
    direccion: "Centro Comunitario Florido IV Sec., El Florido IV, 22236 Tijuana, B.C.",
    maps: "https://maps.app.goo.gl/CAPajHNvrvXnSf979",
    telefono: "664 448 6948",
    facebook: "https://www.facebook.com/p/Centro-Comunitario-IV-Secci%C3%B3n-De-El-Florido-Educaci%C3%B3n-61567199121424/",
    instagram: "https://www.instagram.com/ccflorido_ed",
    youtube: "https://www.youtube.com/@centrocomunitarioflorido4t825"
  },
  talleres: [
    { id: "barberia", nombre: "Barbería", categoria: "Oficios", grupo: "Adultos", pdf: "#" },
    { id: "belleza", nombre: "Taller de Belleza", categoria: "Belleza y bienestar", grupo: "Adultos", pdf: "#" },
    { id: "computacion", nombre: "Computación Básica", categoria: "Tecnología", grupo: "Adultos", pdf: "#" },
    { id: "cocina", nombre: "Cocina Creativa", categoria: "Cocina", grupo: "Adultos", pdf: "#" },
    { id: "arte", nombre: "Arte Infantil", categoria: "Arte", grupo: "Niños", pdf: "#" },
    { id: "lectura", nombre: "Club de Lectura", categoria: "Educación", grupo: "Niños", pdf: "#" }
  ],
  // Una fila por cada vez que se abre un taller. Cada una dura lo que necesite.
  aperturas: [
    { id: "BARB-T1", taller: "barberia", periodo: "1er trimestre", inicio: "2026-10-05", fin: "2026-12-18", horario: "Lunes y miércoles · 4 a 6 pm", cupo: 30, ocupados: 28 },
    { id: "BARB-T2", taller: "barberia", periodo: "2º trimestre", inicio: "2027-01-11", fin: "2027-03-26", horario: "Lunes y miércoles · 4 a 6 pm", cupo: 30, ocupados: 20 },
    { id: "BELL-B1", taller: "belleza", periodo: "Bimestre nov–dic", inicio: "2026-11-09", fin: "2026-12-18", horario: "Lunes y miércoles · 10 a 12", cupo: 20, ocupados: 14 },
    { id: "COMP-B1", taller: "computacion", periodo: "Bimestre nov–dic", inicio: "2026-11-16", fin: "2026-12-18", horario: "Martes y jueves · 5 a 7 pm", cupo: 20, ocupados: 18 },
    { id: "COCI-M1", taller: "cocina", periodo: "Noviembre", inicio: "2026-11-21", fin: "2026-12-19", horario: "Sábados · 9 a 12", cupo: 15, ocupados: 15 },
    { id: "COCI-M2", taller: "cocina", periodo: "Enero", inicio: "2027-01-09", fin: "2027-02-06", horario: "Sábados · 9 a 12", cupo: 15, ocupados: 3 },
    { id: "ARTE-T1", taller: "arte", periodo: "1er trimestre", inicio: "2026-11-10", fin: "2027-01-29", horario: "Martes · 4 a 5:30 pm", cupo: 20, ocupados: 16 },
    { id: "LECT-T1", taller: "lectura", periodo: "1er trimestre", inicio: "2026-11-12", fin: "2027-01-28", horario: "Jueves · 4 a 5 pm", cupo: 25, ocupados: 9 }
  ],
  documentos: [
    { nombre: "Formato de inscripción", descripcion: "Conoce el documento de registro que se utiliza en el Centro Comunitario.", pdf: "#" },
    { nombre: "Reglamento del centro", descripcion: "Normas de convivencia, asistencia y uso de espacios.", pdf: "#" },
    { nombre: "Carta responsiva", descripcion: "Documento aplicable cuando el programa o grupo así lo requiera.", pdf: "#" },
    { nombre: "Lista de materiales", descripcion: "Revisa los materiales que pudieran solicitarse para cada taller.", pdf: "#" }
  ]
};
