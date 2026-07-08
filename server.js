import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { procesarMensaje, getCarreras } from './engine/rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.post('/api/chat', (req, res) => {
    const { mensaje, sessionId } = req.body;
    if (!mensaje || typeof mensaje !== 'string') {
        return res.status(400).json({ error: 'Mensaje requerido' });
    }
    const respuesta = procesarMensaje(mensaje.trim(), sessionId || 'default_session');
    res.json({ respuesta });
});

app.get('/api/carreras', (req, res) => {
    res.json(getCarreras());
});

app.listen(PORT, () => {
    console.log(`🤖 Popu Chat corriendo en http://localhost:${PORT}`);
});
