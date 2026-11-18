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
| **Fase 0** | **Gobernanza, Aislamiento y Especificación** | ✅ **COMPLETADO** | `popuchat2/ESPECIFICACION_Y_PLAN_MAESTRO_POPUCHAT2.md`<br>`popuchat2/GUION_EXPOSICION_POPUCHAT2.docx`<br>`popuchat2/GUION_EXPOSICION_POPUCHAT2.md`<br>`popuchat2/PIPELINE.md` | Commit: `9a071bf` |
| **Fase 1** | **Capa de Preprocesamiento PLN Híbrido** | ✅ **COMPLETADO (20/20 Tests)** | `popuchat2/pipeline/text_processor.js`<br>`popuchat2/pipeline/tone_analyzer.js`<br>`popuchat2/pipeline/intent_detector.js`<br>`popuchat2/pipeline/test_pipeline.js` | Commit: `726b991` |
| **Fase 2** | **Capa Documental, Chunking y Motor RAG** | ⏳ *En cola* | `popuchat2/data/fuentes/`<br>`popuchat2/rag/chunker.js`<br>`popuchat2/rag/rag_index.js`<br>`popuchat2/rag/test_rag.js` | Pendiente |
| **Fase 3** | **Capa Generativa e Inferencia LLM** | ⏳ *En cola* | `popuchat2/engine/system_prompt.js`<br>`popuchat2/engine/memory_manager.js`<br>`popuchat2/engine/llm_connector.js`<br>`popuchat2/engine/mode_router.js` | Pendiente |
| **Fase 4** | **Capa de Interfaz, Panel y Auditoría CSV** | ⏳ *En cola* | `popuchat2/ui/index.html`<br>`popuchat2/ui/app.js`<br>`popuchat2/ui/style.css`<br>`popuchat2/ui/csv_exporter.js` | Pendiente |
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

### ⏳ FASE 4: INTERFAZ DE USUARIO, PANEL Y AUDITORÍA CSV (`popuchat2/ui/`)
* **Paso 4.1:** Construcción de la interfaz web tipo chat moderna.
* **Paso 4.2:** Panel de diagnóstico técnico en tiempo real (muestra texto normalizado, tono, intenciones y fragmentos recuperados con score).
* **Paso 4.3:** Módulo de registro de auditoría y descarga de archivo CSV con el esquema oficial docente.
* **Commit previsto:** `feat(ui): implementar interfaz de usuario con panel tecnico y descarga CSV`

---

### ⏳ FASE 5: CERTIFICACIÓN Y BATERÍA DE PRUEBAS DE CÁTEDRA (`popuchat2/tests/`)
* **Paso 5.1:** Ejecución automatizada de los 8 casos evaluativos de la Clase 14 (paráfrasis, usuario molesto, preguntas trampa sin alucinación, cita de fuentes).
* **Paso 5.2:** Generación del informe de certificación y exportación del CSV final para la exposición.
* **Commit previsto:** `test: certificar suite evaluativa oficial de la Clase 14`
