import { procesarMensaje } from './rules.js';

// Lógica de Bloqueo de Testing (Opción Híbrida)
const testingParams = new URLSearchParams(window.location.search);
const testingCode = testingParams.get('codigo');
const testingExpireDate = new Date("2026-08-26T23:59:59");
const isTestingExpired = new Date() > testingExpireDate;
const isLocked = testingCode !== 'TEST2026' || isTestingExpired;

// Splash Screen Logic
window.addEventListener('load', () => {
    if (isLocked) {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        const micBtn = document.getElementById('micBtn');
        
        if (chatInput) {
            chatInput.disabled = true;
            chatInput.placeholder = isTestingExpired 
                ? "El período de testing ha finalizado. Pronto estaremos online."
                : "El asistente se encuentra en fase de pruebas cerradas.";
        }
        if (sendBtn) sendBtn.disabled = true;
        if (micBtn) micBtn.disabled = true;
        
        // Bloquear todos los botones rápidos existentes
        document.querySelectorAll('.quick-btn, .chat-accordion summary').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });
    }

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            // Quitarlo del DOM después de la transición
            setTimeout(() => splash.remove(), 800);
        }
    }, 1800);
});


// Elementos del DOM para Voz
const voiceToggle = document.getElementById('voiceToggle');
const voiceIcon = voiceToggle?.querySelector('.icon');

// Estado y configuración de Voz
let isVoiceEnabled = false;
let botVoice = null;

// Inicializar voces
function initVoices() {
    const voces = window.speechSynthesis.getVoices();
    // Preferencia: Español de Argentina, luego cualquier Español
    botVoice = voces.find(v => v.lang === 'es-AR' || v.lang === 'es_AR') || 
               voces.find(v => v.lang.startsWith('es')) || 
               voces[0];
}
if (window.speechSynthesis) {
    initVoices();
    window.speechSynthesis.onvoiceschanged = initVoices;
}

if (voiceToggle) {
    voiceToggle.addEventListener('click', () => {
        isVoiceEnabled = !isVoiceEnabled;
        const muteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
        const unmuteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
        voiceIcon.innerHTML = isVoiceEnabled ? unmuteSvg : muteSvg;
        if (!isVoiceEnabled && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            document.querySelectorAll('.message.bot .avatar').forEach(a => a.classList.remove('is-speaking'));
        }
    });
}

function speakText(text) {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    
    // Cancelar cualquier audio anterior
    window.speechSynthesis.cancel();
    
    // Limpiar texto de emojis y etiquetas html si las hubiera
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
                          .replace(/<[^>]*>?/gm, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (botVoice) utterance.voice = botVoice;
    utterance.rate = 1.05; // Un poco más rápido para sonar dinámico
    utterance.pitch = 1.1;

    // Efecto visual: buscar el último avatar del bot y ponerle animación
    const avatars = document.querySelectorAll('.message.bot .avatar');
    const lastAvatar = avatars[avatars.length - 1];

    utterance.onstart = () => {
        if (lastAvatar) lastAvatar.classList.add('is-speaking');
    };
    utterance.onend = () => {
        if (lastAvatar) lastAvatar.classList.remove('is-speaking');
    };
    utterance.onerror = () => {
        if (lastAvatar) lastAvatar.classList.remove('is-speaking');
    };

    window.speechSynthesis.speak(utterance);
}

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');

// =========================================
// RECONOCIMIENTO DE VOZ (Speech-to-Text)
// =========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-AR'; // Español de Argentina
    recognition.interimResults = false; // Solo resultados finales
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('listening');
        chatInput.placeholder = 'Escuchando...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        // Auto-enviar el mensaje una vez reconocido
        enviarMensaje(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        resetMic();
        
        let mensajeError = 'No se pudo activar el reconocimiento de voz.';
        if (event.error === 'not-allowed') {
            mensajeError = 'Permiso denegado para usar el micrófono. Asegúrate de estar navegando mediante HTTPS y de haber otorgado los permisos en tu navegador.';
        } else if (event.error === 'no-speech') {
            mensajeError = 'No se detectó sonido. Intenta hablar de nuevo.';
        } else if (event.error === 'network') {
            mensajeError = 'Error de red. El reconocimiento de voz requiere una conexión a internet activa.';
        } else if (event.error === 'service-not-allowed') {
            mensajeError = 'Servicio de voz no permitido. Asegúrate de que el sitio use HTTPS y que tu navegador soporte reconocimiento de voz.';
        }
        alert(mensajeError);
    };

    recognition.onend = () => {
        resetMic();
    };
} else {
    // Si no es soportado, ocultar botón
    if(micBtn) micBtn.style.display = 'none';
}

function resetMic() {
    isRecording = false;
    micBtn.classList.remove('listening');
    chatInput.placeholder = 'Escribí tu consulta...';
}

if (micBtn) {
    micBtn.addEventListener('click', () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            // Detener Text-to-Speech si está hablando para no hacer eco
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            recognition.start();
        }
    });
}

const quickBtns = document.querySelectorAll('.quick-btn');

// Generar un sessionId único para esta sesión de navegación
const sessionId = Math.random().toString(36).substring(2, 15) + '_' + Date.now();

function procesarAulas(text) {
    if (!text.includes('aula-card')) return text;
    try {
        const temp = document.createElement('div');
        temp.innerHTML = text;
        const cards = temp.querySelectorAll('.aula-card');
        const shouldOpenFirst = cards.length === 1;
        
        cards.forEach(cardDiv => {
            const details = document.createElement('details');
            details.className = 'aula-card';
            details.setAttribute('name', 'aulas-accordion');
            if (shouldOpenFirst) {
                details.setAttribute('open', '');
            }
            
            const titleDiv = cardDiv.querySelector('.aula-card-title');
            if (titleDiv) {
                const summary = document.createElement('summary');
                summary.textContent = titleDiv.textContent;
                details.appendChild(summary);
            }
            
            cardDiv.querySelectorAll('.aula-row').forEach(row => {
                details.appendChild(row.cloneNode(true));
            });
            
            cardDiv.parentNode.replaceChild(details, cardDiv);
        });
        return temp.innerHTML;
    } catch (e) {
        console.error("Error al procesar acordeón de aulas:", e);
        return text;
    }
}

function addMessage(text, role) {
    const processedText = role === 'bot' ? procesarAulas(text) : text;
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
        ${role === 'user' ? '<div class="avatar">👤</div>' : ''}
        <div class="bubble">${processedText}</div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'message bot';
    div.id = 'typingIndicator';
    div.innerHTML = `
        <div class="avatar"><img src="/img/mascot.png" alt="Bot" class="thinking-bot"></div>
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

async function enviarMensaje(texto, clickedBtn = null) {
    if (isLocked) return;
    if (!texto.trim()) return;

    if (clickedBtn) clickedBtn.classList.add('btn-loading');
    else sendBtn.classList.add('btn-loading');

    addMessage(texto, 'user');
    chatInput.value = '';
    showTyping();

    // Latencia Cero: Ejecución local en el navegador
    try {
        const respuestaBot = procesarMensaje(texto, sessionId);
        
        // Pequeño delay artificial muy corto (400ms) para que la interfaz se sienta natural
        // y se pueda ver la animación del botón de carga
        await new Promise(resolve => setTimeout(resolve, 400));
        
        hideTyping();
        addMessage(respuestaBot, 'bot');
        speakText(respuestaBot);
    } catch (err) {
        hideTyping();
        addMessage('Error al procesar el mensaje internamente.', 'bot');
        console.error(err);
    } finally {
        if (clickedBtn) clickedBtn.classList.remove('btn-loading');
        else sendBtn.classList.remove('btn-loading');
    }
}

sendBtn.addEventListener('click', () => enviarMensaje(chatInput.value, sendBtn));

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enviarMensaje(chatInput.value, sendBtn);
});

// Delegación de eventos global para todos los botones inyectados y estáticos
document.body.addEventListener('click', (e) => {
    if (isLocked) return;
    const btn = e.target.closest('.quick-btn');
    if (btn && btn.dataset.msg) {
        enviarMensaje(btn.dataset.msg, btn);
    }
});
