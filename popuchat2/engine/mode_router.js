/**
 * popuchat2/engine/mode_router.js
 * Enrutador Maestro y Orquestador Híbrido (PLN + RAG + Gemini)
 * Coordina las 5 capas del sistema e implementa los 3 modos de operación.
 */

const TextProcessor = typeof module !== "undefined" && module.exports
    ? require("../pipeline/text_processor")
    : window.TextProcessor;

const ToneAnalyzer = typeof module !== "undefined" && module.exports
    ? require("../pipeline/tone_analyzer")
    : window.ToneAnalyzer;

const IntentDetector = typeof module !== "undefined" && module.exports
    ? require("../pipeline/intent_detector")
    : window.IntentDetector;

const { formatearContexto, obtenerFuentesUnicas } = typeof module !== "undefined" && module.exports
    ? require("../rag/rag_engine")
    : window.RAGEngine;

const SystemPrompt = typeof module !== "undefined" && module.exports
    ? require("./system_prompt")
    : window.SystemPrompt;

const MemoryManager = typeof module !== "undefined" && module.exports
    ? require("./memory_manager")
    : window.MemoryManager;

const { GeminiClient } = typeof module !== "undefined" && module.exports
    ? require("./gemini_client")
    : window.GeminiClientModule;

class PopuChatEngine {
    constructor(indiceRAG, apiKey = null) {
        this.indiceRAG = indiceRAG;
        this.gemini = new GeminiClient(apiKey);
        this.memoria = new MemoryManager(6);
        this.registroConsultas = [];
    }

    /**
     * Procesa una consulta completa a través del pipeline híbrido.
     * @param {string} pregunta - Pregunta del usuario en lenguaje natural.
     * @param {string} modo - "Solo base de conocimiento" | "Base + conocimiento general" | "Solo IA general"
     * @returns {Promise<object>}
     */
    async procesarConsulta(pregunta, modo = "Solo base de conocimiento") {
        if (!pregunta || !pregunta.trim()) {
            return {
                respuesta: "Por favor, escribí una consulta para comenzar.",
                normalizado: "",
                tono: "neutral",
                saludo: null,
                intenciones: [],
                fuentes: [],
                resultadosRAG: []
            };
        }

        // 1. CAPA PLN: Limpieza y Normalización
        const normalizado = TextProcessor.normalizarTexto(pregunta);

        // 2. CAPA PLN: Análisis de Tono Jerárquico
        const tono = ToneAnalyzer.detectarTono(pregunta);

        // 3. CAPA PLN: Extractor de Saludo Contextual (Regla 7: solo saludar una vez al inicio)
        let saludo = IntentDetector.detectarSaludo(pregunta);
        if (this.memoria.yaSaludado()) {
            saludo = null; // No reiterar el saludo en turnos posteriores
        }

        // 4. CAPA PLN: Detección de Intenciones
        const intenciones = IntentDetector.detectarIntenciones(pregunta);

        // 5. CAPA RAG: Búsqueda Semántica en Documentos
        let resultadosRAG = [];
        if (modo !== "Solo IA general") {
            resultadosRAG = this.indiceRAG.buscar(normalizado);
        }

        const fuentes = obtenerFuentesUnicas(resultadosRAG);
        let respuestaFinal = "";

        // 6. CONTROL CONVERSACIONAL Y FÁCTICO DE MODO ESTRICTO
        const tieneIntencionInformativa = intenciones.some(i => 
            ["inscripcion", "requisitos", "carreras", "horarios", "ubicacion", "aranceles", "becas", "contacto"].includes(i)
        );

        if (!tieneIntencionInformativa && intenciones.includes("saludo")) {
            respuestaFinal = `¡Hola! 👋 Soy PopuChat 2, el asistente virtual del IES N° 7 "Populorum Progressio" - INTELA. Cuento con IA híbrida y base documental oficial. ¿En qué puedo orientarte hoy? Podés consultarme sobre carreras, cuotas, sedes, horarios o inscripciones.`;
        } else if (!tieneIntencionInformativa && intenciones.includes("agradecimiento")) {
            respuestaFinal = `¡De nada! Es un verdadero placer orientarte. Si tenés alguna otra consulta sobre el IES N° 7, acá estoy a tu entera disposición. ¡Muchos éxitos en tu camino académico! 🎓`;
        } else if (!tieneIntencionInformativa && intenciones.includes("identidad")) {
            respuestaFinal = `Soy PopuChat 2, el asistente virtual del IES N° 7 "Populorum Progressio" - INTELA. Estoy programado con tecnología de Procesamiento de Lenguaje Natural, motor RAG y modelos generativos de IA para brindarte información verídica y actualizada sobre nuestra institución.`;
        } else if (!tieneIntencionInformativa && intenciones.includes("despedida")) {
            respuestaFinal = `¡Hasta luego! Que tengas un excelente día. Cualquier otra consulta que tengas sobre el IES N° 7, aquí estaré para ayudarte. 👋`;
        } else if (modo === "Solo base de conocimiento" && resultadosRAG.length === 0) {
            respuestaFinal = "No encontré información suficiente sobre esa consulta en la base de conocimiento institucional. Podés reformular la pregunta o comunicarte directamente con Secretaría Académica del IES N° 7.";
            if (tono === "molesto") {
                respuestaFinal = "Lamento sinceramente el inconveniente. " + respuestaFinal;
            }
        } else {
            // 7. CAPA GENERATIVA: Ensamblado de Prompt y Ejecución con Gemini
            const contextoDocumental = modo === "Solo IA general"
                ? "El modo actual no utiliza documentos institucionales."
                : formatearContexto(resultadosRAG);

            const systemPrompt = SystemPrompt.obtenerSystemPrompt();
            const promptUsuario = SystemPrompt.construirPromptUsuario({
                preguntaOriginal: pregunta,
                preguntaNormalizada: normalizado,
                tono,
                saludo,
                intenciones,
                contextoDocumental,
                modo
            });

            const historialGemini = this.memoria.obtenerHistorialGemini();

            respuestaFinal = await this.gemini.generar({
                systemPrompt,
                promptUsuario,
                historialGemini,
                contextoDocumental,
                tono,
                saludo,
                fuentes
            });
        }

        // 8. CAPA MEMORIA: Actualizar ventana conversacional
        this.memoria.agregarIntercambio(pregunta, respuestaFinal);

        // 9. CAPA AUDITORÍA: Registrar en matriz de telemetría (para exportación CSV)
        const registro = {
            fecha_hora: new Date().toISOString().replace("T", " ").substring(0, 19),
            pregunta: pregunta,
            normalizado: normalizado,
            tono: tono,
            intenciones: intenciones.join(", "),
            modo: modo,
            fuentes: fuentes.join("; "),
            respuesta: respuestaFinal
        };
        this.registroConsultas.push(registro);

        return {
            respuesta: respuestaFinal,
            normalizado,
            tono,
            saludo,
            intenciones,
            fuentes,
            resultadosRAG,
            registroAuditoria: registro
        };
    }

    /**
     * Retorna todas las consultas registradas en la sesión.
     */
    obtenerRegistroAuditoria() {
        return [...this.registroConsultas];
    }

    /**
     * Limpia la memoria de la conversación actual.
     */
    reiniciarConversacion() {
        this.memoria.limpiar();
    }
}

const ModeRouterModule = {
    PopuChatEngine
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ModeRouterModule;
}
if (typeof window !== "undefined") {
    window.ModeRouterModule = ModeRouterModule;
}
