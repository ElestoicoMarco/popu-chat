/**
 * popuchat2/engine/memory_manager.js
 * Gestor de Memoria Conversacional (Ventana Deslizante de 6 Turnos)
 * Basado en las Clases 5 y 12 de PLN.
 */

class MemoryManager {
    constructor(maxTurnos = 6) {
        this.maxTurnos = maxTurnos; // 6 turnos = 12 mensajes (user + assistant)
        this.historial = [];
        this.saludoEmitido = false;
    }

    /**
     * Agrega un intercambio completo a la memoria.
     * @param {string} userMessage 
     * @param {string} assistantMessage 
     */
    agregarIntercambio(userMessage, assistantMessage) {
        if (userMessage) {
            this.historial.push({ role: "user", content: userMessage });
        }
        if (assistantMessage) {
            this.historial.push({ role: "assistant", content: assistantMessage });
            this.saludoEmitido = true;
        }

        // Mantener solo los últimos maxTurnos * 2 mensajes
        const limiteMensajes = this.maxTurnos * 2;
        if (this.historial.length > limiteMensajes) {
            this.historial = this.historial.slice(-limiteMensajes);
        }
    }

    /**
     * Retorna el historial estándar para el LLM.
     * @returns {Array<{role: string, content: string}>}
     */
    obtenerHistorial() {
        return [...this.historial];
    }

    /**
     * Formatea el historial para la API oficial de Google Gemini:
     * Gemini espera roles: 'user' y 'model' con estructura { role, parts: [{ text }] }
     */
    obtenerHistorialGemini() {
        return this.historial.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
        }));
    }

    /**
     * Indica si ya se emitió un saludo previo en la sesión actual.
     */
    yaSaludado() {
        return this.saludoEmitido;
    }

    /**
     * Reinicia la memoria de la conversación.
     */
    limpiar() {
        this.historial = [];
        this.saludoEmitido = false;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = MemoryManager;
}
if (typeof window !== "undefined") {
    window.MemoryManager = MemoryManager;
}
