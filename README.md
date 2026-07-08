# Popu Chat - Asistente Virtual de Carreras (IES N° 7)

Este proyecto es un chatbot institucional e interactivo desarrollado para guiar a los interesados sobre la oferta académica, requisitos, planes de estudio y datos de contacto del **IES N° 7 "Populorum Progressio" - INTELA** (Sede Central, Turno Mañana).

## 1. Arquitectura y Funcionamiento
El chatbot está construido como una aplicación web nativa completa:
- **Servidor backend**: Node.js con Express (archivo `server.js`).
- **Frontend / Interfaz**: Cliente web premium tipo chat con HTML5, CSS3 y JavaScript Vanilla (carpeta `public`).
- **Motor NLP por Reglas**: Motor lógico basado en procesamiento de lenguaje natural por palabras clave, control de contexto por sesión y análisis de sentimiento (archivo `engine/rules.js`).

---

## 2. Procesamiento y Limpieza del Texto
Para evitar la frustración del usuario ante errores de escritura y garantizar una coincidencia precisa de intenciones, el texto ingresado pasa por un flujo riguroso de limpieza y normalización antes del procesamiento:

1. **Conversión a Minúsculas**: Todo el texto es convertido a minúsculas (`toLowerCase()`).
2. **Remoción de Tildes y Diéresis**: Se normalizan los caracteres unicode eliminando los acentos (`normalize('NFD').replace(/[\u0300-\u036f]/g, '')`).
3. **Tratamiento de Repeticiones Simples**: Mediante la expresión regular `replace(/(.)\1{2,}/g, '$1')`, se detectan y colapsan secuencias de 3 o más letras idénticas consecutivas. Ejemplos:
   - `"holaaaa"` se normaliza a `"hola"`
   - `"graciaaaas"` se normaliza a `"gracias"`
   - `"buenasss"` se normaliza a `"buenas"`
4. **Tratamiento de Abreviaciones**: Mapeo inteligente y expansión de abreviaciones comunes y errores de tipeo típicos:
   - `"info"` -> `"informacion"`
   - `"adm"` -> `"administracion"`
   - `"insc"` -> `"inscripcion"`
   - `"ubi"` -> `"ubicacion"`
   - `"dire"` -> `"direccion"`
   - `"tel"` -> `"telefono"`
   - `"mat"` -> `"materias"`
5. **Limpieza de Espacios**: Se remueven espacios en blanco duplicados o consecutivos y se eliminan los espacios de los extremos (`trim()`).

---

## 2.1 Técnicas NLP Avanzadas (Tokenización, Stopwords, Lematización y Stemming)
Además de la limpieza y normalización básica, el motor aplica un pipeline completo de técnicas de Procesamiento de Lenguaje Natural (NLP) para maximizar la precisión de las coincidencias semánticas:

### Tokenización (`tokenizar()`)
Separa el texto normalizado en tokens (palabras) individuales mediante `split(/\s+/)`, filtrando tokens vacíos. Cada token se procesa de forma independiente en las etapas siguientes.

### Eliminación de Stopwords (`eliminarStopwords()`)
Se define un conjunto oficial de **~80 palabras vacías del español** (`STOPWORDS_ES`) que no aportan significado semántico directo: artículos (`el`, `la`, `los`), preposiciones (`de`, `en`, `con`, `por`), pronombres (`me`, `te`, `se`), conjunciones (`y`, `o`, `pero`), adverbios comunes, etc. Los tokens que pertenecen a este conjunto se eliminan para concentrar el análisis en las palabras con carga semántica relevante.

### Lematización (`lematizar()`)
Reduce cada palabra a su **forma canónica** (singular, masculino) mediante:
- **Diccionario de excepciones**: Formas irregulares que no siguen reglas estándar (ej: `materias` → `materia`, `profesores` → `profesor`, `leyes` → `ley`).
- **Remoción de plurales**: Reglas para `-es`, `-s`, `-iones`, `-ores`, `-ades`, `-antes`, `-entes`.
- **Normalización de género**: `-ora` → `-or` (ej: `coordinadora` → `coordinador`), `-ica` → `-ico` (ej: `terapeutica` → `terapeutico`), `-iva` → `-ivo`.

### Stemming (`stemizar()`)
Algoritmo ligero de extracción de raíces que elimina sufijos comunes del español para reducir las palabras a sus raíces semánticas. Sufijos soportados (de mayor a menor longitud):
- `-amientos`, `-imientos`, `-amiento`, `-imiento`, `-aciones`, `-iciones`
- `-acion`, `-icion`, `-mente`, `-iendo`, `-ando`, `-endo`
- `-ador`, `-cion`, `-sion`, `-idad`, `-ismo`, `-ista`
- `-ado`, `-ido`, `-ar`, `-er`, `-ir`

Ejemplos: `inscripcion` → `inscrip`, `coordinador` → `coordin`, `estudiando` → `estudi`.

### Preprocesamiento Dinámico de Palabras Clave
Al iniciar el módulo, todas las keywords del diccionario `PALABRAS_CLAVE` se preprocesan con el mismo pipeline NLP, generando `PALABRAS_CLAVE_PROCESADAS`. Esto garantiza que tanto la entrada del usuario como las palabras clave de búsqueda estén reducidas a las mismas formas canónicas.

### Matching en 2 Niveles
El motor de detección de intenciones aplica un sistema de coincidencia de 2 niveles:
1. **Nivel 1 (Directo)**: Búsqueda directa sobre el texto normalizado (flujo original preservado).
2. **Nivel 2 (NLP)**: Si no hubo coincidencia directa, se busca por tokens lematizados y stems preprocesados.

---

## 3. Catálogo de 13 Intenciones Soportadas
El bot puede reconocer e integrar hasta 13 intenciones de consulta diferentes:
1. `saludo`: Bienvenida y presentación.
2. `carreras`: Lista consolidada de las 12 carreras del IES N° 7.
3. `tecnicaturas`: Listado de las 9 Tecnicaturas Superiores (3 años).
4. `profesorados`: Listado de los 3 Profesorados (4 años).
5. `descripcion_carrera`: Perfil, objetivo y descripción de cada carrera.
6. `plan_estudios_completo`: Asignaturas y materias distribuidas año por año.
7. `campo_laboral`: Salida laboral, empresas de inserción y economía del conocimiento en Jujuy.
8. `coordinador`: Nombre del coordinador a cargo y sus horarios de consulta física.
9. `horario_atencion`: Turno oficial de cursado (Mañana/Tarde/Noche) y atención presencial.
10. `ubicacion`: Dirección de la Sede Central (Sarmiento 268, San Salvador de Jujuy).
11. `contacto`: Números telefónicos y correo de campus oficiales.
12. `requisitos_inscripcion`: Documentación obligatoria requerida por carpeta.
13. `agradecimiento`: Despedida cordial.

---

## 4. Respuestas Dinámicas (Mínimo de 3 Variaciones por Tono)
El chatbot no entrega respuestas estáticas o idénticas. Para cada una de las 13 intenciones, existen **al menos 3 variaciones de respuesta** por cada uno de los 3 tonos soportados (`formal`, `informal`, `molesto`). 
Esto resulta en un total de **más de 9 respuestas posibles en total** para cada una de las intenciones de consulta general y por cada una de las 12 carreras en específico. El motor alterna de forma consecutiva e inteligente estas variaciones en base a la sesión del usuario.

---

## 5. Detección de Múltiples Intenciones
Si el usuario realiza varias preguntas en un mismo mensaje (ej: *"hola, donde queda y a que hora atienden?"*), el chatbot:
1. Identifica y extrae cada intención (`saludo`, `ubicacion`, `horario_atencion`).
2. Ordena de manera institucional las respuestas usando un orden lógico predefinido (`ORDEN_LOGICO_INTENCIONES`).
3. Remueve respuestas duplicadas.
4. Genera y retorna un **único párrafo integrado y coherente** que responde a todas las dudas de manera directa sin reiterar saludos.

---

## 6. Detección de Tono y Sentimiento
El bot clasifica cada consulta en uno de los 3 tonos para adaptar la respuesta del bot:
- **Tono Molesto/Enojado**: Se dispara al detectar palabras como `"nadie responde"`, `"hace rato"`, `"urgente"`, o si el texto está escrito en **mayúsculas sostenidas** (gritos). El bot responde disculpándose formalmente e yendo al punto de inmediato.
- **Tono Formal**: Se detecta mediante términos de cortesía como `"usted"`, `"quisiera"`, `"por favor"`, `"estimados"`. El bot responde de manera sumamente educada y sobria.
- **Tono Informal**: Es el tono por defecto o cuando se usan palabras de confianza como `"hola"`, `"che"`, `"chau"`. El bot responde amigablemente.

---

## 7. Interfaz Gráfica (Premium Web App vs Gradio)
Aunque la consigna inicial sugiere una interfaz básica en Gradio, en este proyecto se optó por una **Web App de chat nativa completa (HTML/CSS/JS)** que supera los límites de Gradio. Cuenta con:
- Diseño premium responsive y fondo con gradiente dinámico.
- Botones de acceso rápido autocompletados.
- **Mascota Virtual Animada**: El avatar del robot mascota (transparente) cuenta con una animación CSS (`floatAndPulse`) que hace que flote y pulse suavemente durante exactamente **3 segundos** de simulación de espera mientras busca la información, ofreciendo un feedback visual sumamente entretenido y dinámico.
