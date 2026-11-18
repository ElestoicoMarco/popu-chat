/**
 * popuchat2/pipeline/text_processor.js
 * Módulo de Limpieza y Normalización de Texto (PLN Híbrido)
 * Basado en las especificaciones de las Clases 3, 6 y 8 de la cátedra de PLN.
 */

const ABREVIACIONES = {
    "q": "que",
    "xq": "porque",
    "pq": "porque",
    "xfa": "por favor",
    "xfi": "por favor",
    "dnd": "donde",
    "info": "informacion",
    "wsp": "whatsapp",
    "tel": "telefono",
    "hs": "horas"
};

const ERRORES_FRECUENTES = {
    "incripcion": "inscripcion",
    "inscripsion": "inscripcion",
    "horraio": "horario",
    "orario": "horario",
    "ubicasion": "ubicacion",
    "direcsion": "direccion",
    "requisistos": "requisitos",
    "carrerras": "carreras"
};

/**
 * Remueve tildes y marcas diacríticas conservando la 'ñ'.
 */
function quitarTildes(texto) {
    if (!texto) return "";
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Reduce secuencias repetidas de 3 o más caracteres a 2,
 * y normaliza interjecciones y saludos comunes.
 */
function reducirRepeticiones(texto) {
    if (!texto) return "";
    // Colapsar 3 o más letras consecutivas a 2
    let procesado = texto.replace(/(.)\1{2,}/g, "$1$1");

    const correcciones = {
        "holaa": "hola",
        "buenass": "buenas",
        "graciass": "gracias",
        "chauu": "chau"
    };

    for (const [forma, correccion] of Object.entries(correcciones)) {
        const regex = new RegExp(`\\b${forma}\\b`, "gi");
        procesado = procesado.replace(regex, correccion);
    }

    return procesado;
}

/**
 * Reemplaza palabras mediante un diccionario de mapeo.
 */
function reemplazarDiccionario(texto, diccionario) {
    if (!texto) return "";
    return texto
        .split(/\s+/)
        .map(palabra => diccionario[palabra] || palabra)
        .join(" ");
}

/**
 * Pipeline completo de normalización de texto para el bot.
 * @param {string} texto - Texto original ingresado por el usuario.
 * @returns {string} Texto normalizado y listo para búsqueda semántica / RAG.
 */
function normalizarTexto(texto) {
    if (typeof texto !== "string") return "";

    let t = texto.toLowerCase().trim();
    t = quitarTildes(t);
    t = reducirRepeticiones(t);
    // Conservar caracteres alfanuméricos y la letra ñ
    t = t.replace(/[^a-z0-9ñ\s]/gi, " ");
    t = t.replace(/\s+/g, " ").trim();
    t = reemplazarDiccionario(t, ABREVIACIONES);
    t = reemplazarDiccionario(t, ERRORES_FRECUENTES);
    return t.replace(/\s+/g, " ").trim();
}

const TextProcessor = {
    ABREVIACIONES,
    ERRORES_FRECUENTES,
    quitarTildes,
    reducirRepeticiones,
    reemplazarDiccionario,
    normalizarTexto
};

// Compatibilidad Node.js y Navegador
if (typeof module !== "undefined" && module.exports) {
    module.exports = TextProcessor;
}
if (typeof window !== "undefined") {
    window.TextProcessor = TextProcessor;
}
