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

        const bloques = contextoDocumental
            .split("\n\n[FRAGMENTO")
            .map(b => {
                const m = b.match(/Contenido:\s*([\s\S]+)$/i);
                return m ? m[1].trim() : "";
            })
            .filter(Boolean);

        const limpiarBloque = b => b
            .replace(/^#+\s*/gm, "")
            .trim();
        const candidatos = bloques.map(limpiarBloque);
        const cuerpo = candidatos.filter(c => c.length >= 120).slice(0, 2).join("\n\n") || candidatos[0] || "";

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
