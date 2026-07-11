const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const quickBtns = document.querySelectorAll('.quick-btn');

// Generar un sessionId único para esta sesión de navegación
const sessionId = Math.random().toString(36).substring(2, 15) + '_' + Date.now();

function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
        ${role === 'user' ? '<div class="avatar">👤</div>' : ''}
        <div class="bubble">${text}</div>
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
    if (!texto.trim()) return;

    if (clickedBtn) clickedBtn.classList.add('btn-loading');
    else sendBtn.classList.add('btn-loading');

    addMessage(texto, 'user');
    chatInput.value = '';
    showTyping();

    const fetchPromise = fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, sessionId })
    }).then(res => res.json());

    const delayPromise = new Promise(resolve => setTimeout(resolve, 3000));

    try {
        const [data] = await Promise.all([fetchPromise, delayPromise]);
        hideTyping();
        addMessage(data.respuesta, 'bot');
    } catch (err) {
        hideTyping();
        addMessage('Error de conexión con el servidor.', 'bot');
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
    const btn = e.target.closest('.quick-btn');
    if (btn && btn.dataset.msg) {
        enviarMensaje(btn.dataset.msg, btn);
    }
});
