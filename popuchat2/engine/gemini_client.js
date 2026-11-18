/**
 * popuchat2/engine/gemini_client.js
 * Conector con Google Gemini API y Motor de Inferencia
 * Basado en las Clases 2, 4 y 12 de PLN.
 */

const fs = typeof require !== "undefined" ? require("fs") : null;
const path = typeof require !== "undefined" ? require("path") : null;

// Cargar clave desde .env si estamos en entorno Node.js
function cargarClaveDesdeEnv() {
    if (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }

    if (fs && path) {
        const envPath = path.join(__dirname, "../.env");
        if (fs.existsSync(envPath)) {
            const contenido = fs.readFileSync(envPath, "utf-8");
            const match = contenido.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
            if (match && match[1] && !match[1].includes("PEGA_AQUI")) {
                return match[1].trim();
            }
        }
    }

    return null;
}

const GEMINI_CONFIG_DEFAULT = {
    model: "gemini-2.5-flash",
    temperature: 0.2,
    topP: 0.85,
    topK: 20,
    maxOutputTokens: 450
};

/**
 * Cliente de Inferencia para Google Gemini
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
     * Generador de respuesta local fáctico (Fallback de contingencia cuando no hay API Key o no hay red).
     */
    generarRespuestaContingencia({ promptUsuario, systemPrompt, contextoDocumental, tono, saludo, fuentes }) {
        let respuesta = "";

        // 1. Manejo de saludo si es el primer turno
        if (saludo && saludo !== "ninguno") {
            respuesta += `${saludo}. `;
        }

        // 2. Manejo de contención empática si el usuario está molesto (Regla 8)
        if (tono === "molesto") {
            respuesta += "Comprendo perfectamente tu molestia y te pido disculpas por cualquier inconveniente previo. Te informo con gusto: ";
        }

        // 3. Extracción fáctica de datos a partir del contexto documental
        if (contextoDocumental && !contextoDocumental.includes("No se recuperaron")) {
            // Sintetizar el fragmento más afín a la pregunta
            const bloques = contextoDocumental
                .split("\n\n")
                .map(b => b.trim())
                .filter(b => b.includes("Contenido:"));

            let fragmentoElegido = "";
            let maxMatches = -1;
            
            // Extraer la pregunta real del usuario del bloque completo
            const matchPregunta = promptUsuario.match(/PREGUNTA DEL USUARIO A RESPONDER:\s*([^\n]+)/i);
            const preguntaUsuario = matchPregunta ? matchPregunta[1] : promptUsuario;
            const palabrasClave = preguntaUsuario.toLowerCase().split(/\s+/).filter(w => w.length > 3);

            for (const bloque of bloques) {
                const matchContenido = bloque.match(/Contenido:\s*([\s\S]+)$/i);
                if (matchContenido && matchContenido[1]) {
                    const texto = matchContenido[1].trim();
                    const matches = palabrasClave.filter(w => texto.toLowerCase().includes(w)).length;
                    if (matches > maxMatches) {
                        maxMatches = matches;
                        fragmentoElegido = texto;
                    }
                }
            }

            if (fragmentoElegido) {
                respuesta += fragmentoElegido;
            } else {
                respuesta += "Respecto a tu consulta sobre el IES N° 7, la información oficial indica que los trámites y cursados se realizan según los reglamentos vigentes.";
            }
        } else {
            // Regla 4: Declaración explícita de información inexistente
            return "No encontré información suficiente sobre esa consulta en la base de conocimiento institucional. Podés reformular la pregunta o comunicarte directamente con Secretaría Académica del IES N° 7.";
        }

        // 4. Regla 5: Citación obligatoria de fuentes
        if (fuentes && fuentes.length > 0 && !respuesta.toLowerCase().includes("fuentes:")) {
            respuesta += `\n\nFuentes: ${fuentes.join("; ")}`;
        }

        return respuesta;
    }

    /**
     * Envía la solicitud a Google Gemini API para generar la respuesta.
     */
    async generar({ systemPrompt, promptUsuario, historialGemini = [], contextoDocumental = "", tono = "neutral", saludo = null, fuentes = [] }) {
        // Si no hay API Key activa o estamos en modo offline, usar el motor de contingencia fáctico
        if (!this.tieneApiKeyValida()) {
            return this.generarRespuestaContingencia({
                promptUsuario,
                systemPrompt,
                contextoDocumental,
                tono,
                saludo,
                fuentes
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.apiKey}`;

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
                maxOutputTokens: this.config.maxOutputTokens
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`[Gemini API Warning]: Error HTTP ${response.status} - utilizando motor de respaldo. Detalle: ${errorText}`);
                return this.generarRespuestaContingencia({
                    promptUsuario,
                    systemPrompt,
                    contextoDocumental,
                    tono,
                    saludo,
                    fuentes
                });
            }

            const data = await response.json();
            const candidate = data.candidates && data.candidates[0];
            const textResponse = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

            if (!textResponse) {
                return this.generarRespuestaContingencia({
                    promptUsuario,
                    systemPrompt,
                    contextoDocumental,
                    tono,
                    saludo,
                    fuentes
                });
            }

            let respuestaFinal = textResponse.trim();

            // Refuerzo fáctico: Si hay fuentes y el modelo omitió la cita al pie, anexarla (Regla 5)
            if (fuentes && fuentes.length > 0 && !respuestaFinal.toLowerCase().includes("fuentes:")) {
                respuestaFinal += `\n\nFuentes: ${fuentes.join("; ")}`;
            }

            return respuestaFinal;

        } catch (err) {
            console.warn(`[Gemini Network Error]: ${err.message} - utilizando motor fáctico local.`);
            return this.generarRespuestaContingencia({
                promptUsuario,
                systemPrompt,
                contextoDocumental,
                tono,
                saludo,
                fuentes
            });
        }
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
