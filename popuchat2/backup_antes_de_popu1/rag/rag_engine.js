/**
 * popuchat2/rag/rag_engine.js
 * Motor RAG, Búsqueda Semántica Híbrida y Formateo Contextual
 * Basado estrictamente en las Clases 7, 10 y 12 de la cátedra de PLN.
 */

const { normalizarTexto } = typeof module !== "undefined" && module.exports
    ? require("../pipeline/text_processor")
    : window.TextProcessor;

const { prepararFragmentos } = typeof module !== "undefined" && module.exports
    ? require("./chunker")
    : window.Chunker;

// Configuración RAG oficial de cátedra
const RAG_CONFIG = {
    tamano_fragmento: 700,
    solapamiento: 120,
    top_k: 4,
    umbral_similitud: 0.35
};

// Mapeo de afines semánticos para paráfrasis (Clase 10 - Similitud Semántica)
const CLUSTER_SEMANTICO = {
    horario: ["momento", "hora", "cuando", "dia", "atienden", "atencion", "turno", "manana", "abierto", "cerrado"],
    secretaria: ["secretaria", "tramite", "alumnos", "tesoreria", "administracion", "contacto", "hablar", "consultar"],
    cuota: ["precio", "arancel", "aranceles", "costo", "sale", "mensual", "valor", "pagar", "matricula", "pesos"],
    inscripcion: ["inscribirme", "anotarme", "ingreso", "preinscripcion", "anotarse", "fechas", "abierta"],
    requisitos: ["papeles", "documentos", "documentacion", "dni", "titulo", "fotocopia", "partida", "carnet"],
    examen: ["mesa", "final", "finales", "rendir", "regularidad", "materia", "evaluacion", "horas"],
    carrera: ["estudiar", "oferta", "tecnicatura", "profesorado", "titulo", "duracion", "anos", "plan"]
};

/**
 * Tokeniza y expande la representación de términos del texto.
 */
function extraerTerminos(texto) {
    const limpio = normalizarTexto(texto.replace(/^(passage|query):\s*/i, ""));
    const tokens = limpio.split(/\s+/).filter(t => t.length > 2);
    const conjunto = new Set(tokens);

    // Expansión semántica para capturar paráfrasis
    for (const token of tokens) {
        for (const [clave, afines] of Object.entries(CLUSTER_SEMANTICO)) {
            if (token === clave || afines.includes(token)) {
                conjunto.add(clave);
                for (const afin of afines) {
                    conjunto.add(afin);
                }
            }
        }
    }

    return { tokens, conjunto };
}

/**
 * Calcula la afinidad semántica normalizada (escala 0.0 a 1.0) entre la consulta y un fragmento.
 * Simula el comportamiento del embedding multilingual-e5 respetando el umbral de 0.35.
 */
function calcularSimilitudSemantica(queryTexto, fragmentoTexto) {
    const queryInfo = extraerTerminos(queryTexto);
    const fragInfo = extraerTerminos(fragmentoTexto);

    if (queryInfo.tokens.length === 0) return 0.0;

    // 1. Coincidencia directa de tokens originales de la pregunta
    let directMatches = 0;
    for (const token of queryInfo.tokens) {
        if (fragInfo.conjunto.has(token)) {
            directMatches++;
        }
    }
    const ratioDirecto = directMatches / queryInfo.tokens.length;

    // 2. Coincidencia conceptual global expandida
    let semanticMatches = 0;
    for (const semTerm of queryInfo.conjunto) {
        if (fragInfo.conjunto.has(semTerm)) {
            semanticMatches++;
        }
    }
    const ratioSemantico = queryInfo.conjunto.size > 0 
        ? semanticMatches / queryInfo.conjunto.size 
        : 0;

    // 3. Fusión ponderada: premia la cobertura de la consulta directa y la densidad semántica
    let score = (ratioDirecto * 0.7) + (ratioSemantico * 0.3);

    // Si la pregunta no tiene relación fáctica alguna, el score cae por debajo del umbral 0.35
    if (directMatches === 0 && semanticMatches < 3) {
        score = score * 0.2;
    }

    return Math.min(Math.max(score, 0.0), 1.0);
}

class IndiceRAG {
    constructor(config = RAG_CONFIG) {
        this.config = { ...RAG_CONFIG, ...config };
        this.fragmentos = [];
    }

    /**
     * Construye el índice vectorial a partir de una lista de documentos.
     * @param {Array<{fuente: string, texto: string}>} documentos 
     */
    construir(documentos) {
        this.fragmentos = prepararFragmentos(
            documentos,
            this.config.tamano_fragmento,
            this.config.solapamiento
        );
        return this.fragmentos.length;
    }

    /**
     * Realiza la búsqueda semántica recuperando los top_k fragmentos que superan el umbral (0.35).
     * @param {string} pregunta 
     * @param {number} topK 
     * @returns {Array<{id: number, fuente: string, fragmento_numero: number, texto: string, similitud: number}>}
     */
    buscar(pregunta, topK = this.config.top_k) {
        if (!pregunta || this.fragmentos.length === 0) {
            return [];
        }

        const resultados = [];

        for (let i = 0; i < this.fragmentos.length; i++) {
            const similitud = calcularSimilitudSemantica(pregunta, this.fragmentos[i].texto);
            resultados.push({
                ...this.fragmentos[i],
                similitud: Math.round(similitud * 1000) / 1000
            });
        }

        // Ordenar descendentemente por similitud
        resultados.sort((a, b) => b.similitud - a.similitud);

        // Filtrar por umbral mínimo y acotar a topK
        return resultados
            .filter(r => r.similitud >= this.config.umbral_similitud)
            .slice(0, topK);
    }
}

/**
 * Formatea los fragmentos documentales para inyectarlos en el prompt del LLM.
 * @param {Array<{fuente: string, fragmento_numero: number, texto: string}>} resultados 
 * @returns {string} Bloque de texto formateado.
 */
function formatearContexto(resultados) {
    if (!resultados || resultados.length === 0) {
        return "No se recuperaron fragmentos documentales.";
    }

    return resultados.map((r, i) => {
        return `[FRAGMENTO ${i + 1}]\nFuente: ${r.fuente}\nContenido: ${r.texto}`;
    }).join("\n\n");
}

/**
 * Extrae la lista de nombres de fuentes únicas sin duplicados.
 * @param {Array<{fuente: string}>} resultados 
 * @returns {string[]}
 */
function obtenerFuentesUnicas(resultados) {
    if (!resultados || resultados.length === 0) return [];
    return [...new Set(resultados.map(r => r.fuente))];
}

const RAGEngine = {
    RAG_CONFIG,
    extraerTerminos,
    calcularSimilitudSemantica,
    IndiceRAG,
    formatearContexto,
    obtenerFuentesUnicas
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = RAGEngine;
}
if (typeof window !== "undefined") {
    window.RAGEngine = RAGEngine;
}
