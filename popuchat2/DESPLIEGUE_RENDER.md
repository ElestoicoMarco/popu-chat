# Guía Oficial de Despliegue en Render — PopuChat 2

Esta guía detalla el procedimiento paso a paso para desplegar **PopuChat 2** en la nube gratuita de **Render** de forma 100% aislada, asegurando que la rama `main` (Popu 1) permanezca intacta e inmutable.

---

## 🔒 1. Parámetros de Configuración en Render

Al crear el servicio web en Render, configura los siguientes campos:

| Campo en Render | Valor a Configurar | Justificación Técnica |
| :--- | :--- | :--- |
| **Service Type** | `Web Service` | Servicio HTTP Node.js público con SSL automático. |
| **Repository** | `popu-chat` (tu repositorio de GitHub) | Repositorio oficial del proyecto. |
| **Branch** | `popu-chat2` | **Crítico:** Garantiza que se despliegue PopuChat 2 sin tocar `main`. |
| **Root Directory** | `popuchat2` | Render trabajará exclusivamente dentro de la subcarpeta aislada. |
| **Runtime** | `Node` | Entorno de ejecución estándar de JavaScript. |
| **Build Command** | `npm install` | Instala `express` y dependencias declaradas en `popuchat2/package.json`. |
| **Start Command** | `node server.js` | Inicia el servidor autónomo con puerto dinámico `process.env.PORT`. |
| **Instance Type** | `Free` | Plan gratuito con 512 MB RAM y dominio `.onrender.com`. |

---

## 🔑 2. Configuración de Variables de Entorno en Render

Para que el modelo generativo de Gemini responda consultas en tiempo real:

1. Ve a la pestaña **Environment** en el panel de tu servicio en Render.
2. Agrega la variable:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** *(Pega aquí tu clave privada de Google AI Studio, por ej: `AIzaSy...`)*
3. Guarda los cambios. Render reiniciará automáticamente el contenedor con la clave cargada en memoria.
4. *(Opcional)*: También puedes ingresar la clave temporalmente en el panel oculto de la interfaz web tocando el engranaje `⚙️`.

---

## 🚀 3. Paso a Paso para Desplegar desde el Dashboard

1. Inicia sesión en [render.com](https://render.com).
2. Haz clic en **"New +"** (arriba a la derecha) y selecciona **"Web Service"**.
3. Selecciona tu repositorio de GitHub `popu-chat`.
4. Completa el formulario con los valores de la tabla anterior:
   - **Name:** `popuchat2-ies7`
   - **Branch:** `popu-chat2`
   - **Root Directory:** `popuchat2`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. En la sección **Environment Variables**, añade `GEMINI_API_KEY`.
6. Haz clic en **"Deploy Web Service"**.
7. En 1-2 minutos, Render te proporcionará tu URL pública:
   `https://popuchat2-ies7.onrender.com`

---

## 🩺 4. Verificación de Salud y Endpoints

Una vez desplegado, puedes comprobar el estado en:
- **Interfaz Web:** `https://tu-servicio.onrender.com/` (Carga PopuChat 2 con estética de Popu 1 y engranaje de configuración).
- **Healthcheck:** `https://tu-servicio.onrender.com/api/health` (Devuelve `{ "status": "ok", "app": "PopuChat 2", "rag_cargado": true }`).
- **Descarga Auditoría CSV:** `https://tu-servicio.onrender.com/api/auditoria/csv`.
