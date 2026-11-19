# PIPELINE DE IMPLEMENTACIÓN: CLON 1:1 POPU 1 + PANEL COMPLETO GRADIO (COLAB 20:22) EN POPUCHAT 2

## 1. Objetivo General
Integrar en **`popuchat2`** la totalidad de la lógica validada en Google Colab (`NPL_IA/PopuChat_2_RAG_PLN_OFICIAL.ipynb`, versión 20:22) y las **5 vistas/funcionalidades de la interfaz de cátedra**, manteniendo **100% intacta la interfaz principal de Popu 1** y su paleta de colores oficial (`#0f2027` / `#132430` azul petróleo oscuro, `#F5CE5B` dorado institucional y `#4FA0D8` celeste).

---

## 2. Etapas de Ejecución del Pipeline

### Etapa 1 — Base Documental Oficial del IES N° 7 (5 Fuentes Verificadas)
1. **`Oferta académica y carreras - IES N° 7`** (`01_oferta_academica_carreras.txt`):
   - Incluye resumen ejecutivo inicial con todas las Tecnicaturas Superiores (3 años) y Profesorados (4 años) por sede para garantizar cobertura total en `top_k=4`, seguido del perfil y campo laboral de cada carrera.
2. **`Inscripciones y requisitos 2027 - IES N° 7`** (`02_inscripciones_requisitos.txt`):
   - Incluye fechas oficiales de inscripción (diciembre 2026 hasta el 31 de marzo de 2027), Curso de Ingreso Nivelatorio (01 al 19 de marzo de 2027) y los 8 requisitos documentales obligatorios.
3. **`Aranceles, cuotas y becas - IES N° 7`** (`03_aranceles_cuotas_becas.txt`):
   - Cuota general ($60.000), cuota carreras especiales ($70.000), plan de 10 cuotas (marzo a diciembre), matrícula promocional 2027 ($90.000 en diciembre 2026 / $100.000 hasta el 31 de marzo de 2027) y régimen de becas.
4. **`Sedes, horarios y contacto - IES N° 7`** (`04_sedes_horarios_contacto.txt`):
   - Sede Central (Sarmiento 268 y Belgrano 435, Tel. 0388-4224514, turnos 08:00 a 12:30 y 15:30 a 20:30), Sede Perico, Sede San Pedro y Sede Libertador.
5. **`Reglamento académico y exámenes finales - IES N° 7`** (`05_reglamento_academico_examenes.txt`):
   - Inscripción a mesas finales hasta 48 hs hábiles antes por Campus Virtual, vigencia de regularidad de 2 años académicos, asistencia mínima 75% (60% justificado) y aprobación con nota mínima 6.

### Etapa 2 — Motor PLN + RAG + Administración Documental + Gemini (`engine/` y `rag/`)
1. **Administración de `DOCUMENTOS_BASE` y `DOCUMENTOS_ACTIVOS`**:
   - Soporte para agregar nuevos documentos (`.txt`, `.md`, `.pdf`, `.docx`), conservar o reemplazar la base oficial de PopuChat (`conservar_popu`), reconstruir el índice RAG en caliente y restaurar la base oficial (`restaurar_base_popu`).
2. **Motor de Inferencia Híbrido (`gemini_client.js` y `mode_router.js`)**:
   - Réplica exacta de `PROMPT_SISTEMA_BASE` (10 reglas obligatorias) y `construir_mensaje_usuario` del notebook de las 20:22.
   - Comportamiento exacto de los 3 modos:
     * `Solo base de conocimiento`: Usa únicamente fragmentos con similitud $\ge 0.35$. Si no hay evidencia o la consulta pide datos institucionales fuera de la base, rechaza inventar información.
     * `Base + conocimiento general`: Prioriza los fragmentos del IES N° 7 y complementa con explicación general.
     * `Solo IA general`: Desactiva los documentos (`resultados = []`). Si se pregunta por datos internos del Populorum sin documentos, indica que no figura en la base de conocimiento (`Fuentes: ninguna.`); si se hace una consulta de conocimiento general (ej. Ciencia de Datos o consejos para examen oral), responde con conocimiento general (`Fuentes: conocimiento general del modelo.`).
   - Conexión a Google Gemini API (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`) y sintetizador estructurado local de alta precisión para que las respuestas sean siempre completas, con viñetas limpias y sin cortes.

### Etapa 3 — Endpoints REST en `server.js`
1. `GET /api/health`: Estado del servidor y cantidad de fragmentos activos.
2. `POST /api/chat`: Procesa la consulta con `modo`, `top_k`, `temperatura`, `max_tokens`, `apiKey` y devuelve `respuesta`, `normalizado`, `tono`, `saludo`, `intenciones`, `fuentes`, `resultadosRAG` y `registroAuditoria`.
3. `GET /api/documentos`: Devuelve la lista de `documentosActivos` (`Fuente`, `Caracteres`), `totalFragmentos` y mensaje de estado.
4. `POST /api/documentos/procesar`: Recibe archivos cargados desde la pestaña *Base de conocimiento* y el booleano `conservar_popu`, reconstruye el índice RAG y devuelve el resumen actualizado.
5. `POST /api/documentos/restaurar`: Restaura los 5 documentos oficiales de PopuChat y reconstruye el índice RAG.
6. `GET /api/auditoria/csv`: Genera y descarga `registro_consultas_chatbot_rag.csv` con BOM UTF-8 y las 8 columnas oficiales de cátedra.
7. `POST /api/reiniciar`: Limpia la memoria conversacional.

### Etapa 4 — Interfaz Completa (Popu 1 + Las 5 Vistas de Gradio en el Panel `⚙️`)
1. **Vista Principal (100% Popu 1)**:
   - Splash screen, mascota, acordeones de bienvenida, tren de botones rápidos marquee, micrófono, botón redondo amarillo y síntesis de voz argentina.
2. **Panel Desplegable `⚙️` (Oculto al inicio, con la paleta de colores de Popu 1)**:
   - **Hero Header**: Chip `IA generativa + PLN + RAG`, título `PopuChat 2`, subtítulo oficial, botón `⚙️ Configuración` (abre modal de Imagen 4) y botón cerrar `×`.
   - **Pestaña 1 — `Conversación` (Imágenes 1 y 5)**:
     * Radio buttons de `Modo de respuesta`.
     * Sliders con valor numérico y botón reset (`↺`): `Fragmentos a recuperar` (1–8, default 4), `Creatividad` (0–1, default 0.3), `Extensión máxima` (100–700, default 350).
     * Los 4 botones de `Preguntas sugeridas` de cátedra + botón `Nueva conversación`.
     * Acordeón **`Ver cómo procesó la consulta`** con el bloque **Análisis de la consulta** (`Texto normalizado`, `Tono`, `Saludo detectado`, `Intenciones`, `Fuentes usadas`) y la **Tabla de 4 columnas** (`Fuente`, `Fragmento`, `Similitud`, `Contenido`).
   - **Pestaña 2 — `Base de conocimiento` (Imagen 2)**:
     * Cargador de archivos (`PDF, TXT, MD y DOCX`), checkbox `☑ Conservar la base oficial de PopuChat`, botones `Procesar documentos` y `Restaurar base PopuChat`, estado de la base y tabla **`Documentos activos`** (`Fuente` | `Caracteres`).
   - **Pestaña 3 — `Registro y evaluación` (Imagen 3)**:
     * Detalle de campos registrados, botón **`Generar CSV del registro`** y fila de descarga **`Descargar registro`** (`registro_consultas_chatbot_rag.csv` con peso en `KB ↓`).
   - **Modal / Vista 4 — `⚙️ Configuración` (Imagen 4)**:
     * `Tema de visualización` (`Light` / `Dark` / `System`), `Idioma` (`Español`), `Aplicación web progresiva`, `Screen Studio [BETA]` (`Start Recording`) y `Credencial Gemini API`.

### Etapa 5 — Verificación Automatizada, Pruebas Locales y Commit
1. Ejecutar todas las suites de pruebas (`test_pipeline.js`, `test_rag.js`, `test_engine.js`, `test_ui_markup.js`, `test_ui_client.js`, `test_server.js`).
2. Realizar commit en la rama `popu-chat2` y dejar el servidor local listo para prueba del usuario antes del `git push`.
