# PIPELINE INDUSTRIAL DE CONSTRUCCIÓN: POPUCHAT 2
**Rama de Git activa:** `popu-chat2` (Protección total de `main`)  
**Directorio de trabajo:** `popuchat2/`  
**Política de control:**
- Cada paso o fase finalizada se verifica y se registra en este documento.
- Se ejecuta un `git commit` local descriptivo por cada avance completado.
- El comando `git push origin popu-chat2` queda reservado exclusivamente para ejecución del usuario.

---

## 📊 TABLERO DE CONTROL Y AVANCE DEL PIPELINE

| Fase | Etapa / Módulo | Estado | Archivos Involucrados | Commit Asociado |
|---|---|---|---|---|
| **Fase 0** | **Gobernanza, Aislamiento y Especificación** | ✅ **COMPLETADO** | `popuchat2/ESPECIFICACION_Y_PLAN_MAESTRO_POPUCHAT2.md`<br>`popuchat2/GUION_EXPOSICION_POPUCHAT2.docx`<br>`popuchat2/GUION_EXPOSICION_POPUCHAT2.md`<br>`popuchat2/PIPELINE.md` | Commit: `3585f33` |
| **Fase 1** | **Capa de Preprocesamiento PLN Híbrido** | ✅ **COMPLETADO (20/20 Tests)** | `popuchat2/pipeline/text_processor.js`<br>`popuchat2/pipeline/tone_analyzer.js`<br>`popuchat2/pipeline/intent_detector.js`<br>`popuchat2/pipeline/test_pipeline.js` | Commit: `08c149e` |
| **Fase 2** | **Capa Documental, Chunking y Motor RAG** | ✅ **COMPLETADO (18/18 Tests)** | `popuchat2/data/fuentes/`<br>`popuchat2/rag/chunker.js`<br>`popuchat2/rag/rag_engine.js`<br>`popuchat2/rag/test_rag.js` | Commit: `0abcbd8` |
| **Fase 3** | **Capa Generativa e Inferencia LLM** | ✅ **COMPLETADO (22/22 Tests)** | `popuchat2/engine/system_prompt.js`<br>`popuchat2/engine/memory_manager.js`<br>`popuchat2/engine/gemini_client.js`<br>`popuchat2/engine/mode_router.js`<br>`popuchat2/engine/test_engine.js` | Commit: `99d2051` |
| **Fase 4** | **Capa de Interfaz (Fiel a Popu 1), Panel Oculto y Despliegue Render** | ⏳ *Próxima* | `popuchat2/server.js`<br>`popuchat2/ui/index.html`<br>`popuchat2/ui/style.css`<br>`popuchat2/ui/app.js`<br>`popuchat2/ui/csv_exporter.js`<br>`popuchat2/package.json` | Pendiente |
| **Fase 5** | **Batería de Pruebas Evaluativas (Clase 14)** | ⏳ *En cola* | `popuchat2/tests/evaluacion_suite.js`<br>`popuchat2/tests/reporte_certificacion.md` | Pendiente |

---

## 📝 REGISTRO DETALLADO POR FASES

### ✅ FASE 0: GOBERNANZA, AISLAMIENTO Y ESPECIFICACIÓN
* **Fecha:** 17/11/2026
* **Acciones realizadas:**
  1. Activación de la rama `popu-chat2` vinculada a `origin/popu-chat2`.
  2. Creación del directorio aislado `popuchat2/` para garantizar inmutabilidad absoluta de PopuChat 1 (`main`).
  3. Redacción del documento rector de especificación técnica con los 10 puntos de contraste entre Popu 1 y Popu 2.
  4. Redacción del Guión de Exposición y Defensa Técnica formal tanto en `.docx` como en `.md`.
  5. Creación del Pipeline Maestro de seguimiento.

---

### ⏳ FASE 1: CAPA DE PREPROCESAMIENTO PLN HÍBRIDO (`popuchat2/pipeline/`)
* **Paso 1.1:** Construcción del procesador de texto (Normalización Unicode NFD, reducción de repeticiones, expansión de abreviaciones y corrección ortográfica).
* **Paso 1.2:** Construcción del analizador jerárquico de tono (`Molesto > Agradecido > Formal > Informal > Neutral`) con blindaje para fórmulas de cortesía.
* **Paso 1.3:** Extractor de saludos y clasificador de intenciones institucionales.
* **Paso 1.4:** Creación y ejecución de la suite de pruebas unitarias de PLN.
* **Commit previsto:** `feat(pipeline): implementar preprocesamiento PLN hibrido y analizador de tono`

---

### ⏳ FASE 2: INGESTA DOCUMENTAL, CHUNKING Y MOTOR RAG (`popuchat2/rag/`)
* **Paso 2.1:** Organización de los documentos institucionales oficiales del Populorum en `popuchat2/data/fuentes/`.
* **Paso 2.2:** Implementación del algoritmo de fragmentación (700 caracteres, 120 de solapamiento y corte en límites de oraciones).
* **Paso 2.3:** Implementación del indexador vectorial con embeddings E5, cálculo de similitud coseno y filtro de corte con umbral $\ge 0.35$ ($Top\_K = 4$).
* **Paso 2.4:** Pruebas de recuperación semántica con paráfrasis.
* **Commit previsto:** `feat(rag): implementar fragmentacion 700/120 y motor de busqueda semantica E5`

---

### ⏳ FASE 3: MOTOR GENERATIVO E INFERENCIA (`popuchat2/engine/`)
* **Paso 3.1:** Implementación del System Prompt gobernado por las 10 reglas obligatorias inmutables.
* **Paso 3.2:** Implementación del gestor de memoria conversacional (ventana deslizante de 6 turnos / 12 mensajes).
* **Paso 3.3:** Conector de inferencia con parámetros fijos (temperatura 0.2-0.3, max tokens 350, rep penalty 1.08).
* **Paso 3.4:** Controlador de los 3 modos de operación (Solo Base, Mixto, Solo IA General).
* **Commit previsto:** `feat(engine): ensamblar generador de respuestas, reglas obligatorias y memoria contextual`

---

### ⏳ FASE 4: CAPA DE INTERFAZ (FIEL A POPU 1), PANEL OCULTO Y DESPLIEGUE RENDER (`popuchat2/ui/` y `popuchat2/server.js`)
* **Filosofía Visual:** Conservar 100% la estética original de PopuChat 1 (glassmorphism, orbes, colores `#F5CE5B` / `#4FA0D8` y mascota original `mascot.png`). No se utiliza interfaz tipo Gradio.
* **Micro-Avance 4.1: Servidor Express y API REST para Render (`popuchat2/server.js`)** ✅ **COMPLETADO (15/15 Tests)**
  - Servidor backend autónomo preparado para Render (`process.env.PORT || 3000`).
  - Endpoints probados y verificados:
    - `POST /api/chat`: Recibe `{ mensaje, modo, top_k, temperatura, max_tokens, apiKey? }` y procesa la inferencia en caliente.
    - `GET /api/auditoria/csv`: Genera y descarga el archivo CSV de auditoría acumulado con UTF-8 BOM.
    - `POST /api/reiniciar`: Resetea la memoria de contexto (los 6 turnos).
    - `GET /api/health`: Endpoint de diagnóstico y healthcheck de Render.
  - Servicio de archivos estáticos desde `popuchat2/ui/` y recursos gráficos originales desde `/img`.
* **Micro-Avance 4.2: Frontend Fiel a Popu 1 con Panel Oculto de Niveles Oficiales (`popuchat2/ui/index.html` y `style.css`)**
  - Estructura visual exacta de PopuChat 1 con su mascota y cabecera institucional.
  - Incorporación en el header del icono sutil de engranaje (`⚙️`).
  - Maquetado del **Panel Oculto Desplegable (Cajón Lateral de Configuración y Diagnóstico)**:
    1. **Los 4 Controles de Inferencia de Cátedra (Originales del Notebook):**
       - **Selector de Modo:** Radio/píldoras (`Solo base de conocimiento` [def] / `Base + conocimiento general` / `Solo IA general`).
       - **Slider `top_k` (Fragmentos a recuperar):** Rango de 1 a 8 (Default: `4`, paso: `1`).
       - **Slider `temperatura` (Creatividad):** Rango de 0.0 a 1.0 (Default: `0.3`, paso: `0.1`).
       - **Slider `max_tokens` (Extensión máxima):** Rango de 100 a 700 tokens (Default: `350`, paso: `50`).
    2. **Bloque de Diagnóstico PLN en Vivo:**
       - Tono detectado con badge de color (rojo: Molesto, verde: Agradecido, azul: Formal, gris: Neutral).
       - Saludo contextual detectado e Intenciones identificadas.
    3. **Bloque de Evidencia RAG:**
       - Tabla interactiva de fragmentos recuperados con nombre de fuente y puntuación de similitud coseno ($\ge 0.35$).
    4. **Auditoría de Cátedra:**
       - Botón destacado `[📥 Descargar Registro CSV]`.
    5. **Credenciales:**
       - Campo opcional para ingresar/actualizar la `GEMINI_API_KEY` directamente en el navegador.
* **Micro-Avance 4.3: Controlador de Cliente y Telemetría en Vivo (`popuchat2/ui/app.js`)**
  - Manejo de chat interactivo con citas de fuentes formales al pie (`Fuentes: ...`).
  - Apertura/cierre fluido del panel lateral al tocar el engranaje `⚙️` o la tecla `Esc`.
  - Sincronización en tiempo real de los sliders (`top_k`, `temperatura`, `max_tokens`, `modo`) con las peticiones al backend.
  - Actualización reactiva de las tarjetas de diagnóstico tras cada mensaje.
* **Micro-Avance 4.4: Motor de Auditoría y Descarga CSV (`popuchat2/ui/csv_exporter.js`)**
  - Generador de CSV en el cliente con codificación UTF-8 BOM para apertura perfecta en Excel.
  - Esquema oficial de 8 columnas: `fecha_hora`, `pregunta`, `normalizado`, `tono`, `intenciones`, `modo`, `fuentes`, `respuesta`.
* **Micro-Avance 4.5: Configuración Completa de Despliegue en Render (`popuchat2/package.json` y `render.yaml`)**
  - Archivo `package.json` autónomo con dependencias (`express`, `cors`).
  - Especificación formal para Render Web Service:
    - **Build Command:** `npm install`
    - **Start Command:** `node server.js`
    - **Root Directory:** `popuchat2`
    - **Branch:** `popu-chat2` (main protegida)
    - **Environment Variable:** `GEMINI_API_KEY` (configurada en el panel privado de Render).
    - Asignación dinámica del puerto asignado por Render vía `process.env.PORT`.
* **Commit previsto:** `feat(ui): implementar interfaz fiel a Popu 1, panel oculto con sliders oficiales y backend Render`

---

### ⏳ FASE 5: CERTIFICACIÓN Y BATERÍA DE PRUEBAS DE CÁTEDRA (`popuchat2/tests/`)
* **Paso 5.1:** Ejecución automatizada de los 8 casos evaluativos de la Clase 14 (paráfrasis, usuario molesto, preguntas trampa sin alucinación, cita de fuentes).
* **Paso 5.2:** Generación del informe de certificación y exportación del CSV final para la exposición.
* **Commit previsto:** `test: certificar suite evaluativa oficial de la Clase 14`
