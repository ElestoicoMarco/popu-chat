/**
 * popuchat2/rag/test_rag.js
 * Suite de Verificación Automática de la Fase 2 (Motor RAG y Chunking 700/120)
 */

const fs = require("fs");
const path = require("path");
const Chunker = require("./chunker");
const { IndiceRAG, formatearContexto, obtenerFuentesUnicas } = require("./rag_engine");

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
    totalTests++;
    if (condition) {
        console.log(`  [PASS] ${testName}`);
        passedTests++;
    } else {
        console.error(`  [FAIL] ${testName}`);
    }
}

console.log("=================================================");
console.log("EJECUTANDO TEST SUITE: FASE 2 (MOTOR RAG Y CHUNKING)");
console.log("=================================================\n");

// 1. Cargar documentos reales del Populorum
const fuentesDir = path.join(__dirname, "../data/fuentes");
const archivos = fs.readdirSync(fuentesDir).filter(f => f.endsWith(".txt"));
const documentos = archivos.map(f => ({
    fuente: f.replace(/^\d+_/, "").replace(/\.txt$/, ""),
    texto: fs.readFileSync(path.join(fuentesDir, f), "utf-8")
}));

console.log(`1. Documentos cargados desde popuchat2/data/fuentes/: ${documentos.length} archivos`);
assert(documentos.length >= 5, "Carga exitosa de al menos 5 fuentes oficiales");

// 2. Tests de Fragmentación (Chunking 700/120)
console.log("\n2. Pruebas del Algoritmo de Fragmentación (700/120):");
const fragmentos = Chunker.prepararFragmentos(documentos, 700, 120);
console.log(`   Total de fragmentos generados: ${fragmentos.length}`);
assert(fragmentos.length > 5, "Genera múltiples fragmentos estructurados");

const todosMenores700 = fragmentos.every(f => f.texto.length <= 700);
assert(todosMenores700, "Todos los fragmentos respetan el límite máximo de 700 caracteres");

const todosTienenMetadatos = fragmentos.every(f => f.fuente && f.fragmento_numero && f.id !== undefined);
assert(todosTienenMetadatos, "Todos los fragmentos poseen metadatos de fuente y posición");

// 3. Construcción del Índice RAG
console.log("\n3. Construcción del Índice RAG y Vectorización:");
const indice = new IndiceRAG({ umbral_similitud: 0.35, top_k: 4 });
const cantIndexada = indice.construir(documentos);
assert(cantIndexada === fragmentos.length, "Indexación completa de todos los fragmentos");

// 4. Búsqueda Semántica - Pruebas Oficiales de Cátedra
console.log("\n4. Pruebas de Búsqueda Semántica y Umbral de Similitud (>= 0.35):");

// Caso A: Consulta directa de horarios
const rHorario = indice.buscar("Cuál es el horario de atención en sede central?");
assert(rHorario.length > 0, "Recupera fragmentos para horario");
assert(rHorario.some(r => r.fuente.includes("horarios") || r.texto.includes("08:00") || r.texto.includes("8:00")), "Recupera fragmento con horario de atención");

// Caso B: Paráfrasis (sin usar la palabra 'horario')
const rParafrasis = indice.buscar("A qué hora atienden en la institución?");
assert(rParafrasis.length > 0, "Comprende paráfrasis sin requerir la palabra clave 'horario'");
assert(rParafrasis[0].texto.includes("atención"), "Identifica correctamente el horario de atención");

// Caso C: Aranceles y Cuotas
const rArancel = indice.buscar("Cuánto es el valor de la cuota mensual y la inscripción?");
assert(rArancel.length > 0, "Recupera información de cuotas y aranceles");
assert(rArancel.some(r => r.texto.includes("60.000") || r.texto.includes("70.000")), "Recupera los valores numéricos precisos de cuotas ($60.000/$70.000)");

// Caso D: Reglamento y Exámenes Finales
const rReglamento = indice.buscar("Hasta cuándo puedo inscribirme a una mesa de examen final?");
assert(rReglamento.length > 0, "Recupera fragmento de reglamento de exámenes");
assert(rReglamento.some(r => r.texto.includes("48 horas")), "Recupera la regla crítica de 48 horas hábiles");

// Caso E: Pregunta Fuera de Base (Debe descartarse con umbral < 0.35)
const rMundial = indice.buscar("Quién ganó el último mundial de fútbol de la FIFA?");
assert(rMundial.length === 0, "FILTRO DE UMBRAL: Rechaza preguntas fuera de base (0 fragmentos recuperados)");

// 5. Pruebas de Formateo Contextual y Citas
console.log("\n5. Pruebas de Formateo de Contexto y Extracción de Fuentes:");
const contextoFormateado = formatearContexto(rHorario);
assert(contextoFormateado.includes("[FRAGMENTO 1]"), "Formato estandarizado con tag [FRAGMENTO 1]");
assert(contextoFormateado.includes("Fuente:"), "Incluye etiqueta Fuente:");

const fuentesUnicas = obtenerFuentesUnicas(rHorario);
assert(Array.isArray(fuentesUnicas) && fuentesUnicas.length > 0, "Extrae lista de fuentes únicas");
assert(new Set(fuentesUnicas).size === fuentesUnicas.length, "No existen fuentes duplicadas en la lista");

console.log("\n=================================================");
console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} pruebas superadas.`);
if (passedTests === totalTests) {
    console.log("ESTADO: FASE 2 APROBADA AL 100% CON ÉXITO.");
} else {
    console.error("ESTADO: HAY FALLOS EN LA SUITE DE PRUEBAS.");
    process.exit(1);
}
console.log("=================================================");
