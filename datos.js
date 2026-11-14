// Datos de ejemplo con la misma forma que el JSON de Apps Script.
// Solo se usan si no hay internet y el celular nunca guardó una copia.
// En la hoja: "talleres" sale del Catálogo + las pestañas del formato de inscripción.
const DATOS_EJEMPLO = {
  actualizado: "2026-11-08T09:00:00",
  config: {
    centro: "Centro Comunitario Cuarta Sección de El Florido A.C.",
    whatsapp: "5216644486948",
    direccion: "Centro Comunitario Florido IV Sec., El Florido IV, 22236 Tijuana, B.C.",
    maps: "https://maps.app.goo.gl/CAPajHNvrvXnSf979",
    telefono: "664 448 6948",
    facebook: "https://www.facebook.com/p/Centro-Comunitario-IV-Secci%C3%B3n-De-El-Florido-Educaci%C3%B3n-61567199121424/",
    instagram: "https://www.instagram.com/ccflorido_ed",
    youtube: "https://www.youtube.com/@centrocomunitarioflorido4t825",
    aviso: "Este trámite corresponde únicamente a un PRE-REGISTRO. No garantiza la inscripción definitiva al taller o curso. Para concluir tu proceso y asegurar tu lugar, es indispensable acudir presencialmente al Centro Comunitario con tu documentación básica completa."
  },
  categorias: ["Niños y Jóvenes", "Belleza y Cuidado Personal", "Cocina y Repostería", "Tecnología e Innovación",
    "Oficios y Capacitación CECATI", "Manualidades y Emprendimiento", "Deportes y Bienestar Adultos"],
  auxiliares: ["Auxiliar de ejemplo"],
  talleres: [
    { pestana: "BALLET", nombre: "Ballet", categoria: "Niños y Jóvenes", edadMin: 6, edadMax: 15,
      descripcion: "Taller de ballet para niñas, niños y jóvenes, en grupo y con instructores del centro.",
      requisitos: ["Acta de nacimiento", "CURP", "Identificación oficial (INE) del tutor", "Boleta de calificaciones o comprobante de estudios"],
      inicio: "2026-11-16", fin: "2027-01-29", dias: "Martes y Jueves", horario: "4:00 PM a 5:30 PM", cupo: 20, ocupados: 9, interesados: 3 },
    { pestana: "UÑAS", nombre: "Uñas", categoria: "Belleza y Cuidado Personal", edadMin: 15, edadMax: 0,
      descripcion: "Aprende las técnicas de uñas para trabajar por tu cuenta o emplearte.",
      requisitos: ["CURP", "Identificación oficial (INE)", "Comprobante de domicilio (no mayor a 3 meses)"],
      inicio: "2026-11-10", fin: "2027-01-20", dias: "Lunes y Miércoles", horario: "4:00 PM a 6:00 PM", cupo: 25, ocupados: 24, interesados: 6 },
    { pestana: "REPOSTERIA BASICA", nombre: "Repostería Básica", categoria: "Cocina y Repostería", edadMin: 16, edadMax: 0,
      descripcion: "Aprende a preparar repostería básica paso a paso, con práctica en cada clase.",
      requisitos: ["CURP", "Identificación oficial (INE)", "Comprobante de domicilio (no mayor a 3 meses)"],
      inicio: "2026-11-21", fin: "2026-12-19", dias: "Sábado", horario: "9:00 AM a 12:00 PM", cupo: 15, ocupados: 15, interesados: 2 }
  ]
};
