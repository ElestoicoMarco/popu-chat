# Registro de Pruebas Obligatorias - Popu Chat

Este documento registra los resultados de las pruebas obligatorias exigidas por la consigna para validar el correcto funcionamiento del chatbot en diferentes situaciones.

---

### Prueba 1: Mensaje Formal
- **Entrada del usuario**: `"Buenas tardes, quisiera saber el horario de atención, por favor."`
- **Intención detectada**: `horario_atencion`
- **Tono/Sentimiento detectado**: `formal`
- **Respuesta generada**: `"El turno de cursado de las carreras y el horario administrativo de atención en el IES 7 se desarrolla de lunes a viernes, durante el Turno Mañana de 08:00 a 12:30 horas."`
- **Observaciones**: Funcionó correctamente. Identificó el tono formal (por las palabras `"buenas tardes"`, `"quisiera"`, `"por favor"`) y entregó el horario administrativo en tono formal.

---

### Prueba 2: Mensaje Informal
- **Entrada del usuario**: `"hola, ¿hasta qué hora atienden?"`
- **Intención detectada**: `horario_atencion`
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"Se cursa de mañana, así que nos encontrás en la institución de lunes a viernes de 08:00 a 12:30."`
- **Observaciones**: Funcionó correctamente. Se detectó como informal y se respondió de manera amigable y resumida.

---

### Prueba 3: Mensaje Agradecido (Positivo)
- **Entrada del usuario**: `"muchas gracias por la ayuda che"`
- **Intención detectada**: `agradecimiento`
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"¡De nada! Qué bueno haberte ayudado. Si te queda alguna otra duda de las carreras, avisame."`
- **Observaciones**: Funcionó correctamente. Detectó la intención de agradecimiento e informalidad.

---

### Prueba 4: Mensaje Molesto (Negativo)
- **Entrada del usuario**: `"hace rato intento comunicarme y nadie me responde, denme bola"`
- **Intención detectada**: `contacto`
- **Tono/Sentimiento detectado**: `molesto`
- **Respuesta generada**: `"Lamentamos la demora. Para comunicarse con la institución, puede llamar al teléfono (0388) 4224514 o escribir al mail campus@populorumjujuy.ar."`
- **Observaciones**: Funcionó correctamente. Detectó la insatisfacción y enojo del usuario (por las palabras `"hace rato"`, `"nadie me responde"`) y adaptó la respuesta pidiendo disculpas.

---

### Prueba 5: Mensaje con Mayúsculas Sostenidas (Gritos / Molesto)
- **Entrada del usuario**: `"QUIERO SABER LA DIRECCION FÍSICA"`
- **Intención detectada**: `ubicacion`
- **Tono/Sentimiento detectado**: `molesto`
- **Respuesta generada**: `"Lamentamos sinceramente la demora. La ubicación física de la institución para cursar y realizar trámites es la Sede Central del IES N° 7, en Sarmiento 268, San Salvador de Jujuy."`
- **Observaciones**: Funcionó correctamente. Las mayúsculas sostenidas activaron el tono molesto y el bot se disculpó formalmente antes de dar la dirección.

---

### Prueba 6: Mensaje con Repeticiones (Tratamiento de repeticiones)
- **Entrada del usuario**: `"holaaaa che buenasss"`
- **Intención detectada**: `saludo`
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"¡Hola! ¿Cómo va? Decime en qué te puedo ayudar con las carreras del IES N° 7."`
- **Observaciones**: Funcionó correctamente. La limpieza colapsó las letras repetidas (`"holaaaa"` -> `"hola"`, `"buenasss"` -> `"buenas"`), permitiendo una correcta detección.

---

### Prueba 7: Mensaje con Errores de Escritura o Abreviaciones
- **Entrada del usuario**: `"me pasas info de la carrera de adm de empresas"`
- **Intención detectada**: `descripcion_carrera` (para la carrera `administracion_empresas`)
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"Es una tecnicatura de 3 años muy práctica y demandada. Te enseña a manejar todas las áreas de una empresa o negocio: desde la parte contable y financiera hasta los recursos humanos, el marketing y la logística, usando tecnologías modernas para que el negocio funcione de diez."`
- **Observaciones**: Funcionó correctamente. La abreviación `"info"` se expandió a `"informacion"` y `"adm"` a `"administracion"`, lo cual ruteó la consulta a la carrera y la intención correspondiente de forma exitosa.

---

### Prueba 8: Mensaje con Múltiples Intenciones
- **Entrada del usuario**: `"Hola che me decis las materias de Ciencia de Datos y donde es la sede?"`
- **Intención detectada**: `saludo`, `plan_estudios_completo`, `ubicacion` (con contexto de carrera `ciencia_datos`)
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"¡Hola! ¿Cómo va? Decime en qué te puedo ayudar con las carreras del IES N° 7. ¡El plan de Ciencia de Datos está buenísimo y dura 3 años! En 1er año tenés Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I. En 2do año cursás Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I (Machine Learning), Prácticas Profesionalizantes II y EDI II. Y en 3er año cerrás con Aprendizaje Profundo (Deep Learning), Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas Profesionalizantes III. Cursamos en la Sede Central del IES N° 7 'Populorum Progressio', en Sarmiento 268, acá en San Salvador de Jujuy."`
- **Observaciones**: Funcionó correctamente. Reconoció la combinación de saludo, plan de estudios de la carrera identificada y la ubicación física en un párrafo único y fluido.

---

### Prueba 9: Mensaje Fuera de la Temática (Fallback)
- **Entrada del usuario**: `"¿Cómo se hace un asado?"`
- **Intención detectada**: Ninguna (Fallback)
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"¡Uy, no entendí bien qué necesitás! Porfa, probá escribiendo de otra forma, por ejemplo usando palabras como 'materias', 'dirección', 'horarios' o 'salida laboral' así te puedo dar una mano."`
- **Observaciones**: Funcionó correctamente. Al no hacer match con ninguna palabra clave, ejecutó la respuesta de fallback informal de ayuda.

---

### Prueba 10: Mensaje Fuera de la Temática Formal (Fallback Formal)
- **Entrada del usuario**: `"Disculpe, desearía saber la receta del pastel de papas por favor."`
- **Intención detectada**: Ninguna (Fallback)
- **Tono/Sentimiento detectado**: `formal`
- **Respuesta generada**: `"Disculpe la inconveniencia, pero no he logrado interpretar su solicitud con las reglas de consulta actuales de las tecnicaturas y profesorados. Por favor, refrasee su pregunta utilizando términos explícitos como 'carreras', 'horario' o 'inscripción'."`
- **Observaciones**: Funcionó correctamente. Se detectó el tono formal por las palabras clave y el bot entregó el fallback formal.

### Prueba 11: Mensaje con Caracteres de Distintos Tipos (Puntuación Interna y Espaciado)
- **Entrada del usuario**: `"h.o.l.a!!! che c-o-o-r-d-i-n-a-d-o-r"`
- **Intención detectada**: `saludo`, `coordinador`
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: `"¡Hola! ¿Cómo va? Decime en qué te puedo ayudar con las carreras del IES N° 7. Si necesitás hablar con el coordinador de la carrera, podés consultar al Ing. Pablo Vilte los Martes de 10:00 a 12:00 hs. o Jueves de 08:00 a 10:00 hs. (o del coordinador correspondiente según la carrera en consulta)."`
- **Observaciones**: Funcionó correctamente. El flujo avanzado de limpieza y normalización:
  1. Eliminó los signos de exclamación (`!!!`).
  2. Removió los puntos de `"h.o.l.a"` convirtiéndolo a `"hola"`.
  3. Reemplazó los guiones de `"c-o-o-r-d-i-n-a-d-o-r"` por espacios (`"c o o r d i n a d o r"`) y luego fusionó las letras individuales consecutivas convirtiéndolo en la palabra limpia `"coordinador"`. Esto permitió que el bot detectara el saludo y la intención del coordinador de forma exitosa a pesar del formateo inusual.

---

### Prueba 12: Mensaje Procesado con Técnicas NLP Avanzadas (Tokenización, Stopwords, Lematización y Stemming)
- **Entrada del usuario**: `"me podrias decir cuales son las coordinadoras de las tecnicaturas?"`
- **Intención detectada**: `coordinador`, `tecnicaturas`
- **Tono/Sentimiento detectado**: `informal`
- **Respuesta generada**: Respuesta combinada con información de coordinadores y listado de tecnicaturas.
- **Observaciones**: Funcionó correctamente. El pipeline NLP avanzado procesó la entrada de la siguiente manera:
  1. **Normalización**: `"me podrias decir cuales son las coordinadoras de las tecnicaturas"`
  2. **Tokenización**: `['me', 'podrias', 'decir', 'cuales', 'son', 'las', 'coordinadoras', 'de', 'las', 'tecnicaturas']`
  3. **Eliminación de Stopwords**: Se removieron las palabras vacías (`me`, `decir`, `cuales`, `son`, `las`, `de`) → `['podrias', 'coordinadoras', 'tecnicaturas']`
  4. **Lematización**: `coordinadoras` → `coordinadora` → `coordinador` (deplural + normalización de género). `tecnicaturas` → `tecnicatura` (deplural por excepción).
  5. **Stemming**: `coordinador` → `coordin` (raíz semántica), `tecnicatura` → `tecnicatura` (sin sufijo removible).
  6. **Matching Nivel 2**: Los tokens lematizados `coordinador` y `tecnicatura` coincidieron con las keywords preprocesadas `coordinador` (intención `coordinador`) y `tecnicatura` (intención `tecnicaturas`), detectando ambas intenciones exitosamente gracias al pipeline NLP.

---

### Conclusión General
El chatbot ha superado satisfactoriamente todas las pruebas obligatorias. Su motor NLP basado en reglas es robusto, tolera errores ortográficos y de tipeo comunes, limpia puntuaciones complejas y caracteres incrustados en palabras, y adapta perfectamente sus respuestas al tono emocional detectado en el mensaje del usuario, integrando de manera fluida múltiples preguntas en una sola contestación institucional coherente. Además, incorpora técnicas NLP avanzadas (Tokenización, Eliminación de Stopwords, Lematización y Stemming) que amplían la cobertura semántica y mejoran la detección de intenciones ante variaciones morfológicas del español.
