/**
 * PopuChat 2 — Controlador Principal Adaptado sobre Popu 1
 * Clona 100% la experiencia visual e interactiva de Popu 1 (Voz, Splash, Acordeones,
 * Botones Rápidos Marquee, Micrófono y Estética) conectándola con el motor híbrido
 * de PopuChat 2 (PLN + RAG + Gemini) y el panel oculto oficial de cátedra.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ==========================================
    // 1. SPLASH SCREEN (Auténtico de Popu 1)
    // ==========================================
    const splashScreen = document.getElementById('splash-screen');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');

    if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = "Escribí tu consulta...";
    }
    if (sendBtn) sendBtn.disabled = false;
    if (micBtn) micBtn.disabled = false;

    if (splashScreen) {
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            setTimeout(() => splashScreen.remove(), 800);
            if (chatInput) chatInput.focus();
        }, 1600);
    }

    // ==========================================
    // 2. SÍNTESIS DE VOZ (Auténtica de Popu 1)
    // ==========================================
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceIcon = voiceToggle ? voiceToggle.querySelector('.icon') : null;
    let isVoiceEnabled = false;
    let botVoice = null;

    function initVoices() {
        if (!('speechSynthesis' in window)) return;
        const voces = window.speechSynthesis.getVoices();
        botVoice = voces.find(v => v.lang === 'es-AR' || v.lang === 'es_AR') ||
                   voces.find(v => v.lang.startsWith('es')) ||
                   voces[0];
    }

    if ('speechSynthesis' in window) {
        initVoices();
        window.speechSynthesis.onvoiceschanged = initVoices;
    }

    if (voiceToggle) {
        voiceToggle.addEventListener('click', () => {
            isVoiceEnabled = !isVoiceEnabled;
            const muteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
            const unmuteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
            if (voiceIcon) voiceIcon.innerHTML = isVoiceEnabled ? unmuteSvg : muteSvg;
            if (!isVoiceEnabled && window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        });
    }

    function speakText(text) {
        if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/Fuentes:.*$/i, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (botVoice) utterance.voice = botVoice;
        utterance.rate = 1.05;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================
    // 3. RECONOCIMIENTO DE VOZ (MICRÓFONO)
    // ==========================================
    if (micBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognizer = new SpeechRec();
        recognizer.lang = 'es-AR';
        recognizer.interimResults = false;

        micBtn.addEventListener('click', () => {
            micBtn.style.color = '#ef4444';
            recognizer.start();
        });

        recognizer.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (chatInput) {
                chatInput.value = transcript;
                handleSend();
            }
        };

        recognizer.onend = () => {
            micBtn.style.color = '';
        };

        recognizer.onerror = () => {
            micBtn.style.color = '';
        };
    }

    // ==========================================
    // 4. PANEL OCULTO (DRAWER OFICIAL DE CÁTEDRA)
    // ==========================================
    const configToggle = document.getElementById('configToggle');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const configDrawer = document.getElementById('configDrawer');

    // Controles de Inferencia de Cátedra
    const modePills = document.querySelectorAll('.mode-pill');
    const topKSlider = document.getElementById('topKSlider');
    const topKVal = document.getElementById('topKVal');
    const tempSlider = document.getElementById('tempSlider');
    const tempVal = document.getElementById('tempVal');
    const maxTokensSlider = document.getElementById('maxTokensSlider');
    const maxTokensVal = document.getElementById('maxTokensVal');

    // Diagnóstico PLN en Vivo
    const diagTone = document.getElementById('diagTone');
    const diagGreeting = document.getElementById('diagGreeting');
    const diagNormalized = document.getElementById('diagNormalized');
    const diagIntents = document.getElementById('diagIntents');
    const ragItemsContainer = document.getElementById('ragItemsContainer');

    // Chat y Acciones
    const chatMessages = document.getElementById('chatMessages');
    const btnDownloadCsv = document.getElementById('btnDownloadCsv');
    const btnResetMemory = document.getElementById('btnResetMemory');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const btnSaveApiKey = document.getElementById('btnSaveApiKey');

    let currentMode = 'Solo base de conocimiento';

    function openDrawer() {
        if (configDrawer) configDrawer.classList.add('active');
        if (drawerBackdrop) drawerBackdrop.classList.add('active');
    }

    function closeDrawer() {
        if (configDrawer) configDrawer.classList.remove('active');
        if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    }

    if (configToggle) configToggle.addEventListener('click', openDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && configDrawer && configDrawer.classList.contains('active')) {
            closeDrawer();
        }
    });

    // Sincronización de Modo
    modePills.forEach(pill => {
        pill.addEventListener('click', () => {
            modePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentMode = pill.getAttribute('data-mode') || 'Solo base de conocimiento';
        });
    });

    // Sincronización de Sliders
    if (topKSlider && topKVal) {
        topKSlider.addEventListener('input', () => { topKVal.textContent = topKSlider.value; });
    }
    if (tempSlider && tempVal) {
        tempSlider.addEventListener('input', () => { tempVal.textContent = parseFloat(tempSlider.value).toFixed(1); });
    }
    if (maxTokensSlider && maxTokensVal) {
        maxTokensSlider.addEventListener('input', () => { maxTokensVal.textContent = maxTokensSlider.value; });
    }

    // API Key de Gemini en Navegador
    function getStoredApiKey() {
        return localStorage.getItem('gemini_api_key') || '';
    }

    if (geminiApiKeyInput) {
        geminiApiKeyInput.value = getStoredApiKey();
    }

    if (btnSaveApiKey && geminiApiKeyInput) {
        btnSaveApiKey.addEventListener('click', () => {
            const val = geminiApiKeyInput.value.trim();
            if (val) {
                localStorage.setItem('gemini_api_key', val);
                btnSaveApiKey.textContent = '✓';
            } else {
                localStorage.removeItem('gemini_api_key');
                btnSaveApiKey.textContent = 'Borrada';
            }
            setTimeout(() => { btnSaveApiKey.textContent = 'Guardar'; }, 2000);
        });
    }

    // ==========================================
    // 5. BOTONES RÁPIDOS Y ACORDEONES
    // ==========================================
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-btn');
        if (btn) {
            const msg = btn.getAttribute('data-msg');
            if (msg) {
                if (chatInput) chatInput.value = msg;
                handleSend();
            }
        }
    });

    // ==========================================
    // 6. MENSAJERÍA Y CHAT
    // ==========================================
    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user';
        msgDiv.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendBotMessage(text, meta = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';

        let formattedText = formatBotResponse(text);
        let metaHtml = '';
        if (meta && meta.modo) {
            metaHtml = `<div class="msg-meta-tag">Modo: ${escapeHtml(meta.modo)}</div>`;
        }

        msgDiv.innerHTML = `
            <div class="avatar"><img src="/img/mascot.png" alt="Bot"></div>
            <div class="bubble">
                ${formattedText}
                ${metaHtml}
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
        speakText(text);
    }

    function formatBotResponse(raw) {
        if (!raw) return '';
        let escaped = escapeHtml(raw);

        // Saltos de línea
        let html = escaped.replace(/\n/g, '<br>');

        // Negritas
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Fuentes citadas
        const fuentesRegex = /Fuentes:\s*(.+)$/i;
        html = html.replace(fuentesRegex, (match, p1) => {
            return `<div class="bubble-footer-sources"><span style="font-weight:700;">📚 Documentación Oficial Citada:</span> ${p1}</div>`;
        });

        return html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(str).replace(/[&<>"']/g, s => map[s]);
    }

    let typingEl = null;
    function showTyping(show) {
        if (show) {
            if (!typingEl) {
                typingEl = document.createElement('div');
                typingEl.className = 'message bot typing-wrapper';
                typingEl.innerHTML = `
                    <div class="avatar"><img src="/img/mascot.png" alt="Bot"></div>
                    <div class="bubble" style="display:flex; align-items:center; gap:6px; padding:10px 14px;">
                        <span class="typing-dot" style="width:7px; height:7px; background:var(--primary); border-radius:50%; display:inline-block; animation:bounce 1.2s infinite ease-in-out;"></span>
                        <span class="typing-dot" style="width:7px; height:7px; background:var(--secondary); border-radius:50%; display:inline-block; animation:bounce 1.2s infinite ease-in-out 0.2s;"></span>
                        <span class="typing-dot" style="width:7px; height:7px; background:var(--primary); border-radius:50%; display:inline-block; animation:bounce 1.2s infinite ease-in-out 0.4s;"></span>
                        <span style="font-size:0.75rem; color:var(--text-dim); margin-left:6px;">PopuChat 2 está redactando...</span>
                    </div>
                `;
            }
            chatMessages.appendChild(typingEl);
            scrollToBottom();
        } else if (typingEl && typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
        }
    }

    // ==========================================
    // 7. TELEMETRÍA Y DIAGNÓSTICO EN VIVO
    // ==========================================
    function updateLiveDiagnostic(telemetry, pln, rag) {
        const tono = (telemetry && telemetry.tono) || (pln && pln.tono) || 'neutral';
        const saludo = (telemetry && telemetry.saludo) || (pln && pln.saludo) || 'Ninguno';
        const normalizado = (telemetry && telemetry.normalizado) || (pln && pln.normalizado) || '-';
        const intenciones = (telemetry && telemetry.intenciones) || (pln && pln.intenciones) || [];
        const fragmentos = (rag && rag.fragmentos) || (telemetry && telemetry.fragmentos) || [];

        if (diagTone) {
            diagTone.textContent = tono;
            diagTone.className = 'tone-badge ' + getToneBadgeClass(tono);
        }
        if (diagGreeting) diagGreeting.textContent = saludo;
        if (diagNormalized) diagNormalized.textContent = normalizado;
        if (diagIntents) {
            diagIntents.textContent = Array.isArray(intenciones) && intenciones.length > 0 ? intenciones.join(', ') : 'Ninguna';
        }

        if (ragItemsContainer) {
            if (!fragmentos || fragmentos.length === 0) {
                ragItemsContainer.innerHTML = `
                    <div style="font-size:0.75rem; color:var(--text-dim); font-style:italic; padding:6px;">
                        Sin fragmentos para esta consulta (umbral &lt; 0.35 o chitchat).
                    </div>
                `;
            } else {
                ragItemsContainer.innerHTML = fragmentos.map(frag => {
                    const score = frag.score || frag.similitud ? Number(frag.score || frag.similitud).toFixed(2) : '0.00';
                    const fuente = frag.fuente || frag.fuente_id || 'Documento Oficial';
                    const snippet = frag.texto ? escapeHtml(frag.texto.substring(0, 160)) + '...' : '';
                    return `
                        <div class="rag-card">
                            <div class="rag-card-header">
                                <span class="rag-source">${escapeHtml(fuente)}</span>
                                <span class="rag-score">Score: ${score}</span>
                            </div>
                            <div class="rag-snippet">${snippet}</div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    function getToneBadgeClass(tone) {
        switch ((tone || '').toLowerCase()) {
            case 'molesto': return 'tone-molesto';
            case 'agradecido': return 'tone-agradecido';
            case 'formal': return 'tone-formal';
            case 'informal': return 'tone-informal';
            default: return 'tone-neutral';
        }
    }

    // ==========================================
    // 8. ENVÍO DE CONSULTA AL BACKEND
    // ==========================================
    async function handleSend() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        appendUserMessage(text);
        showTyping(true);

        const payload = {
            mensaje: text,
            modo: currentMode,
            top_k: topKSlider ? parseInt(topKSlider.value, 10) : 4,
            temperatura: tempSlider ? parseFloat(tempSlider.value) : 0.3,
            max_tokens: maxTokensSlider ? parseInt(maxTokensSlider.value, 10) : 450,
            apiKey: getStoredApiKey() || undefined
        };

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error HTTP ${response.status}`);
            }

            const data = await response.json();
            showTyping(false);

            appendBotMessage(data.respuesta, {
                modo: data.modo || currentMode,
                fuentes: data.fuentes
            });

            updateLiveDiagnostic(data.telemetria, data.pln, data.rag || { fragmentos: data.resultadosRAG });

            if (window.CsvExporter) {
                window.CsvExporter.addRecord({
                    pregunta: text,
                    normalizado: (data.pln && data.pln.normalizado) || (data.telemetria && data.telemetria.normalizado) || text,
                    tono: (data.pln && data.pln.tono) || (data.telemetria && data.telemetria.tono) || 'neutral',
                    intenciones: (data.pln && data.pln.intenciones) || (data.telemetria && data.telemetria.intenciones) || [],
                    modo: data.modo || currentMode,
                    fuentes: data.fuentes || [],
                    respuesta: data.respuesta
                });
            }
        } catch (error) {
            showTyping(false);
            console.error('[PopuChat2 Error]:', error);
            appendBotMessage(`⚠️ Disculpas, ocurrió un inconveniente de conexión con el servidor: ${error.message}. Por favor reintentá en unos segundos.`);
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', handleSend);
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        });
    }

    // ==========================================
    // 9. AUDITORÍA Y RESET
    // ==========================================
    if (btnDownloadCsv) {
        btnDownloadCsv.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/auditoria/csv');
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'registro_consultas_popuchat2.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    return;
                }
            } catch (e) {
                console.warn('[PopuChat2] Fallback CSV local:', e);
            }
            if (window.CsvExporter) window.CsvExporter.download();
        });
    }

    if (btnResetMemory) {
        btnResetMemory.addEventListener('click', async () => {
            if (!confirm('¿Deseas reiniciar la memoria contextual de la conversación?')) return;
            try {
                await fetch('/api/reiniciar', { method: 'POST' });
            } catch (e) {}
            location.reload();
        });
    }

    console.log('[PopuChat 2] Interfaz Popu 1 clonada y motor híbrido conectados con éxito.');
});
