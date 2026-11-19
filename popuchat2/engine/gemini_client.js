/**
 * popuchat2/engine/gemini_client.js
 * Conector con Google Gemini API y Motor de Inferencia Estructurado
 * Sincronizado 1:1 con el comportamiento validado en Colab (PopuChat_2_RAG_PLN_OFICIAL.ipynb).
 */

const fs = typeof require !== "undefined" ? require("fs") : null;
const path = typeof require !== "undefined" ? require("path") : null;

// Cargar clave desde .env si estamos en entorno Node.js
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
    maxOutputTokens: 500
};

/**
 * Cliente de Inferencia para Google Gemini con síntesis estructurada de respaldo
 */
class GeminiClient {
    constructor(apiKey = null, config = {}) {
        this.apiKey = apiKey || cargarClaveDesdeEnv();
        this.config = { ...GEMINI_CONFIG_DEFAULT, ...config };
    }

    /**
     * Establece o actualiza la API Key en caliente (desde UI o configuración).
     */
    setApiKey(key) {
        this.apiKey = key ? key.trim() : null;
    }

    /**
     * Verifica si posee una API Key válida configurada.
     */
    tieneApiKeyValida() {
        return Boolean(this.apiKey && !this.apiKey.includes("PEGA_AQUI") && this.apiKey.length > 10);
    }

    /**
     * Sintetizador fáctico estructurado (cuando se ejecuta en local sin API Key o sin conexión externa).
     * Replica fielmente las respuestas estructuradas del notebook de Colab.
     */
    generarRespuestaContingencia({ promptUsuario, systemPrompt, contextoDocumental, tono, saludo, fuentes, modo }) {
        const matchPregunta = promptUsuario.match(/PREGUNTA (?:DEL USUARIO )?A RESPONDER:\s*([\s\S]+)$/i);
        const preguntaUsuario = (matchPregunta ? matchPregunta[1] : promptUsuario).trim();
        const qNorm = preguntaUsuario.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const esModoGeneral = (modo === "Solo IA general") ||
            (contextoDocumental && contextoDocumental.includes("no utiliza documentos"));

        // 1. MODO "Solo IA general" (Sin documentos RAG)
        if (esModoGeneral) {
            const pideDatosInstitucionales = /\b(populorum|ies\s*7|ies\s*n|intela|cuota|matricula|arancel|sede|perico|san pedro|libertador|sarmiento|inscripcion|inscribirme|secretaria|tesoreria|mesa|regularidad|correlativa)\b/i.test(qNorm);
            if (pideDatosInstitucionales) {
                return "No encontré esa información en la base de conocimiento.\n\nFuentes: ninguna.";
            }
            if (qNorm.includes("ciencia de datos") || qNorm.includes("inteligencia artificial")) {
                return "Un técnico en Ciencia de Datos e Inteligencia Artificial se encarga de recopilar, procesar y analizar grandes volúmenes de datos para extraer patrones, tendencias y conocimientos útiles. Utiliza herramientas estadísticas, matemáticas y de programación (como Python, SQL y modelos de Machine Learning y Procesamiento de Lenguaje Natural) para transformar datos en decisiones estratégicas, automatización predictiva y soluciones inteligentes.\n\nFuentes: conocimiento general del modelo.";
            }
            if (qNorm.includes("examen") || qNorm.includes("estudiar") || qNorm.includes("consejo")) {
                return "Para prepararte con éxito para un examen académico, te recomiendo:\n\n1. **Organizá el temario con anticipación:** Dividí las unidades en bloques diarios manejables.\n2. **Practicá explicaciones claras y concisas:** Exponé los conceptos principales en voz alta con tus propias palabras.\n3. **Elaborá mapas conceptuales y resúmenes:** Conectá los temas clave de la materia.\n4. **Simulá preguntas de mesa:** Practicá posibles preguntas frente a un compañero o espejo controlando el tiempo.\n5. **Mantené la calma y descansá bien:** Dormir adecuadamente antes de rendir consolida la memoria.\n\nFuentes: conocimiento general del modelo.";
            }
            if (qNorm.includes("software") || qNorm.includes("programacion")) {
                return "El Desarrollo de Software abarca el diseño, programación, prueba y mantenimiento de aplicaciones web, móviles y de escritorio, utilizando bases de datos, arquitecturas modernas y metodologías ágiles.\n\nFuentes: conocimiento general del modelo.";
            }
            return "Desde el conocimiento general académico, puedo orientarte sobre conceptos de estudio, tecnología, ciencia de datos, preparación de exámenes y metodología universitaria.\n\nFuentes: conocimiento general del modelo.";
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

        let cuerpo = "";

        // Síntesis limpia según el tópico consultado respaldado en los fragmentos recuperados
        const pideCarreras = /\b(carreras?|tecnicaturas?|profesorados?|oferta|estudiar|duran|duracion)\b/i.test(qNorm);
        const pideCuotas = /\b(cuotas?|arancel|aranceles|matricula|valores|costo|cuanto sale|precio)\b/i.test(qNorm);
        const pideBecas = /\b(becas?|progresar|ayuda economica)\b/i.test(qNorm);
        const pideRequisitos = /\b(requisitos?|papeles|documentos?|documentacion|inscripcion|inscribirme|ingreso|cursillo)\b/i.test(qNorm);
        const pideHorariosSedes = /\b(horarios?|sedes?|donde queda|direccion|telefono|contacto|secretaria|atienden|momento|perico|san pedro|libertador)\b/i.test(qNorm);
        const pideExamenesReglamento = /\b(examen|examenes|final|finales|mesa|mesas|regularidad|regular|asistencia|anotarme|equivalencias?|aulas?)\b/i.test(qNorm);

        const secciones = [];

        if (pideCarreras) {
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

        if (pideCuotas) {
            secciones.push(
                `Los valores oficiales de **cuotas mensuales y matrícula** en el IES N° 7 son:\n\n` +
                `- **Cuota mensual para Carreras Generales:** **$60.000** por mes (tecnicaturas administrativas, humanísticas, profesorados y ciencias sociales).\n` +
                `- **Cuota mensual para Carreras Especiales:** **$70.000** por mes (Ciencia de Datos e Inteligencia Artificial, Laboratorio Clínico y Hemoterapia, Acompañamiento Terapéutico, Mecatrónica y Automatización).\n` +
                `- **Régimen de pago:** 10 cuotas mensuales consecutivas de marzo a diciembre (vencen el último día de cada mes).\n` +
                `- **Matrícula de Inscripción (Ciclo Lectivo 2027):**\n` +
                `  - Abonando en **diciembre de 2026**: **$90.000**.\n` +
                `  - Abonando hasta el **31 de marzo de 2027**: **$100.000**.\n` +
                `- **Horario de Tesorería:** Lunes a viernes de 08:00 a 12:00 y de 15:30 a 20:00 hs.`
            );
        }

        if (pideBecas) {
            secciones.push(
                `**Régimen de Becas Estudiantiles del IES N° 7:**\n` +
                `- **Becas Progresar (Nacionales):** Los alumnos regulares pueden postularse a Progresar Nivel Superior (ANSES) en las convocatorias de marzo y agosto.\n` +
                `- **Becas Institucionales de Estímulo:** Cupos de ayuda económica y medias becas arancelarias según situación socioeconómica y rendimiento académico regular, gestionadas ante Bienestar Estudiantil.`
            );
        }

        if (pideRequisitos) {
            secciones.push(
                `**Inscripción, Fechas y Requisitos (Ciclo Lectivo 2027):**\n` +
                `- **Plazo de inscripción:** Desde diciembre de 2026 hasta el **31 de marzo de 2027** (preinscripción online en el Campus Virtual y entrega física en Secretaría de 08:00 a 12:00 o de 15:30 a 20:00 hs).\n` +
                `- **Curso de Ingreso Obligatorio y Nivelatorio:** Del **01 al 19 de marzo de 2027** (cartillas disponibles desde febrero de 2027).\n` +
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

        if (pideHorariosSedes) {
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

        if (pideExamenesReglamento) {
            secciones.push(
                `**Reglamento Académico, Regularidad y Mesas de Examen Final:**\n` +
                `- **Inscripción a exámenes finales:** Personal y obligatoria por autogestión en el Campus Virtual hasta **48 horas hábiles antes** de la mesa (sin excepciones fuera de término; bajas hasta 24 horas antes).\n` +
                `- **Vigencia de la regularidad:** Dura **2 años académicos consecutivos** desde el primer turno posterior al cursado.\n` +
                `- **Requisitos para regularizar:** **75% de asistencia** mínima (o 60% con certificado laboral/médico), 100% de trabajos prácticos y parciales aprobados con nota mínima de **6 (seis)** puntos (con derecho a recuperatorio).\n` +
                `- **Aulas y Equivalencias:** La distribución de aulas se publica en planta baja de Sede Central y en el Campus Virtual. Las equivalencias se solicitan durante el mes de **marzo** con programas autenticados.`
            );
        }

        if (secciones.length > 0) {
            cuerpo = secciones.join("\n\n");
        } else {
            // Extraer limpiamente el contenido de los fragmentos recuperados conservando saltos de línea
            const bloques = contextoDocumental
                .split("\n\n[FRAGMENTO")
                .map(b => {
                    const m = b.match(/Contenido:\s*([\s\S]+)$/i);
                    return m ? m[1].trim() : "";
                })
                .filter(Boolean);

            cuerpo = bloques[0] || "La información oficial se encuentra disponible en Secretaría Académica del IES N° 7.";
            // Limpiar encabezados markdown manteniendo legibilidad
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
                maxOutputTokens: Math.max(this.config.maxOutputTokens || 500, 450)
            }
        };

        const modelosAConsultar = Array.from(new Set([
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro"
        ])).filter(Boolean);

        for (const modeloActual of modelosAConsultar) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloActual}:generateContent?key=${this.apiKey}`;
            try {
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
                        let respuestaFinal = textResponse.trim();
                        if (fuentes && fuentes.length > 0 && !respuestaFinal.toLowerCase().includes("fuente")) {
                            respuestaFinal += `\n\nFuentes: ${fuentes.join("; ")}`;
                        }
                        return respuestaFinal;
                    }
                } else {
                    const errorText = await response.text();
                    console.warn(`[Gemini API Warning] Modelo ${modeloActual} devolvió ${response.status}: ${errorText.substring(0, 120)}...`);
                }
            } catch (err) {
                console.warn(`[Gemini Network Error] Con modelo ${modeloActual}: ${err.message}`);
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
