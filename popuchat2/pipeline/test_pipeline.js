/**
 * popuchat2/pipeline/test_pipeline.js
 * Suite de Verificación Automática de la Fase 1 (Pipeline PLN)
 */

const TextProcessor = require("./text_processor");
const ToneAnalyzer = require("./tone_analyzer");
const IntentDetector = require("./intent_detector");

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
console.log("EJECUTANDO TEST SUITE: FASE 1 (PIPELINE PLN)");
console.log("=================================================\n");

// 1. Tests de Normalización y Limpieza
console.log("1. Pruebas de Limpieza y Normalización:");
const entrada1 = "Holaaaa, q papeles necesito para la incripcion en la tecnicatura???";
const norm1 = TextProcessor.normalizarTexto(entrada1);
assert(norm1.includes("que"), "Expande abreviación 'q' -> 'que'");
assert(norm1.includes("inscripcion"), "Corrige error frecuente 'incripcion' -> 'inscripcion'");
assert(norm1.startsWith("hola"), "Reduce repetición abusiva 'holaaaa' -> 'hola'");

const entrada2 = "dnd queda la sede y a q hs atienden?";
const norm2 = TextProcessor.normalizarTexto(entrada2);
assert(norm2.includes("donde"), "Expande 'dnd' -> 'donde'");
assert(norm2.includes("horas"), "Expande 'hs' -> 'horas'");

// 2. Tests de Detección de Tono (Jerarquía Oficial)
console.log("\n2. Pruebas de Clasificación Jerárquica de Tono:");
const tonoMolesto1 = ToneAnalyzer.detectarTono("HACE RATO PREGUNTO Y NADIE ME RESPONDE!!!");
assert(tonoMolesto1 === "molesto", "Detecta tono MOLESTO por mayúsculas y exclamaciones múltiples");

const tonoMolesto2 = ToneAnalyzer.detectarTono("es una verguenza que no atiendan el telefono");
assert(tonoMolesto2 === "molesto", "Detecta tono MOLESTO por palabra crítica 'verguenza'");

const tonoAgradecido = ToneAnalyzer.detectarTono("Muchas gracias por la informacion, muy amable!");
assert(tonoAgradecido === "agradecido", "Detecta tono AGRADECIDO");

// REGLA CRÍTICA DE LA PROFESORA: "Buenas tardes" DEBE ser formal, NO informal
const tonoFormal1 = ToneAnalyzer.detectarTono("Buenas tardes, quisiera consultar los aranceles");
assert(tonoFormal1 === "formal", "REGLA CLAVE CÁTEDRA: 'Buenas tardes' se clasifica como FORMAL y no informal");

const tonoFormal2 = ToneAnalyzer.detectarTono("Buen dia, podria indicarme los requisitos?");
assert(tonoFormal2 === "formal", "Clasifica 'Buen dia' como FORMAL");

const tonoInformal = ToneAnalyzer.detectarTono("hola che me pasas info dale");
assert(tonoInformal === "informal", "Detecta tono INFORMAL");

const tonoNeutral = ToneAnalyzer.detectarTono("requisitos para tecnicatura en software");
assert(tonoNeutral === "neutral", "Detecta tono NEUTRAL por defecto");

// 3. Tests de Detección de Saludos (Para responder una sola vez)
console.log("\n3. Pruebas de Detección de Saludo Contextual:");
assert(IntentDetector.detectarSaludo("Buenas tardes a todos") === "Buenas tardes", "Extrae 'Buenas tardes'");
assert(IntentDetector.detectarSaludo("Hola, qué tal?") === "Hola", "Extrae 'Hola'");
assert(IntentDetector.detectarSaludo("buenos dias profesor") === "Buen día", "Extrae 'Buen día'");
assert(IntentDetector.detectarSaludo("requisitos para el ingreso") === null, "Devuelve null si no hay saludo");

// 4. Tests de Detección de Intenciones Múltiples
console.log("\n4. Pruebas de Detección de Intenciones Múltiples:");
const consultaMultiple = "Hola! Que carreras tienen, cuanto sale la cuota y dnd queda la sede?";
const intenciones = IntentDetector.detectarIntenciones(consultaMultiple);
assert(intenciones.includes("saludo"), "Detecta intención 'saludo'");
assert(intenciones.includes("carreras"), "Detecta intención 'carreras'");
assert(intenciones.includes("aranceles"), "Detecta intención 'aranceles'");
assert(intenciones.includes("ubicacion"), "Detecta intención 'ubicacion'");

console.log("\n=================================================");
console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} pruebas superadas.`);
if (passedTests === totalTests) {
    console.log("ESTADO: FASE 1 APROBADA AL 100% CON ÉXITO.");
} else {
    console.error("ESTADO: HAY FALLOS EN LA SUITE DE PRUEBAS.");
    process.exit(1);
}
console.log("=================================================");
