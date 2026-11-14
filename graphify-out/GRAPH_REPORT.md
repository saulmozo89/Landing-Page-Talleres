# Graph Report - Landing-Page-Talleres  (2026-11-07)

## Corpus Check
- Corpus is ~4,054 words - fits in a single context window. You may not need a graph.

## Summary
- 79 nodes · 156 edges · 8 communities
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.85)
- Token cost: 72,072 input · 0 output

## Community Hubs (Navigation)
- Backend Apps Script
- PWA y modo sin conexión
- Documentación y reglas de negocio
- Catálogo y filtros
- Carga de datos y API
- Detalle de taller y fechas
- Núcleo app.js y modales
- Documentos, footer y WhatsApp

## God Nodes (most connected - your core abstractions)
1. `doPost()` - 14 edges
2. `armarCatalogo_()` - 11 edges
3. `pintarTodo()` - 8 edges
4. `pintarTarjetas()` - 8 edges
5. `enviarPreregistro()` - 8 edges
6. `esc()` - 7 edges
7. `htmlDetalle()` - 7 edges
8. `Pre-registro / waitlist form dialog (#modal)` - 7 edges
9. `aFecha()` - 6 edges
10. `calcular()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `calcular()` --semantically_similar_to--> `contarOcupados_()`  [INFERRED] [semantically similar]
  app.js → Codigo.gs
- `siguienteApertura()` --semantically_similar_to--> `siguienteApertura_()`  [INFERRED] [semantically similar]
  app.js → Codigo.gs
- `DATOS_EJEMPLO` --shares_data_with--> `armarCatalogo_()`  [INFERRED]
  datos.js → Codigo.gs
- `Fixed 'today' date (30-oct-2026)` --rationale_for--> `calcular()`  [INFERRED]
  LEEME.md → app.js
- `Detail dialog (#modal-detalle)` --references--> `mostrarDetalle()`  [INFERRED]
  index.html → app.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pre-registro / lista de espera submission flow** — index_modal_preregistro, app_abrirformulario, app_enviarpreregistro, codigo_dopost, codigo_contarocupados_, codigo_siguienteapertura_, codigo_hoja_inscripciones [INFERRED 0.85]
- **Catalog load: Sheets to landing render** — codigo_doget, codigo_armarcatalogo_, codigo_leertabla_, app_cargar, app_pintartodo, datos_datos_ejemplo [INFERRED 0.85]

## Communities (8 total, 0 thin omitted)

### Community 0 - "Backend Apps Script"
Cohesion: 0.20
Nodes (12): armarCatalogo_(), CFG, contarOcupados_(), doPost(), esSi_(), fechaISO_(), Inscripciones sheet, leerConfig_() (+4 more)

### Community 1 - "PWA y modo sin conexión"
Cohesion: 0.14
Nodes (12): avisoConexion(), Offline banner (#sin-senal), Modo sin conexión (PWA), background_color, display, icons, lang, name (+4 more)

### Community 2 - "Documentación y reglas de negocio"
Cohesion: 0.21
Nodes (9): Codigo.gs (Apps Script backend), DATOS_EJEMPLO, Aviso de privacidad (provisional), Pre-registro / waitlist form dialog (#modal), Tailwind CSS CDN, Google Sheets backend setup, Lista de espera, Live Server (VS Code extension) (+1 more)

### Community 3 - "Catálogo y filtros"
Cohesion: 0.28
Nodes (9): botonAccion(), cambiarFiltro(), fechaCorta(), FILTROS, pintarFiltros(), pintarResumen(), pintarTarjetas(), pintarTodo() (+1 more)

### Community 4 - "Carga de datos y API"
Cohesion: 0.29
Nodes (7): calcular(), cargar(), enviarPreregistro(), mostrarDetalle(), doGet(), Detail dialog (#modal-detalle), URL_API

### Community 5 - "Detalle de taller y fechas"
Cohesion: 0.38
Nodes (7): abrirFormulario(), aFecha(), fechaLarga(), htmlDetalle(), siguienteApertura(), verDetalle(), Detalle y fechas section (#detalle)

### Community 6 - "Núcleo app.js y modales"
Cohesion: 0.33
Nodes (3): COLOR_BARRA, ESTILO_ESTADO, MESES

### Community 7 - "Documentos, footer y WhatsApp"
Cohesion: 0.33
Nodes (6): esc(), linkWhatsApp(), mostrarListo(), pintarDocumentos(), Footer: ubicación, WhatsApp, redes, Documentos section (#lista-docs)

## Knowledge Gaps
- **2 isolated node(s):** `Live Server (VS Code extension)`, `Tailwind CSS CDN`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 20 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `doPost()` connect `Backend Apps Script` to `Documentación y reglas de negocio`, `Carga de datos y API`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `doPost()` (e.g. with `enviarPreregistro()` and `Pre-registro / waitlist form dialog (#modal)`) actually correct?**
  _`doPost()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Live Server (VS Code extension)`, `Tailwind CSS CDN` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PWA y modo sin conexión` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `armarCatalogo_()` connect `Backend Apps Script` to `Documentación y reglas de negocio`, `Carga de datos y API`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `armarCatalogo_()` (e.g. with `DATOS_EJEMPLO` and `Aperturas (periodos con fechas y cupo)`) actually correct?**
  _`armarCatalogo_()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Why does `enviarPreregistro()` connect `Carga de datos y API` to `Backend Apps Script`, `Documentación y reglas de negocio`, `Catálogo y filtros`, `Núcleo app.js y modales`, `Documentos, footer y WhatsApp`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._