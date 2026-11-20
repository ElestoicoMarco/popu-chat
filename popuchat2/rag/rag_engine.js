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

// Palabras funcionales que no aportan contenido a la búsqueda
const PALABRAS_VACIAS = new Set([
    "que", "cual", "cuales", "como", "para", "por", "una", "uno", "unos", "unas", "los", "las", "del",
    "con", "son", "sus", "hay", "tiene", "tienen", "esta", "estan", "este", "esto", "ese", "esa", "eso",
    "donde", "quien", "quienes", "cuanto", "cuanta", "cuantos", "cuantas", "hago", "puedo", "podes",
    "quiero", "saber", "decime", "pasame", "dame", "necesito", "hace", "rato", "nadie", "dice", "pregunto",
    "cuando", "hola", "buenas", "tardes", "noches", "mas", "muy", "sobre", "entre", "ser", "fue", "era", "sin", "pero", "les", "nos", "mis", "tus"
]);

/**
 * Reduce plurales simples del español ("inscripciones" -> "inscripcion", "becas" -> "beca").
 */
function singularizar(token) {
    if (token.length <= 4) return token;
    if (token.endsWith("iones")) return token.slice(0, -2);
    if (token.endsWith("ces")) return token.slice(0, -3) + "z";
    if (/[^aeiou]es$/.test(token) && token.length > 5) return token.slice(0, -2);
    if (token.endsWith("s")) return token.slice(0, -1);
    if (token.length > 6 && /[ae]n$/.test(token)) return token.slice(0, -1);
    return token;
}

/**
 * Tokeniza y expande la representación de términos del texto.
 */
function extraerTerminos(texto) {
    const limpio = normalizarTexto(texto.replace(/^(passage|query):\s*/i, ""));
    const tokens = limpio.split(/\s+/).filter(t => t.length > 2 && !PALABRAS_VACIAS.has(t));
    const conjunto = new Set(tokens);
    for (const token of tokens) {
        conjunto.add(singularizar(token));
    }
    const base = new Set(conjunto);

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

    return { tokens, conjunto, base };
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
        if (fragInfo.conjunto.has(token) || fragInfo.conjunto.has(singularizar(token))) {
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

/**
 * Texto usado para puntuar un fragmento: su contenido más las palabras clave de su sección
 * (las mismas que usa PopuChat 1 para detectar la intención). Las palabras clave no se envían al modelo.
 */
function textoIndexable(fragmento) {
    return fragmento.palabras_clave ? `${fragmento.texto} ${fragmento.palabras_clave}` : fragmento.texto;
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
        this.frecuenciaDocumental = new Map();
        for (const frag of this.fragmentos) {
            for (const termino of extraerTerminos(textoIndexable(frag)).base) {
                this.frecuenciaDocumental.set(termino, (this.frecuenciaDocumental.get(termino) || 0) + 1);
            }
        }
        return this.fragmentos.length;
    }

    /**
     * Cobertura de la consulta ponderada por IDF: prioriza los términos poco frecuentes
     * (ej. "fotocopiadora", "coordinador") sobre los que aparecen en casi todos los fragmentos.
     * Solo se usa para ordenar resultados que ya superaron el umbral.
     */
    calcularRelevanciaIDF(queryTokens, fragmentoTexto, titulo = "") {
        const total = this.fragmentos.length;
        const frag = extraerTerminos(fragmentoTexto).base;
        const encabezado = titulo ? extraerTerminos(titulo).base : new Set();
        let peso = 0;
        let pesoCoincidente = 0;
        let pesoEncabezado = 0;
        for (const token of new Set(queryTokens)) {
            const singular = singularizar(token);
            const df = Math.max(this.frecuenciaDocumental.get(token) || 0, this.frecuenciaDocumental.get(singular) || 0);
            if (df === 0) continue;
            const idf = Math.log((total + 1) / (df + 1)) + 1;
            peso += idf;
            if (frag.has(token) || frag.has(singular)) pesoCoincidente += idf;
            if (encabezado.has(token) || encabezado.has(singular)) pesoEncabezado += idf;
        }
        return peso > 0 ? (pesoCoincidente + 0.5 * pesoEncabezado) / peso : 0;
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
            const similitud = calcularSimilitudSemantica(pregunta, textoIndexable(this.fragmentos[i]));
            resultados.push({
                ...this.fragmentos[i],
                similitud: Math.round(similitud * 1000) / 1000
            });
        }

        const queryTokens = extraerTerminos(pregunta).tokens;

        // Filtrar por umbral mínimo, ordenar por relevancia IDF y acotar a topK
        return resultados
            .filter(r => r.similitud >= this.config.umbral_similitud)
            .map(r => ({ r, relevancia: this.calcularRelevanciaIDF(queryTokens, textoIndexable(r), r.titulo) + 0.5 * r.similitud - (r.continuacion ? 0.1 : 0) }))
            .sort((a, b) => (b.relevancia - a.relevancia) || (b.r.similitud - a.r.similitud))
            .map(x => x.r)
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
