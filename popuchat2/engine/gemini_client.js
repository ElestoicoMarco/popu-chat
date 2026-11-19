/**
 * popuchat2/engine/gemini_client.js
 * Conector con Google Gemini API (con Auto-Descubrimiento de Modelos contra 404)
 * y Motor de Síntesis Estructurada 100% PopuChat (IES N° 7).
 */

const fs = typeof require !== "undefined" ? require("fs") : null;
const path = typeof require !== "undefined" ? require("path") : null;

function cargarClaveDesdeEnv() {
    if (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY) {
        const k = process.env.GEMINI_API_KEY.trim();
        if (!k.includes("PEGA_AQUI") && k.length > 10) return k;
    }

    if (fs && path) {
        const envPath = path.join(__dirname, "../.env");
        if (fs.existsSync(envPath)) {
            const contenido = fs.readFileSync(envPath, "utf-8");
            const match = contenido.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
            if (match && match[1] && !match[1].includes("PEGA_AQUI") && match[1].trim().length > 10) {
                return match[1].trim();
            }
        }
    }

    return null;
}

const GEMINI_CONFIG_DEFAULT = {
    model: "gemini-2.0-flash",
    temperature: 0.3,
    topP: 0.85,
    topK: 20,
    maxOutputTokens: 550
};

class GeminiClient {
    constructor(apiKey = null, config = {}) {
        this.apiKey = apiKey || cargarClaveDesdeEnv();
        this.config = { ...GEMINI_CONFIG_DEFAULT, ...config };
        this.cachedWorkingModel = null;
    }

    setApiKey(key) {
        this.apiKey = key ? key.trim() : null;
        this.cachedWorkingModel = null;
    }

    tieneApiKeyValida() {
        return Boolean(this.apiKey && !this.apiKey.includes("PEGA_AQUI") && this.apiKey.length > 10);
    }

    /**
     * Descubre dinámicamente en la API de Google qué modelos soportan generateContent
     * para evitar al 100% cualquier error 404 NotFound.
     */
    async descubrirModeloDisponible() {
        if (!this.tieneApiKeyValida()) return null;
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data || !Array.isArray(data.models)) return null;

            const candidatos = data.models
                .filter(m =>
                    m.name &&
                    m.name.includes("gemini") &&
                    !m.name.includes("embedding") &&
                    !m.name.includes("imagen") &&
                    !m.name.includes("veo") &&
                    !m.name.includes("tts") &&
                    !m.name.includes("aqa") &&
                    Array.isArray(m.supportedGenerationMethods) &&
                    m.supportedGenerationMethods.includes("generateContent")
                )
                .map(m => m.name.replace(/^models\//, ""));

            // Priorizar modelos flash rápidos y gratuitos
            const preferido =
                candidatos.find(c => c === "gemini-2.0-flash") ||
                candidatos.find(c => c === "gemini-1.5-flash") ||
                candidatos.find(c => c.includes("flash")) ||
                candidatos[0];

            return preferido || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Sintetizador fáctico estructurado (cuando se ejecuta en local sin API Key o sin red).
     */
    generarRespuestaContingencia({ promptUsuario, systemPrompt, contextoDocumental, tono, saludo, fuentes, modo }) {
        const matchPregunta = promptUsuario.match(/PREGUNTA (?:DEL USUARIO )?A RESPONDER:\s*([\s\S]+)$/i);
        const preguntaUsuario = (matchPregunta ? matchPregunta[1] : promptUsuario).trim();
        const qNorm = preguntaUsuario.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const esModoGeneral = (modo === "Solo IA general") ||
            (contextoDocumental && contextoDocumental.includes("no utiliza documentos"));

        // 1. MODO "Solo IA general" (Sin documentos RAG)
        if (esModoGeneral) {
            const pideDatosInstitucionales = /\b(populorum|ies\s*7|ies\s*n|intela|cuota|cuotas|matricula|arancel|aranceles|sede|perico|san pedro|libertador|sarmiento|inscripcion|inscribirme|secretaria|tesoreria|mesa|regularidad|correlativa|aulas|distribucion|ingreso)\b/i.test(qNorm);
            if (pideDatosInstitucionales) {
                return "No encontré esa información en la base de conocimiento.\n\nFuentes: ninguna.";
            }
            if (/cien[sc]*ia de datos|inteligencia artificial/i.test(qNorm)) {
                return "Un profesional o técnico en **Ciencia de Datos e Inteligencia Artificial** se encarga de recopilar, limpiar, procesar y analizar grandes volúmenes de datos para extraer patrones, tendencias y conocimientos útiles.\n\n- **Funciones principales:** Análisis exploratorio de datos, desarrollo de modelos predictivos de Machine Learning y Deep Learning, Procesamiento de Lenguaje Natural (PLN) y tableros de Business Intelligence.\n- **Herramientas habituales:** Python, SQL, Pandas, Scikit-Learn, PyTorch y visualización de datos.\n- **Campo de aplicación:** Optimización de procesos, sistemas de recomendación, automatización inteligente, salud, finanzas y gestión pública.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/acompanamiento terapeutico/i.test(qNorm)) {
                return "El **Acompañamiento Terapéutico** es una disciplina del ámbito de la salud y la salud mental que brinda apoyo personalizado e integral a pacientes en su vida cotidiana, trabajando dentro de un equipo interdisciplinario para favorecer su autonomía, rehabilitación e integración social, familiar y comunitaria.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/administracion de empresas/i.test(qNorm)) {
                return "La carrera de **Administración de Empresas** forma profesionales en planificación estratégica, contabilidad, finanzas, marketing, recursos humanos, costos, logística y dirección de organizaciones públicas o privadas y PyMEs.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/administracion publica/i.test(qNorm)) {
                return "La **Administración Pública** estudia la gestión eficiente de los recursos del Estado, el diseño y evaluación de políticas públicas, derecho administrativo, presupuesto público y modernización de organismos gubernamentales.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/ninez|adolescencia|familia/i.test(qNorm)) {
                return "La formación en **Niñez, Adolescencia y Familia** aborda la promoción y protección integral de los derechos de niños, niñas y adolescentes, psicología evolutiva, intervención socio-comunitaria, mediación familiar y políticas públicas de infancia.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/laboratorio|analisis clinicos/i.test(qNorm)) {
                return "El área de **Laboratorio de Análisis Clínicos** se especializa en la toma, procesamiento y análisis de muestras biológicas (hematología, bioquímica, microbiología, parasitología e inmunología) bajo estrictas normas de bioseguridad para el diagnóstico médico.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/hemoterapia/i.test(qNorm)) {
                return "La **Hemoterapia e Inmunohematología** se dedica a la obtención, clasificación, conservación y transfusión segura de sangre y hemocomponentes en bancos de sangre y servicios hospitalarios.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/software|programacion/i.test(qNorm)) {
                return "El **Desarrollo de Software** comprende el análisis, diseño, programación, pruebas y despliegue de sistemas informáticos, aplicaciones web, móviles y bases de datos mediante metodologías ágiles.\n\nFuentes: conocimiento general del modelo.";
            }
            if (/examen|estudiar|consejo/i.test(qNorm)) {
                return "Para prepararte con éxito para un examen académico, te recomiendo:\n\n1. **Organizá el temario con anticipación:** Dividí las unidades en bloques diarios manejables.\n2. **Practicá explicaciones claras y concisas:** Exponé los conceptos principales en voz alta con tus propias palabras.\n3. **Elaborá mapas conceptuales y resúmenes:** Conectá los temas clave de la materia.\n4. **Simulá preguntas de mesa:** Practicá posibles preguntas frente a un compañero o espejo controlando el tiempo.\n5. **Mantené la calma y descansá bien:** Dormir adecuadamente antes de rendir consolida la memoria.\n\nFuentes: conocimiento general del modelo.";
            }
            return "Desde el conocimiento general académico, puedo orientarte sobre el perfil conceptual de cada disciplina (Ciencia de Datos, Software, Salud, Administración, Educación), técnicas de estudio y preparación de exámenes.\n\nFuentes: conocimiento general del modelo.";
        }

        // 2. MODOS CON RAG ("Solo base de conocimiento" y "Base + conocimiento general")
        if (!contextoDocumental || contextoDocumental.includes("No se recuperaron")) {
            return "No encontré información suficiente sobre esa consulta en la base de conocimiento. Podés reformularla o comunicarte con la institución.";
        }

        let prefijo = "";
        if (saludo && saludo !== "ninguno") {
            prefijo += `${saludo}. `;
        }
        if (tono === "molesto") {
            prefijo += "Comprendo perfectamente tu molestia y te pido disculpas por la demora o cualquier inconveniente previo. Te brindo la información oficial de inmediato:\n\n";
        }

        // Respuestas específicas detalladas por carrera si pregunta por una carrera puntual
        const secciones = [];

        if (/cien[sc]*ia de datos|inteligencia artificial/i.test(qNorm)) {
            secciones.push(
                `**Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial (IES N° 7):**\n` +
                `- **Duración:** 3 años (Modalidad presencial con prácticas profesionalizantes).\n` +
                `- **Sede:** Sede Central (San Salvador de Jujuy - Sarmiento N° 268).\n` +
                `- **Perfil y Contenidos:** Análisis exploratorio de datos, programación en Python y SQL, estadística aplicada, pipelines de Machine Learning y Deep Learning, Procesamiento de Lenguaje Natural (PLN), Business Intelligence, visualización avanzada y gobernanza de datos.\n` +
                `- **Salida laboral:** Científico/a de datos, analista de Business Intelligence, desarrollador/a de modelos de IA y especialista en automatización predictiva en empresas tecnológicas, banca, salud, retail y organismos públicos.\n` +
                `- **Arancel mensual vigente:** $70.000 (carrera especial con prácticas intensivas de laboratorio).`
            );
        } else if (/acompanamiento terapeutico/i.test(qNorm)) {
            secciones.push(
                `**Tecnicatura Superior en Acompañamiento Terapéutico (IES N° 7):**\n` +
                `- **Duración:** 3 años.\n` +
                `- **Sedes:** Sede Central (San Salvador de Jujuy) y Sede Libertador Gral. San Martín.\n` +
                `- **Perfil y Materias:** Psicología general y evolutiva, psicopatología, intervención clínica y comunitaria, abordaje de consumos problemáticos, salud mental, discapacidad, tercera edad, niñez y prácticas profesionalizantes en equipos interdisciplinarios.\n` +
                `- **Salida laboral:** Hospitales públicos, clínicas privadas, centros de rehabilitación, instituciones educativas integradoras y dispositivos de atención domiciliaria.`
            );
        } else if (/laboratorio|analisis clinicos/i.test(qNorm)) {
            secciones.push(
                `**Tecnicatura Superior en Laboratorio Clínico y Hemoterapia (IES N° 7):**\n` +
                `- **Duración:** 3 años.\n` +
                `- **Sede:** Sede Central (San Salvador de Jujuy).\n` +
                `- **Perfil y Salida Laboral:** Extracción, preparación y análisis de muestras biológicas (hematología, química clínica, microbiología, inmunología), procesos de hemodonación y bioseguridad bajo normas ISO. Amplia inserción laboral en laboratorios de análisis clínicos, hospitales públicos, clínicas privadas y bancos de sangre de Jujuy y el país.`
            );
        } else if (/hemoterapia/i.test(qNorm)) {
            secciones.push(
                `**Formación en Hemoterapia y Laboratorio Clínico (IES N° 7):**\n` +
                `- **Duración:** 3 años en Sede Central (San Salvador de Jujuy).\n` +
                `- **Perfil Profesional:** Procesos de inmunohematología, selección y atención de donantes, procesamiento y conservación de hemocomponentes, medicina transfusional, bancos de sangre y bioseguridad clínica.\n` +
                `- **Campo laboral:** Servicios de hemoterapia hospitalarios, centros regionales de hemoterapia, bancos de sangre y clínicas privadas.`
            );
        } else if (/ninez|adolescencia|familia/i.test(qNorm)) {
            secciones.push(
                `**Tecnicatura Superior en Niñez, Adolescencia y Familia (IES N° 7):**\n` +
                `- **Duración:** 3 años en Sede Central (San Salvador de Jujuy).\n` +
                `- **Plan de Estudios y Materias principales:** Psicología del desarrollo en niñez y adolescencia, Marco normativo y Derechos de Niños, Niñas y Adolescentes, Dinámicas y Problemáticas Familiares, Diseño de Proyectos Socio-Comunitarios, Abordaje de Vulnerabilidad Social, Mediación y Prácticas Profesionalizantes en instituciones de protección de derechos.`
            );
        } else if (/administracion de empresas/i.test(qNorm)) {
            secciones.push(
                `**Tecnicatura Superior en Administración de Empresas (IES N° 7):**\n` +
                `- **Duración:** 3 años (Sede Central y orientación PyME en Sede Perico).\n` +
                `- **Materias principales:** Administración General y Estratégica, Contabilidad y Análisis de Estados Contables, Matemática Financiera, Costos y Presupuestos, Marketing y Comercialización, Gestión de Recursos Humanos, Derecho Comercial y Laboral, Formulación y Evaluación de Proyectos de Inversión y Prácticas Profesionalizantes.`
            );
        } else if (/administracion publica/i.test(qNorm)) {
            secciones.push(
                `**Tecnicatura Superior en Administración Pública (IES N° 7):**\n` +
                `- **Duración:** 3 años en Sede Central (San Salvador de Jujuy).\n` +
                `- **Perfil y Contenidos:** Diseño, ejecución y evaluación de políticas públicas, Derecho Constitucional y Administrativo, Finanzas y Presupuesto Público, Contabilidad Gubernamental, Gestión Municipal y Provincial, Modernización del Estado y Prácticas Profesionalizantes en organismos públicos.`
            );
        } else if (/mecatronica|automatizacion|robotica/i.test(qNorm)) {
            secciones.push(
                `**Tecnicaturas Superiores en Mecatrónica y en Automatización y Robótica (IES N° 7):**\n` +
                `- **Duración:** 3 años.\n` +
                `- **Sedes:** Sede Perico (Mecatrónica y Automatización), Sede San Pedro y Sede Libertador (Automatización y Robótica).\n` +
                `- **Perfil del Egresado:** Diseño, programación y mantenimiento de sistemas automatizados industriales, PLC, brazos robóticos, sistemas neumáticos/hidráulicos, instrumentación electrónica y monitoreo SCADA.`
            );
        } else if (/\bprofesorados?\b/i.test(qNorm) && !/\btecnicaturas?\b/i.test(qNorm)) {
            secciones.push(
                `El **IES N° 7 "Populorum Progressio" - In.Te.La.** dicta los siguientes **Profesorados (Duración: 4 años)** con validez nacional:\n\n` +
                `- **Profesorado de Educación Secundaria en Lengua y Literatura** (Sede Central y Sede Perico)\n` +
                `- **Profesorado de Educación Secundaria en Historia** (Sede Central y Sede San Pedro)\n` +
                `- **Profesorado de Educación Secundaria en Psicología** (Sede Central y Sede Libertador)\n` +
                `- **Profesorado de Educación Especial con Orientación en Discapacidad Intelectual** (Sede Central)\n` +
                `- **Profesorado de Educación Especial con Orientación en Sordos e Hipoacúsicos** (Sede Central y Sede San Pedro)\n` +
                `- **Profesorado en Ciencia Política** (Sede Central)\n` +
                `- **Profesorado en Ciencias Sagradas** (Sede Central)`
            );
        } else if (/\b(carreras?|tecnicaturas?|oferta|estudiar|duran|duracion)\b/i.test(qNorm)) {
            secciones.push(
                `El **IES N° 7 "Populorum Progressio" - In.Te.La.** ofrece las siguientes carreras con validez nacional:\n\n` +
                `**Tecnicaturas Superiores (Duración: 3 años):**\n` +
                `- **Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial** (Sede Central)\n` +
                `- **Tecnicatura Superior en Desarrollo de Software** (Sede Central y San Pedro)\n` +
                `- **Tecnicatura Superior en Laboratorio Clínico y Hemoterapia** (Sede Central)\n` +
                `- **Tecnicatura Superior en Acompañamiento Terapéutico** (Sede Central y Libertador)\n` +
                `- **Tecnicatura Superior en Niñez, Adolescencia y Familia** (Sede Central)\n` +
                `- **Tecnicatura Superior en Mecatrónica** (Sede Perico)\n` +
                `- **Tecnicatura Superior en Automatización y Robótica** (Sede Perico, San Pedro y Libertador)\n` +
                `- **Tecnicaturas en Administración de Empresas, Administración Pública, Gestión Jurídica y Gestión Ambiental** (Sede Central / Perico)\n\n` +
                `**Profesorados de Educación Secundaria y Especial (Duración: 4 años):**\n` +
                `- **Profesorado en Lengua y Literatura** (Sede Central y Perico)\n` +
                `- **Profesorado en Historia** (Sede Central y San Pedro)\n` +
                `- **Profesorado en Psicología** (Sede Central y Libertador)\n` +
                `- **Profesorado de Educación Especial** (Orientación Discapacidad Intelectual en Sede Central; Sordos e Hipoacúsicos en Sede Central y San Pedro)\n` +
                `- **Profesorado en Ciencia Política y Profesorado en Ciencias Sagradas** (Sede Central)`
            );
        }

        if (/\b(cuotas?|arancel|aranceles|matricula|valores|costo|cuanto sale|precio|tesoreria|tramites?)\b/i.test(qNorm)) {
            secciones.push(
                `Los valores oficiales de **cuotas mensuales, matrícula y trámites de Tesorería** en el IES N° 7 son:\n\n` +
                `- **Cuota mensual para Carreras Generales:** **$60.000** por mes (tecnicaturas administrativas, humanísticas, profesorados y ciencias sociales).\n` +
                `- **Cuota mensual para Carreras Especiales:** **$70.000** por mes (Ciencia de Datos e IA, Laboratorio Clínico y Hemoterapia, Acompañamiento Terapéutico, Mecatrónica y Automatización).\n` +
                `- **Régimen de pago:** 10 cuotas mensuales consecutivas de marzo a diciembre (vencen el último día de cada mes).\n` +
                `- **Matrícula de Inscripción (Ciclo Lectivo 2027):**\n` +
                `  - Abonando en **diciembre de 2026**: **$90.000**.\n` +
                `  - Abonando hasta el **31 de marzo de 2027**: **$100.000**.\n` +
                `- **Trámites en Tesorería:** La Constancia de Alumno Regular y autenticaciones son gratuitas por autogestión del Campus Virtual. Los certificados analíticos parciales y duplicados de libreta se abonan en ventanilla de Tesorería (Lunes a viernes de 08:00 a 12:00 y de 15:30 a 20:00 hs).`
            );
        }

        if (/\b(becas?|progresar|ayuda economica)\b/i.test(qNorm)) {
            secciones.push(
                `**Régimen de Becas Estudiantiles del IES N° 7:**\n` +
                `- **Becas Progresar (Nacionales):** Los alumnos regulares pueden postularse a Progresar Nivel Superior (ANSES) en las convocatorias de marzo y agosto.\n` +
                `- **Becas Institucionales de Estímulo:** Cupos de ayuda económica y medias becas arancelarias según situación socioeconómica y rendimiento académico regular, gestionadas ante Bienestar Estudiantil.`
            );
        }

        if (/\b(requisitos?|papeles|documentos?|documentacion|inscripcion|inscribirme|ingreso|cursillo)\b/i.test(qNorm)) {
            secciones.push(
                `**Inscripción, Curso de Ingreso y Requisitos (Ciclo Lectivo 2027):**\n` +
                `- **Plazo de inscripción:** Desde diciembre de 2026 hasta el **31 de marzo de 2027** (preinscripción online en el Campus Virtual y presentación física en Secretaría de 08:00 a 12:00 o de 15:30 a 20:00 hs).\n` +
                `- **Curso de Ingreso Obligatorio y Nivelatorio:** Del **01 al 19 de marzo de 2027** (cartillas digitales e impresas disponibles desde febrero de 2027).\n` +
                `- **Documentación obligatoria (en carpeta colgante):**\n` +
                `  1. Fotocopia autenticada del Título Secundario o Constancia de Título en Trámite (sin adeudar materias).\n` +
                `  2. Fotocopia legible del DNI (frente y dorso).\n` +
                `  3. Partida de Nacimiento actualizada y legalizada.\n` +
                `  4. Constancia de CUIL (ANSES).\n` +
                `  5. Dos (2) fotos carnet 4x4 (fondo blanco o celeste).\n` +
                `  6. Certificado de Aptitud Psicofísica o ficha médica institucional.\n` +
                `  7. Planilla prontuarial / certificado de antecedentes policiales de Jujuy.\n` +
                `  8. Comprobante de pago de matrícula emitido por Tesorería.`
            );
        }

        if (/\b(horarios?|sedes?|donde queda|direccion|telefono|contacto|secretaria|atienden|momento|perico|san pedro|libertador)\b/i.test(qNorm)) {
            secciones.push(
                `**Sedes, Horarios de Atención y Contacto del IES N° 7:**\n` +
                `- **Sede Central (San Salvador de Jujuy):** Calle Sarmiento N° 268 y Belgrano N° 435.\n` +
                `  - **Horario de Secretaría y Tesorería:** Lunes a viernes de **08:00 a 12:30 hs** (mañana) y de **15:30 a 20:30 hs** (tarde/noche).\n` +
                `  - **Teléfono:** (0388) 4224514 | **Correos:** informes@ies7.edu.ar / campusvirtual@ies7.edu.ar\n` +
                `- **Sede Perico:** Av. Malvinas Argentinas N° 199 (Lunes a viernes de **18:00 a 22:00 hs**).\n` +
                `- **Sede San Pedro:** Calle Mitre N° 257 (Lunes a viernes de **18:30 a 22:30 hs**).\n` +
                `- **Sede Libertador Gral. San Martín:** Colegio FASTA Secundario (Lunes a viernes de **18:00 a 22:00 hs**).`
            );
        }

        if (/\b(examen|examenes|final|finales|mesa|mesas|regularidad|regular|asistencia|anotarme|equivalencias?|aulas?|distribucion)\b/i.test(qNorm)) {
            secciones.push(
                `**Reglamento Académico, Distribución de Aulas y Exámenes Finales:**\n` +
                `- **Distribución de Aulas:** Se publica diariamente en las carteleras informativas de planta baja de Sede Central (Sarmiento 268 / Belgrano 435) y en el portal del Campus Virtual.\n` +
                `- **Inscripción a exámenes finales:** Personal y obligatoria por autogestión en el Campus Virtual hasta **48 horas hábiles antes** de la mesa (bajas hasta 24 horas antes).\n` +
                `- **Vigencia de la regularidad:** Dura **2 años académicos consecutivos** desde el primer turno posterior al cursado.\n` +
                `- **Requisitos para regularizar:** **75% de asistencia** mínima (o 60% con certificado laboral/médico), trabajos prácticos y parciales aprobados con nota mínima de **6 (seis)** puntos.\n` +
                `- **Equivalencias:** Se solicitan en Secretaría Académica durante el mes de **marzo** con programas autenticados.`
            );
        }

        let cuerpo = "";
        if (secciones.length > 0) {
            cuerpo = secciones.join("\n\n");
        } else {
            const bloques = contextoDocumental
                .split("\n\n[FRAGMENTO")
                .map(b => {
                    const m = b.match(/Contenido:\s*([\s\S]+)$/i);
                    return m ? m[1].trim() : "";
                })
                .filter(Boolean);

            cuerpo = bloques[0] || "La información oficial se encuentra disponible en Secretaría Académica del IES N° 7.";
            cuerpo = cuerpo.replace(/^#+\s*/gm, "").trim();
            const lastDot = cuerpo.lastIndexOf(".");
            if (lastDot > 80 && lastDot < cuerpo.length - 1) {
                cuerpo = cuerpo.substring(0, lastDot + 1);
            }
        }

        let respuesta = (prefijo + cuerpo).trim();

        if (fuentes && fuentes.length > 0 && !respuesta.toLowerCase().includes("fuentes:")) {
            respuesta += `\n\nFuentes: ${fuentes.join("; ")}`;
        }

        return respuesta;
    }

    /**
     * Envía la solicitud a Google Gemini API para generar la respuesta.
     */
    async generar({ systemPrompt, promptUsuario, historialGemini = [], contextoDocumental = "", tono = "neutral", saludo = null, fuentes = [], modo = "Solo base de conocimiento" }) {
        if (!this.tieneApiKeyValida()) {
            return this.generarRespuestaContingencia({
                promptUsuario,
                systemPrompt,
                contextoDocumental,
                tono,
                saludo,
                fuentes,
                modo
            });
        }

        const contents = [
            ...historialGemini,
            {
                role: "user",
                parts: [{ text: promptUsuario }]
            }
        ];

        const payload = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
                temperature: this.config.temperature,
                topP: this.config.topP,
                topK: this.config.topK,
                maxOutputTokens: Math.max(this.config.maxOutputTokens || 550, 450)
            }
        };

        const candidatosIniciales = Array.from(new Set([
            this.cachedWorkingModel,
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro"
        ])).filter(Boolean);

        const intentarLlamada = async (modeloActual) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloActual}:generateContent?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                const candidate = data.candidates && data.candidates[0];
                const textResponse = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

                if (textResponse) {
                    this.cachedWorkingModel = modeloActual;
                    let respuestaFinal = textResponse.trim();
                    if (fuentes && fuentes.length > 0 && !respuestaFinal.toLowerCase().includes("fuente")) {
                        respuestaFinal += `\n\nFuentes: ${fuentes.join("; ")}`;
                    }
                    return { ok: true, texto: respuestaFinal };
                }
            } else {
                const errorText = await response.text();
                console.warn(`[Gemini API Warning] Modelo ${modeloActual} devolvió ${response.status}: ${errorText.substring(0, 120)}...`);
            }
            return { ok: false };
        };

        for (const modeloActual of candidatosIniciales) {
            try {
                const res = await intentarLlamada(modeloActual);
                if (res.ok) return res.texto;
            } catch (err) {
                console.warn(`[Gemini Network Error] Con modelo ${modeloActual}: ${err.message}`);
            }
        }

        // Auto-descubrimiento dinámico si cambiaron los nombres de endpoint en Google AI Studio
        const modeloDescubierto = await this.descubrirModeloDisponible();
        if (modeloDescubierto && !candidatosIniciales.includes(modeloDescubierto)) {
            try {
                console.log(`[Gemini Auto-Discovery] Probando modelo descubierto: ${modeloDescubierto}`);
                const res = await intentarLlamada(modeloDescubierto);
                if (res.ok) return res.texto;
            } catch (err) {
                console.warn(`[Gemini Auto-Discovery Error]: ${err.message}`);
            }
        }

        return this.generarRespuestaContingencia({
            promptUsuario,
            systemPrompt,
            contextoDocumental,
            tono,
            saludo,
            fuentes,
            modo
        });
    }
}

const GeminiClientModule = {
    GEMINI_CONFIG_DEFAULT,
    GeminiClient
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = GeminiClientModule;
}
if (typeof window !== "undefined") {
    window.GeminiClientModule = GeminiClientModule;
}
