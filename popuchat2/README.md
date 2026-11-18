# Módulo Aislado: PopuChat 2 (Híbrido PLN + RAG + IA)

Esta carpeta concentra **exclusivamente todo el desarrollo, código, pipelines y recursos de PopuChat 2**. 

De esta manera, el proyecto original queda completamente intacto en la raíz y todo lo nuevo vive de forma encapsulada aquí dentro.

---

## 🏗️ Estructura del Módulo `popuchat2/`

```text
popuchat2/
├── README.md               <-- Este archivo de control
├── pipeline/               <-- Capa 1: Normalización, Abreviaciones, Errores y Tono
├── rag/                    <-- Capa 2: Chunking (700/120), Embeddings (E5) y Búsqueda Semántica
├── engine/                 <-- Capa 3: Prompt RAG, Reglas Obligatorias y Conexión con IA (Qwen/LLM)
├── data/                   <-- Capa 4: Fuentes documentales y fragmentos generados
└── ui/                     <-- Capa 5: Interfaz, panel de auditoría y exportación CSV
```

---

## 🛡️ Doble Capa de Seguridad
1. **Aislamiento en Git:** Rama activa `popu-chat2` (la rama `main` en producción no se entera de nada).
2. **Aislamiento Físico en Disco:** Carpeta dedicada `popuchat2/` (ningún archivo original del bot 1 es modificado).
