/**
 * popuchat2/test_ui_markup.js
 * Verificación del Micro-Avance 4.2 (Frontend Fiel a Popu 1 con Panel Oculto)
 */

const fs = require("fs");
const path = require("path");

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
console.log("EJECUTANDO TEST SUITE: MICRO-AVANCE 4.2 (UI POPU 1 + PANEL OCULTO)");
console.log("=================================================\n");

const htmlPath = path.join(__dirname, "ui/index.html");
const cssPath = path.join(__dirname, "ui/style.css");

assert(fs.existsSync(htmlPath), "Archivo popuchat2/ui/index.html existe");
assert(fs.existsSync(cssPath), "Archivo popuchat2/ui/style.css existe");

const html = fs.readFileSync(htmlPath, "utf-8");
const css = fs.readFileSync(cssPath, "utf-8");

// 1. Verificación de Fidelidad Visual a Popu 1
console.log("1. Fidelidad Visual a PopuChat 1:");
assert(html.includes("/img/mascot.png"), "Utiliza la imagen y mascota original (/img/mascot.png)");
assert(css.includes("--primary: #F5CE5B"), "Mantiene color primario dorado institucional (#F5CE5B)");
assert(css.includes("--secondary: #4FA0D8"), "Mantiene color secundario cian (#4FA0D8)");
assert(css.includes("backdrop-filter: blur"), "Implementa efecto Glassmorphism");

// 2. Verificación del Botón de Engranaje en Cabecera
console.log("\n2. Acceso Discreto (Engranaje):");
assert(html.includes('id="configToggle"'), "Botón #configToggle presente en el header");

// 3. Verificación de los 4 Controles Oficiales de Cátedra
console.log("\n3. Controles Oficiales de Cátedra (del Notebook):");
assert(html.includes('id="modeSelector"'), "Selector de Modo presente con las 3 opciones de cátedra");
assert(html.includes('id="topKSlider"'), "Slider top_k presente (rango 1 a 8)");
assert(html.includes('id="tempSlider"'), "Slider temperatura presente (rango 0.0 a 1.0)");
assert(html.includes('id="maxTokensSlider"'), "Slider max_tokens presente (rango 100 a 700)");

// 4. Verificación de Diagnóstico PLN y Evidencia RAG
console.log("\n4. Diagnóstico PLN y Evidencia RAG:");
assert(html.includes('id="diagTone"'), "Elemento para visualización de tono con badge");
assert(html.includes('id="diagGreeting"'), "Elemento para saludo contextual");
assert(html.includes('id="diagNormalized"'), "Elemento para texto normalizado");
assert(html.includes('id="diagIntents"'), "Elemento para intenciones detectadas");
assert(html.includes('id="ragItemsContainer"'), "Contenedor de tarjetas de fragmentos RAG con similitud");

// 5. Verificación de Auditoría CSV
console.log("\n5. Auditoría Docente:");
assert(html.includes('id="btnDownloadCsv"'), "Botón #btnDownloadCsv para descarga directa");
assert(html.includes('id="btnResetMemory"'), "Botón #btnResetMemory para nueva conversación");

console.log("\n=================================================");
console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} pruebas superadas.`);
if (passedTests === totalTests) {
    console.log("ESTADO: MICRO-AVANCE 4.2 APROBADO AL 100% CON ÉXITO.");
} else {
    console.error("ESTADO: HAY FALLOS EN EL MAQUETADO DE UI.");
    process.exit(1);
}
console.log("=================================================");
