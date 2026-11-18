/**
 * PopuChat 2 — Motor de Auditoría y Exportación CSV en Navegador
 * Genera el reporte oficial de 8 columnas estipulado por la cátedra
 * con codificación UTF-8 BOM (\uFEFF) para visualización perfecta en Microsoft Excel.
 */

(function (window) {
    'use strict';

    const HEADERS = [
        'fecha_hora',
        'pregunta',
        'normalizado',
        'tono',
        'intenciones',
        'modo',
        'fuentes',
        'respuesta'
    ];

    class CsvExporter {
        constructor() {
            this.records = [];
            this.storageKey = 'popuchat2_audit_records';
            this.loadStoredRecords();
        }

        loadStoredRecords() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    this.records = JSON.parse(stored);
                }
            } catch (e) {
                console.warn('[CsvExporter] No se pudo leer el historial local:', e);
                this.records = [];
            }
        }

        saveRecords() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.records));
            } catch (e) {
                console.warn('[CsvExporter] No se pudo guardar el historial local:', e);
            }
        }

        addRecord(entry) {
            const row = {
                fecha_hora: entry.fecha_hora || new Date().toISOString().replace('T', ' ').substring(0, 19),
                pregunta: entry.pregunta || '',
                normalizado: entry.normalizado || '',
                tono: entry.tono || 'neutral',
                intenciones: Array.isArray(entry.intenciones) ? entry.intenciones.join(', ') : (entry.intenciones || ''),
                modo: entry.modo || 'Solo base de conocimiento',
                fuentes: Array.isArray(entry.fuentes) ? entry.fuentes.join(', ') : (entry.fuentes || 'Ninguna'),
                respuesta: entry.respuesta || ''
            };

            this.records.push(row);
            this.saveRecords();
            return row;
        }

        clearRecords() {
            this.records = [];
            try {
                localStorage.removeItem(this.storageKey);
            } catch (e) {}
        }

        escapeCsvCell(val) {
            if (val === null || val === undefined) return '""';
            let str = String(val).replace(/"/g, '""');
            // Reemplazar saltos de línea con espacio para mantener registros en una sola línea por fila si es necesario, o mantenerlos entrecomillados
            str = str.replace(/\r?\n/g, ' ');
            return `"${str}"`;
        }

        generateCsvString() {
            const headerLine = HEADERS.map(h => this.escapeCsvCell(h)).join(',');
            const dataLines = this.records.map(row => {
                return HEADERS.map(col => this.escapeCsvCell(row[col])).join(',');
            });
            // Prefijo BOM UTF-8 (\uFEFF) para que Excel lo abra con tildes y caracteres especiales intactos
            return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
        }

        downloadBlob(csvString, filename = 'registro_consultas_popuchat2.csv') {
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        download() {
            if (this.records.length === 0) {
                return false;
            }
            const csvContent = this.generateCsvString();
            this.downloadBlob(csvContent);
            return true;
        }
    }

    window.CsvExporter = new CsvExporter();
})(typeof window !== 'undefined' ? window : this);
