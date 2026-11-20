/**
 * popuchat2/engine/gemini_client.js
 * Conector Dual de Alta Velocidad: Groq (Qwen3) + Google Gemini API
 * Con conmutación automática (failover por demora/timeout o error)
 * y Motor de Síntesis Estructurada 100% PopuChat (IES N° 7).
 */

const fs = typeof require !== "undefined" ? require("fs") : null;
const path = typeof require !== "undefined" ? require("path") : null;

function cargarClaveEnv(nombreVar) {
    if (typeof process !== "undefined" && process.env && process.env[nombreVar]) {
        const k = process.env[nombreVar].trim();
        if (!k.includes("PEGA_AQUI") && k.length > 10) return k;
    }

    if (fs && path) {
        const envPath = path.join(__dirname, "../.env");
        if (fs.existsSync(envPath)) {
            const contenido = fs.readFileSync(envPath, "utf-8");
            const regex = new RegExp(`^${nombreVar}\\s*=\\s*(.+)$`, "m");
            const match = contenido.match(regex);
            if (match && match[1] && !match[1].includes("PEGA_AQUI") && match[1].trim().length > 10) {
                return match[1].trim();
            }
        }
    }

    return null;
}

const GEMINI_CONFIG_DEFAULT = {
    model: "gemini-flash-latest",
    groqModel: "qwen/qwen3-32b",
    temperature: 0.3,
    topP: 0.85,
    topK: 20,
    maxOutputTokens: 550,
    timeoutGroqMs: 5500,
    timeoutGeminiMs: 7500
};

/**
 * Ejecuta fetch con timeout estricto para activar failover rápido si un proveedor demora.
 */
async function fetchConTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Limpia posibles etiquetas internas <think>...</think> de modelos Qwen3.
 */
function limpiarPensamientoInterno(texto) {
    if (!texto) return "";
    return texto.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

class GeminiClient {
    constructor(apiKey = null, config = {}, groqApiKey = null) {
        this.apiKey = apiKey || cargarClaveEnv("GEMINI_API_KEY");
        this.groqApiKey = groqApiKey || cargarClaveEnv("GROQ_API_KEY");
        this.config = { ...GEMINI_CONFIG_DEFAULT, ...config };
        this.cachedWorkingModel = null;
        this.cachedWorkingGroqModel = null;
        this.ultimoDiagnostico = {
            proveedor: "sin-ejecutar",
            modelo: null,
            latenciaMs: 0,
            tieneGroq: this.tieneGroqKeyValida(),
            tieneGemini: this.tieneGeminiKeyValida()
        };
    }

    setApiKey(key) {
        if (key && key.trim().length > 10 && !key.includes("PEGA_AQUI")) {
            if (this.apiKey !== key.trim()) {
                this.apiKey = key.trim();
                this.cachedWorkingModel = null;
            }
        }
        this.ultimoDiagnostico.tieneGemini = this.tieneGeminiKeyValida();
    }

    setGroqApiKey(key) {
        if (key && key.trim().length > 10 && !key.includes("PEGA_AQUI")) {
            if (this.groqApiKey !== key.trim()) {
                this.groqApiKey = key.trim();
                this.cachedWorkingGroqModel = null;
            }
        }
        this.ultimoDiagnostico.tieneGroq = this.tieneGroqKeyValida();
    }

    tieneGeminiKeyValida() {
        return Boolean(this.apiKey && !this.apiKey.includes("PEGA_AQUI") && this.apiKey.length > 10);
    }

    tieneGroqKeyValida() {
        return Boolean(this.groqApiKey && !this.groqApiKey.includes("PEGA_AQUI") && this.groqApiKey.length > 10);
    }

    tieneApiKeyValida() {
        return this.tieneGroqKeyValida() || this.tieneGeminiKeyValida();
    }

    /**
     * Convierte el historial en formato Gemini ({role: "user"|"model", parts:[{text}]})
     * al formato estándar Chat Completions ({role: "user"|"assistant", content}).
     */
    convertirHistorialOpenAI(historialGemini = []) {
        if (!Array.isArray(historialGemini)) return [];
        return historialGemini
            .map(m => {
                const role = m.role === "model" ? "assistant" : "user";
                const text = Array.isArray(m.parts)
                    ? m.parts.map(p => p.text || "").join("")
                    : (m.content || "");
                return text ? { role, content: text } : null;
            })
            .filter(Boolean);
    }

    /**
     * Descubre dinámicamente en la API de Google qué modelos soportan generateContent
     * para evitar al 100% cualquier error 404 NotFound.
     */
    async descubrirModeloDisponible() {
        if (!this.tieneGeminiKeyValida()) return [];
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${this.apiKey}`;
            const res = await fetchConTimeout(url, {}, 4000);
            if (!res.ok) return [];
            const data = await res.json();
            if (!data || !Array.isArray(data.models)) return [];

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

            const flash = candidatos.filter(c => c.includes("flash") && !c.includes("image") && !c.includes("preview"));
            return [...flash.reverse(), ...candidatos.filter(c => !flash.includes(c))];
        } catch (e) {
            return [];
        }
    }

    /**
     * Llama a Groq API usando Qwen (ultra rápido ~0.8 - 1.5s) con timeout estricto.
     */
    async llamarGroqQwen({ systemPrompt, promptUsuario, historialGemini, fuentes }) {
        if (!this.tieneGroqKeyValida()) return { ok: false };

        const messages = [
            { role: "system", content: systemPrompt },
            ...this.convertirHistorialOpenAI(historialGemini),
            { role: "user", content: promptUsuario }
        ];

        const candidatosGroq = Array.from(new Set([
            this.cachedWorkingGroqModel,
            this.config.groqModel,
            "qwen/qwen3-32b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant"
        ])).filter(Boolean);

        const maxTok = Math.max(this.config.maxOutputTokens || 550, 450);

        for (const modelo of candidatosGroq) {
            const inicio = Date.now();
            try {
                const bodyObj = {
                    model: modelo,
                    messages,
                    temperature: this.config.temperature,
                    top_p: this.config.topP,
                    max_tokens: maxTok
                };

                // Para Qwen3 en Groq desactivamos el razonamiento largo para velocidad instantánea
                if (modelo.includes("qwen3")) {
                    bodyObj.reasoning_effort = "none";
                }

                const response = await fetchConTimeout(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${this.groqApiKey}`
                        },
                        body: JSON.stringify(bodyObj)
                    },
                    this.config.timeoutGroqMs
                );

                if (response.ok) {
                    const data = await response.json();
                    const rawText = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                    const textResponse = limpiarPensamientoInterno(rawText);

                    if (textResponse) {
                        this.cachedWorkingGroqModel = modelo;
                        let respuestaFinal = textResponse;
                        if (fuentes && fuentes.length > 0 && !respuestaFinal.toLowerCase().includes("fuente")) {
                            respuestaFinal += `\n\nFuentes: ${fuentes.join("; ")}`;
                        }
                        const latenciaMs = Date.now() - inicio;
                        this.ultimoDiagnostico = {
                            proveedor: "Groq (Qwen)",
                            modelo,
                            latenciaMs,
                            tieneGroq: true,
                            tieneGemini: this.tieneGeminiKeyValida()
                        };
                        console.log(`[IA OK - Groq] Modelo: ${modelo} | Tiempo: ${latenciaMs}ms`);
                        return { ok: true, texto: respuestaFinal };
                    }
                } else {
                    const errTxt = await response.text();
                    console.warn(`[Groq API Warning] Modelo ${modelo} devolvió ${response.status}: ${errTxt.substring(0, 120)}`);
                    // Si es 401 (clave inválida) no seguir probando otros modelos de Groq
                    if (response.status === 401) break;
                }
            } catch (err) {
                const motivo = err.name === "AbortError" ? `TIMEOUT (> ${this.config.timeoutGroqMs}ms)` : err.message;
                console.warn(`[Groq Failover] Modelo ${modelo}: ${motivo} -> conmutando automáticamente.`);
                // Si hubo timeout en Groq, saltar rápido al proveedor alternativo (Gemini)
                if (err.name === "AbortError") break;
            }
        }

        return { ok: false };
    }

    /**
     * Llama a Google Gemini API con timeout estricto y thinking desactivado para mayor rapidez.
     */
    async llamarGemini({ systemPrompt, promptUsuario, historialGemini, fuentes }) {
        if (!this.tieneGeminiKeyValida()) return { ok: false };

        const contents = [
            ...historialGemini,
            {
                role: "user",
                parts: [{ text: promptUsuario }]
            }
        ];

        const basePayload = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
                temperature: this.config.temperature,
                topP: this.config.topP,
                topK: this.config.topK,
                maxOutputTokens: Math.max(this.config.maxOutputTokens || 550, 450) + 1024
            }
        };

        const candidatosIniciales = Array.from(new Set([
            this.cachedWorkingModel,
            this.config.model,
            "gemini-flash-latest",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash"
        ])).filter(Boolean);

        const intentarLlamada = async (modeloActual) => {
            const inicio = Date.now();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloActual}:generateContent?key=${this.apiKey}`;
            const payloadModelo = JSON.parse(JSON.stringify(basePayload));

            // Desactivar pensamiento prolongado en Gemini 2.5 Flash para bajar latencia a ~2s
            if (modeloActual.includes("2.5-flash") || modeloActual.includes("flash-latest")) {
                payloadModelo.generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }

            const response = await fetchConTimeout(
                url,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadModelo)
                },
                this.config.timeoutGeminiMs
            );

            if (response.ok) {
                const data = await response.json();
                const candidate = data.candidates && data.candidates[0];
                const partes = (candidate && candidate.content && candidate.content.parts) || [];
                const textResponse = partes.filter(p => p.text && !p.thought).map(p => p.text).join("").trim();

                if (textResponse) {
                    this.cachedWorkingModel = modeloActual;
                    let respuestaFinal = textResponse;
                    if (fuentes && fuentes.length > 0 && !respuestaFinal.toLowerCase().includes("fuente")) {
                        respuestaFinal += `\n\nFuentes: ${fuentes.join("; ")}`;
                    }
                    const latenciaMs = Date.now() - inicio;
                    this.ultimoDiagnostico = {
                        proveedor: "Google Gemini",
                        modelo: modeloActual,
                        latenciaMs,
                        tieneGroq: this.tieneGroqKeyValida(),
                        tieneGemini: true
                    };
                    console.log(`[IA OK - Gemini] Modelo: ${modeloActual} | Tiempo: ${latenciaMs}ms`);
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
                if (res.ok) return res;
            } catch (err) {
                const motivo = err.name === "AbortError" ? `TIMEOUT (> ${this.config.timeoutGeminiMs}ms)` : err.message;
                console.warn(`[Gemini Failover] Modelo ${modeloActual}: ${motivo}`);
                if (err.name === "AbortError") break;
            }
        }

        // Auto-descubrimiento si ningún modelo inicial respondió
        const descubiertos = (await this.descubrirModeloDisponible())
            .filter(m => !candidatosIniciales.includes(m))
            .slice(0, 3);
        for (const modeloDescubierto of descubiertos) {
            try {
                const res = await intentarLlamada(modeloDescubierto);
                if (res.ok) return res;
            } catch (err) {
                console.warn(`[Gemini Auto-Discovery Error]: ${err.message}`);
            }
        }

        return { ok: false };
    }

    /**
     * Sintetizador fáctico estructurado (cuando no hay API Keys activas o sin red).
     */
    generarRespuestaContingencia({ promptUsuario, systemPrompt, contextoDocumental, tono, saludo, fuentes, modo }) {
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

        const limpiarBloque = b => b.replace(/^#+\s*/gm, "").trim();
        const candidatos = bloques.map(limpiarBloque);
        const cuerpo = candidatos.filter(c => c.length >= 120).slice(0, 2).join("\n\n") || candidatos[0] || "";

        let respuesta = (prefijo + cuerpo).trim();
        if (respuesta) {
            respuesta += "\n\n¿Querés que te cuente algo más sobre este tema?";
        }

        if (fuentes && fuentes.length > 0 && !respuesta.toLowerCase().includes("fuentes:")) {
            respuesta += `\n\nFuentes: ${fuentes.join("; ")}`;
        }

        this.ultimoDiagnostico = {
            proveedor: "Respaldo Local",
            modelo: "sintetizador-rag-local",
            latenciaMs: 1,
            tieneGroq: this.tieneGroqKeyValida(),
            tieneGemini: this.tieneGeminiKeyValida()
        };

        return respuesta;
    }

    /**
     * Orquestador Dual:
     * 1) Si existe clave Groq -> intenta primero Qwen en Groq (ultra rápido, timeout 5.5s).
     * 2) Si Groq demora demasiado, falla o no tiene clave -> conmuta automáticamente a Google Gemini (timeout 7.5s).
     * 3) Si ambos fallan o no hay claves -> usa respaldo estructurado local.
     */
    async generar({ systemPrompt, promptUsuario, historialGemini = [], contextoDocumental = "", tono = "neutral", saludo = null, fuentes = [], modo = "Solo base de conocimiento", respaldo = null }) {
        if (!this.tieneApiKeyValida()) {
            if (respaldo) return respaldo;
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

        // Prioridad 1: Groq (Qwen3) - Ultra rápido (~1s) con failover automático si supera 5.5s o da error
        if (this.tieneGroqKeyValida()) {
            const resGroq = await this.llamarGroqQwen({
                systemPrompt,
                promptUsuario,
                historialGemini,
                fuentes
            });
            if (resGroq.ok) return resGroq.texto;
        }

        // Prioridad 2 (Failover automático): Google Gemini API
        if (this.tieneGeminiKeyValida()) {
            const resGemini = await this.llamarGemini({
                systemPrompt,
                promptUsuario,
                historialGemini,
                fuentes
            });
            if (resGemini.ok) return resGemini.texto;
        }

        if (respaldo) return respaldo;
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
