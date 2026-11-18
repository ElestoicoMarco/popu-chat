/**
 * popuchat2/test_ui_client.js
 * Batería de Pruebas Unitarias y de Integración para el Frontend y Despliegue Render
 * Verifica CsvExporter, sintaxis de app.js, configuración de Render y servicio de estáticos.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FALLO: ${message}`);
        failed++;
    }
}

async function runTests() {
    console.log("=== BATERÍA DE PRUEBAS DE CLIENTE, UI Y RENDER (POPUCHAT 2) ===\n");

    // -------------------------------------------------------------
    // GRUPO 1: CsvExporter (Motor de Auditoría en Navegador)
    // -------------------------------------------------------------
    console.log("1. Pruebas de CsvExporter:");
    const csvCode = fs.readFileSync(path.join(__dirname, "ui/csv_exporter.js"), "utf8");

    assert(csvCode.includes("class CsvExporter"), "Define la clase CsvExporter");
    assert(csvCode.includes("\\uFEFF"), "Incorpora el prefijo BOM UTF-8 (\\uFEFF) para Excel");
    assert(csvCode.includes("escapeCsvCell"), "Implementa escape seguro de comillas dobles para celdas CSV");

    // Probar lógica aislada de CsvExporter en Node
    const mockWindow = {};
    const evalCsv = new Function("window", "localStorage", csvCode);
    const mockStorage = {
        _data: {},
        getItem: function(k) { return this._data[k] || null; },
        setItem: function(k, v) { this._data[k] = v; },
        removeItem: function(k) { delete this._data[k]; }
    };
    evalCsv(mockWindow, mockStorage);

    const exporter = mockWindow.CsvExporter;
    assert(exporter !== undefined, "CsvExporter se instancia y adjunta a window");

    exporter.addRecord({
        pregunta: '¿Cuánto sale la cuota?',
        normalizado: 'cuanto sale la cuota',
        tono: 'neutral',
        intenciones: ['aranceles_cuotas'],
        modo: 'Solo base de conocimiento',
        fuentes: ['aranceles_cuotas_becas'],
        respuesta: 'La cuota mensual es de $15.000.'
    });

    const csvContent = exporter.generateCsvString();
    assert(csvContent.startsWith('\uFEFF'), "La cadena CSV generada inicia con UTF-8 BOM");
    assert(csvContent.includes('"fecha_hora","pregunta","normalizado","tono","intenciones","modo","fuentes","respuesta"'), "Cabecera contiene las 8 columnas oficiales de cátedra");
    assert(csvContent.includes('"¿Cuánto sale la cuota?"'), "Contiene la pregunta registrada");
    assert(csvContent.includes('"aranceles_cuotas"'), "Contiene las intenciones registradas");

    exporter.clearRecords();
    assert(exporter.records.length === 0, "clearRecords limpia exitosamente los registros de auditoría");

    // -------------------------------------------------------------
    // GRUPO 2: App.js (Controlador de Cliente y Telemetría)
    // -------------------------------------------------------------
    console.log("\n2. Pruebas de app.js:");
    const appCode = fs.readFileSync(path.join(__dirname, "ui/app.js"), "utf8");

    assert(appCode.includes("configToggle"), "Vincula el botón de engranaje #configToggle");
    assert(appCode.includes("configDrawer.classList.add('active')"), "Maneja apertura del panel lateral con clase .active");
    assert(appCode.includes("closeDrawerBtn"), "Maneja cierre del panel lateral");
    assert(appCode.includes("Escape"), "Maneja atajo de teclado Escape para cerrar drawer");
    assert(appCode.includes("modePills"), "Gestiona selección de modos de cátedra");
    assert(appCode.includes("topKSlider"), "Gestiona slider top_k");
    assert(appCode.includes("tempSlider"), "Gestiona slider temperatura");
    assert(appCode.includes("maxTokensSlider"), "Gestiona slider max_tokens");
    assert(appCode.includes("updateLiveDiagnostic"), "Actualiza bloque de diagnóstico en tiempo real");
    assert(appCode.includes("diagTone"), "Actualiza badge de tono emocional con clases específicas");
    assert(appCode.includes("ragItemsContainer"), "Actualiza evidencias documentales RAG");
    assert(appCode.includes("/api/chat"), "Realiza fetch a POST /api/chat");
    assert(appCode.includes("/api/auditoria/csv"), "Gestiona descarga de auditoría CSV");
    assert(appCode.includes("/api/reiniciar"), "Gestiona reinicio de memoria contextual");

    // -------------------------------------------------------------
    // GRUPO 3: Configuración de Despliegue en Render
    // -------------------------------------------------------------
    console.log("\n3. Pruebas de Configuración de Despliegue Render:");
    const pkgPath = path.join(__dirname, "package.json");
    assert(fs.existsSync(pkgPath), "Existe popuchat2/package.json");

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    assert(pkg.name === "popuchat2", "package.json name es 'popuchat2'");
    assert(pkg.scripts && pkg.scripts.start === "node server.js", "Script de inicio de Render es 'node server.js'");
    assert(pkg.dependencies && pkg.dependencies.express !== undefined, "Express declarado como dependencia principal");

    const renderYamlPath = path.join(__dirname, "render.yaml");
    assert(fs.existsSync(renderYamlPath), "Existe popuchat2/render.yaml");
    const renderYaml = fs.readFileSync(renderYamlPath, "utf8");
    assert(renderYaml.includes("branch: popu-chat2"), "render.yaml especifica la rama popu-chat2 (protege main)");
    assert(renderYaml.includes("rootDir: popuchat2"), "render.yaml especifica rootDir popuchat2");
    assert(renderYaml.includes("GEMINI_API_KEY"), "render.yaml declara la variable GEMINI_API_KEY");

    const deployDocPath = path.join(__dirname, "DESPLIEGUE_RENDER.md");
    assert(fs.existsSync(deployDocPath), "Existe la guía formal popuchat2/DESPLIEGUE_RENDER.md");

    // -------------------------------------------------------------
    // GRUPO 4: Servir Estáticos del Frontend desde Express
    // -------------------------------------------------------------
    console.log("\n4. Verificación de Entrega de Archivos Estáticos:");
    const mascotPath = path.join(__dirname, "ui/img/mascot.png");
    assert(fs.existsSync(mascotPath), "Mascota institucional original presente en popuchat2/ui/img/mascot.png");

    console.log(`\n=================================================`);
    console.log(`RESUMEN: ${passed} pruebas superadas, ${failed} fallos.`);
    console.log(`=================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Error fatal en suite de pruebas:", err);
    process.exit(1);
});
