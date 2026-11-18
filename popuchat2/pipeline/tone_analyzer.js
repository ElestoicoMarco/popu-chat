/**
 * popuchat2/pipeline/tone_analyzer.js
 * Módulo de Clasificación Jerárquica de Tono Emocional
 * Especificación de la Clase 6 y Clase 13 de PLN.
 * 
 * Jerarquía Estricta:
 * 1. Molesto
 * 2. Agradecido
 * 3. Formal (Evaluado ANTES que informal para proteger 'buenas tardes' / 'buen dia')
 * 4. Informal
 * 5. Neutral
 */

const { normalizarTexto } = typeof module !== "undefined" && module.exports
    ? require("./text_processor")
    : window.TextProcessor;

const PALABRAS_MOLESTIA = [
    "molesto", "enojado", "pesimo", "horrible",
    "nadie responde", "hace rato", "una verguenza",
    "no funciona", "urgente"
];

const PALABRAS_AGRADECIMIENTO = [
    "gracias", "muchas gracias", "te agradezco",
    "genial", "excelente", "muy amable"
];

const PALABRAS_FORMALES = [
    "buen dia", "buenos dias", "buenas tardes", "buenas noches",
    "quisiera", "podria", "por favor", "disculpe",
    "necesitaria", "agradeceria"
];

const PALABRAS_INFORMALES = [
    "hola", "holi", "buenas", "che", "porfa",
    "me decis", "dale"
];

/**
 * Cuenta la cantidad de apariciones de un caracter en un texto.
 */
function contarOcurrencias(texto, caracter) {
    if (!texto) return 0;
    return (texto.match(new RegExp(`\\${caracter}`, "g")) || []).length;
}

/**
 * Detecta si el texto está completamente en mayúsculas (ignorando espacios y signos)
 * y tiene una longitud significativa (mayor a 5 caracteres).
 */
function esMayusculasSostenidas(texto) {
    if (!texto) return false;
    const letras = texto.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ]/g, "");
    return letras.length > 5 && letras === letras.toUpperCase();
}

/**
 * Clasifica el tono principal del mensaje respetando la jerarquía oficial.
 * @param {string} textoOriginal - Mensaje original del usuario sin normalizar.
 * @returns {"molesto" | "agradecido" | "formal" | "informal" | "neutral"}
 */
function detectarTono(textoOriginal) {
    if (!textoOriginal || typeof textoOriginal !== "string") {
        return "neutral";
    }

    const normalizado = normalizarTexto(textoOriginal);

    // 1. PRIORIDAD MÁXIMA: Molesto
    const tienePalabraMolestia = PALABRAS_MOLESTIA.some(frase => normalizado.includes(frase));
    const tieneSignosExclamacion = contarOcurrencias(textoOriginal, "!") >= 2;
    const tieneGritos = esMayusculasSostenidas(textoOriginal);

    if (tienePalabraMolestia || tieneSignosExclamacion || tieneGritos) {
        return "molesto";
    }

    // 2. Agradecido
    if (PALABRAS_AGRADECIMIENTO.some(frase => normalizado.includes(frase))) {
        return "agradecido";
    }

    // 3. Formal (Evaluado ANTES que informal)
    if (PALABRAS_FORMALES.some(frase => normalizado.includes(frase))) {
        return "formal";
    }

    // 4. Informal
    if (PALABRAS_INFORMALES.some(frase => normalizado.includes(frase))) {
        return "informal";
    }

    // 5. Neutral por descarte
    return "neutral";
}

const ToneAnalyzer = {
    PALABRAS_MOLESTIA,
    PALABRAS_AGRADECIMIENTO,
    PALABRAS_FORMALES,
    PALABRAS_INFORMALES,
    detectarTono
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ToneAnalyzer;
}
if (typeof window !== "undefined") {
    window.ToneAnalyzer = ToneAnalyzer;
}
