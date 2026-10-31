# Prototipo de la landing de talleres

Prototipo visual con datos de ejemplo (todavía no se conecta a Google Sheets).

Incluye: catálogo por **aperturas** (cada taller se abre por periodos con sus propias fechas y cupo), **pre-registro** (nombre y teléfono; aparta el lugar) y **lista de espera** (si el taller ya comenzó o está lleno, la persona queda con prioridad para la siguiente apertura). En el prototipo el envío del formulario es simulado: no se guarda en ningún lado.

## Cómo abrirlo en VS Code

1. Descomprime la carpeta y ábrela en VS Code (Archivo → Abrir carpeta).
2. Instala la extensión **Live Server** (de Ritwick Dey).
3. Clic derecho en `index.html` → **Open with Live Server**. Se abre en el navegador y se recarga solo cada vez que guardas.

También puedes abrir `index.html` con doble clic, pero así no funciona el modo sin conexión.

## Qué hay en cada archivo

| Archivo | Para qué |
|---|---|
| `index.html` | La estructura y el diseño de la página (secciones del PDF). |
| `app.js` | Calcula cupos y estados, pinta tarjetas, filtros y detalle, y maneja el formulario de pre-registro / lista de espera. |
| `datos.js` | Talleres, aperturas y documentos de ejemplo. **Edita aquí para probar** cupos, fechas, días que se aparta el lugar o el número de WhatsApp. |
| `manifest.json`, `sw.js`, `icono.svg` | Hacen que se pueda instalar en el celular y abrir sin señal. |

## Siguiente paso (cuando quieras)

Cuando exista el Apps Script, se pone su URL en `URL_API` dentro de `app.js` y la página empieza a leer de Google Sheets. `datos.js` ya tiene la misma forma que tendrá ese JSON.

Nota: en `app.js` la fecha de "hoy" está fija en 30-oct-2026 para que los estados de ejemplo se vean bien. En la versión real va `new Date()`.

## Conectar con Google Sheets (backend)

1. Abre tu hoja en Google Sheets. Si la subiste como .xlsx, primero ve a **Archivo → Guardar como Hojas de cálculo de Google**.
2. **Extensiones → Apps Script**. Borra lo que haya y pega todo `Codigo.gs`. Guarda.
3. Ejecuta `probarCatalogo` una vez (te pedirá permisos) y revisa en el registro que salgan talleres y aperturas.
4. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Acceso: **Cualquier usuario**. Copia la URL que termina en `/exec`.
5. Pega esa URL en `URL_API` al inicio de `app.js` y recarga la página.

Cada vez que cambies `Codigo.gs`: Implementar → Gestionar implementaciones → ✏️ → Nueva versión. La URL no cambia.
