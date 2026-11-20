/**
 * popuchat2/rag/chunker.js
 * Módulo de Fragmentación Quirúrgica de Documentos (Chunking 700/120)
 * Basado estrictamente en las especificaciones de la Clase 9 de PLN.
 */

/**
 * Limpia caracteres nulos y normaliza espacios en blanco del documento.
 */
function limpiarDocumento(texto) {
    if (!texto || typeof texto !== "string") return "";
    return texto
        .replace(/\x00/g, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Divide un documento en fragmentos oracionales de longitud controlada con solapamiento.
 * @param {string} texto - Texto del documento.
 * @param {number} tamano - Tamaño máximo de caracteres por fragmento (default: 700).
 * @param {number} solapamiento - Cantidad de caracteres superpuestos entre fragmentos adyacentes (default: 120).
 * @returns {string[]} Lista de fragmentos.
 */
function dividirEnFragmentos(texto, tamano = 700, solapamiento = 120) {
    const limpio = limpiarDocumento(texto);
    if (!limpio) return [];

    const fragmentos = [];
    let inicio = 0;

    while (inicio < limpio.length) {
        let fin = Math.min(inicio + tamano, limpio.length);

        // Si no estamos al final del documento, buscar un límite oracional natural
        if (fin < limpio.length) {
            const sub = limpio.substring(inicio, fin);
            
            // Prioridad 1: Punto y espacio (oración completa)
            const cortePunto = sub.lastIndexOf(". ");
            const cortePuntoYComa = sub.lastIndexOf("; ");
            const corteEspacio = sub.lastIndexOf(" ");

            if (cortePunto !== -1 && cortePunto > Math.floor(tamano * 0.45)) {
                fin = inicio + cortePunto + 1; // Incluye el punto
            } else if (cortePuntoYComa !== -1 && cortePuntoYComa > Math.floor(tamano * 0.5)) {
                fin = inicio + cortePuntoYComa + 1;
            } else if (corteEspacio !== -1 && corteEspacio > Math.floor(tamano * 0.6)) {
                fin = inicio + corteEspacio;
            }
        }

        const fragmento = limpio.substring(inicio, fin).trim();
        if (fragmento) {
            fragmentos.push(fragmento);
        }

        if (fin >= limpio.length) {
            break;
        }

        // El nuevo inicio retrocede según el solapamiento, pero respetando límites de palabras
        let siguienteInicio = Math.max(fin - solapamiento, inicio + 1);
        if (siguienteInicio < fin) {
            // Avanzar si quedó partido en el medio de una palabra
            while (siguienteInicio < fin && limpio[siguienteInicio - 1] !== " " && limpio[siguienteInicio] !== " ") {
                siguienteInicio++;
            }
            if (siguienteInicio < fin && limpio[siguienteInicio] === " ") {
                siguienteInicio++;
            }
        }
        inicio = siguienteInicio;
    }

    return fragmentos;
}

/**
 * Procesa una lista de documentos y genera la matriz de fragmentos con metadatos.
 * @param {Array<{fuente: string, texto: string}>} documentos 
 * @param {number} tamano 
 * @param {number} solapamiento 
 * @returns {Array<{id: number, fuente: string, fragmento_numero: number, texto: string}>}
 */
function prepararFragmentos(documentos, tamano = 700, solapamiento = 120) {
    const registros = [];

    for (const documento of documentos) {
        const frags = dividirEnFragmentos(documento.texto, tamano, solapamiento);
        for (let i = 0; i < frags.length; i++) {
            registros.push({
                id: registros.length,
                fuente: documento.fuente,
                fragmento_numero: i + 1,
                texto: frags[i]
            });
        }
    }

    return registros;
}

const Chunker = {
    limpiarDocumento,
    dividirEnFragmentos,
    prepararFragmentos
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = Chunker;
}
if (typeof window !== "undefined") {
    window.Chunker = Chunker;
}
