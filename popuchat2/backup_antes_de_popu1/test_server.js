/**
 * popuchat2/test_server.js
 * Suite de Verificación Automática del Micro-Avance 4.1 (Servidor Express y API REST)
 */

const http = require("http");
const app = require("./server");

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

// Iniciar servidor en puerto efímero de prueba
const server = http.createServer(app);

server.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    console.log("=================================================");
    console.log(`EJECUTANDO TEST SUITE: MICRO-AVANCE 4.1 (API REST RENDER)`);
    console.log(`Servidor de prueba montado en: ${baseUrl}`);
    console.log("=================================================\n");

    try {
        // 1. Test GET /api/health
        console.log("1. Prueba de Endpoint /api/health (Healthcheck Render):");
        const resHealth = await fetch(`${baseUrl}/api/health`);
        const jsonHealth = await resHealth.json();
        assert(resHealth.status === 200, "Healthcheck retorna HTTP 200");
        assert(jsonHealth.status === "ok", "Respuesta contiene status: ok");
        assert(jsonHealth.service.includes("PopuChat 2"), "Identifica servicio PopuChat 2");

        // 2. Test POST /api/chat con parámetros de cátedra
        console.log("\n2. Prueba de Endpoint /api/chat (Inferencia RAG + Sliders):");
        const resChat = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensaje: "Buenas tardes, a qué hora atiende la secretaría en sede central?",
                modo: "Solo base de conocimiento",
                top_k: 4,
                temperatura: 0.2,
                max_tokens: 350
            })
        });
        const jsonChat = await resChat.json();
        assert(resChat.status === 200, "POST /api/chat retorna HTTP 200");
        assert(jsonChat.ok === true, "Respuesta indica ok: true");
        assert(jsonChat.tono === "formal", "Clasifica tono como formal");
        assert(jsonChat.respuesta.includes("08:00") || jsonChat.respuesta.includes("8:00"), "Responde con el horario fáctico correcto");
        assert(jsonChat.fuentes.length > 0, "Retorna lista de fuentes documentales");
        assert(jsonChat.resultadosRAG.length > 0, "Retorna fragmentos RAG con similitud");

        // 3. Test POST /api/reiniciar
        console.log("\n3. Prueba de Endpoint /api/reiniciar (Reset de Memoria):");
        const resReset = await fetch(`${baseUrl}/api/reiniciar`, { method: "POST" });
        const jsonReset = await resReset.json();
        assert(resReset.status === 200, "POST /api/reiniciar retorna HTTP 200");
        assert(jsonReset.ok === true, "Confirma reinicio de memoria");

        // 4. Test GET /api/auditoria/csv
        console.log("\n4. Prueba de Endpoint /api/auditoria/csv (Descarga CSV Docente):");
        const resCsv = await fetch(`${baseUrl}/api/auditoria/csv`);
        const textCsv = await resCsv.text();
        assert(resCsv.status === 200, "GET /api/auditoria/csv retorna HTTP 200");
        assert(resCsv.headers.get("content-type").includes("text/csv"), "Header content-type es text/csv");
        assert(textCsv.includes("fecha_hora,pregunta,normalizado,tono"), "Cabecera contiene los 8 campos oficiales de cátedra");
        assert(textCsv.includes("Buenas tardes, a qué hora atiende"), "CSV contiene la consulta registrada en la sesión");

        console.log("\n=================================================");
        console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} pruebas superadas.`);
        if (passedTests === totalTests) {
            console.log("ESTADO: MICRO-AVANCE 4.1 APROBADO AL 100% CON ÉXITO.");
        } else {
            console.error("ESTADO: HAY FALLOS EN EL SERVIDOR.");
            process.exit(1);
        }
        console.log("=================================================");

    } catch (err) {
        console.error("Error en pruebas:", err);
        process.exit(1);
    } finally {
        server.close();
    }
});
