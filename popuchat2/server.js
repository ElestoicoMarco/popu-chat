/**
 * popuchat2/server.js
 * Servidor Autónomo en Node.js/Express para PopuChat 2
 * Sincronizado 1:1 con PopuChat_2_RAG_PLN_OFICIAL.ipynb (Colab 20:22) y preparado para Render.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

const { IndiceRAG } = require("./rag/rag_engine");
const { PopuChatEngine } = require("./engine/mode_router");

const app = express();
const PORT = process.env.PORT || 3000;

// Mapeo oficial de nombres de fuentes (Idéntico a Celda 10 e Imagen 2 de Gradio)
const NOMBRES_FUENTES_OFICIALES = {
    "01_oferta_academica_carreras.txt": "Oferta académica y carreras - IES N° 7",
    "02_inscripciones_requisitos.txt": "Inscripciones y requisitos 2027 - IES N° 7",
    "03_aranceles_cuotas_becas.txt": "Aranceles, cuotas y becas - IES N° 7",
    "04_sedes_horarios_contacto.txt": "Sedes, horarios y contacto - IES N° 7",
    "05_reglamento_academico_examenes.txt": "Reglamento académico y exámenes finales - IES N° 7"
};

// Middleware 1: CORS nativo
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Middleware 2: Parser JSON (ampliado a 10mb para carga de documentos en Base de Conocimiento)
app.use(express.json({ limit: "10mb" }));

// Middleware 3: Servir archivos estáticos de UI de PopuChat 2
app.use(express.static(path.join(__dirname, "ui")));

// Middleware 4: Servir recursos visuales y logos originales de Popu 1 (mascot.png, etc.)
const localImg = path.join(__dirname, "ui/img");
const rootImg = path.join(__dirname, "../public/img");
if (fs.existsSync(localImg)) {
    app.use("/img", express.static(localImg));
}
if (fs.existsSync(rootImg)) {
    app.use("/img", express.static(rootImg));
}
app.use("/css", express.static(path.join(__dirname, "../public/css")));

// Estado en memoria de la base documental y del motor
let engine = null;
let DOCUMENTOS_BASE = [];
let DOCUMENTOS_ACTIVOS = [];

function obtenerResumenDocumentos(docs) {
    return docs.map(d => ({
        Fuente: d.fuente,
        Caracteres: d.texto.replace(/\r\n/g, "\n").trim().length
    }));
}

function inicializarMotor() {
    const fuentesDir = path.join(__dirname, "data/fuentes");
    if (!fs.existsSync(fuentesDir)) {
        console.error(`[Error]: No se encontró el directorio de fuentes en ${fuentesDir}`);
        return null;
    }

    const archivos = fs.readdirSync(fuentesDir).filter(f => f.endsWith(".txt")).sort();
    DOCUMENTOS_BASE = archivos.map(f => ({
        fuente: NOMBRES_FUENTES_OFICIALES[f] || f.replace(/^\d+_/, "").replace(/\.txt$/, ""),
        texto: fs.readFileSync(path.join(fuentesDir, f), "utf-8").replace(/\r\n/g, "\n").trim()
    }));
    DOCUMENTOS_ACTIVOS = DOCUMENTOS_BASE.map(d => ({ ...d }));

    const indice = new IndiceRAG({
        tamano_fragmento: 700,
        solapamiento: 120,
        top_k: 4,
        umbral_similitud: 0.35
    });

    const cantidadFragmentos = indice.construir(DOCUMENTOS_ACTIVOS);
    console.log(`[RAG Init]: ${DOCUMENTOS_ACTIVOS.length} fuentes oficiales indexadas en ${cantidadFragmentos} fragmentos.`);

    engine = new PopuChatEngine(indice);
    const envKey = process.env.GEMINI_API_KEY;
    console.log(`[Gemini Env Check]: process.env.GEMINI_API_KEY configurada? ${envKey ? "SÍ (" + envKey.substring(0, 6) + "...)" : "NO"}`);
    return engine;
}

inicializarMotor();

// ==========================================
// ENDPOINTS DE LA API REST
// ==========================================

// 1. Healthcheck (Para Render y monitoreo)
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "PopuChat 2 (Híbrido PLN + RAG + IA)",
        version: "2.0.0",
        port: PORT,
        isRender: Boolean(process.env.RENDER),
        documentos: DOCUMENTOS_ACTIVOS.length,
        fragmentos: engine && engine.indiceRAG ? engine.indiceRAG.fragmentos.length : 0,
        timestamp: new Date().toISOString()
    });
});

// 2. Chat Principal (Inferencia RAG + Gemini con parámetros dinámicos)
app.post("/api/chat", async (req, res) => {
    try {
        const {
            mensaje,
            modo = "Solo base de conocimiento",
            top_k,
            temperatura,
            max_tokens,
            apiKey
        } = req.body;

        if (!engine) {
            inicializarMotor();
        }

        if (apiKey) {
            engine.gemini.setApiKey(apiKey);
        }
        if (top_k !== undefined) {
            engine.indiceRAG.config.top_k = parseInt(top_k, 10);
        }
        if (temperatura !== undefined) {
            engine.gemini.config.temperature = parseFloat(temperatura);
        }
        if (max_tokens !== undefined) {
            engine.gemini.config.maxOutputTokens = parseInt(max_tokens, 10);
        }

        console.log(`[Chat Request]: "${mensaje}" | Modo: ${modo} | top_k: ${engine.indiceRAG.config.top_k} | temp: ${engine.gemini.config.temperature} | Key: ${engine.gemini.tieneApiKeyValida() ? "SÍ" : "NO"}`);
        const resultado = await engine.procesarConsulta(mensaje, modo);

        res.json({
            ok: true,
            modo,
            ...resultado
        });
    } catch (error) {
        console.error("[Error /api/chat]:", error);
        res.status(500).json({
            ok: false,
            error: "Error interno al procesar la consulta en el motor de IA.",
            detalle: error.message
        });
    }
});

// 3. Reiniciar Memoria Contextual (Nueva Conversación)
app.post("/api/reiniciar", (req, res) => {
    if (engine) {
        engine.reiniciarConversacion();
    }
    res.json({
        ok: true,
        mensaje: "Memoria de conversación reiniciada exitosamente (6 turnos limpios)."
    });
});

// 4. Administración de la Base de Conocimiento (Sección 12 / Imagen 2 de Gradio)
app.get("/api/documentos", (req, res) => {
    if (!engine) inicializarMotor();
    res.json({
        ok: true,
        estado: "La base oficial de PopuChat está activa.",
        totalDocumentos: DOCUMENTOS_ACTIVOS.length,
        totalFragmentos: engine && engine.indiceRAG ? engine.indiceRAG.fragmentos.length : 0,
        documentosActivos: obtenerResumenDocumentos(DOCUMENTOS_ACTIVOS)
    });
});

app.post("/api/documentos/procesar", (req, res) => {
    try {
        if (!engine) inicializarMotor();
        const { archivos = [], conservar_popu = true } = req.body;

        const documentosNuevos = (Array.isArray(archivos) ? archivos : [])
            .filter(a => a && a.nombre && typeof a.texto === "string" && a.texto.trim().length > 0)
            .map(a => ({
                fuente: a.nombre.trim(),
                texto: a.texto.replace(/\r\n/g, "\n").trim()
            }));

        const nuevaLista = conservar_popu
            ? [...DOCUMENTOS_BASE.map(d => ({ ...d })), ...documentosNuevos]
            : documentosNuevos;

        if (nuevaLista.length === 0) {
            return res.json({
                ok: false,
                mensaje: "No se cargaron documentos. La base no fue modificada.",
                totalDocumentos: DOCUMENTOS_ACTIVOS.length,
                totalFragmentos: engine.indiceRAG.fragmentos.length,
                documentosActivos: obtenerResumenDocumentos(DOCUMENTOS_ACTIVOS)
            });
        }

        DOCUMENTOS_ACTIVOS = nuevaLista;
        const cantFrag = engine.indiceRAG.construir(DOCUMENTOS_ACTIVOS);
        const mensaje = `Base actualizada correctamente: ${DOCUMENTOS_ACTIVOS.length} documentos y ${cantFrag} fragmentos.`;

        res.json({
            ok: true,
            mensaje,
            totalDocumentos: DOCUMENTOS_ACTIVOS.length,
            totalFragmentos: cantFrag,
            documentosActivos: obtenerResumenDocumentos(DOCUMENTOS_ACTIVOS)
        });
    } catch (error) {
        console.error("[Error /api/documentos/procesar]:", error);
        res.status(500).json({
            ok: false,
            mensaje: `Error al procesar los documentos: ${error.message}`
        });
    }
});

app.post("/api/documentos/restaurar", (req, res) => {
    try {
        if (!engine) inicializarMotor();
        DOCUMENTOS_ACTIVOS = DOCUMENTOS_BASE.map(d => ({ ...d }));
        const cantFrag = engine.indiceRAG.construir(DOCUMENTOS_ACTIVOS);

        res.json({
            ok: true,
            mensaje: "Base oficial de PopuChat restaurada.",
            totalDocumentos: DOCUMENTOS_ACTIVOS.length,
            totalFragmentos: cantFrag,
            documentosActivos: obtenerResumenDocumentos(DOCUMENTOS_ACTIVOS)
        });
    } catch (error) {
        console.error("[Error /api/documentos/restaurar]:", error);
        res.status(500).json({
            ok: false,
            mensaje: `Error al restaurar la base: ${error.message}`
        });
    }
});

// 5. Descarga de Registro de Auditoría en formato CSV oficial (Sección 13 / Imagen 3 de Gradio)
function construirCsvString() {
    const registros = engine ? engine.obtenerRegistroAuditoria() : [];
    const columnas = [
        "fecha_hora",
        "pregunta",
        "normalizado",
        "tono",
        "intenciones",
        "modo",
        "fuentes",
        "respuesta"
    ];

    let csv = "\uFEFF"; // Byte Order Mark para compatibilidad con Excel (utf-8-sig)
    csv += columnas.join(",") + "\n";

    for (const reg of registros) {
        const fila = columnas.map(col => {
            let valor = (reg[col] || "").toString();
            valor = valor.replace(/"/g, '""');
            return `"${valor}"`;
        });
        csv += fila.join(",") + "\n";
    }
    return csv;
}

app.get("/api/auditoria/csv", (req, res) => {
    try {
        const csv = construirCsvString();
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="registro_consultas_chatbot_rag.csv"');
        res.send(csv);
    } catch (error) {
        console.error("[Error /api/auditoria/csv]:", error);
        res.status(500).json({
            ok: false,
            error: "Error al generar la planilla de auditoría CSV."
        });
    }
});

// 6. Fallback para servir el Frontend
app.get("*", (req, res) => {
    const indexPath = path.join(__dirname, "ui/index.html");
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send("PopuChat 2 Backend API está activo.");
    }
});

// Arranque del servidor si se ejecuta directamente
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 PopuChat 2 Server activo en el puerto ${PORT}`);
        console.log(`🌐 URL local: http://localhost:${PORT}`);
        console.log(`☁️  Ambiente Render: ${process.env.RENDER ? "SÍ" : "NO (Local)"}`);
        console.log(`=================================================`);
    });
}

module.exports = app;
