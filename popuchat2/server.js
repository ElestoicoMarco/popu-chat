/**
 * popuchat2/server.js
 * Servidor Autónomo en Node.js/Express para PopuChat 2
 * Preparado para despliegue en Render (PORT dinámico, CORS nativo, API REST y Archivos Estáticos).
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

const { IndiceRAG } = require("./rag/rag_engine");
const { PopuChatEngine } = require("./engine/mode_router");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware 1: CORS nativo (Sin dependencias externas)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Middleware 2: Parser JSON
app.use(express.json({ limit: "2mb" }));

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

// Inicialización de la base de conocimiento y el motor de IA
let engine = null;

function inicializarMotor() {
    const fuentesDir = path.join(__dirname, "data/fuentes");
    if (!fs.existsSync(fuentesDir)) {
        console.error(`[Error]: No se encontró el directorio de fuentes en ${fuentesDir}`);
        return null;
    }

    const archivos = fs.readdirSync(fuentesDir).filter(f => f.endsWith(".txt"));
    const documentos = archivos.map(f => ({
        fuente: f.replace(/^\d+_/, "").replace(/\.txt$/, ""),
        texto: fs.readFileSync(path.join(fuentesDir, f), "utf-8")
    }));

    const indice = new IndiceRAG({
        tamano_fragmento: 700,
        solapamiento: 120,
        top_k: 4,
        umbral_similitud: 0.35
    });

    const cantidadFragmentos = indice.construir(documentos);
    console.log(`[RAG Init]: ${documentos.length} fuentes oficiales indexadas en ${cantidadFragmentos} fragmentos.`);

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

        // Actualizar parámetros dinámicos si provienen de los controles del engranaje
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

        console.log(`[Chat Request]: "${mensaje}" | Modo: ${modo} | Key en Engine: ${engine.gemini.tieneApiKeyValida() ? "SÍ" : "NO"}`);
        const resultado = await engine.procesarConsulta(mensaje, modo);

        res.json({
            ok: true,
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

// 4. Descarga de Registro de Auditoría en formato CSV oficial
app.get("/api/auditoria/csv", (req, res) => {
    try {
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

        let csv = "\uFEFF"; // Byte Order Mark para compatibilidad con Excel (acentos y eñes)
        csv += columnas.join(",") + "\n";

        for (const reg of registros) {
            const fila = columnas.map(col => {
                let valor = (reg[col] || "").toString();
                // Escapar comillas dobles y saltos de línea para formato CSV estándar
                valor = valor.replace(/"/g, '""');
                return `"${valor}"`;
            });
            csv += fila.join(",") + "\n";
        }

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="registro_consultas_popuchat2.csv"');
        res.send(csv);
    } catch (error) {
        console.error("[Error /api/auditoria/csv]:", error);
        res.status(500).json({
            ok: false,
            error: "Error al generar la planilla de auditoría CSV."
        });
    }
});

// 5. Fallback para servir el Frontend
app.get("*", (req, res) => {
    const indexPath = path.join(__dirname, "ui/index.html");
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send("PopuChat 2 Backend API está activo. La interfaz se cargará en el Micro-Avance 4.2.");
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
