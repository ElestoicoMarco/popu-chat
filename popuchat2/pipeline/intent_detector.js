/**
 * popuchat2/pipeline/intent_detector.js
 * Extractor de Saludos Contextuales y Clasificador de Intenciones
 * Especificación de la Clase 3, 6 y 13 de PLN.
 */

const { normalizarTexto } = typeof module !== "undefined" && module.exports
    ? require("./text_processor")
    : window.TextProcessor;

const PATRONES_INTENCIONES = {
    saludo: [
        /\bhola\b/i, /\bbuen dia\b/i, /\bbuenos dias\b/i,
        /\bbuenas tardes\b/i, /\bbuenas noches\b/i, /\bbuenas\b/i
    ],
    inscripcion: [
        /\binscrip/i, /\banotarme\b/i, /\bpreinscripcion\b/i,
        /\bingreso\b/i
    ],
    requisitos: [
        /\brequisit/i, /\bdocument/i, /\bpapeles\b/i,
        /\bdni\b/i, /\btitulo secundario\b/i
    ],
    carreras: [
        /\bcarreras?\b/i, /\boferta academica\b/i,
        /\bque puedo estudiar\b/i, /\btecnicatura/i, /\bprofesorado/i
    ],
    horarios: [
        /\bhorarios?\b/i, /\ba que hora\b/i,
        /\bhasta que hora\b/i, /\bcuando atienden\b/i, /\batencion\b/i
    ],
    ubicacion: [
        /\bubicacion\b/i, /\bdireccion\b/i,
        /\bdonde queda\b/i, /\bcomo llego\b/i, /\bsede\b/i
    ],
    aranceles: [
        /\bprecio\b/i, /\bcuota\b/i, /\barancel/i,
        /\bcosto\b/i, /\bcuanto sale\b/i, /\bes gratis\b/i
    ],
    becas: [
        /\bbecas?\b/i, /\bayuda economica\b/i,
        /\btransporte\b/i, /\bcomedor\b/i
    ],
    contacto: [
        /\btelefono\b/i, /\bcorreo\b/i, /\bemail\b/i,
        /\bwhatsapp\b/i, /\bcontact/i
    ],
    agradecimiento: [
        /\bgracias\b/i, /\bmuchas gracias\b/i, /\bagradezc/i,
        /\bte agradezco\b/i, /\bmil gracias\b/i
    ],
    identidad: [
        /\bquien sos\b/i, /\bque sos\b/i, /\bcomo te llamas\b/i,
        /\btu nombre\b/i, /\bque haces\b/i
    ],
    despedida: [
        /\bchau\b/i, /\badios\b/i, /\bhasta luego\b/i,
        /\bnos vemos\b/i
    ]
};

/**
 * Detecta si el mensaje contiene un saludo inicial explícito.
 * @param {string} texto - Mensaje original del usuario.
 * @returns {string | null} Saludo estandarizado o null si no contiene saludo.
 */
function detectarSaludo(texto) {
    const normalizado = normalizarTexto(texto);

    if (normalizado.includes("buenas noches")) {
        return "Buenas noches";
    }
    if (normalizado.includes("buenas tardes")) {
        return "Buenas tardes";
    }
    if (normalizado.includes("buenos dias") || normalizado.includes("buen dia")) {
        return "Buen día";
    }
    if (/\bhola\b/i.test(normalizado)) {
        return "Hola";
    }
    if (/\bbuenas\b/i.test(normalizado)) {
        return "Buenas";
    }

    return null;
}

/**
 * Detecta todas las intenciones presentes en el mensaje del usuario.
 * @param {string} texto - Mensaje del usuario.
 * @returns {string[]} Lista de intenciones detectadas.
 */
function detectarIntenciones(texto) {
    const normalizado = normalizarTexto(texto);
    const detectadas = [];

    for (const [intencion, patrones] of Object.entries(PATRONES_INTENCIONES)) {
        const coincide = patrones.some(patron => patron.test(normalizado));
        if (coincide) {
            detectadas.push(intencion);
        }
    }

    return detectadas;
}

const IntentDetector = {
    PATRONES_INTENCIONES,
    detectarSaludo,
    detectarIntenciones
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = IntentDetector;
}
if (typeof window !== "undefined") {
    window.IntentDetector = IntentDetector;
}
