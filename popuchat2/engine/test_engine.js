/**
 * popuchat2/engine/test_engine.js
 * Suite de Verificación Automática de la Fase 3 (Motor Generativo e Inferencia LLM)
 */

const fs = require("fs");
const path = require("path");
const { IndiceRAG } = require("../rag/rag_engine");
const SystemPrompt = require("./system_prompt");
const MemoryManager = require("./memory_manager");
const { PopuChatEngine } = require("./mode_router");

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

async function runTests() {
    console.log("=================================================");
    console.log("EJECUTANDO TEST SUITE: FASE 3 (MOTOR GENERATIVO Y GEMINI)");
    console.log("=================================================\n");

    // 1. Verificación del System Prompt y 10 Reglas
    console.log("1. Pruebas de Gobernanza del System Prompt (10 Reglas Obligatorias):");
    const sysPrompt = SystemPrompt.obtenerSystemPrompt();
    assert(sysPrompt.includes("REGLAS OBLIGATORIAS:"), "Contiene bloque de reglas obligatorias");
    assert(sysPrompt.includes("Fuentes:"), "Exige citación formal de fuentes");
    assert(sysPrompt.includes("No inventes"), "Contiene directiva estricta anti-alucinación");
    assert(sysPrompt.includes("contención empática") || sysPrompt.includes("empatía"), "Contiene directiva de empatía para usuario molesto");
    assert(sysPrompt.includes("una sola vez"), "Contiene directiva de no reiterar saludos");

    // 2. Verificación del Gestor de Memoria Contextual
    console.log("\n2. Pruebas del Gestor de Memoria (Ventana de 6 Turnos / 12 Mensajes):");
    const mem = new MemoryManager(6);
    for (let i = 1; i <= 8; i++) {
        mem.agregarIntercambio(`Pregunta ${i}`, `Respuesta ${i}`);
    }
    const historial = mem.obtenerHistorial();
    assert(historial.length === 12, "Acota el historial a exactamente 12 mensajes (6 turnos)");
    assert(historial[0].content === "Pregunta 3", "Descarta los turnos más antiguos mediante ventana deslizante");
    assert(mem.yaSaludado() === true, "Registra que ya se emitió saludo en la sesión");

    // 3. Inicialización del Motor Completo con RAG
    console.log("\n3. Inicialización del Orquestador PopuChatEngine:");
    const fuentesDir = path.join(__dirname, "../data/fuentes");
    const archivos = fs.readdirSync(fuentesDir).filter(f => f.endsWith(".txt"));
    const documentos = archivos.map(f => ({
        fuente: f.replace(/^\d+_/, "").replace(/\.txt$/, ""),
        texto: fs.readFileSync(path.join(fuentesDir, f), "utf-8")
    }));
    const indice = new IndiceRAG();
    indice.construir(documentos);

    const engine = new PopuChatEngine(indice);
    assert(engine !== null, "Instanciación exitosa de PopuChatEngine");

    // 4. Pruebas de Procesamiento y Modos de Inferencia
    console.log("\n4. Pruebas de Inferencia y Modos de Operación:");

    // Turno 1: Saludo + Consulta de Horario
    const turno1 = await engine.procesarConsulta("Buenas tardes, a qué hora atiende la sede central?");
    assert(turno1.saludo === "Buenas tardes", "Identifica saludo inicial en Turno 1");
    assert(turno1.tono === "formal", "Clasifica tono como formal");
    assert(turno1.respuesta.includes("08:00 a 12:30"), "Responde con el horario fáctico correcto");
    assert(turno1.respuesta.includes("Fuentes:"), "Incluye cita obligatoria de fuentes");

    // Turno 2: Verificación de NO repetición de saludo (Regla 7)
    const turno2 = await engine.procesarConsulta("Hola de nuevo, cuánto cuesta la cuota mensual?");
    assert(turno2.saludo === null, "REGLA 7 CUMPLIDA: Oprime el saludo en el Turno 2 para no reiterar");
    assert(turno2.respuesta.includes("60.000") || turno2.respuesta.includes("70.000"), "Entrega valores de arancel correctos");

    // Turno 3: Usuario Molesto (Regla 8 - Empatía)
    const turno3 = await engine.procesarConsulta("HACE RATO PREGUNTO Y NADIE ME DICE HASTA CUANDO PUEDO ANOTARME AL FINAL!!!");
    assert(turno3.tono === "molesto", "Detecta tono molesto por mayúsculas y exclamaciones");
    assert(turno3.respuesta.toLowerCase().includes("molestia") || turno3.respuesta.toLowerCase().includes("disculpa"), "Aplica contención empática antes de responder");
    assert(turno3.respuesta.includes("48 horas"), "Entrega la regla reglamentaria de 48 horas");

    // Turno 4: Blindaje Fáctico en Modo Estricto (Regla 4 - Cero Alucinación)
    const turno4 = await engine.procesarConsulta("Quién ganó el último mundial de fútbol?", "Solo base de conocimiento");
    assert(turno4.respuesta.includes("No encontré información suficiente"), "REGLA 4 CUMPLIDA: Rechaza categóricamente inventar datos fuera de base");
    assert(turno4.fuentes.length === 0, "No asocia fuentes espurias a preguntas fuera de base");

    // 5. Verificación de Matriz de Auditoría para CSV
    console.log("\n5. Pruebas del Registro de Auditoría (Telemetría de Cátedra):");
    const auditoria = engine.obtenerRegistroAuditoria();
    assert(auditoria.length === 4, "Registra exactamente las 4 consultas procesadas");
    
    const primerReg = auditoria[0];
    const tieneCamposCompletos = [
        "fecha_hora", "pregunta", "normalizado", "tono", "intenciones", "modo", "fuentes", "respuesta"
    ].every(campo => primerReg[campo] !== undefined);
    assert(tieneCamposCompletos, "Registro de auditoría contiene el esquema completo de 8 campos para exportación CSV");

    console.log("\n=================================================");
    console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} pruebas superadas.`);
    if (passedTests === totalTests) {
        console.log("ESTADO: FASE 3 APROBADA AL 100% CON ÉXITO.");
    } else {
        console.error("ESTADO: HAY FALLOS EN LA SUITE DE PRUEBAS.");
        process.exit(1);
    }
    console.log("=================================================");
}

runTests().catch(err => {
    console.error("Error ejecutando tests de Fase 3:", err);
    process.exit(1);
});
