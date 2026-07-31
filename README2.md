# Informe de Actualización de PopuChat - Parte 2

Este documento resume las tareas de mantenimiento, mejora estructural y expansión de la base de conocimientos realizadas en el sistema **PopuChat** (archivo principal `rules.js`).

## 1. Restauración y Estabilidad del Sistema
Durante la fase de experimentación previa, se identificó un script defectuoso que causó la eliminación masiva de campos clave dentro del diccionario `RESPUESTAS_CARRERA`. 
Para salvaguardar la integridad de la aplicación:
- Se realizó un **rollback de emergencia** al commit funcional seguro (`2b1346e`).
- Se adoptó una nueva metodología de actualización: en lugar de scripts automatizados de reemplazo global (riesgosos para la estructura anidada de JSON/JS), se procedió a **inyectar las mejoras de forma directa y quirúrgica** empleando expresiones regulares estrictas sobre cada bloque específico.

## 2. Actualización Académica: Sede Central (100% Completada)
Se unificó el estándar de calidad en la presentación de la oferta académica. Inspirándonos en la excelente estructura que ya se había planteado previamente para *Educación Especial*, se actualizó la descripción y el campo laboral de las **12 carreras de Casa Central**.

Se agregó el **Perfil del Egresado / Funciones Profesionales** (estructurado con viñetas) y se redactó un **Campo Profesional y Laboral** exhaustivo (categorizado por ámbitos de desempeño).

**Tecnicaturas Superiores (9):**
1. Ciencia de Datos e Inteligencia Artificial
2. Gestión Ambiental
3. Niñez, Adolescencia y Familia
4. Laboratorio de Análisis Clínicos
5. Hemoterapia
6. Acompañamiento Terapéutico
7. Administración de Empresas
8. Administración Pública
9. Gestión Jurídica

**Profesorados (3):**
10. Ciencia Política
11. Ciencias Sagradas
12. Educación Especial (con Orientación en Discapacidad Intelectual)

## 3. Mejoras en el Motor NLP (Detección de Intenciones)
Se optimizó el reconocimiento de lenguaje natural del bot añadiendo nuevas palabras clave (keywords) a las intenciones existentes, resolviendo vacíos detectados durante las pruebas de usuario:

### Intención: Saludos y Despedidas (`agradecimiento`)
Para evitar que el bot no comprenda cuando el usuario finaliza la charla de forma amigable, se agregaron las siguientes frases al arreglo de palabras clave:
- `"hasta luego"`, `"hasta pronto"`, `"nos vemos"`
- `"gracias por la informacion"`, `"muy amable"`, `"gracias che"`
- `"ahi te ves"`, `"ahi te vez"`, `"que tengas buen viaje"`, `"perfecto adios"`

### Intención: Navegación de Sedes (`informacion_sedes`)
Se detectó que el bot fallaba (arrojando el mensaje de _fallback_) cuando el usuario escribía escuetamente la palabra "sede".
- Se añadieron explícitamente las palabras clave: **`"sede"`** y **`"sedes"`**.
- Resultado: El bot ahora despliega inmediatamente el panel interactivo con los botones de **Sede Perico**, **Sede San Pedro** y **Sede Libertador**.

## 4. Mejoras Estructurales y Flujos de Sedes Anexas
Como parte fundamental de esta etapa (previa a la actualización de contenidos), se implementaron las bases lógicas para dar soporte al interior de la provincia:
- **Flujos de Sedes (Perico, Libertador y San Pedro):** Se crearon las rutas y opciones interactivas (botones) para navegar y consultar la información específica de cada una de estas sedes anexas.
- **Separación de Educación Especial:** Se resolvió el conflicto de orientaciones del profesorado, bifurcando el flujo para que el usuario pueda elegir entre "Orientación en Discapacidad Intelectual" (Casa Central) y "Orientación Sordos/Hipoacúsicos" (San Pedro).
- **Resolución de Loops:** Se solucionaron errores lógicos ("loops") en la navegación del menú de carreras que atrapaban al usuario en respuestas repetitivas.

## Conclusión de la Parte 2
PopuChat cuenta ahora con una base de datos 100% formal, profesional y estandarizada para toda su oferta de Sede Central, además de ser más robusto y amigable para comprender los modismos de entrada del usuario, y poseer la infraestructura necesaria para desplegar la información de sus Sedes Anexas. El proyecto se encuentra listo para iniciar la fase de actualización de contenidos del interior.
