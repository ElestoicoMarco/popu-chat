/**
 * Módulo de Telemetría Oficial para PopuChat
 * Conexión segura con Firebase Analytics (Google Analytics 4)
 */

let analytics = null;
let logEventFn = null;

export async function initTelemetry() {
    try {
        // Carga modular dinámica de Firebase SDK desde CDN oficial de Google
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
        const { getAnalytics, logEvent } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js");

        const firebaseConfig = {
            apiKey: "AIzaSyC5SYpdo-j3Jvcnq-OoMg4GeZOAxkfSYpQ",
            authDomain: "mecanica-martinez.firebaseapp.com",
            projectId: "mecanica-martinez",
            storageBucket: "mecanica-martinez.firebasestorage.app",
            messagingSenderId: "834060797173",
            appId: "1:834060797173:web:0511c4259a81d78be6f1bc",
            measurementId: "G-JKL39KP3GY"
        };

        const app = initializeApp(firebaseConfig);
        analytics = getAnalytics(app);
        logEventFn = logEvent;

        // Registrar evento de visita inicial
        logEventFn(analytics, 'visita_popuchat', {
            dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'movil' : 'escritorio',
            origen_url: window.location.hostname
        });

        console.log('[Telemetría] Conexión establecida con Firebase Analytics.');
    } catch (err) {
        // Aislamiento seguro: no interfiere con el funcionamiento del chatbot si hay adblock o no hay red
        console.warn('[Telemetría] Inicialización omitida o bloqueada por el navegador:', err.message);
    }
}

export function registrarEvento(nombre, parametros = {}) {
    if (analytics && logEventFn) {
        try {
            logEventFn(analytics, nombre, parametros);
        } catch (err) {
            console.warn('[Telemetría] Error al registrar evento:', err.message);
        }
    }
}
