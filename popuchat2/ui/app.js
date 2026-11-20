/**
 * PopuChat 2 — Controlador Principal Adaptado sobre Popu 1 + Panel Completo de Cátedra (5 Imágenes Gradio)
 * Clona 100% la experiencia visual e interactiva de Popu 1 en la vista principal y monta en el
 * panel desplegable (#configDrawer) las 4 pestañas completas del notebook validado en Colab (20:22).
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
            .replace(/\*\*Fuentes:\*\*[\s\S]*$/i, '')
            .replace(/📚?\s*Fuentes:[\s\S]*$/i, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/^\s*#{1,6}\s*/gm, '')
            .replace(/^\s*[-*•]\s+/gm, '')
            .replace(/^\s*>\s?/gm, '')
            .replace(/[*_~`#|]+/g, '')
            .replace(/\s*\n+\s*/g, '. ')
            .replace(/([.!?:;,])\s*\.\s*/g, '$1 ')
            .replace(/\s{2,}/g, ' ')
            .trim();

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

        recognizer.onend = () => { micBtn.style.color = ''; };
        recognizer.onerror = () => { micBtn.style.color = ''; };
    }

    // ==========================================
    // 4. PANEL OCULTO (DRAWER OFICIAL DE CÁTEDRA Y TABS)
    // ==========================================
    const configToggle = document.getElementById('configToggle');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const configDrawer = document.getElementById('configDrawer');

    // Pestañas del Drawer
    const drawerTabs = document.querySelectorAll('.drawer-tab');
    const drawerPanes = document.querySelectorAll('.drawer-tab-pane');
    const btnOpenSettingsTab = document.getElementById('btnOpenSettingsTab');
    const btnFooterSettings = document.getElementById('btnFooterSettings');

    function activateTab(tabId) {
        drawerTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
        });
        drawerPanes.forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
        if (tabId === 'tabBaseConocimiento') {
            cargarDocumentosActivos();
        }
    }

    drawerTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activateTab(tab.getAttribute('data-tab'));
        });
    });

    if (btnOpenSettingsTab) {
        btnOpenSettingsTab.addEventListener('click', () => activateTab('tabConfiguracion'));
    }
    if (btnFooterSettings) {
        btnFooterSettings.addEventListener('click', () => activateTab('tabConfiguracion'));
    }

    // Controles de Inferencia de Cátedra
    const modePills = document.querySelectorAll('.mode-pill');
    const topKSlider = document.getElementById('topKSlider');
    const topKVal = document.getElementById('topKVal');
    const tempSlider = document.getElementById('tempSlider');
    const tempVal = document.getElementById('tempVal');
    const maxTokensSlider = document.getElementById('maxTokensSlider');
    const maxTokensVal = document.getElementById('maxTokensVal');

    // Diagnóstico PLN en Vivo y Tabla de 4 Columnas (Imagen 5)
    const diagTone = document.getElementById('diagTone');
    const diagGreeting = document.getElementById('diagGreeting');
    const diagNormalized = document.getElementById('diagNormalized');
    const diagIntents = document.getElementById('diagIntents');
    const diagSources = document.getElementById('diagSources');
    const fragmentosTablaBody = document.getElementById('fragmentosTablaBody');
    const ragItemsContainer = document.getElementById('ragItemsContainer');

    // Consola de Chat en el Drawer (Imagen 1)
    const drawerChatMirror = document.getElementById('drawerChatMirror');
    const drawerQueryInput = document.getElementById('drawerQueryInput');
    const btnDrawerSend = document.getElementById('btnDrawerSend');

    // Chat Principal y Acciones
    const chatMessages = document.getElementById('chatMessages');
    const btnGenerarCsv = document.getElementById('btnGenerarCsv');
    const btnDownloadCsv = document.getElementById('btnDownloadCsv');
    const csvFileSizeLabel = document.getElementById('csvFileSizeLabel');
    const btnResetMemory = document.getElementById('btnResetMemory');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const btnSaveApiKey = document.getElementById('btnSaveApiKey');
    const groqApiKeyInput = document.getElementById('groqApiKeyInput');
    const btnSaveGroqKey = document.getElementById('btnSaveGroqKey');

    let currentMode = 'Solo base de conocimiento';

    function openDrawer() {
        if (configDrawer) configDrawer.classList.add('active');
        if (drawerBackdrop) drawerBackdrop.classList.add('active');
        cargarDocumentosActivos();
    }

    function closeDrawer() {
        if (configDrawer) configDrawer.classList.remove('active');
        if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    }

    if (configToggle) configToggle.addEventListener('click', openDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
    // El panel de estudio permanece oculto al iniciar para mostrar Popu 1 intacto; se abre con el botón ⚙️

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

    // Sincronización de Sliders y Botones de Reset (↺)
    if (topKSlider && topKVal) {
        topKSlider.addEventListener('input', () => { topKVal.textContent = topKSlider.value; });
    }
    if (tempSlider && tempVal) {
        tempSlider.addEventListener('input', () => { tempVal.textContent = parseFloat(tempSlider.value).toFixed(1); });
    }
    if (maxTokensSlider && maxTokensVal) {
        maxTokensSlider.addEventListener('input', () => { maxTokensVal.textContent = maxTokensSlider.value; });
    }

    document.querySelectorAll('.slider-reset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const defVal = btn.getAttribute('data-default');
            const slider = document.getElementById(targetId);
            if (slider && defVal !== null) {
                slider.value = defVal;
                slider.dispatchEvent(new Event('input'));
            }
        });
    });

    // Preguntas Sugeridas del Panel de Cátedra (Imagen 1)
    document.querySelectorAll('.suggestion-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const texto = btn.getAttribute('data-suggest');
            if (texto) {
                if (drawerQueryInput) drawerQueryInput.value = texto;
                if (chatInput) chatInput.value = texto;
                handleSend(texto);
            }
        });
    });

    // API Key de Groq (Qwen) en Navegador

    function getStoredGroqApiKey() {

        return localStorage.getItem('groq_api_key') || '';

    }



    if (groqApiKeyInput) {

        groqApiKeyInput.value = getStoredGroqApiKey();

    }



    if (btnSaveGroqKey && groqApiKeyInput) {

        btnSaveGroqKey.addEventListener('click', () => {

            const val = groqApiKeyInput.value.trim();

            if (val) {

                localStorage.setItem('groq_api_key', val);

                btnSaveGroqKey.textContent = '✓ Guardada';

            } else {

                localStorage.removeItem('groq_api_key');

                btnSaveGroqKey.textContent = 'Borrada';

            }

            setTimeout(() => { btnSaveGroqKey.textContent = 'Guardar'; }, 2000);

        });

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
                btnSaveApiKey.textContent = '✓ Guardada';
            } else {
                localStorage.removeItem('gemini_api_key');
                btnSaveApiKey.textContent = 'Borrada';
            }
            setTimeout(() => { btnSaveApiKey.textContent = 'Guardar'; }, 2000);
        });
    }

    // ==========================================
    // 5. BOTONES RÁPIDOS DE POPU 1
    // ==========================================
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-btn');
        if (btn) {
            const msg = btn.getAttribute('data-msg');
            if (msg) {
                if (chatInput) chatInput.value = msg;
                handleSend(msg);
            }
        }
    });

    // ==========================================
    // 6. MENSAJERÍA Y CHAT (PRINCIPAL + ESPEJO EN PANEL)
    // ==========================================
    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        if (drawerChatMirror) {
            drawerChatMirror.scrollTop = drawerChatMirror.scrollHeight;
        }
    }

    function appendUserMessage(text) {
        if (chatMessages) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message user';
            msgDiv.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
            chatMessages.appendChild(msgDiv);
        }

        if (drawerChatMirror) {
            const placeholder = document.getElementById('drawerChatPlaceholder');
            if (placeholder) placeholder.style.display = 'none';
            const mUser = document.createElement('div');
            mUser.className = 'chat-row user';
            mUser.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
            drawerChatMirror.appendChild(mUser);
        }
        scrollToBottom();
    }

    function appendBotMessage(text, meta = null) {
        const formattedText = formatBotResponse(text);
        let metaHtml = '';
        if (meta && meta.modo) {
            metaHtml = `<div class="msg-meta-tag">Modo: ${escapeHtml(meta.modo)}</div>`;
        }

        if (chatMessages) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message bot';
            msgDiv.innerHTML = `
                <div class="avatar"><img src="/img/mascot.png" alt="Bot"></div>
                <div class="bubble">
                    ${formattedText}
                    ${metaHtml}
                </div>
            `;
            chatMessages.appendChild(msgDiv);
        }

        if (drawerChatMirror) {
            const mBot = document.createElement('div');
            mBot.className = 'chat-row bot';
            mBot.innerHTML = `<div class="msg-avatar"><img src="/img/mascot.png" alt="PopuChat"></div><div class="chat-bubble">${formattedText}${metaHtml}</div>`;
            drawerChatMirror.appendChild(mBot);
        }

        scrollToBottom();
        speakText(text);
    }

    function formatBotResponse(raw) {
        if (!raw) return '';
        const lineas = escapeHtml(raw).split('\n');
        let html = '';
        let enLista = false;
        lineas.forEach(linea => {
            const item = linea.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
            if (item) {
                if (!enLista) { html += '<ul>'; enLista = true; }
                html += `<li>${item[1]}</li>`;
                return;
            }
            if (enLista) { html += '</ul>'; enLista = false; }
            const titulo = linea.match(/^\s*#{1,6}\s+(.*)$/);
            html += titulo ? `<strong>${titulo[1]}</strong><br>` : `${linea}<br>`;
        });
        if (enLista) html += '</ul>';
        html = html.replace(/(<br>)+$/, '').replace(/<br><ul>/g, '<ul>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[\s>])\*([^*\n<]+)\*/g, '$1<em>$2</em>');

        const fuentesRegex = /(?:\*\*Fuentes:\*\*|Fuentes:)\s*(.+)$/i;
        html = html.replace(fuentesRegex, (match, p1) => {
            return `<div class="bubble-footer-sources"><span style="font-weight:700;">📚 Fuentes:</span> ${p1}</div>`;
        });

        return html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(str).replace(/[&<>"']/g, s => map[s]);
    }

    let typingEl = null;
    let mirrorTypingEl = null;
    function showTyping(show) {
        if (show) {
            if (!typingEl && chatMessages) {
                typingEl = document.createElement('div');
                typingEl.className = 'message bot typing-wrapper';
                typingEl.innerHTML = `
                    <div class="avatar"><img src="/img/mascot.png" alt="Bot"></div>
                    <div class="bubble" style="display:flex; align-items:center; gap:6px; padding:10px 14px;">
                        <span class="typing-dot" style="width:7px; height:7px; background:var(--primary); border-radius:50%; display:inline-block; animation:bounce 1.2s infinite ease-in-out;"></span>
                        <span class="typing-dot" style="width:7px; height:7px; background:var(--secondary); border-radius:50%; display:inline-block; animation:bounce 1.2s infinite ease-in-out 0.2s;"></span>
                        <span class="typing-dot" style="width:7px; height:7px; background:var(--primary); border-radius:50%; display:inline-block; animation:bounce 1.2s infinite ease-in-out 0.4s;"></span>
                        <span style="font-size:0.75rem; color:var(--text-dim); margin-left:6px;">PopuChat 2 está procesando...</span>
                    </div>
                `;
            }
            if (chatMessages && typingEl) chatMessages.appendChild(typingEl);
            if (drawerChatMirror) {
                if (!mirrorTypingEl) {
                    mirrorTypingEl = document.createElement('div');
                    mirrorTypingEl.className = 'chat-row bot';
                    mirrorTypingEl.innerHTML = `<div class="msg-avatar"><img src="/img/mascot.png" alt="PopuChat"></div><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
                }
                drawerChatMirror.appendChild(mirrorTypingEl);
            }
            scrollToBottom();
        } else {
            if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
            if (mirrorTypingEl && mirrorTypingEl.parentNode) mirrorTypingEl.parentNode.removeChild(mirrorTypingEl);
        }
    }

    // ==========================================
    // 7. TELEMETRÍA Y TABLA DE 4 COLUMNAS (IMAGEN 5)
    // ==========================================
    function updateLiveDiagnostic(data) {
        const pln = (data && data.pln) || (data && data.telemetria) || data || {};
        const tono = pln.tono || 'neutral';
        const saludo = pln.saludo || 'ninguno';
        const normalizado = pln.normalizado || '-';
        const intenciones = pln.intenciones || [];
        const fuentes = (data && data.fuentes) || [];
        const fragmentos = (data && data.resultadosRAG) ||
                           (data && data.rag && data.rag.fragmentos) ||
                           (data && data.telemetria && data.telemetria.fragmentos) || [];

        if (diagTone) {
            diagTone.textContent = tono;
            diagTone.className = 'tone-badge ' + getToneBadgeClass(tono);
        }
        if (diagGreeting) diagGreeting.textContent = saludo;
        if (diagNormalized) diagNormalized.textContent = normalizado;
        if (diagIntents) {
            diagIntents.textContent = Array.isArray(intenciones) && intenciones.length > 0
                ? intenciones.join(', ')
                : 'No detectadas';
        }
        if (diagSources) {
            diagSources.textContent = Array.isArray(fuentes) && fuentes.length > 0
                ? fuentes.join('; ')
                : 'Ninguna';
        }

        // Actualizar Tabla de 4 Columnas (Fuente | Fragmento | Similitud | Contenido) - Imagen 5
        if (fragmentosTablaBody) {
            if (!fragmentos || fragmentos.length === 0) {
                fragmentosTablaBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-table-cell">Sin fragmentos recuperados para esta consulta (similitud &lt; 0.35).</td>
                    </tr>
                `;
            } else {
                fragmentosTablaBody.innerHTML = fragmentos.map((frag, idx) => {
                    const fuente = frag.fuente || frag.fuente_id || 'Documento Oficial';
                    const num = frag.fragmento_numero !== undefined ? frag.fragmento_numero : (idx + 1);
                    const sim = frag.similitud !== undefined || frag.score !== undefined
                        ? Number(frag.similitud !== undefined ? frag.similitud : frag.score).toFixed(3)
                        : '0.000';
                    const contenido = frag.texto || '';
                    return `
                        <tr>
                            <td><strong>${escapeHtml(fuente)}</strong></td>
                            <td>${escapeHtml(String(num))}</td>
                            <td><span class="rag-score">${escapeHtml(sim)}</span></td>
                            <td>${escapeHtml(contenido)}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Actualizar también #ragItemsContainer por compatibilidad con tests unitarios
        if (ragItemsContainer) {
            if (!fragmentos || fragmentos.length === 0) {
                ragItemsContainer.innerHTML = `<div style="font-size:0.75rem;">Sin fragmentos para esta consulta.</div>`;
            } else {
                ragItemsContainer.innerHTML = fragmentos.map(frag => {
                    const score = frag.score || frag.similitud ? Number(frag.score || frag.similitud).toFixed(3) : '0.000';
                    const fuente = frag.fuente || 'Documento Oficial';
                    return `<div class="rag-card"><div class="rag-card-header"><span class="rag-source">${escapeHtml(fuente)}</span><span class="rag-score">Score: ${score}</span></div><div class="rag-snippet">${escapeHtml(frag.texto || '')}</div></div>`;
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
    async function handleSend(overrideText) {
        const rawText = typeof overrideText === 'string'
            ? overrideText
            : ((chatInput && chatInput.value.trim()) || (drawerQueryInput && drawerQueryInput.value.trim()) || '');
        const text = rawText.trim();
        if (!text) return;

        if (chatInput) chatInput.value = '';
        if (drawerQueryInput) {
            drawerQueryInput.value = '';
            drawerQueryInput.style.height = 'auto';
        }

        appendUserMessage(text);
        showTyping(true);

        const payload = {
            mensaje: text,
            modo: currentMode,
            top_k: topKSlider ? parseInt(topKSlider.value, 10) : 4,
            temperatura: tempSlider ? parseFloat(tempSlider.value) : 0.3,
            max_tokens: maxTokensSlider ? parseInt(maxTokensSlider.value, 10) : 350,
            apiKey: getStoredApiKey() || undefined,
            groqApiKey: getStoredGroqApiKey() || undefined
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

            updateLiveDiagnostic(data);

            if (window.CsvExporter) {
                window.CsvExporter.addRecord({
                    pregunta: text,
                    normalizado: data.normalizado || (data.pln && data.pln.normalizado) || text,
                    tono: data.tono || (data.pln && data.pln.tono) || 'neutral',
                    intenciones: data.intenciones || (data.pln && data.pln.intenciones) || [],
                    modo: data.modo || currentMode,
                    fuentes: data.fuentes || [],
                    respuesta: data.respuesta
                });
                actualizarPesoCsvLocal();
            }
        } catch (error) {
            showTyping(false);
            console.error('[PopuChat2 Error]:', error);
            appendBotMessage(`⚠️ Disculpas, ocurrió un inconveniente de conexión con el servidor: ${error.message}.`);
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => handleSend());
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        });
    }
    if (btnDrawerSend) {
        btnDrawerSend.addEventListener('click', () => {
            if (drawerQueryInput && drawerQueryInput.value.trim()) {
                handleSend(drawerQueryInput.value.trim());
            }
        });
    }
    if (drawerQueryInput) {
        const ajustarAltura = () => {
            drawerQueryInput.style.height = 'auto';
            drawerQueryInput.style.height = Math.min(drawerQueryInput.scrollHeight, 160) + 'px';
        };
        drawerQueryInput.addEventListener('input', ajustarAltura);
        drawerQueryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (drawerQueryInput.value.trim()) {
                    handleSend(drawerQueryInput.value.trim());
                }
            }
        });
    }

    // ==========================================
    // 9. PESTAÑA 2: BASE DE CONOCIMIENTO (IMAGEN 2)
    // ==========================================
    const kbFileInput = document.getElementById('kbFileInput');
    const kbDropzone = document.getElementById('kbDropzone');
    const kbSelectedFilesList = document.getElementById('kbSelectedFilesList');
    const chkConservarPopu = document.getElementById('chkConservarPopu');
    const btnProcesarDocs = document.getElementById('btnProcesarDocs');
    const btnRestaurarDocs = document.getElementById('btnRestaurarDocs');
    const estadoBaseMsg = document.getElementById('estadoBaseMsg');
    const tablaDocumentosBody = document.getElementById('tablaDocumentosBody');

    let archivosCargadosEnMemoria = [];

    function renderTablaDocumentos(docs) {
        if (!tablaDocumentosBody || !Array.isArray(docs)) return;
        if (docs.length === 0) {
            tablaDocumentosBody.innerHTML = `<tr><td colspan="2" class="empty-table-cell">Sin documentos activos.</td></tr>`;
            return;
        }
        tablaDocumentosBody.innerHTML = docs.map(d => `
            <tr>
                <td>${escapeHtml(d.Fuente || d.fuente)}</td>
                <td>${escapeHtml(String(d.Caracteres !== undefined ? d.Caracteres : (d.caracteres || 0)))}</td>
            </tr>
        `).join('');
    }

    async function cargarDocumentosActivos() {
        try {
            const res = await fetch('/api/documentos');
            if (res.ok) {
                const data = await res.json();
                if (data.documentosActivos) {
                    renderTablaDocumentos(data.documentosActivos);
                }
            }
        } catch (err) {
            console.warn('[PopuChat2] No se pudo consultar /api/documentos:', err);
        }
    }

    async function leerArchivosSeleccionados(fileList) {
        archivosCargadosEnMemoria = [];
        for (const file of Array.from(fileList)) {
            const texto = await file.text();
            archivosCargadosEnMemoria.push({
                nombre: file.name,
                texto: texto
            });
        }
        if (kbSelectedFilesList) {
            kbSelectedFilesList.textContent = archivosCargadosEnMemoria.length > 0
                ? `Archivos listos (${archivosCargadosEnMemoria.length}): ${archivosCargadosEnMemoria.map(a => a.nombre).join(', ')}`
                : '';
        }
    }

    if (kbFileInput) {
        kbFileInput.addEventListener('change', (e) => {
            if (e.target.files) leerArchivosSeleccionados(e.target.files);
        });
    }

    if (kbDropzone) {
        kbDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            kbDropzone.style.borderColor = 'var(--primary)';
        });
        kbDropzone.addEventListener('dragleave', () => {
            kbDropzone.style.borderColor = '';
        });
        kbDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            kbDropzone.style.borderColor = '';
            if (e.dataTransfer && e.dataTransfer.files) {
                leerArchivosSeleccionados(e.dataTransfer.files);
            }
        });
    }

    if (btnProcesarDocs) {
        btnProcesarDocs.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/documentos/procesar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        archivos: archivosCargadosEnMemoria,
                        conservar_popu: chkConservarPopu ? chkConservarPopu.checked : true
                    })
                });
                const data = await res.json();
                if (estadoBaseMsg && data.mensaje) {
                    estadoBaseMsg.textContent = data.mensaje;
                }
                if (data.documentosActivos) {
                    renderTablaDocumentos(data.documentosActivos);
                }
            } catch (err) {
                if (estadoBaseMsg) estadoBaseMsg.textContent = `Error al procesar documentos: ${err.message}`;
            }
        });
    }

    if (btnRestaurarDocs) {
        btnRestaurarDocs.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/documentos/restaurar', { method: 'POST' });
                const data = await res.json();
                archivosCargadosEnMemoria = [];
                if (kbSelectedFilesList) kbSelectedFilesList.textContent = '';
                if (kbFileInput) kbFileInput.value = '';
                if (estadoBaseMsg && data.mensaje) {
                    estadoBaseMsg.textContent = data.mensaje;
                }
                if (data.documentosActivos) {
                    renderTablaDocumentos(data.documentosActivos);
                }
            } catch (err) {
                if (estadoBaseMsg) estadoBaseMsg.textContent = `Error al restaurar base: ${err.message}`;
            }
        });
    }

    // ==========================================
    // 10. PESTAÑA 3: REGISTRO CSV Y RESET (IMAGEN 3)
    // ==========================================
    function actualizarPesoCsvLocal() {
        if (!csvFileSizeLabel || !window.CsvExporter) return;
        const csvStr = window.CsvExporter.generateCsvString();
        const kb = Math.max(0.1, (new Blob([csvStr]).size / 1024)).toFixed(1);
        csvFileSizeLabel.textContent = `${kb} KB ↓`;
    }

    async function descargarCsvRegistro() {
        try {
            const res = await fetch('/api/auditoria/csv');
            if (res.ok) {
                const blob = await res.blob();
                if (csvFileSizeLabel) {
                    const kb = Math.max(0.1, (blob.size / 1024)).toFixed(1);
                    csvFileSizeLabel.textContent = `${kb} KB ↓`;
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'registro_consultas_chatbot_rag.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                return;
            }
        } catch (e) {
            console.warn('[PopuChat2] Fallback CSV local:', e);
        }
        if (window.CsvExporter) window.CsvExporter.download('registro_consultas_chatbot_rag.csv');
    }

    if (btnGenerarCsv) {
        btnGenerarCsv.addEventListener('click', descargarCsvRegistro);
    }
    if (btnDownloadCsv) {
        btnDownloadCsv.addEventListener('click', descargarCsvRegistro);
    }

    if (btnResetMemory) {
        btnResetMemory.addEventListener('click', async () => {
            try {
                await fetch('/api/reiniciar', { method: 'POST' });
            } catch (e) {}
            if (drawerChatMirror) {
                drawerChatMirror.innerHTML = `
                    <div class="drawer-chat-placeholder" id="drawerChatPlaceholder">
                        <div class="welcome-avatar"><img src="/img/mascot.png" alt="PopuChat"></div>
                        <h4>¡Hola! Soy PopuChat 2</h4>
                        <p>Preguntame lo que necesites sobre carreras, inscripciones, cuotas, sedes u horarios. Podemos charlar: recuerdo lo que me contaste.</p>
                    </div>
                `;
            }
            if (fragmentosTablaBody) {
                fragmentosTablaBody.innerHTML = `<tr><td colspan="4" class="empty-table-cell">Todavía no se procesó ningún mensaje.</td></tr>`;
            }
            if (diagNormalized) diagNormalized.textContent = '-';
            if (diagTone) {
                diagTone.textContent = 'neutral';
                diagTone.className = 'tone-badge tone-neutral';
            }
            if (diagGreeting) diagGreeting.textContent = 'ninguno';
            if (diagIntents) diagIntents.textContent = 'No detectadas';
            if (diagSources) diagSources.textContent = 'Ninguna';
        });
    }

    // ==========================================
    // 11. PESTAÑA 4: CONFIGURACIÓN Y SCREEN STUDIO (IMAGEN 4)
    // ==========================================
    const themeBtns = document.querySelectorAll('#themeSelectorGroup .theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const theme = btn.getAttribute('data-theme');
            if (theme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }
        });
    });

    const btnStartRecording = document.getElementById('btnStartRecording');
    let mediaRecorder = null;
    let recordedChunks = [];

    if (btnStartRecording) {
        btnStartRecording.addEventListener('click', async () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                btnStartRecording.textContent = '⊙ Start Recording';
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert('Tu navegador no soporta grabación directa de pantalla.');
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                recordedChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
                };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'popuchat2_screen_studio.webm';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    stream.getTracks().forEach(t => t.stop());
                    btnStartRecording.textContent = '⊙ Start Recording';
                };
                mediaRecorder.start();
                btnStartRecording.textContent = '⏹ Stop Recording';
            } catch (err) {
                console.warn('[Screen Studio] Grabación cancelada:', err);
            }
        });
    }

    console.log('[PopuChat 2] Interfaz Popu 1 + Panel Completo de 5 Vistas de Cátedra inicializados con éxito.');
});
