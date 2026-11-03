# PIPELINE DE ACTUALIZACIÓN Y DESPLIEGUE A PRODUCCIÓN - POPUCHAT
**Instituto de Educación Superior N° 7 "Populorum Progressio" In.Te.La.**  
**Proyecto:** PopuChat - Asistente Virtual Institucional  
**Fecha de Actualización:** Noviembre 2026  
**Desarrollo:** Nortechly Digital Solutions  

---

## 1. RESUMEN EJECUTIVO DE LA ACTUALIZACIÓN
El presente documento certifica y detalla formalmente el proceso de desbloqueo, actualización del motor de Procesamiento de Lenguaje Natural (PLN) y adecuación de interfaz llevado a cabo sobre **PopuChat** para su reactivación definitiva en producción pública abierta.

Se eliminaron las restricciones de la fase de pruebas cerradas y se cargaron las nuevas definiciones oficiales del ciclo lectivo (cuotas vigentes, pautas para el ciclo 2027, régimen de becas y calendario del curso de ingreso).

---

## 2. FASES EJECUTADAS EN EL PIPELINE

```
[ Fase 1: Desbloqueo a Producción ] ➔ [ Fase 2: Motor NLP & Base de Reglas ] ➔ [ Fase 3: Interfaz & Botoneras ] ➔ [ Fase 4: Testing & Respaldo ]
```

---

### FASE 1: DESBLOQUEO DE INTERFAZ Y MODO PRODUCCIÓN
* **Archivo modificado:** `public/js/app.js`
  * **Desactivación de bloqueo de pruebas:** Se retiró la variable de expiración fija (`testingExpireDate = new Date("2026-08-28T23:59:59")`) y la condición condicional `isLocked`.
  * **Habilitación universal:** Se eliminó la función `bloquearInterfaz()` del flujo inicial. Ahora cualquier usuario que ingrese a la aplicación dispone del campo de entrada y los botones de envío y micrófono habilitados de inmediato, sin requerir códigos por URL (`?codigo=TEST2026`).
  * **Foco automático:** Al finalizar la animación del *Splash Screen*, el cursor se posiciona automáticamente en la caja de texto (`chatInput.focus()`).
* **Archivo modificado:** `public/index.html`
  * Se removió el banner superior de cuenta regresiva (`countdownBanner`).

---

### FASE 2: MOTOR NLP Y ACTUALIZACIÓN DE LA BASE DE CONOCIMIENTO
* **Archivo modificado:** `public/js/rules.js`

#### 2.1. Actualización de Aranceles y Cuota Vigente
* **Intención:** `valor_cuota`
  * **Monto actualizado:** Se fijó la cuota mensual vigente en **$70.000 pesos** (reemplazando los valores anteriores de $55.000 y $60.000).
  * **Modalidad de pago:** Se incorporó formalmente la regla de que **se abonan 10 cuotas mensuales en todas las carreras**.
  * **Vencimientos y Atención:** Vencimiento el último día de cada mes (con recargo por mora) y atención de tesorería de lunes a viernes de 8:00 a 12:00 y de 15:30 a 20:00 hs.
  * **Excepciones de carrera:** Se actualizó el caso específico de la Tecnicatura en Acompañamiento Terapéutico a $70.000 (10 cuotas anuales).

#### 2.2. Definiciones para el Ciclo Lectivo 2027
* **Intenciones:** `valor_cuota_2027` y `valor_inscripcion`
  * **Respuesta oficial:** Se unificó la respuesta para ambas intenciones aclarando que **los valores de matrícula de inscripción y cuotas mensuales correspondientes al Ciclo Lectivo 2027 aún no están definidos, y se establecerán formalmente durante el mes de diciembre de 2026**.

#### 2.3. Fechas de Inscripción
* **Intención:** `requisitos_inscripcion`
  * **Aclaración temporal exacta:**
    * **Diciembre 2026:** del 14 al 30.
    * **Febrero 2027:** del 15 al 26.

#### 2.4. Nueva Intención: Curso de Ingreso 2027
* **Intención creada:** `curso_ingreso`
* **Palabras clave integradas:** `curso de ingreso`, `cursillo`, `ingreso 2027`, `ambientacion`, `nivelacion`, `curso ingreso`, `cuando empieza el curso de ingreso`, `cuando es el curso de ingreso`, `cronograma comision`, `cronograma comisiones`, `cronograma curso de ingreso`, `cronograma ingreso`.
* **Contenido oficial de la respuesta:**
  1. Fechas del cursado: **Del 01 al 19 de marzo de 2027**.
  2. Publicación de cronogramas por comisión: **Se realizará en la página web oficial de Populorum Casa Central a partir del 26 de febrero de 2027 desde horas 21:30**.
  3. Disponibilidad de cartillas: **Disponibles a partir del 28 de diciembre de 2026** tanto en la web como en fotocopiadora (Cel. 3885384866).

#### 2.5. Nueva Intención: Régimen de Becas
* **Intención creada:** `becas`
* **Palabras clave integradas:** `beca`, `becas`, `ayuda economica`, `progresar`, `beca progresar`, `postular beca`, `requisitos beca`, `acceder a beca`, `pedir beca`, `como tener beca`, `solicitar beca`.
* **Contenido oficial de la respuesta:** Se informa con total claridad en los tres tonos que **el acceso y postulación al sistema de becas rige únicamente a partir del 2° año de cursado**, por lo que los ingresantes de 1° año no pueden acceder a este beneficio.

#### 2.6. Nueva Intención: Cartillas de Ingreso y Fotocopiadora
* **Intención creada:** `cartillas_ingreso`
* **Palabras clave integradas:** `cartilla`, `cartillas`, `cartilla de ingreso`, `cartillas de ingreso`, `fotocopiadora`, `contacto fotocopiadora`, `telefono fotocopiadora`, `celular fotocopiadora`, `material de ingreso`, `donde comprar la cartilla`.
* **Contenido oficial de la respuesta:**
  - Disponibilidad: **A partir del 28 de diciembre de 2026** en la página web oficial y en fotocopiadora.
  - Contacto directo de fotocopiadora: **Celular 3885384866**.

#### 2.6. Ingeniería Lingüística y Prevención de Colisiones Semánticas
Durante la fase de integración, se realizaron ajustes finos de desambiguación en el pipeline:
1. **Filtro de colisión para "curso":** Se incorporó una regla estricta en `detectarIntenciones()` para que cuando el usuario pregunte por `curso_ingreso`, el motor suprima falsos positivos hacia `distribucion_aulas` y `plan_estudios_completo` causados por la raíz común *"curso/cursado"*.
2. **Filtro de colisión para "becas":** Se configuró una regla de supresión para evitar que preguntas generales como *"¿Tienen becas?"* disparen el catálogo general de carreras por la coincidencia del verbo *"tienen"*.
3. **Desambiguación en `coordinador`:** Se retiró el término aislado *"consulta"* del diccionario del coordinador (reemplazándolo por frases compuestas como *"horario de consulta"* o *"consultar al coordinador"*), evitando que fórmulas de cortesía como *"quisiera hacer una consulta..."* abrieran indebidamente el selector de coordinadores.

---

### FASE 3: ACTUALIZACIÓN DE LA INTERFAZ DE USUARIO (UI)
* **Archivo modificado:** `public/index.html`
  * **Acordeón de Consultas Frecuentes:**
    * Se agregaron botones de acceso directo para *"Curso de Ingreso 2027"*, *"Información de Becas"* y *"Valores de Cuota y Matrícula"*.
  * **Carrusel Inferior de Botones Rápidos (Quick Actions):**
    * Se actualizaron ambas pistas del tren infinito (*marquee animation*) con los nuevos accesos:
      * `Cuota ($70.000)` (reemplazando el botón viejo de *"Cuotas 2026"*).
      * `Ingreso 2027` (vinculado a la intención `curso_ingreso`).
      * `Becas` (vinculado a la intención `becas`).
      * `Aulas` (generalizado para el cursado).
  * **Pie de Página (Footer):** Actualizado a `&copy; 2026-2027`.

---

## 3. VERIFICACIÓN Y TESTING AUTOMATIZADO

Se ejecutaron pruebas automatizadas sobre el motor en entorno Node.js, validando las siguientes entradas críticas:

| Consulta de Entrada | Intención Detectada | Tono Asignado | Validación de Respuesta |
| :--- | :--- | :--- | :--- |
| `"cual es el valor de la cuota?"` | `valor_cuota` | Informal | Retorna $70.000 y 10 cuotas mensuales. ✅ |
| `"cuanto sale la matricula 2027?"` | `valor_inscripcion` / `valor_cuota_2027` | Informal | Informa definición en diciembre de 2026. ✅ |
| `"cuando empieza el curso de ingreso?"` | `curso_ingreso` | Informal | Retorna 01 al 19 de marzo y web Casa Central 26/02 21:30 hs. ✅ |
| `"como hago para pedir una beca?"` | `becas` | Informal | Informa acceso exclusivo a partir de 2° año. ✅ |
| `"Estimados, quisiera consultar los requisitos para la beca por favor"` | `requisitos_inscripcion` + `becas` | Formal | Combina requisitos y normativa de becas en tono protocolar. ✅ |
| `"NADIE ME RESPONDE CUANDO EMPIEZA EL CURSO DE INGRESO PESIMO SERVICIO"` | `curso_ingreso` | Molesto | Respuesta de contención formal sin rodeos con fechas oficiales. ✅ |
| `"donde consigo la cartilla de ingreso?"` | `cartillas_ingreso` | Informal | Retorna disponible el 28/12/2026 en web y fotocopiadora. ✅ |
| `"pasame el celular de la fotocopiadora"` | `cartillas_ingreso` | Informal | Retorna número de celular 3885384866. ✅ |

---

## 4. ESTADO DE DESPLIEGUE
* **Sintaxis de código:** Validada con `node -c` en `public/js/app.js` y `public/js/rules.js` (cero errores).
* **Condición de uso:** Producción Abierta (Pública y sin clave).
* **Rama Git:** `main`.
* **Próximo paso:** Ejecución de `git commit` y posterior `git push origin main` para despliegue en Render.
