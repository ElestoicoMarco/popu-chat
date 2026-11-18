# GUIÓN QUIRÚRGICO DE EXPOSICIÓN Y DEFENSA TÉCNICA
**Proyecto:** PopuChat 2 — Asistente Híbrido Académico (PLN + RAG + IA Generativa)  
**Institución:** IES N° 7 "Populorum Progressio" - INTELA  
**Cátedra:** Procesamiento de Lenguaje Natural (PLN)  
**Tiempo estimado:** 7 a 10 minutos (Exposición conceptual + Demostración en vivo)  
**Versión Word descargable:** [`popuchat2/GUION_EXPOSICION_POPUCHAT2.docx`](file:///C:/Users/MARCOGALU/OneDrive/Desktop/popu-chat/popuchat2/GUION_EXPOSICION_POPUCHAT2.docx)

---

## 📌 FICHA TÉCNICA RÁPIDA DEL EXPOSITOR
* **Tesis Central:** *"No reemplazamos reglas por IA pura: creamos un sistema híbrido explicable, blindado contra alucinaciones con RAG y citación fáctica obligatoria."*
* **Pantallas a tener abiertas:**
  1. Interfaz de PopuChat 2 con panel técnico lateral.
  2. Explorador de archivos mostrando la carpeta aislada `popuchat2/`.
  3. Terminal en la rama `popu-chat2`.
  4. Archivo CSV de auditoría listo para ser descargado/mostrado.

---

## 🎙️ MINUTO 0:00 - 1:30 | APERTURA Y TESIS CENTRAL

> **Acción en pantalla:** Mostrar la interfaz de PopuChat 2 limpia, con el mensaje de bienvenida y el panel técnico lateral.

### 🗣️ Qué decir textualmente:
> *"Buenas tardes profesora y compañeros. En el primer cuatrimestre desarrollamos PopuChat 1, un chatbot institucional basado en reglas lógicas y procesamiento clásico de texto. Si bien lograba responder preguntas sobre la oferta académica, presentaba la limitación clásica de los sistemas basados puramente en reglas: si el usuario no utilizaba la palabra clave exacta o formulaba la consulta con otras palabras, el bot quedaba ciego o devolvía mensajes genéricos.*
> 
> *Hoy presentamos **PopuChat 2**. Siguiendo las directrices pedagógicas de la cátedra, **no desechamos el trabajo de PLN previo para colocar una IA genérica abierta**: construimos un **Chatbot Híbrido Explicable**. Esto significa que las técnicas de PLN limpian y analizan la consulta, un motor de búsqueda semántica (RAG) recupera evidencia fáctica de documentos institucionales oficiales, y un modelo generativo redacta una respuesta concisa, empática y citando obligatoriamente sus fuentes. Cero alucinaciones y máxima explicabilidad."*

---

## 🏗️ MINUTO 1:30 - 3:30 | ARQUITECTURA EN 5 CAPAS

> **Acción en pantalla:** Señalar el panel técnico o el diagrama de flujo arquitectónico.

### 🗣️ Qué decir textualmente:
> *"La arquitectura de PopuChat 2 opera en 5 capas industriales perfectamente articuladas:*
> 
> 1. **Capa 1: Preprocesamiento de PLN:** *Antes de consultar al modelo, limpiamos la entrada: normalización Unicode NFD, colapso de caracteres repetidos abusivos, expansión de abreviaciones comunes (`q`, `wsp`, `info`) y corrección ortográfica. Además, ejecutamos un detector jerárquico de tono (`Molesto > Agradecido > Formal > Informal > Neutral`) y extraemos el saludo para responderlo una única vez.*
> 
> 2. **Capa 2: Motor RAG y Fragmentación:** *Los documentos oficiales (reglamentos, aranceles, planes de estudio) se procesan con un algoritmo de chunking en bloques de **700 caracteres con 120 caracteres de solapamiento**, cortando siempre en fronteras de oraciones naturales para no truncar ideas. Usamos el modelo `multilingual-e5-small` con prefijos `passage:` y `query:` para vectorizar.*
> 
> 3. **Capa 3: Inferencia Semántica y Umbral Fáctico:** *Calculamos similitud coseno. Si los fragmentos no alcanzan el **umbral de corte estricto de 0.35**, el sistema descarta la evidencia y no inventa.*
> 
> 4. **Capa 4: Motor Generativo Gobernado:** *El modelo instructivo opera bajo un System Prompt inmutable con **10 reglas obligatorias**, temperatura baja (0.2 a 0.3) para máxima precisión, y una ventana de memoria contextual de hasta **6 turnos conversacionales completos**.*
> 
> 5. **Capa 5: Panel de Auditoría y Telemetría:** *Cada mensaje se registra en una matriz exportable a CSV con timestamp, texto normalizado, tono, intenciones, fragmentos utilizados y tiempo de respuesta para control docente."*

---

## ⚡ MINUTO 3:30 - 6:30 | DEMOSTRACIÓN EN VIVO (LOS 4 CASOS DE FUEGO)

### 🔥 Caso 1: Paráfrasis y Comprensión Semántica (Clase 14)
* **Pregunta a escribir en el chat:** `¿En qué momento del día puedo hablar con Secretaría?`
* **Qué destacar oralmente:**
  > *"Observen que no escribí la palabra clave 'horario'. PopuChat 1 hubiera fallado. Aquí, el embedding semántico vectorizó la pregunta, recuperó el fragmento de 'Horarios y Contacto' con similitud superior a 0.65, y el bot redactó: 'Secretaría Académica atiende de lunes a viernes de 8:00 a 18:00 hs'. Al pie, incluye: `Fuentes: Horarios y contacto`."*

### 🔥 Caso 2: Detección de Usuario Molesto y Empatía Activa (Clase 6 y 14)
* **Pregunta a escribir en el chat:** `HACE RATO PREGUNTO Y NADIE ME DICE CUÁNDO ATIENDEN!!!`
* **Qué destacar oralmente:**
  > *"El pipeline de PLN detecta automáticamente las mayúsculas continuas y los tres signos de exclamación. El analizador de tono lo clasifica inmediatamente como 'Molesto'. Observen que el bot no responde secamente: primero muestra contención empática ('Comprendo tu molestia, te informo de inmediato que...') y luego entrega la respuesta. Demostramos inteligencia emocional artificial controlada por reglas."*

### 🔥 Caso 3: Blindaje Fáctico y Cero Alucinación / Pregunta Trampa (Clase 11 y 14)
* **Pregunta a escribir en el chat:** `¿Quién es el rector actual?` o `¿Quién ganó el último Mundial?`
* **Qué destacar oralmente:**
  > *"Una IA generativa genérica inventaría un nombre plausible o respondería sobre fútbol. En nuestro Modo Estricto, al no haber fragmentos que superen el umbral de 0.35 en la base institucional, PopuChat 2 responde honestamente: 'No encontré información suficiente sobre esa consulta en la base de conocimiento institucional'. Cumplimos la regla número 3 del prompt: prohibido alucinar."*

### 🔥 Caso 4: Pregunta Múltiple y Cita Verificable (Clase 14)
* **Pregunta a escribir en el chat:** `¿Qué carreras hay, cuánto duran y qué cuota tienen?`
* **Qué destacar oralmente:**
  > *"El bot desglosa las tres consultas simultáneas: lista las tecnicaturas, aclara la duración estimada de 3 años, explica la política de aranceles y cita al pie: `Fuentes: Oferta académica 2026; Aranceles y becas`."*

---

## 🏁 MINUTO 6:30 - 8:00 | CIERRE Y PANEL DE AUDITORÍA DOCENTE

> **Acción en pantalla:** Abrir el panel técnico lateral y hacer clic en el botón de exportación CSV.

### 🗣️ Qué decir textualmente:
> *"Para finalizar, la cátedra solicitó que el sistema sea auditable y transparente. En el panel técnico lateral pueden observar en tiempo real los metadatos de la consulta: el texto normalizado, el tono asignado, las intenciones detectadas y la tabla de fragmentos con su puntaje de similitud coseno.*
> 
> *Hacemos clic en 'Descargar Registro CSV' y se genera instantáneamente el archivo con la traza completa de la sesión para evaluación docente.*
> 
> *En conclusión: PopuChat 2 demuestra que la verdadera ingeniería en PLN no consiste en dejar hablar libremente a un modelo de IA, sino en orquestar el procesamiento clásico de lenguaje natural, la recuperación documental rigurosa mediante RAG y modelos generativos gobernados por estrictas políticas de comportamiento. Quedo a disposición de la profesora para las preguntas técnicas. Muchas gracias."*

---

## 🛡️ SECCIÓN ESPECIAL: PREGUNTAS TRAMPA DE LA PROFESORA Y CÓMO RESPONDERLAS (ESCUDO DEFENSIVO)

### ❓ Pregunta 1: *"¿Por qué no hicieron Fine-Tuning en vez de RAG?"*
* **Respuesta Maestra:**
  > *"Porque el Fine-Tuning sirve para ajustar el estilo, el tono o aprender una tarea lingüística específica, pero no es adecuado para información institucional dinámica. Si cambian los aranceles, las fechas de inscripción o los reglamentos, con Fine-Tuning habría que reentrenar el modelo con costo computacional alto. Con RAG, la actualización es inmediata: basta con actualizar el documento o PDF. Además, el Fine-Tuning no elimina las alucinaciones ni permite citar fuentes verificables en tiempo real."*

### ❓ Pregunta 2: *"¿Por qué eligieron tamaño de fragmento 700 y solapamiento 120?"*
* **Respuesta Maestra:**
  > *"700 caracteres equivalen a un párrafo de entre 100 y 120 palabras, lo cual preserva una unidad semántica completa (un artículo del reglamento o una carrera) sin diluir el vector del embedding. Los 120 caracteres de solapamiento garantizan que si un dato clave (por ejemplo, una fecha de inscripción) queda en el límite de corte, se repita al inicio del siguiente fragmento, evitando perder el contexto oracional."*

### ❓ Pregunta 3: *"¿Por qué fijaron el umbral de similitud en 0.35?"*
* **Respuesta Maestra:**
  > *"En modelos multilingües como E5, una similitud coseno normalizada de 0.35 representa el punto óptimo entre precisión y exhaustividad (recall). Un umbral más alto (ej. 0.50) descartaba paráfrasis legítimas; un umbral menor a 0.30 permitía el ingreso de fragmentos con baja correlación, lo que inducía al modelo a alucinar."*

### ❓ Pregunta 4: *"¿Cómo garantizaron que el bot de producción no sufriera ningún impacto durante este desarrollo?"*
* **Respuesta Maestra:**
  > *"Aplicamos aislamiento a nivel de infraestructura y repositorio: en Git trabajamos exclusivamente en la rama `popu-chat2` dejando `main` inmutable; y a nivel de código encapsulamos toda la nueva arquitectura dentro del directorio `popuchat2/`, garantizando cero impacto en la versión que se encuentra en línea."*
