/**
 * PopuChat 2 — Controlador Principal de la Interfaz (Frontend)
 * Vincula la UI de PopuChat 1 con el motor híbrido (PLN + RAG + Gemini),
 * el panel oculto de configuración oficial y la telemetría en tiempo real.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ==========================================
    // 1. SELECTORES DE ELEMENTOS DEL DOM
    // ==========================================
    // Drawer (Panel Oculto)
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

    // Chat y Mensajería
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    // Acciones y Credenciales
    const btnDownloadCsv = document.getElementById('btnDownloadCsv');
    const btnResetMemory = document.getElementById('btnResetMemory');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const btnSaveApiKey = document.getElementById('btnSaveApiKey');

    // Estado Local de la Sesión
    let currentMode = 'Solo base de conocimiento';

    // ==========================================
    // 2. GESTIÓN DEL PANEL OCULTO (DRAWER)
    // ==========================================
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

    // ==========================================
    // 3. SINCRONIZACIÓN DE SLIDERS Y SELECTORES
    // ==========================================
    // Selector de Modo de Inferencia
    modePills.forEach(pill => {
        pill.addEventListener('click', () => {
            modePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentMode = pill.getAttribute('data-mode') || 'Solo base de conocimiento';
            console.log('[PopuChat2] Modo seleccionado:', currentMode);
        });
    });

    // Slider top_k
    if (topKSlider && topKVal) {
        topKSlider.addEventListener('input', () => {
            topKVal.textContent = topKSlider.value;
        });
    }

    // Slider temperatura
    if (tempSlider && tempVal) {
        tempSlider.addEventListener('input', () => {
            tempVal.textContent = parseFloat(tempSlider.value).toFixed(1);
        });
    }

    // Slider max_tokens
    if (maxTokensSlider && maxTokensVal) {
        maxTokensSlider.addEventListener('input', () => {
            maxTokensVal.textContent = maxTokensSlider.value;
        });
    }

    // Chips de Sugerencias Rápidas
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            const msg = chip.getAttribute('data-msg');
            if (msg && userInput) {
                userInput.value = msg;
                userInput.focus();
                // Enviar inmediatamente para agilidad en la demostración
                sendMessage(msg);
            }
        });
    });

    // ==========================================
    // 4. GESTIÓN DE API KEY EN NAVEGADOR
    // ==========================================
    function getStoredApiKey() {
        return localStorage.getItem('gemini_api_key') || '';
    }

    if (geminiApiKeyInput) {
        const stored = getStoredApiKey();
        if (stored) {
            geminiApiKeyInput.value = stored;
        }
    }

    if (btnSaveApiKey && geminiApiKeyInput) {
        btnSaveApiKey.addEventListener('click', () => {
            const keyVal = geminiApiKeyInput.value.trim();
            if (keyVal) {
                localStorage.setItem('gemini_api_key', keyVal);
                btnSaveApiKey.textContent = '✓ Guardada';
                setTimeout(() => {
                    btnSaveApiKey.textContent = 'Guardar';
                }, 2000);
            } else {
                localStorage.removeItem('gemini_api_key');
                btnSaveApiKey.textContent = 'Borrada';
                setTimeout(() => {
                    btnSaveApiKey.textContent = 'Guardar';
                }, 2000);
            }
        });
    }

    // ==========================================
    // 5. RENDERIZADO DE MENSAJES Y CHAT
    // ==========================================
    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user';
        msgDiv.innerHTML = `
            <div class="bubble">${escapeHtml(text)}</div>
        `;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendBotMessage(text, meta = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';

        // Procesar formato institucional para citas de fuentes
        let formattedText = formatBotResponse(text);

        let metaHtml = '';
        if (meta && meta.modo) {
            metaHtml = `<div class="msg-meta-tag">Modo: ${escapeHtml(meta.modo)}</div>`;
        }

        msgDiv.innerHTML = `
            <div class="avatar"><img src="/img/mascot.png" alt="PopuBot"></div>
            <div class="bubble">
                ${formattedText}
                ${metaHtml}
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function formatBotResponse(raw) {
        if (!raw) return '';
        let escaped = escapeHtml(raw);

        // Convertir saltos de línea a <br>
        let html = escaped.replace(/\n/g, '<br>');

        // Resaltar negritas tipo **texto**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Resaltar formalmente el bloque "Fuentes: ..." al pie
        const fuentesRegex = /Fuentes:\s*(.+)$/i;
        html = html.replace(fuentesRegex, (match, p1) => {
            return `<div class="bubble-footer-sources"><span style="font-weight: 700;">📚 Documentación Oficial Citada:</span> ${p1}</div>`;
        });

        return html;
    }

    function escapeHtml(string) {
        if (!string) return '';
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(string).replace(/[&<>"']/g, s => entityMap[s]);
    }

    function showTyping(show) {
        if (!typingIndicator) return;
        if (show) {
            typingIndicator.style.display = 'flex';
            scrollToBottom();
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    // ==========================================
    // 6. ACTUALIZACIÓN DEL DIAGNÓSTICO EN TIEMPO REAL
    // ==========================================
    function updateLiveDiagnostic(telemetry, pln, rag) {
        if (!telemetry && !pln) return;

        const tono = (telemetry && telemetry.tono) || (pln && pln.tono) || 'neutral';
        const saludo = (telemetry && telemetry.saludo) || (pln && pln.saludo) || 'Ninguno';
        const normalizado = (telemetry && telemetry.normalizado) || (pln && pln.normalizado) || '-';
        const intenciones = (telemetry && telemetry.intenciones) || (pln && pln.intenciones) || [];
        const fragmentos = (rag && rag.fragmentos) || (telemetry && telemetry.fragmentos) || [];

        // 1. Tono emocional
        if (diagTone) {
            diagTone.textContent = tono;
            diagTone.className = 'tone-badge ' + getToneBadgeClass(tono);
        }

        // 2. Saludo
        if (diagGreeting) {
            diagGreeting.textContent = saludo;
        }

        // 3. Texto normalizado
        if (diagNormalized) {
            diagNormalized.textContent = normalizado;
        }

        // 4. Intenciones detectadas
        if (diagIntents) {
            if (Array.isArray(intenciones) && intenciones.length > 0) {
                diagIntents.textContent = intenciones.map(i => typeof i === 'object' ? `${i.intent || i.nombre}` : i).join(', ');
            } else {
                diagIntents.textContent = 'Ninguna identificada';
            }
        }

        // 5. Evidencia RAG recuperada
        if (ragItemsContainer) {
            if (!fragmentos || fragmentos.length === 0) {
                ragItemsContainer.innerHTML = `
                    <div style="font-size: 0.75rem; color: var(--text-dim); font-style: italic; padding: 6px;">
                        Sin fragmentos recuperados para esta consulta (o umbral no alcanzado &lt; 0.35).
                    </div>
                `;
            } else {
                ragItemsContainer.innerHTML = fragmentos.map(frag => {
                    const score = frag.score ? Number(frag.score).toFixed(2) : '0.00';
                    const fuente = frag.fuente || frag.fuente_id || 'Documento Oficial';
                    const textoPreview = frag.texto ? escapeHtml(frag.texto.substring(0, 160)) + '...' : '';

                    return `
                        <div class="rag-card">
                            <div class="rag-card-header">
                                <span class="rag-source">${escapeHtml(fuente)}</span>
                                <span class="rag-score">Score: ${score}</span>
                            </div>
                            <div class="rag-snippet">${textoPreview}</div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    function getToneBadgeClass(tone) {
        switch (tone.toLowerCase()) {
            case 'molesto': return 'tone-molesto';
            case 'agradecido': return 'tone-agradecido';
            case 'formal': return 'tone-formal';
            case 'informal': return 'tone-informal';
            default: return 'tone-neutral';
        }
    }

    // ==========================================
    // 7. ENVÍO DE CONSULTA AL BACKEND
    // ==========================================
    async function sendMessage(text) {
        const queryText = (text || '').trim();
        if (!queryText) return;

        // Limpiar input
        if (userInput) userInput.value = '';

        // Agregar mensaje de usuario en UI
        appendUserMessage(queryText);
        showTyping(true);

        const payload = {
            mensaje: queryText,
            modo: currentMode,
            top_k: topKSlider ? parseInt(topKSlider.value, 10) : 4,
            temperatura: tempSlider ? parseFloat(tempSlider.value) : 0.3,
            max_tokens: maxTokensSlider ? parseInt(maxTokensSlider.value, 10) : 350,
            apiKey: getStoredApiKey() || undefined
        };

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error HTTP ${response.status}`);
            }

            const data = await response.json();
            showTyping(false);

            // Renderizar respuesta del bot
            appendBotMessage(data.respuesta, {
                modo: data.modo || currentMode,
                fuentes: data.fuentes
            });

            // Actualizar diagnóstico y telemetría en el panel de control
            updateLiveDiagnostic(data.telemetria, data.pln, data.rag);

            // Registrar en el motor de auditoría del cliente
            if (window.CsvExporter) {
                const rowData = {
                    pregunta: queryText,
                    normalizado: (data.pln && data.pln.normalizado) || (data.telemetria && data.telemetria.normalizado) || queryText,
                    tono: (data.pln && data.pln.tono) || (data.telemetria && data.telemetria.tono) || 'neutral',
                    intenciones: (data.pln && data.pln.intenciones) || (data.telemetria && data.telemetria.intenciones) || [],
                    modo: data.modo || currentMode,
                    fuentes: data.fuentes || [],
                    respuesta: data.respuesta
                };
                window.CsvExporter.addRecord(rowData);
            }

        } catch (error) {
            showTyping(false);
            console.error('[PopuChat2] Error al procesar mensaje:', error);
            appendBotMessage(`⚠️ Disculpas, ocurrió un problema al conectar con el servidor: ${error.message}. Por favor verifica la conexión o vuelve a intentar.`);
        }
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (userInput) {
                sendMessage(userInput.value);
            }
        });
    }

    // ==========================================
    // 8. AUDITORÍA DOCENTE Y DESCARGA CSV
    // ==========================================
    if (btnDownloadCsv) {
        btnDownloadCsv.addEventListener('click', async () => {
            try {
                // Primero intentamos la descarga directa desde el endpoint de servidor
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
            } catch (err) {
                console.warn('[PopuChat2] Fallback a exportador CSV cliente:', err);
            }

            // Fallback a exportador local del navegador
            if (window.CsvExporter) {
                const ok = window.CsvExporter.download();
                if (!ok) {
                    alert('Todavía no se han registrado consultas en la sesión para exportar.');
                }
            }
        });
    }

    // ==========================================
    // 9. REINICIO DE CONVERSACIÓN (MEMORIA)
    // ==========================================
    if (btnResetMemory) {
        btnResetMemory.addEventListener('click', async () => {
            if (!confirm('¿Deseas reiniciar la memoria contextual de la conversación?')) {
                return;
            }

            try {
                await fetch('/api/reiniciar', { method: 'POST' });
            } catch (e) {
                console.warn('[PopuChat2] No se pudo reiniciar en el servidor:', e);
            }

            // Limpiar mensajes excepto el mensaje inicial de bienvenida
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="message bot">
                        <div class="avatar"><img src="/img/mascot.png" alt="PopuBot"></div>
                        <div class="bubble">
                            ¡Memoria reiniciada con éxito! Estoy listo para una nueva consulta académica sobre el <strong>IES N° 7 "Populorum Progressio" - INTELA</strong>.
                        </div>
                    </div>
                `;
            }

            // Resetear diagnósticos
            if (diagTone) {
                diagTone.textContent = 'neutral';
                diagTone.className = 'tone-badge tone-neutral';
            }
            if (diagGreeting) diagGreeting.textContent = 'Ninguno';
            if (diagNormalized) diagNormalized.textContent = '-';
            if (diagIntents) diagIntents.textContent = '-';
            if (ragItemsContainer) {
                ragItemsContainer.innerHTML = `
                    <div style="font-size: 0.75rem; color: var(--text-dim); font-style: italic;">
                        Memoria contextual vacía. Listo para nueva consulta.
                    </div>
                `;
            }
        });
    }

    console.log('[PopuChat2] Frontend y controlador inicializados correctamente.');
});
