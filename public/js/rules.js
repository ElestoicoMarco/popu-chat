// Base de conocimiento y configuración de intenciones para el IES N° 7 "Populorum Progressio" - INTELA
// Soporta múltiples carreras de forma dinámica e inteligente, con control de sesión y ordenamiento lógico.

// Mapa global en memoria para guardar las sesiones
const sesiones = new Map();

// Obtener o crear sesión
function obtenerSesion(sessionId) {
    if (!sesiones.has(sessionId)) {
        sesiones.set(sessionId, {
            carreraContexto: null,
            historialVariaciones: {} // key -> index (0 o 1)
        });
    }
    return sesiones.get(sessionId);
}

const ORDEN_LOGICO_INTENCIONES = [
    'saludo',
    'experto_bot',
    'valor_cuota_2027',
    'valor_cuota',
    'valor_inscripcion',
    'tramites_tesoreria',
    'distribucion_aulas',
    'requisitos_duplicado',
    'carreras',
    'tecnicaturas',
    'profesorados',
    'descripcion_carrera',
    'plan_estudios_completo',
    'campo_laboral',
    'coordinador',
    'requisitos_inscripcion',
    'horario_atencion',
    'ubicacion',
    'contacto',
    'idiomas_soporte',
    'agradecimiento'
];

// Función para normalizar texto (pasar a minúsculas, remover acentos)
function normalizar(texto) {
    if (!texto) return '';
    // 1. Pasar a minúsculas
    let t = texto.toLowerCase();
    
    // 2. Normalizar tildes y diéresis (hacerlo temprano para facilitar regex posteriores)
    t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // 3. Reemplazar guiones, barras y guiones bajos por espacios
    t = t.replace(/[-_/]/g, ' ');
    
    // 4. Eliminar cualquier otro carácter de puntuación o símbolo que no sea letra, número o espacio
    t = t.replace(/[^a-z0-9\s]/g, '');
    
    // 5. Tratar repeticiones simples de letras (3 o más repeticiones consecutivas a 1)
    // Se hace DESPUÉS de quitar puntuación para casos como "hola....aaa" -> "holaaaa" -> "hola"
    t = t.replace(/(.)\1{2,}/g, '$1');
    
    // 6. Fusionar letras individuales separadas por espacios (ej: "h o l a" -> "hola")
    let prev;
    do {
        prev = t;
        t = t.replace(/\b([a-z])\s+(?=[a-z]\b)/gi, '$1');
    } while (t !== prev);
    
    // 7. Tratar errores frecuentes y abreviaciones comunes de la temática
    const abreviaciones = {
        // Correcciones de saludos modernos/adolescentes
        '\\bhol[ais]*\\b': 'hola',
        '\\bhola+\\b': 'hola',
        '\\bbuenas+\\b': 'buenas',
        '\\bbns\\b': 'buenas',
        '\\bbuenis\\b': 'buenas',
        
        // Abreviaciones adolescentes / chat
        '\\bxfa\\b': 'por favor',
        '\\bxf\\b': 'por favor',
        '\\bplis\\b': 'por favor',
        '\\bporfa\\b': 'por favor',
        '\\bprofe\\b': 'profesor',
        '\\bgcs\\b': 'gracias',
        '\\bgx\\b': 'gracias',
        '\\bgrx\\b': 'gracias',

        // Abreviaciones comunes
        '\\binfo\\b': 'informacion',
        '\\badm\\b': 'administracion',
        '\\binsc\\b': 'inscripcion',
        '\\bubi\\b': 'ubicacion',
        '\\btel\\b': 'telefono',
        '\\bdire\\b': 'direccion',
        '\\bcoor\\b': 'coordinador',
        '\\bcoord\\b': 'coordinador',
        '\\bmat\\b': 'materias',
        '\\bcurs\\b': 'cursado',
        
        // Errores frecuentes de tipeo (Fuzzy / Typos)
        '\\brequsitos\\b': 'requisitos',
        '\\brequesitos\\b': 'requisitos',
        '\\brequicitos\\b': 'requisitos',
        '\\brequicito\\b': 'requisitos',
        '\\brequsito\\b': 'requisitos',
        '\\brequesito\\b': 'requisitos',
        '\\brequsit\\b': 'requisitos',
        '\\brequisi\\b': 'requisitos',
        
        '\\bincripcion\\b': 'inscripcion',
        '\\bincripciones\\b': 'inscripcion',
        '\\binscricion\\b': 'inscripcion',
        '\\binscripsion\\b': 'inscripcion',
        
        '\\bcordinador\\b': 'coordinador',
        '\\bcordinadora\\b': 'coordinador',
        '\\bcordinacion\\b': 'coordinador',
        
        '\\borario\\b': 'horario',
        '\\borarios\\b': 'horario',
        '\\bhoraro\\b': 'horario',
        
        '\\bdirecion\\b': 'direccion',
        '\\bdireciones\\b': 'direccion',
        '\\bubicasion\\b': 'ubicacion',
        
        '\\bcarera\\b': 'carrera',
        '\\bcareras\\b': 'carrera',
        
        '\\btelefno\\b': 'telefono',
        '\\bemial\\b': 'email',
        
        '\\bmatereas\\b': 'materias',
        '\\bmatiras\\b': 'materias',
        '\\bmateria\\b': 'materias'
    };
    for (const [abrevia, completa] of Object.entries(abreviaciones)) {
        t = t.replace(new RegExp(abrevia, 'gi'), completa);
    }
    
    // 8. Eliminar espacios innecesarios (dobles espacios a simples, y espacios en los extremos)
    t = t.replace(/\s+/g, ' ').trim();
    
    // ============================================
    // DICCCIONARIO DE SABIDURÍA (Lematización Extra)
    // ============================================
    const STOPWORDS_LOC = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'por', 'para', 'con', 'sin', 'quisiera', 'quiero', 'saber', 'sobre', 'que', 'como', 'cuando', 'donde', 'me', 'te', 'se', 'nos', 'lo', 'le', 'les'];
    const LEMATIZACION = {
        'abogacia': 'juridica',
        'leyes': 'juridica',
        'abogado': 'juridica',
        'precio': 'cuota',
        'precios': 'cuota',
        'mensualidad': 'cuota',
        'mensualidades': 'cuota',
        'arancel': 'cuota',
        'aranceles': 'cuota',
        'pagar': 'cuota',
        'pago': 'cuota',
        'perico': 'sede_perico',
        'san pedro': 'sede_san_pedro',
        'libertador': 'sede_libertador'
    };
    
    let palabras = t.split(/\s+/);
    let palabrasLimpias = [];
    
    for (let palabra of palabras) {
        if (!palabra || STOPWORDS_LOC.includes(palabra)) continue;
        if (LEMATIZACION[palabra]) {
            palabrasLimpias.push(LEMATIZACION[palabra]);
        } else {
            palabrasLimpias.push(palabra);
        }
    }
    
    return palabrasLimpias.join(' ').trim();
}

// ============================================================
// TÉCNICAS NLP AVANZADAS
// Tokenización, Eliminación de Stopwords, Lematización y Stemming
// ============================================================

// 1. STOPWORDS EN ESPAÑOL
// Conjunto de palabras funcionales que no aportan significado semántico directo
// a la consulta del usuario. Se filtran para mejorar la precisión del matching.
const STOPWORDS_ES = new Set([
    // Artículos
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    // Preposiciones
    'de', 'del', 'al', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre',
    'hasta', 'desde', 'hacia', 'ante', 'bajo', 'tras',
    // Pronombres personales y átonos
    'me', 'te', 'se', 'nos', 'les', 'lo', 'le', 'mi', 'tu', 'su',
    'yo', 'ella', 'ellos', 'ellas', 'nosotros', 'eso', 'esto',
    // Conjunciones
    'y', 'o', 'pero', 'ni', 'sino', 'aunque', 'porque', 'pues',
    // Verbos auxiliares y copulativos
    'es', 'son', 'fue', 'era', 'ser', 'estar', 'ha', 'han', 'hay', 'sido', 'siendo',
    // Demostrativos
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
    'aquel', 'aquella',
    // Adverbios comunes
    'muy', 'mas', 'menos', 'bien', 'mal', 'si', 'no', 'ya', 'tambien',
    'solo', 'aqui', 'ahi', 'alli', 'asi', 'entonces', 'luego', 'despues',
    'antes', 'ahora',
    // Interrogativos (sin tilde por normalización previa)
    'como', 'cuando', 'donde', 'quien', 'cual', 'cuales',
    // Cuantificadores
    'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras',
    'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'algo', 'nada', 'cada',
    // Posesivos
    'mio', 'mia', 'tuyo', 'tuya', 'suyo', 'suya', 'nuestro', 'nuestra',
    // Verbos comunes genéricos
    'puede', 'podria', 'quiero', 'necesito', 'tengo', 'puedo', 'tiene',
    'hacer', 'ir', 'poder', 'saber', 'decir', 'ver', 'dar',
    // Otras palabras funcionales
    'que', 'sus', 'cual', 'quisiera'
]);

// 2. TOKENIZACIÓN
// Separa el texto normalizado en tokens (palabras) individuales
function tokenizar(textoNormalizado) {
    return textoNormalizado
        .split(/\s+/)
        .filter(token => token.length > 0);
}

// 3. ELIMINACIÓN DE STOPWORDS
// Filtra los tokens eliminando las palabras vacías que no aportan significado
function eliminarStopwords(tokens) {
    return tokens.filter(token => !STOPWORDS_ES.has(token));
}

// 4. LEMATIZACIÓN
// Reduce cada palabra a su forma canónica (singular, masculino) mediante reglas
// morfológicas del español y un diccionario de excepciones
function lematizar(palabra) {
    if (palabra.length < 3) return palabra;

    // Diccionario de excepciones: formas irregulares o que no siguen reglas estándar
    const excepciones = {
        'materias': 'materia', 'carreras': 'carrera', 'requisitos': 'requisito',
        'horarios': 'horario', 'profesores': 'profesor', 'coordinadores': 'coordinador',
        'tecnicaturas': 'tecnicatura', 'profesorados': 'profesorado',
        'docentes': 'docente', 'asignaturas': 'asignatura', 'papeles': 'papel',
        'leyes': 'ley', 'empresas': 'empresa', 'residuos': 'residuo',
        'donantes': 'donante', 'urgencias': 'urgencia', 'ofertas': 'oferta',
        'tecnicas': 'tecnica', 'ciencias': 'ciencia', 'clinicos': 'clinico',
        'biologicos': 'biologico', 'sagradas': 'sagrada', 'especiales': 'especial',
        'empresariales': 'empresarial', 'gubernamentales': 'gubernamental',
        'estatales': 'estatal', 'acompanamientos': 'acompanamiento',
        'acompanantes': 'acompanante', 'hemocomponentes': 'hemocomponente',
        'direcciones': 'direccion', 'inscripciones': 'inscripcion'
    };

    // Paso 0: Verificar excepciones antes de aplicar reglas
    if (excepciones[palabra]) return excepciones[palabra];

    let resultado = palabra;

    // Paso 1: Remoción de plurales
    if (resultado.length > 4 && resultado.endsWith('es')) {
        // -iones → -ion (ej: inscripciones → inscripcion)
        if (resultado.endsWith('iones')) { resultado = resultado.slice(0, -2); }
        // -ores → -or (ej: coordinadores → coordinador)
        else if (resultado.endsWith('ores')) { resultado = resultado.slice(0, -2); }
        // -ades → -ad (ej: universidades → universidad)
        else if (resultado.endsWith('ades')) { resultado = resultado.slice(0, -2); }
        // -antes → -ante (ej: estudiantes → estudiante)
        else if (resultado.endsWith('antes')) { resultado = resultado.slice(0, -1); }
        // -entes → -ente (ej: docentes → docente)
        else if (resultado.endsWith('entes')) { resultado = resultado.slice(0, -1); }
        // General: -consonante+es → -consonante
        else {
            const sinEs = resultado.slice(0, -2);
            const ultimaLetra = sinEs[sinEs.length - 1];
            if ('bcdfghjklmnpqrstvwxyz'.includes(ultimaLetra)) {
                resultado = sinEs;
            }
        }
    } else if (resultado.length > 3 && resultado.endsWith('s') && !resultado.endsWith('ss')) {
        // Plural simple: -vocal+s → -vocal (ej: carreras → carrera)
        const penultima = resultado[resultado.length - 2];
        if ('aeiou'.includes(penultima)) {
            resultado = resultado.slice(0, -1);
        }
    }

    // Verificar excepciones de nuevo después de deplural (ej: tecnicas → tecnica → ya está)
    if (excepciones[resultado]) return excepciones[resultado];

    // Paso 2: Normalización de género (femenino → masculino canónico)
    if (resultado.length > 4 && resultado.endsWith('a')) {
        // -ora → -or (ej: coordinadora → coordinador)
        if (resultado.endsWith('ora') && resultado.length > 5) {
            resultado = resultado.slice(0, -1);
        }
        // -ica → -ico (ej: terapeutica → terapeutico)
        else if (resultado.endsWith('ica')) {
            resultado = resultado.slice(0, -1) + 'o';
        }
        // -iva → -ivo (ej: inclusiva → inclusivo)
        else if (resultado.endsWith('iva')) {
            resultado = resultado.slice(0, -1) + 'o';
        }
        // -ida → -ido
        else if (resultado.endsWith('ida')) {
            resultado = resultado.slice(0, -1) + 'o';
        }
    }

    return resultado;
}

// 5. STEMMING (Extracción de Raíces)
// Algoritmo ligero de stemming en español que elimina sufijos comunes
// para reducir las palabras a sus raíces semánticas
function stemizar(palabra) {
    if (palabra.length < 5) return palabra;

    // Sufijos ordenados de mayor a menor longitud (longest match first)
    const sufijos = [
        // 8+ caracteres
        'amientos', 'imientos',
        // 7 caracteres
        'amiento', 'imiento', 'aciones', 'iciones',
        // 6 caracteres
        'amente',
        // 5 caracteres
        'acion', 'icion', 'mente', 'iendo', 'istas',
        // 4 caracteres
        'ando', 'endo', 'ador', 'cion', 'sion', 'idad',
        'ismo', 'ista', 'ante', 'ente', 'ible', 'able',
        'ario', 'aria',
        // 3 caracteres
        'oso', 'osa', 'ivo', 'iva', 'ado', 'ido',
        // 2 caracteres (infinitivos verbales)
        'ar', 'er', 'ir'
    ];

    for (const sufijo of sufijos) {
        if (palabra.endsWith(sufijo) && (palabra.length - sufijo.length) >= 3) {
            return palabra.slice(0, -sufijo.length);
        }
    }

    return palabra;
}

// 6. PIPELINE NLP COMPLETO
// Encadena todas las técnicas: normalizar → tokenizar → eliminar stopwords → lematizar
// Retorna tokens procesados y stems para matching en múltiples niveles
function procesarTextoNLP(texto) {
    const textoNormalizado = normalizar(texto);
    const tokens = tokenizar(textoNormalizado);
    const tokensSinStopwords = eliminarStopwords(tokens);
    const tokensLematizados = tokensSinStopwords.map(t => lematizar(t));
    const tokensStemizados = tokensLematizados.map(t => stemizar(t));

    return {
        textoNormalizado,
        tokens,
        tokensSinStopwords,
        tokensLematizados,
        tokensStemizados
    };
}

// ============================================================
// FIN DE TÉCNICAS NLP AVANZADAS
// ============================================================

// Helper para evitar falsos positivos de palabras cortas (ej. "ia" haciendo match con "ciencia")
function contieneKeyword(textoNormalizado, palabrasTexto, keyword) {
    const kwNorm = normalizar(keyword);
    if (kwNorm.includes(' ')) {
        return textoNormalizado.includes(kwNorm);
    }
    // Si es una sola palabra y corta (4 letras o menos), buscar coincidencia de palabra exacta
    if (kwNorm.length <= 4) {
        return palabrasTexto.includes(kwNorm);
    }
    return textoNormalizado.includes(kwNorm);
}

// Clasificación de tono
function detectarTono(texto) {
    const textoNormalizado = normalizar(texto);
    const palabrasTexto = textoNormalizado.split(/\W+/);
    
    // Tono molesto / enojado
    const palabrasMolesto = ['nadie responde', 'hace rato', 'tardan', 'pesimo', 'malisimo', 'urgente'];
    const contienePalabraMolesto = palabrasMolesto.some(p => contieneKeyword(textoNormalizado, palabrasTexto, p));
    
    // Verificar si está en mayúsculas sostenidas (mínimo 6 letras del alfabeto, todo en mayúsculas)
    const letras = texto.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    const esMayusculasSostenidas = letras.length >= 6 && letras === letras.toUpperCase();

    if (contienePalabraMolesto || esMayusculasSostenidas) {
        return 'molesto';
    }

    // Tono formal
    const palabrasFormal = ['usted', 'quisiera', 'buenas tardes', 'por favor', 'estimados', 'solicito', 'atentamente', 'ustedes'];
    const contienePalabraFormal = palabrasFormal.some(p => contieneKeyword(textoNormalizado, palabrasTexto, p));
    if (contienePalabraFormal) {
        return 'formal';
    }

    // Tono informal (por defecto o si tiene palabras clave informales)
    return 'informal';
}

// Detección de carrera inteligente y prioritaria para evitar la frustración del usuario
function detectarCarrera(texto) {
    const textoNormalizado = normalizar(texto);
    const tokensBase = textoNormalizado.split(/\W+/);
    // NLP: Enriquecer tokens con formas lematizadas para mayor cobertura semántica
    // Ej: "coordinadoras" → lematiza a "coordinador", "terapeuticas" → "terapeutico"
    const tokensLematizados = tokensBase.map(t => lematizar(t));
    const palabrasTexto = [...new Set([...tokensBase, ...tokensLematizados])];

    // 1. Ciencia Política (se evalúa primero para diferenciar de "ciencia" a secas)
    if (textoNormalizado.includes('ciencia politica') || 
        textoNormalizado.includes('ciencias politicas') ||
        palabrasTexto.includes('politica') || 
        palabrasTexto.includes('politico') || 
        textoNormalizado.includes('profesorado de politica')) {
        return 'ciencia_politica';
    }

    // 2. Educación Especial
    if (textoNormalizado.includes('intelectual') || palabrasTexto.includes('retraso')) {
        return 'carrera_especial_intelectual';
    }
    if (textoNormalizado.includes('sordo') || textoNormalizado.includes('hipoacusico') || textoNormalizado.includes('seña') || textoNormalizado.includes('auditiva')) {
        return 'carrera_especial_sordos';
    }
    if (textoNormalizado.includes('educacion especial') || 
        palabrasTexto.includes('discapacidad') || 
        palabrasTexto.includes('inclusiva') || 
        palabrasTexto.includes('inclusion') || 
        palabrasTexto.includes('especial') || 
        palabrasTexto.includes('especiales')) {
        return 'carrera_educacion_especial';
    }

    // 3. Ciencias Sagradas
    if (textoNormalizado.includes('ciencias sagradas') || 
        palabrasTexto.includes('sagradas') || 
        palabrasTexto.includes('sagrada') || 
        palabrasTexto.includes('teologia') || 
        palabrasTexto.includes('religion') || 
        palabrasTexto.includes('pastoral') || 
        palabrasTexto.includes('doctrina')) {
        return 'ciencias_sagradas';
    }

    // 4. Gestión Ambiental (evaluado antes de "gestion" para capturar "gestion ambiental")
    if (textoNormalizado.includes('gestion ambiental') || 
        textoNormalizado.includes('medio ambiente') || 
        textoNormalizado.includes('mabiente') || 
        palabrasTexto.includes('ambiental') || 
        palabrasTexto.includes('ambiente') || 
        palabrasTexto.includes('mabiente') || 
        palabrasTexto.includes('residuos') || 
        palabrasTexto.includes('ecologia') || 
        palabrasTexto.includes('sustentable')) {
        return 'gestion_ambiental';
    }

    // 11. Administración Pública
    if (textoNormalizado.includes('administracion publica') || 
        textoNormalizado.includes('gestion estatal') || 
        textoNormalizado.includes('politicas publicas') || 
        textoNormalizado.includes('contabilidad publica') || 
        textoNormalizado.includes('gubernamental') || 
        textoNormalizado.includes('gubernamentales') || 
        palabrasTexto.includes('estatal') || 
        palabrasTexto.includes('estatales') || 
        textoNormalizado.includes('desarrollo local') || 
        textoNormalizado.includes('sector publico')) {
        return 'administracion_publica';
    }

    // 5. Gestión Jurídica (mapea "gestion" directamente aquí si no coincidió con ambiental)
    if (textoNormalizado.includes('gestion juridica') || 
        palabrasTexto.includes('juridica') || 
        palabrasTexto.includes('juridico') || 
        palabrasTexto.includes('gestion') || 
        palabrasTexto.includes('abogacia') || 
        palabrasTexto.includes('leyes') || 
        palabrasTexto.includes('notarial') || 
        palabrasTexto.includes('judicial') ||
        palabrasTexto.includes('derecho') ||
        palabrasTexto.includes('juridicos')) {
        return 'gestion_juridica';
    }

    // 6. Ciencia de Datos e Inteligencia Artificial
    if (textoNormalizado.includes('ciencia de datos') || 
        textoNormalizado.includes('inteligencia artificial') || 
        textoNormalizado.includes('data science') || 
        textoNormalizado.includes('machine learning') || 
        palabrasTexto.includes('ia') || 
        palabrasTexto.includes('datos') || 
        palabrasTexto.includes('tecnologia') || 
        palabrasTexto.includes('programacion') || 
        palabrasTexto.includes('computacion') ||
        palabrasTexto.includes('sistemas') ||
        palabrasTexto.includes('python') ||
        palabrasTexto.includes('ciencia') ||
        palabrasTexto.includes('ciencias')) {
        return 'ciencia_datos';
    }

    // 7. Niñez, Adolescencia y Familia
    if (textoNormalizado.includes('ninez') || 
        textoNormalizado.includes('adolescencia') || 
        textoNormalizado.includes('familia') || 
        palabrasTexto.includes('ninos') || 
        palabrasTexto.includes('ninas') || 
        palabrasTexto.includes('infancia') || 
        textoNormalizado.includes('26061')) {
        return 'ninez_adolescencia_familia';
    }

    // 8. Laboratorio de Análisis Clínicos
    if (textoNormalizado.includes('laboratorio') || 
        textoNormalizado.includes('analisis clinicos') || 
        palabrasTexto.includes('sangre') || 
        palabrasTexto.includes('bioquimica') || 
        palabrasTexto.includes('biologico') || 
        palabrasTexto.includes('biologicos') || 
        palabrasTexto.includes('clinico') ||
        palabrasTexto.includes('clinicos')) {
        return 'laboratorio_analisis_clinicos';
    }

    // 9. Hemoterapia
    if (textoNormalizado.includes('hemoterapia') || 
        textoNormalizado.includes('hemo') || 
        textoNormalizado.includes('hemodonacion') || 
        textoNormalizado.includes('transfusion') || 
        palabrasTexto.includes('donante') || 
        palabrasTexto.includes('donantes') || 
        textoNormalizado.includes('banco de sangre') || 
        textoNormalizado.includes('bancos de sangre') || 
        palabrasTexto.includes('hemocomponentes')) {
        return 'hemoterapia';
    }

    // 10. Acompañamiento Terapéutico
    if (textoNormalizado.includes('acompanamiento terapeutico') || 
        textoNormalizado.includes('acompanante terapeutico') || 
        palabrasTexto.includes('terapeutico') || 
        palabrasTexto.includes('terapeutica') || 
        palabrasTexto.includes('acompanante') || 
        palabrasTexto.includes('acompanantes') || 
        palabrasTexto.includes('acompanamiento') || 
        palabrasTexto.includes('acompanamientos') || 
        textoNormalizado.includes('psicofisica') ||
        textoNormalizado.includes('psiquiatrica') ||
        textoNormalizado.includes('psicologica') ||
        textoNormalizado.includes('salud mental') ||
        palabrasTexto.includes('urgencias') ||
        palabrasTexto.includes('contencion')) {
        return 'acompanamiento_terapeutico';
    }


    // 12. Administración de Empresas
    if (textoNormalizado.includes('administracion de empresas') || 
        textoNormalizado.includes('administracion') || 
        palabrasTexto.includes('administrar') || 
        palabrasTexto.includes('empresariales') || 
        palabrasTexto.includes('empresarial') || 
        palabrasTexto.includes('pyme') || 
        palabrasTexto.includes('pymes') || 
        textoNormalizado.includes('recursos humanos') || 
        textoNormalizado.includes('capital humano') ||
        textoNormalizado.includes('relaciones institucionales') ||
        palabrasTexto.includes('contabilidad') ||
        palabrasTexto.includes('marketing') ||
        palabrasTexto.includes('microeconomia') ||
        palabrasTexto.includes('macroeconomia')) {
        return 'administracion_empresas';
    }


    if (textoNormalizado.includes('mecatronica') || textoNormalizado.includes('mecanotronica')) return 'carrera_mecatronica';
    if (textoNormalizado.includes('software') || textoNormalizado.includes('programacion') || textoNormalizado.includes('sistemas')) return 'carrera_software';
    if (textoNormalizado.includes('automatizacion') || textoNormalizado.includes('robot')) return 'carrera_automatizacion';
    if (textoNormalizado.includes('lengua') || textoNormalizado.includes('literatura')) return 'carrera_lengua';
    if (textoNormalizado.includes('historia')) return 'carrera_historia';
    if (textoNormalizado.includes('psicologia')) return 'carrera_psicologia';

    return null;
}

const PALABRAS_CLAVE = {
    saludo: ['hola', 'buenas', 'dia', 'tarde', 'noche', 'que tal', 'como va', 'hello', 'que haces', 'que contas amigo', 'que contas', 'ola'],
    valor_cuota_2027: ['cuota 2027', 'arancel 2027', 'precio 2027', 'costo 2027', 'año que viene', 'proximo año', 'cuotas 2027'],
    valor_cuota: ['cuota', 'cuanto se paga', 'precio cuota', 'valor cuota', 'vencimiento cuota', 'arancel', 'mensualidad', 'cuanto cuesta la cuota', 'recargo', 'mora'],
    valor_inscripcion: ['valor inscripcion', 'precio inscripcion', 'cuanto cuesta la inscripcion', 'costo inscripcion', 'precio matricula', 'costo matricula', 'pagar inscripcion'],
    tramites_tesoreria: ['constancia', 'autenticacion', 'libreta', 'analitico', 'documentacion junta', 'duplicado titulo', 'biblioteca', 'tramite', 'precios tesoreria', 'aranceles tesoreria', 'tramites tesoreria'],
    horario_tesoreria: ['horario tesoreria', 'horarios tesoreria', 'horario de tesoreria', 'horarios de tesoreria', 'tesoreria'],
    distribucion_aulas: ['aula', 'aulas', 'espacios', 'donde curso', 'que aula', 'turno mañana', 'turno tarde', 'turno noche', 'donde nos toca'],
    requisitos_duplicado: ['requisitos duplicado', 'otro ejemplar', 'extravio titulo', 'perdi el titulo', 'duplicado de titulo', 'perdi mi titulo', 'deterioro titulo'],
    carreras: ['carrera', 'carreras', 'oferta academica', 'estudiar', 'que tienen', 'que puedo cursar', 'que se dicta', 'dictan', 'oferta', 'ofertas', 'oferta educativa', 'me decis que carrera hay'],
    tecnicaturas: ['tecnicatura', 'tecnicaturas', 'tecnica', 'tecnicas', 'carreras tecnicas', 'carrera tecnica'],
    profesorados: ['profesorado', 'profesorados', 'profesor', 'profesores', 'docente', 'docentes', 'carreras docentes'],
    descripcion_carrera: ['de que trata', 'descripcion', 'que hace', 'para que sirve', 'perfil', 'que aprendo'],
    plan_estudios_completo: ['materias', 'plan de estudio', 'asignaturas', 'materias de primero', 'que curso', 'materias de segundo', 'materias de tercero', 'primer año', 'segundo año', 'tercer año', 'cuarto año', 'plan de estudios'],
    campo_laboral: ['salida laboral', 'donde trabajar', 'trabajo', 'empleo', 'mercado laboral', 'de que puedo trabajar', 'empresas', 'litio', 'campo laboral', 'campo profesional', 'trabaja', 'salida'],
    coordinador: ['coordinador', 'coordinadora', 'coordinadores', 'silvia', 'cichello', 'jimena', 'cabrera', 'susana', 'villa', 'valverde', 'mariela', 'garcia', 'canil', 'galarza', 'santillan', 'aranibar', 'romano', 'pablo', 'vilte', 'consulta', 'horarios de consulta', 'horario de consulta', 'contacto del coordinador'],
    horario_atencion: ['horario', 'a que hora', 'atienden', 'abren', 'cierran', 'atencion', 'hasta que hora', 'cuando ir', 'horarios', 'turno', 'cursado', 'se cursa', 'cursa'],
    ubicacion: ['ubicacion', 'donde queda', 'direccion', 'donde estan', 'como llego', 'mapa', 'san salvador', 'sarmiento', 'sarmiento 268'],
    contacto: ['contacto', 'telefono', 'mail', 'correo', 'llamar', 'email', 'comunicarme', 'comunicar', 'numero', 'tel', 'fijo', 'llamada'],
    requisitos_inscripcion: ['inscribirme', 'anotarme', 'requisitos', 'papeles', 'que necesito', 'titulo secundario', 'inscripcion', 'matricula', 'fecha de inscripcion', 'fechas de inscripcion', 'cuando me inscribo', 'periodo de inscripcion', 'cuando son las inscripciones'],
    sede_perico: ['sede_perico', 'perico', 'anexo perico'],
    sede_san_pedro: ['sede_san_pedro', 'san pedro', 'san pedrito'],
    sede_libertador: ['sede_libertador', 'libertador', 'ledesma', 'ledezma', 'gral san martin', 'general san martin'],
    sede_central: ['sede_central', 'sede central', 'sede jujuy', 'sede san salvador', 'sede capital', 'san salvador de jujuy', 'capital'],
    informacion_sedes: ['anexo', 'anexos', 'sucursales', 'sucursal', 'otras sedes', 'sedes y anexos', 'que sedes y anexos', 'informacion de sedes', 'sede', 'sedes'],
    carrera_mecatronica: ['carrera_mecatronica', 'mecanotronica'],
    carrera_software: ['carrera_software'],
    carrera_automatizacion: ['carrera_automatizacion'],
    carrera_lengua: ['carrera_lengua'],
    carrera_historia: ['carrera_historia'],
    carrera_psicologia: ['carrera_psicologia'],
    ayuda: ['ayuda', 'manual', 'guia', 'que hacer', 'que preguntar', 'ejemplos', 'opciones', 'que me podes decir', 'que podes hacer', 'que sabes'],
    agradecimiento: ['gracias', 'muchas gracias', 'genial', 'me sirvio', 'impecable', 'chau', 'adios', 'hasta luego', 'hasta pronto', 'nos vemos', 'gracias por la informacion', 'muy amable', 'ahi te ves', 'ahi te vez', 'gracias che', 'que tengas buen viaje', 'perfecto adios', 'chauchi'],
    experto_bot: ['sos un bot experto', 'sos experto', 'bot experto', 'experto en que', 'de que sos experto', 'para que servis', 'cual es tu funcion', 'sos un bot inteligente', 'que tipo de bot sos', 'como bot que haces', 'como bot que informacion brindas', 'como bot que informacion das', 'como bot que informacion provees', 'como bot que informacion entregas', 'como bot que informacion das', 'bot'],
    idiomas_soporte: ['puedes contestar en', 'contestar en ingles', 'contestar en portugues', 'contestar en italiano', 'contestar en chino', 'contestar en frances', 'hablas ingles', 'hablas portugues', 'hablas italiano', 'hablas chino', 'hablas frances', 'idioma ingles', 'idioma portugues', 'idioma italiano', 'idioma chino', 'idioma frances', 'en ingles', 'en portugues', 'en italiano', 'en frances', 'en chino', 'hablar ingles', 'hablar portugues', 'hablar italiano', 'hablar frances', 'hablar chino']
};

// ============================================================
// PREPROCESAMIENTO NLP DINÁMICO DE PALABRAS CLAVE (al cargar el módulo)
// Se aplica el mismo pipeline NLP a las keywords del diccionario para
// garantizar que tanto la entrada del usuario como las palabras clave
// estén reducidas a sus mismas formas canónicas (lemmas/stems).
// ============================================================
const PALABRAS_CLAVE_PROCESADAS = {};
for (const [intencion, keywords] of Object.entries(PALABRAS_CLAVE)) {
    PALABRAS_CLAVE_PROCESADAS[intencion] = keywords.map(kw => {
        const kwNorm = normalizar(kw);
        const esMultiPalabra = kwNorm.includes(' ');
        const tokens = tokenizar(kwNorm);
        const lemmas = tokens.map(t => lematizar(t));
        const stems = lemmas.map(t => stemizar(t));
        return { original: kwNorm, esMultiPalabra, lemmas, stems };
    });
}

// Respuestas generales (no dependen de una carrera específica)
const RESPUESTAS_GENERALES = {
    valor_cuota_2027: {
        formal: [
            "Le informamos que los valores arancelarios correspondientes al Ciclo Lectivo 2027 aún no se encuentran disponibles. Le sugerimos consultar nuevamente a partir de fines de diciembre del corriente año para obtener la información oficial y actualizada."
        ],
        informal: [
            "Te cuento que los valores de las cuotas para el 2027 todavía no están definidos. Porfa, volvé a consultarnos a fines de diciembre que ya vamos a tener la info actualizada."
        ],
        molesto: [
            "Lamentamos no poder brindarle esa información ahora. Los aranceles para 2027 no están disponibles en este momento. Le pedimos por favor consultar a fin de diciembre."
        ]
    },
    valor_cuota: {
        formal: [
            "Tesorería Informa - Valores de Cuota 2026:\nEl valor de la cuota mensual para todas las carreras es de 55.000. pesos-, a excepción de las Carreras Especiales (Laboratorio clínico, hemoterapia, acompañamiento terapéutico y ciencia de datos) cuyo valor es de 60.000. pesos-\n\nVencimientos: Las cuotas de todas las carreras vencen el último día de cada mes. Transcurrido ese plazo, se aplicará un recargo por cada mes de mora.\n\nAtención tesorería: lunes a viernes, horario de 8:00 a 12:00 y 15:30 a 20:00."
        ],
        informal: [
            "Para el año 2026, el valor de la cuota para casi todas las carreras es de 55.000 pesos (las Carreras Especiales están en 60.000 pesos; las carreras especiales son: Laboratorio clínico, hemoterapia, acompañamiento terapéutico y ciencia de datos).\nAcordate que las cuotas vencen el último día de cada mes; si te pasás de esa fecha, se cobra un recargo por cada mes de atraso.\n\nAtención tesorería: lunes a viernes, horario de 8:00 a 12:00 y 15:30 a 20:00."
        ],
        molesto: [
            "Le informamos los valores vigentes para 2026: la cuota es de 55.000 pesos para todas las carreras y 60.000 pesos para las especiales (Laboratorio clínico, hemoterapia, acompañamiento terapéutico y ciencia de datos). Vencen el último día de cada mes, sin excepción, y el atraso genera recargos.\n\nAtención tesorería: lunes a viernes, horario de 8:00 a 12:00 y 15:30 a 20:00."
        ]
    },
    experto_bot: {
        formal: [
            "Efectivamente, soy un asistente virtual programado con información exclusiva del Instituto Populorum Progressio IES N° 7. Las preguntas o consultas que se encuentren fuera de este contexto institucional deberán ser canalizadas a través de otros medios de comunicación digital."
        ],
        informal: [
            "Soy un bot entrenado únicamente con información exclusiva del Instituto Populorum Progressio IES N° 7. Si tenés preguntas sobre otros temas fuera de la institución, vas a tener que buscarlas en otros medios digitales."
        ],
        molesto: [
            "Le confirmo que mi base de conocimientos se limita con exclusividad al Instituto Populorum Progressio IES N° 7. Las preguntas ajenas a esta institución no serán respondidas y deberá buscarlas por otros medios."
        ]
    },
    idiomas_soporte: {
        formal: [
            "Solo puedo contestar y reconocer preguntas en español, gracias por la consulta lo vamos a tener en cuenta para futuras mejoras."
        ],
        informal: [
            "Solo puedo contestar y reconocer preguntas en español, gracias por la consulta lo vamos a tener en cuenta para futuras mejoras."
        ],
        molesto: [
            "Solo puedo contestar y reconocer preguntas en español, gracias por la consulta lo vamos a tener en cuenta para futuras mejoras."
        ]
    },
    valor_inscripcion: {
        formal: [
            "Tesorería Informa: El valor de inscripción para el Ciclo Lectivo 2026 es de 60.000. pesos-"
        ],
        informal: [
            "Te comento que el valor de la inscripción para el ciclo 2026 está fijado en 60.000. pesos"
        ],
        molesto: [
            "Le informamos que el arancel de inscripción correspondiente al ciclo 2026 es de 60.000. pesos"
        ]
    },
    tramites_tesoreria: {
        formal: [
            "Tesorería informa los aranceles vigentes para el Ciclo Lectivo 2026:<br><ul><li>Constancia de Alumno Regular y Autenticaciones: 3.800 pesos</li><li>Libretas: 11.000 pesos</li><li>Analítico: 7.500 pesos</li><li>Documentación p/ Junta: 12.500 pesos</li><li>Duplicado de Título: 27.000 pesos</li><li>Biblioteca: 8.000 pesos</li></ul>"
        ],
        informal: [
            "Te paso los precios de tesorería para el 2026:<br><ul><li>Constancia de Alumno Regular y Autenticaciones: 3.800 pesos</li><li>Libretas: 11.000 pesos</li><li>Analítico: 7.500 pesos</li><li>Documentación p/ Junta: 12.500 pesos</li><li>Duplicado de Título: 27.000 pesos</li><li>Biblioteca: 8.000 pesos</li></ul>"
        ],
        molesto: [
            "Le recordamos los costos de trámites por tesorería para 2026:<br><ul><li>Constancia de Alumno Regular y Autenticaciones: 3.800 pesos</li><li>Libretas: 11.000 pesos</li><li>Analítico: 7.500 pesos</li><li>Documentación p/ Junta: 12.500 pesos</li><li>Duplicado de Título: 27.000 pesos</li><li>Biblioteca: 8.000 pesos</li></ul>"
        ]
    },
    horario_tesoreria: {
        formal: [
            "Tesorería Informa: El horario de atención es de lunes a viernes, de 8:00 a 12:00 y de 15:30 a 20:00."
        ],
        informal: [
            "El horario de tesorería es de lunes a viernes, de 8:00 a 12:00 y de 15:30 a 20:00."
        ],
        molesto: [
            "Le informamos que el horario de atención de tesorería es de lunes a viernes, de 8:00 a 12:00 y de 15:30 a 20:00."
        ]
    },
    
    requisitos_duplicado: {
        formal: [
            "Requisitos para tramitar otros ejemplares de títulos (duplicados):<br><ul><li>Fotocopia Título Secundario autenticado por el Dpto. Títulos del Min. de Educación.</li><li>Fotocopia del DNI actualizado.</li><li>Certificado o Partida de Nacimiento actualizado.</li><li>Título Terciario emitido por esta institución (si el motivo es desgaste o errores).</li><li>Constancia Policial (en caso de extravío).</li><li>Recibo de pago en Tesorería.</li><li>Nota dirigida a la rectora solicitando el duplicado y adjuntando la documentación precedente.</li></ul>"
        ],
        informal: [
            "Para pedir un duplicado de tu título necesitás traer:<br><ul><li>Fotocopia del Título Secundario autenticado.</li><li>Fotocopia del DNI actualizado.</li><li>Partida de Nacimiento actualizada.</li><li>El Título Terciario viejo (si es por desgaste o error).</li><li>Constancia policial (si lo perdiste).</li><li>El recibo de pago del trámite en Tesorería.</li><li>Una notita dirigida a la Rectora pidiendo el duplicado y adjuntando todo esto.</li></ul>"
        ],
        molesto: [
            "Le informamos los requisitos obligatorios para tramitar duplicado de título:<br><ul><li>Fotocopia Título Secundario autenticada</li><li>Fotocopia DNI actualizado</li><li>Partida de nacimiento actualizada</li><li>Título original si está deteriorado</li><li>Constancia policial por extravío</li><li>Recibo de pago en tesorería</li><li>Nota formal a la rectora</li></ul>"
        ]
    },
        informacion_sedes: {
        formal: ["El IES N° 7 'Populorum Progressio' - INTELA cuenta con su Sede Central en San Salvador de Jujuy (Sarmiento 268) y además dicta carreras en las siguientes sedes anexas:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede Perico\">Sede Perico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede San Pedro\">Sede San Pedro</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede Libertador\">Sede Libertador</button></div>"],
        informal: ["Además de la Sede Central en San Salvador de Jujuy, contamos con anexos en otras localidades. Elegí la sede que te interese para ver qué carreras se dictan ahí:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede Perico\">Sede Perico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede San Pedro\">Sede San Pedro</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede Libertador\">Sede Libertador</button></div>"],
        molesto: ["Contamos con la Sede Central y las siguientes sedes anexas en el interior de la provincia:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede Perico\">Sede Perico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede San Pedro\">Sede San Pedro</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Sede Libertador\">Sede Libertador</button></div>"]
    },
    
sede_perico: {
        formal: ["La Sede Perico ofrece las siguientes opciones académicas:<br><br>📍 <b>Dirección:</b> Av. Malvinas Argentinas N° 199<br>📞 <b>Teléfono:</b> 4911909<br>✉️ <b>Mail:</b> popuperico@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Lengua y Literatura\">Prof. Lengua y Lit.</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas (PyME)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Mecatrónica\">Mecatrónica</button></div>"],
        informal: ["¡En la Sede Perico tenemos estas carreras disponibles! Elegí la que más te guste:<br><br>📍 <b>Dirección:</b> Av. Malvinas Argentinas N° 199<br>📞 <b>Teléfono:</b> 4911909<br>✉️ <b>Mail:</b> popuperico@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Lengua y Literatura\">Prof. Lengua y Lit.</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas (PyME)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Mecatrónica\">Mecatrónica</button></div>"],
        molesto: ["La Sede Perico cuenta con las siguientes opciones:<br><br>📍 <b>Dirección:</b> Av. Malvinas Argentinas N° 199<br>📞 <b>Teléfono:</b> 4911909<br>✉️ <b>Mail:</b> popuperico@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Lengua y Literatura\">Prof. Lengua y Lit.</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas (PyME)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Mecatrónica\">Mecatrónica</button></div>"]
    },
    sede_san_pedro: {
        formal: ["La Sede San Pedro dispone de la siguiente oferta académica:<br><br>📍 <b>Dirección:</b> Mitre N° 257<br>📞 <b>Teléfono:</b> 03888-422744<br>✉️ <b>Mail:</b> ies7sanpedro@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado de Educación Especial\">Prof. Especial (Sordos/Hipo)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Historia\">Prof. Historia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Desarrollo de Software\">Des. Software</button></div>"],
        informal: ["¡Mirá las carreras que podés cursar en la Sede San Pedro!:<br><br>📍 <b>Dirección:</b> Mitre N° 257<br>📞 <b>Teléfono:</b> 03888-422744<br>✉️ <b>Mail:</b> ies7sanpedro@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado de Educación Especial\">Prof. Especial (Sordos/Hipo)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Historia\">Prof. Historia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Desarrollo de Software\">Des. Software</button></div>"],
        molesto: ["Las opciones para Sede San Pedro son:<br><br>📍 <b>Dirección:</b> Mitre N° 257<br>📞 <b>Teléfono:</b> 03888-422744<br>✉️ <b>Mail:</b> ies7sanpedro@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado de Educación Especial\">Prof. Especial (Sordos/Hipo)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Historia\">Prof. Historia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Desarrollo de Software\">Des. Software</button></div>"]
    },
    sede_libertador: {
        formal: ["En la Sede Libertador, la institución dicta las siguientes carreras:<br><br>📍 <b>Dirección:</b> Colegio FASTA Secundario (sobre Ruta 34) de 18:30 a 22:00 Hs. de lunes a viernes.<br>🚨 <b>Próximamente en NUEVA SEDE:</b> Jacarandá S/N<br>📞 <b>Teléfono:</b> No disponible<br>✉️ <b>Mail:</b> populibertador@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Psicología\">Prof. Psicología</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Automatización y Robótica\">Aut. y Robótica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button></div>"],
        informal: ["¡Te muestro las opciones de la Sede Libertador! Hacé clic en la que te interese:<br><br>📍 <b>Dirección:</b> Colegio FASTA Secundario (sobre Ruta 34) de 18:30 a 22:00 Hs. de lunes a viernes.<br>🚨 <b>Próximamente en NUEVA SEDE:</b> Jacarandá S/N<br>📞 <b>Teléfono:</b> No disponible<br>✉️ <b>Mail:</b> populibertador@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Psicología\">Prof. Psicología</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Automatización y Robótica\">Aut. y Robótica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button></div>"],
        molesto: ["La oferta de la Sede Libertador comprende las siguientes carreras:<br><br>📍 <b>Dirección:</b> Colegio FASTA Secundario (sobre Ruta 34) de 18:30 a 22:00 Hs. de lunes a viernes.<br>🚨 <b>Próximamente en NUEVA SEDE:</b> Jacarandá S/N<br>📞 <b>Teléfono:</b> No disponible<br>✉️ <b>Mail:</b> populibertador@gmail.com<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Psicología\">Prof. Psicología</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Automatización y Robótica\">Aut. y Robótica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button></div>"]
    },
    sede_central: {
        formal: ["La Sede Central (San Salvador de Jujuy) ofrece todas las Tecnicaturas Superiores y Profesorados detallados en nuestra oferta general.<br><br>📍 <b>Dirección:</b> Sarmiento 268, San Salvador de Jujuy<br>📞 <b>Teléfono:</b> (0388) 4224514<br>✉️ <b>Mail:</b> campus@populorumjujuy.ar<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Oferta académica\">Ver Oferta Académica</button></div>"],
        informal: ["¡En la Sede Central (San Salvador de Jujuy) tenemos la oferta completa de Tecnicaturas y Profesorados!:<br><br>📍 <b>Dirección:</b> Sarmiento 268, San Salvador de Jujuy<br>📞 <b>Teléfono:</b> (0388) 4224514<br>✉️ <b>Mail:</b> campus@populorumjujuy.ar<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Oferta académica\">Ver Oferta Académica</button></div>"],
        molesto: ["Las opciones para Sede Central son todas las Tecnicaturas y Profesorados detallados en la oferta general:<br><br>📍 <b>Dirección:</b> Sarmiento 268, San Salvador de Jujuy<br>📞 <b>Teléfono:</b> (0388) 4224514<br>✉️ <b>Mail:</b> campus@populorumjujuy.ar<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Oferta académica\">Ver Oferta Académica</button></div>"]
    },
    ayuda: {
        formal: ["Soy PopuBot y estoy capacitado para ayudarte con los siguientes temas. Podés hacerme preguntas sobre:<br><br><ul><li>🎓 <b>Carreras:</b> <i>'¿Qué carreras tienen?'</i></li><li>🏫 <b>Sedes:</b> <i>'Dónde queda la sede San Pedro'</i></li><li>🕒 <b>Horarios:</b> <i>'A qué hora atiende tesorería'</i></li><li>📝 <b>Inscripciones:</b> <i>'Requisitos de ingreso'</i></li></ul><br>Elegí una opción o escribime tu consulta de forma directa:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Oferta académica\">Ver Carreras</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de sedes\">Ver Sedes</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Requisitos de inscripción\">Ver Requisitos</button></div>"],
        informal: ["¡Te dejo una guía rápida! Estoy capacitado para ayudarte con los siguientes temas. Podés preguntarme sobre:<br><br><ul><li>🎓 <b>Carreras:</b> <i>'¿Qué carreras tienen?'</i></li><li>🏫 <b>Sedes:</b> <i>'Dónde queda la sede San Pedro'</i></li><li>🕒 <b>Horarios:</b> <i>'A qué hora atiende tesorería'</i></li><li>📝 <b>Inscripciones:</b> <i>'Requisitos de ingreso'</i></li></ul><br>Elegí una opción o escribime tu consulta:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Oferta académica\">Ver Carreras</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de sedes\">Ver Sedes</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Requisitos de inscripción\">Ver Requisitos</button></div>"],
        molesto: ["Aquí tiene la guía de uso. Estoy capacitado para asistirle con los siguientes temas:<br><br><ul><li>🎓 <b>Carreras:</b> <i>'¿Qué carreras tienen?'</i></li><li>🏫 <b>Sedes:</b> <i>'Dónde queda la sede San Pedro'</i></li><li>🕒 <b>Horarios:</b> <i>'A qué hora atiende tesorería'</i></li><li>📝 <b>Inscripciones:</b> <i>'Requisitos de ingreso'</i></li></ul><br>Seleccione una opción:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Oferta académica\">Ver Carreras</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de sedes\">Ver Sedes</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Requisitos de inscripción\">Ver Requisitos</button></div>"]
    },
    carreras: {
        formal: [
            "La oferta académica del IES N° 7 'Populorum Progressio' - INTELA consta de las siguientes carreras presenciales:<br><br><b>Tecnicaturas Superiores Sede Central:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div><br><b>Profesorados Sede Central:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div><br><b>Sede Perico:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Lengua y Literatura\">Prof. Lengua y Lit.</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Mecatrónica\">Mecatrónica</button></div><br><b>Sede San Pedro:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado de Educación Especial\">Prof. Especial (Sordos/Hipo)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Historia\">Prof. Historia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Desarrollo de Software\">Des. Software</button></div><br><b>Sede Libertador:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Psicología\">Prof. Psicología</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Automatización y Robótica\">Aut. y Robótica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button></div>"
        ],
        informal: [
            "¡Te cuento la oferta completa de carreras que podés cursar en el IES N° 7!<br><br><b>Tecnicaturas Superiores Sede Central:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div><br><b>Profesorados Sede Central:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div><br><b>Sede Perico:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Lengua y Literatura\">Prof. Lengua y Lit.</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Mecatrónica\">Mecatrónica</button></div><br><b>Sede San Pedro:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado de Educación Especial\">Prof. Especial (Sordos/Hipo)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Historia\">Prof. Historia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Desarrollo de Software\">Des. Software</button></div><br><b>Sede Libertador:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Psicología\">Prof. Psicología</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Automatización y Robótica\">Aut. y Robótica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button></div>"
        ],
        molesto: [
            "A continuación le detallamos la totalidad de las carreras dictadas en la institución:<br><br><b>Tecnicaturas Sede Central:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div><br><b>Profesorados Sede Central:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div><br><b>Sede Perico:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Lengua y Literatura\">Prof. Lengua y Lit.</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Mecatrónica\">Mecatrónica</button></div><br><b>Sede San Pedro:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado de Educación Especial\">Prof. Especial (Sordos/Hipo)</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Historia\">Prof. Historia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Desarrollo de Software\">Des. Software</button></div><br><b>Sede Libertador:</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Profesorado en Psicología\">Prof. Psicología</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Automatización y Robótica\">Aut. y Robótica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button></div>"
        ]
    },
    tecnicaturas: {
        formal: [
            "El IES N° 7 'Populorum Progressio' - INTELA ofrece las siguientes tecnicaturas superiores (duración de 3 años, modalidad presencial, Turno Mañana). ¿Desea obtener información sobre alguna de ellas?<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div>"
        ],
        informal: [
            "¡Te cuento las tecnicaturas que tenemos! Todas duran 3 años y se cursan a la mañana de forma presencial. ¿Cuál te interesa más?<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div>"
        ],
        molesto: [
            "Las tecnicaturas de 3 años que dictamos son las siguientes. Quedamos a su disposición para detallarle cualquiera de ellas:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div>"
        ]
    },
    profesorados: {
        formal: [
            "El IES N° 7 'Populorum Progressio' - INTELA ofrece los siguientes profesorados (duración de 4 años, modalidad presencial, Turno Mañana). ¿Desea consultar el plan de estudios o descripción de alguno de ellos?<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div>"
        ],
        informal: [
            "¡Te paso los profesorados que podés cursar! Duran 4 años y se dictan por la mañana de forma presencial. ¿De cuál te gustaría que charlemos?<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div>"
        ],
        molesto: [
            "Los profesorados de 4 años disponibles son los siguientes. Le brindamos detalles de inmediato sobre el que elija:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div>"
        ]
    },
    saludo: {
        formal: [
            "Buenas tardes. ¿En qué puedo colaborar con usted hoy respecto a las carreras del IES N° 7 'Populorum Progressio' - INTELA?",
            "Saludos cordiales del IES 7. ¿Cuál es su consulta sobre nuestra oferta académica?",
            "Le damos la bienvenida al asistente virtual del IES N° 7. Por favor, indíquenos en qué podemos colaborar con usted hoy."
        ],
        informal: [
            "¡Hola! ¿Cómo va? Decime en qué te puedo ayudar con las carreras del IES N° 7.",
            "¡Buenas! Contame qué estás buscando sobre nuestra oferta de carreras.",
            "¡Qué tal! Bienvenido al Popu Chat. Consultame lo que quieras saber sobre las carreras del IES 7."
        ],
        molesto: [
            "Lamentamos sinceramente la demora y los inconvenientes. Estoy aquí para atenderle de inmediato, ¿cómo puedo ayudarle con sus dudas?",
            "Pedimos disculpas por los inconvenientes ocasionados en la comunicación. Le asistimos de inmediato con su consulta sobre las carreras.",
            "Pedimos sinceras disculpas por las dificultades en la comunicación. Estamos a su entera disposición para responder sus dudas de inmediato."
        ]
    },
    horario_atencion: {
        formal: [
            "El turno de cursado de las carreras y el horario administrativo de atención en el IES 7 se desarrolla de lunes a viernes, durante el Turno Mañana de 08:00 a 12:30 horas.",
            "Le informamos que las actividades académicas y administrativas generales se realizan de lunes a viernes en el Turno Mañana, de 08:00 a 12:30 horas.",
            "Le recordamos que el turno de cursado de las carreras y el horario administrativo de atención en el IES 7 se desarrolla de lunes a viernes, durante el Turno Mañana de 08:00 a 12:30 horas. Quedamos a su disposición para cualquier aclaración."
        ],
        informal: [
            "Se cursa de mañana, así que nos encontrás en la institución de lunes a viernes de 08:00 a 12:30.",
            "Podés hacer trámites o cursar por la mañana de lunes a viernes, de 08:00 a 12:30 horas.",
            "¡Te paso este dato! Se cursa de mañana, así que nos encontrás en la institución de lunes a viernes de 08:00 a 12:30. Escribime cualquier otra consulta que tengas."
        ],
        molesto: [
            "Lamentamos sinceramente la demora. El horario oficial y estricto de cursado y atención administrativa es de lunes a viernes de 08:00 a 12:30 horas.",
            "Pedimos disculpas por los inconvenientes. Le indicamos que el horario establecido de atención presencial y cursado es de lunes a viernes en el turno mañana, de 08:00 a 12:30.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. El horario oficial y estricto de cursado y atención administrativa es de lunes a viernes de 08:00 a 12:30 horas. Agradecemos su comprensión."
        ]
    },
    
    distribucion_aulas: {
        formal: [
            `Le presentamos la distribución general de aulas asignadas para el ciclo lectivo 2026:<br><div style='margin-top: 10px;'>
    <h4 style='color: var(--primary); margin-bottom: 5px;'>☀️ Turno Mañana</h4>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia de Datos e IA</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia Política</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 12</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>⛅ Turno Tarde</h4>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Jurídica</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Niñez y Familia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 2</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Laboratorio Clínico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 21</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Hemoterapia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Acomp. Terapéutico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>🌙 Turno Noche</h4>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 35</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencias Sagradas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Ambiental</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. Pública</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div>
    </div>
</div>`,
            `La distribución de aulas para todas las carreras se organiza de la siguiente manera:<br><div style='margin-top: 10px;'>
    <h4 style='color: var(--primary); margin-bottom: 5px;'>☀️ Turno Mañana</h4>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia de Datos e IA</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia Política</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 12</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>⛅ Turno Tarde</h4>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Jurídica</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Niñez y Familia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 2</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Laboratorio Clínico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 21</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Hemoterapia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Acomp. Terapéutico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>🌙 Turno Noche</h4>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 35</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencias Sagradas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Ambiental</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. Pública</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div>
    </div>
</div>`
        ],
        informal: [
            `¡Acá tenés la distribución de aulas para todas las carreras! Buscá tu turno:<br><div style='margin-top: 10px;'>
    <h4 style='color: var(--primary); margin-bottom: 5px;'>☀️ Turno Mañana</h4>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia de Datos e IA</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia Política</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 12</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>⛅ Turno Tarde</h4>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Jurídica</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Niñez y Familia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 2</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Laboratorio Clínico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 21</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Hemoterapia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Acomp. Terapéutico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>🌙 Turno Noche</h4>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 35</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencias Sagradas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Ambiental</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. Pública</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div>
    </div>
</div>`,
            `Te paso el listado completo de aulas para este año:<br><div style='margin-top: 10px;'>
    <h4 style='color: var(--primary); margin-bottom: 5px;'>☀️ Turno Mañana</h4>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia de Datos e IA</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia Política</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 12</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>⛅ Turno Tarde</h4>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Jurídica</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Niñez y Familia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 2</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Laboratorio Clínico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 21</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Hemoterapia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Acomp. Terapéutico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>🌙 Turno Noche</h4>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 35</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencias Sagradas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Ambiental</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. Pública</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div>
    </div>
</div>`
        ],
        molesto: [
            `A continuación detallamos la distribución de aulas para toda la institución:<br><div style='margin-top: 10px;'>
    <h4 style='color: var(--primary); margin-bottom: 5px;'>☀️ Turno Mañana</h4>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia de Datos e IA</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencia Política</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 12</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>⛅ Turno Tarde</h4>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Jurídica</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Niñez y Familia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 2</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Laboratorio Clínico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 21</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Hemoterapia</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Acomp. Terapéutico</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div>
    </div>

    <h4 style='color: var(--primary); margin-top: 15px; margin-bottom: 5px;'>🌙 Turno Noche</h4>
    <div class="aula-card">
        <div class="aula-card-title">Educación Especial</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 13</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 25</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 35</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Ciencias Sagradas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div>
        <div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Gestión Ambiental</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. de Empresas</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div>
    </div>
    <div class="aula-card">
        <div class="aula-card-title">Adm. Pública</div>
        <div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div>
        <div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div>
        <div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div>
    </div>
</div>`
        ]
    },
    ubicacion: {
        formal: [
            "El cursado presencial y la atención institucional se llevan a cabo en la Sede Central del IES N° 7 'Populorum Progressio' - INTELA, ubicada en Sarmiento 268, San Salvador de Jujuy.",
            "Las aulas físicas y las oficinas administrativas están situadas en Sarmiento 268, en la ciudad de San Salvador de Jujuy, Provincia de Jujuy.",
            "Le recordamos que el cursado presencial y la atención institucional se llevan a cabo en la Sede Central del IES N° 7 'Populorum Progressio' - INTELA, ubicada en Sarmiento 268, San Salvador de Jujuy. Quedamos a su disposición para cualquier aclaración."
        ],
        informal: [
            "Cursamos en la Sede Central del IES N° 7 'Populorum Progressio', en Sarmiento 268, acá en San Salvador de Jujuy.",
            "La sede de dictado es la Sede Central, que queda en Sarmiento 268, San Salvador de Jujuy.",
            "¡Te paso este dato! Cursamos en la Sede Central del IES N° 7 'Populorum Progressio', en Sarmiento 268, acá en San Salvador de Jujuy. Escribime cualquier otra consulta que tengas."
        ],
        molesto: [
            "Lamentamos sinceramente la demora. La ubicación física de la institución para cursar y realizar trámites es la Sede Central del IES N° 7, en Sarmiento 268, San Salvador de Jujuy.",
            "Pedimos disculpas por los inconvenientes. Confirmamos que las oficinas y aulas de cursado se encuentran en Sarmiento 268, San Salvador de Jujuy.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. La ubicación física de la institución para cursar y realizar trámites es la Sede Central del IES N° 7, en Sarmiento 268, San Salvador de Jujuy. Agradecemos su comprensión."
        ]
    },
    contacto: {
        formal: [
            "Puede ponerse en contacto con el IES N° 7 a través del teléfono (0388) 4224514 o enviando un correo electrónico a campus@populorumjujuy.ar.",
            "Para comunicarse con nuestra institución, disponemos del número telefónico (0388) 4224514 y la dirección de correo electrónico campus@populorumjujuy.ar.",
            "Le recordamos que puede ponerse en contacto con el IES N° 7 a través del teléfono (0388) 4224514 o enviando un correo electrónico a campus@populorumjujuy.ar. Quedamos a su disposición para cualquier aclaración."
        ],
        informal: [
            "Te podés comunicar con el IES N° 7 llamando al (0388) 4224514 o mandando un mail a campus@populorumjujuy.ar.",
            "Nos encontrás en el teléfono (0388) 4224514 o nos podés escribir por correo electrónico a campus@populorumjujuy.ar.",
            "¡Te paso este dato! Te podés comunicar con el IES N° 7 llamando al (0388) 4224514 o mandando un mail a campus@populorumjujuy.ar. Escribime cualquier otra consulta que tengas."
        ],
        molesto: [
            "Lamentamos la demora. Para comunicarse con la institución, puede llamar al teléfono (0388) 4224514 o escribir al mail campus@populorumjujuy.ar.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que los canales de contacto directo son el teléfono (0388) 4224514 y el correo campus@populorumjujuy.ar.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Para comunicarse con la institución, puede llamar al teléfono (0388) 4224514 o escribir al mail campus@populorumjujuy.ar. Agradecemos su comprensión."
        ]
    },
    requisitos_inscripcion: {
        formal: [
            "Para formalizar su inscripción definitiva en cualquier tecnicatura o profesorado, la normativa ministerial requiere la presentación de la siguiente documentación obligatoria: Título Secundario original autenticado (o constancia de título en trámite), fotocopia de Documento Nacional de Identidad (DNI), Partida de Nacimiento actualizada, constancia de CUIL y fotos tipo carnet.<br><br>📆 <b>Fecha de Inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26.",
            "Los requisitos oficiales de ingreso del IES 7 constan de la entrega física en carpeta de: analítico del secundario completo, DNI, CUIL, partida de nacimiento y certificado de aptitud médica.<br><br>📆 <b>Fecha de Inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26.",
            "Le recordamos que para formalizar su inscripción definitiva en cualquier tecnicatura o profesorado, la normativa ministerial requiere la presentación de la siguiente documentación obligatoria: Título Secundario original autenticado (o constancia de título en trámite), fotocopia de Documento Nacional de Identidad (DNI), Partida de Nacimiento actualizada, constancia de CUIL y fotos tipo carnet.<br><br>📆 <b>Fecha de Inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26. Quedamos a su disposición para cualquier aclaración."
        ],
        informal: [
            "Para inscribirte tenés que presentar los papeles típicos: fotocopia de tu DNI, la constancia de CUIL, partida de nacimiento actualizada, fotos tipo carnet y el analítico del secundario (o la constancia de título en trámite).<br><br>📆 <b>Fechas de inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26.",
            "Anotarte es fácil, tenés que llevar una carpeta con: fotocopia de DNI, CUIL, partida de nacimiento, fotos carnet y el título secundario completo.<br><br>📆 <b>Fechas de inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26.",
            "¡Te paso este dato! Para inscribirte tenés que presentar los papeles típicos: fotocopia de tu DNI, la constancia de CUIL, partida de nacimiento actualizada, fotos tipo carnet y el analítico del secundario (o la constancia de título en trámite).<br><br>📆 <b>Fechas de inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26. Escribime cualquier otra consulta que tengas."
        ],
        molesto: [
            "Lamentamos sinceramente la demora. Le detallamos rigurosamente los requisitos obligatorios de inscripción: título secundario autenticado o en trámite, fotocopia de DNI, constancia de CUIL, partida de nacimiento actualizada y fotos carnet.<br><br>📆 <b>Fecha de Inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26.",
            "Pedimos disculpas por los inconvenientes. Para evitar contratiempos, debe presentar de manera inmediata: analítico del secundario, fotocopia de DNI, CUIL, partida de nacimiento y certificado de salud.<br><br>📆 <b>Fecha de Inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Le detallamos rigurosamente los requisitos obligatorios de inscripción: título secundario autenticado o en trámite, fotocopia de DNI, constancia de CUIL, partida de nacimiento actualizada y fotos carnet.<br><br>📆 <b>Fecha de Inscripción Año 2027:</b> Diciembre del 14 al 30 y Febrero del 15 al 26. Agradecemos su comprensión."
        ]
    },
    agradecimiento: {
        formal: [
            "Ha sido un placer asistirle. Quedamos a su entera disposición para cualquier otra consulta sobre nuestra oferta académica. Que tenga una excelente jornada.",
            "Agradecemos su comunicación con el IES N° 7. Estamos para servirle en lo que requiera respecto a su formación académica.",
            "Le recordamos que ha sido un placer asistirle. Quedamos a su entera disposición para cualquier otra consulta sobre nuestra oferta académica. Que tenga una excelente jornada. Quedamos a su disposición para cualquier aclaración."
        ],
        informal: [
            "¡De nada! Qué bueno haberte ayudado. Si te queda alguna otra duda de las carreras, avisame.",
            "¡Buenísimo que te sirvió! Éxitos y ojalá nos vemos pronto en la cursada.",
            "¡Te paso este dato! ¡De nada! Qué bueno haberte ayudado. Si te queda alguna otra duda de las carreras, avisame. Escribime cualquier otra consulta que tengas."
        ],
        molesto: [
            "Lamentamos sinceramente la demora inicial. Agradecemos su paciencia y esperamos haber resuelto todas sus dudas de manera satisfactoria.",
            "Pedimos disculpas por los inconvenientes y agradecemos su contacto con nuestra institución. Estamos a su disposición para asegurar una mejor atención.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora inicial. Agradecemos su paciencia y esperamos haber resuelto todas sus dudas de manera satisfactoria. Agradecemos su comprensión."
        ]
    }
};

// Respuestas de Aclaración (cuando se consulta algo específico de carrera pero no se aclara cuál)
// Función para generar la aclaración de carrera dinámica conservando la intención
function generarAclaracionDinamica(intencion, tono) {
    const mapaIntenciones = {
        'descripcion_carrera': 'información general',
        'plan_estudios_completo': 'materias y plan de estudios',
        'campo_laboral': 'perfil profesional y salida laboral',
        'coordinador': 'el coordinador',
        'horario_atencion': 'los horarios',
        'requisitos_inscripcion': 'los requisitos',
        'ubicacion': 'la ubicación'
    };
    const etiqueta = mapaIntenciones[intencion] || 'información';
    
    const prefijoBoton = {
        'descripcion_carrera': 'Información de',
        'plan_estudios_completo': 'Materias de',
        'campo_laboral': 'Perfil profesional de',
        'coordinador': 'Coordinador de',
        'horario_atencion': 'Horarios de',
        'requisitos_inscripcion': 'Requisitos de',
        'ubicacion': 'Ubicación de'
    };
    const prefijo = prefijoBoton[intencion] || 'Información de';

    const introFormal = `Para brindarle la información sobre ${etiqueta}, por favor seleccione la carrera:`;
    const introInformal = `¿De qué carrera querés ver ${etiqueta}? Hacé clic en la que te interese:`;
    const introMolesto = `Seleccione la carrera para ver ${etiqueta}:`;

    const intros = { formal: [introFormal], informal: [introInformal], molesto: [introMolesto] };
    const intro = (intros[tono] || intros['formal'])[0];

    const carreras = [
        { id: "Ciencia de Datos e Inteligencia Artificial", label: "Ciencia de Datos e IA" },
        { id: "Gestión Jurídica", label: "Gestión Jurídica" },
        { id: "Ciencia Política", label: "Ciencia Política" },
        { id: "Educación Especial", label: "Educación Especial" },
        { id: "Ciencias Sagradas", label: "Ciencias Sagradas" },
        { id: "Gestión Ambiental", label: "Gestión Ambiental" },
        { id: "Niñez, Adolescencia y Familia", label: "Niñez, Adolescencia y Familia" },
        { id: "Laboratorio de Análisis Clínicos", label: "Laboratorio en Análisis Clínicos" },
        { id: "Hemoterapia", label: "Hemoterapia" },
        { id: "Acompañamiento Terapéutico", label: "Acomp. Terapéutico" },
        { id: "Administración de Empresas", label: "Adm. de Empresas" },
        { id: "Administración Pública", label: "Adm. Pública" },
        { id: "carrera_mecatronica", label: "Mecatrónica" },
        { id: "carrera_software", label: "Des. de Software" },
        { id: "carrera_automatizacion", label: "Aut. y Robótica" },
        { id: "carrera_lengua", label: "Prof. Lengua" },
        { id: "carrera_historia", label: "Prof. Historia" },
        { id: "carrera_psicologia", label: "Prof. Psicología" }    ];

    let btnHtml = '<br><br><div class="btn-list">';
    carreras.forEach(c => {
        let labelPrefijo = prefijo.replace(' de', '');
        if (labelPrefijo === 'Perfil profesional') labelPrefijo = 'Perfil';
        btnHtml += `<button class="quick-btn inline-quick-btn" data-msg="${prefijo} ${c.id}">${labelPrefijo} - ${c.label}</button>`;
    });
    btnHtml += '</div>';

    return [`${intro}${btnHtml}`];
}

// Respuestas específicas por carrera
const RESPUESTAS_CARRERA = {
    carrera_mecatronica: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Perico**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Desarrollar, analizar y evaluar proyectos de automatización con dispositivos mecatrónicos bajo normas de calidad.</li><li>Proyectar sistemas automatizados, desarrollar prototipos y resolver problemas de máquinas.</li><li>Programar y verificar controladores, y mantener equipos de tecnología mecánica, eléctrica o informática.</li><li>Gestionar, asesorar y peritar instalaciones mecatrónicas.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Perico**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Desarrollar, analizar y evaluar proyectos de automatización con dispositivos mecatrónicos bajo normas de calidad.</li><li>Proyectar sistemas automatizados, desarrollar prototipos y resolver problemas de máquinas.</li><li>Programar y verificar controladores, y mantener equipos de tecnología mecánica, eléctrica o informática.</li><li>Gestionar, asesorar y peritar instalaciones mecatrónicas.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede Perico**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Desarrollar, analizar y evaluar proyectos de automatización con dispositivos mecatrónicos bajo normas de calidad.</li><li>Proyectar sistemas automatizados, desarrollar prototipos y resolver problemas de máquinas.</li><li>Programar y verificar controladores, y mantener equipos de tecnología mecánica, eléctrica o informática.</li><li>Gestionar, asesorar y peritar instalaciones mecatrónicas.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["<ul><li><b>1° Año:</b> Física Aplicada, Matemática Aplicada, Comunicación, Sistemas de Representación, Electrónica Industrial, Electromecánica, Mecatrónica I, Prácticas I</li><li><b>2° Año:</b> Ciencia, Tecnología y Sociedad, Procesos Productivos, Mecatrónica II, Automatización Industrial, Inglés Técnico, Mecánica, EDI I, Prácticas II</li><li><b>3° Año:</b> Gestión de Emprendimientos, Ética y Deontología, Tecnología de los Materiales, Gestión, Organización y Planificación, Mecatrónica III, Mantenimiento Industrial, EDI II, Metrología y Calidad, Prácticas III</li></ul>"],
            informal: ["<ul><li><b>1° Año:</b> Física, Matemática, Comunicación, Sistemas, Electrónica Industrial, Electromecánica, Mecatrónica I, Prácticas I</li><li><b>2° Año:</b> Ciencia, Procesos, Mecatrónica II, Automatización Industrial, Inglés, Mecánica, EDI I, Prácticas II</li><li><b>3° Año:</b> Emprendimientos, Ética, Materiales, Gestión, Mecatrónica III, Mantenimiento, EDI II, Metrología, Prácticas III</li></ul>"],
            molesto: ["Le detallamos el plan:<br><ul><li><b>1° Año:</b> Física, Matemática, Comunicación, Sistemas, Electrónica Industrial, Electromecánica, Mecatrónica I, Prácticas I</li><li><b>2° Año:</b> Ciencia, Procesos, Mecatrónica II, Automatización Industrial, Inglés, Mecánica, EDI I, Prácticas II</li><li><b>3° Año:</b> Emprendimientos, Ética, Materiales, Gestión, Mecatrónica III, Mantenimiento, EDI II, Metrología, Prácticas III</li></ul>"]
        },
        horario_atencion: {
            formal: ["El cursado de la Tecnicatura Superior en Mecatrónica se desarrolla en el Turno Noche, en la Sede Perico."],
            informal: ["Las clases de Mecatrónica se dictan a la noche en la Sede Perico."],
            molesto: ["Le informamos que las clases de Mecatrónica son durante el Turno Noche en Perico."]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Industrias de diversa envergadura (mecánica, metalmecánica, automatización).</li><li>Ingeniería de vehículos y organizaciones aeronáuticas.</li><li>Producción de robótica aplicada a la medicina.</li><li>Informática, programación industrial y consultorías ambientales.</li><li>Establecimientos agropecuarios con instalaciones robotizadas.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Industrias de diversa envergadura (mecánica, metalmecánica, automatización).</li><li>Ingeniería de vehículos y organizaciones aeronáuticas.</li><li>Producción de robótica aplicada a la medicina.</li><li>Informática, programación industrial y consultorías ambientales.</li><li>Establecimientos agropecuarios con instalaciones robotizadas.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Industrias de diversa envergadura (mecánica, metalmecánica, automatización).</li><li>Ingeniería de vehículos y organizaciones aeronáuticas.</li><li>Producción de robótica aplicada a la medicina.</li><li>Informática, programación industrial y consultorías ambientales.</li><li>Establecimientos agropecuarios con instalaciones robotizadas.</li></ul>"]
        }
    },
    carrera_software: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Producir artefactos de software, abarcando su diseño detallado, construcción, verificación unitaria y mantenimiento.</li><li>Participar en proyectos de desarrollo programando módulos, objetos o subsistemas.</li><li>Integrar aplicaciones complejas con motores de base de datos, sistemas operativos y navegadores.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Producir artefactos de software, abarcando su diseño detallado, construcción, verificación unitaria y mantenimiento.</li><li>Participar en proyectos de desarrollo programando módulos, objetos o subsistemas.</li><li>Integrar aplicaciones complejas con motores de base de datos, sistemas operativos y navegadores.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Producir artefactos de software, abarcando su diseño detallado, construcción, verificación unitaria y mantenimiento.</li><li>Participar en proyectos de desarrollo programando módulos, objetos o subsistemas.</li><li>Integrar aplicaciones complejas con motores de base de datos, sistemas operativos y navegadores.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["<ul><li><b>1° Año:</b> Álgebra, Inglés, EDI I, Metodología de la Inv., Informática, Programación I, Arquitectura de computadoras, Administración y organizaciones, Análisis matemático</li><li><b>2° Año:</b> Inglés técnico, Programación II, Base de datos, Sistemas operativos, Redes, Análisis y diseño, Estructura de datos, Seguridad informática, Prácticas I</li><li><b>3° Año:</b> Estadística, EDI II, Ética, Programación III, Legislación, Emprendedurismo, Diseño de interface, Ingeniería del software, Prácticas III</li></ul>"],
            informal: ["<ul><li><b>1° Año:</b> Álgebra, Inglés, EDI I, Metodología, Informática, Programación I, Arquitectura, Administración, Análisis matemático</li><li><b>2° Año:</b> Inglés técnico, Programación II, Base de datos, Sistemas operativos, Redes, Análisis, Estructuras, Seguridad informática, Prácticas I</li><li><b>3° Año:</b> Estadística, EDI II, Ética, Programación III, Legislación, Emprendedurismo, Interfaces, Ingeniería de software, Prácticas III</li></ul>"],
            molesto: ["El plan incluye:<br><ul><li><b>1° Año:</b> Álgebra, Inglés, EDI I, Metodología, Informática, Programación I, Arquitectura, Administración, Análisis matemático</li><li><b>2° Año:</b> Inglés técnico, Programación II, Base de datos, Sistemas operativos, Redes, Análisis, Estructuras, Seguridad informática, Prácticas I</li><li><b>3° Año:</b> Estadística, EDI II, Ética, Programación III, Legislación, Emprendedurismo, Interfaces, Ingeniería de software, Prácticas III</li></ul>"]
        },
        horario_atencion: {
            formal: ["El cursado de la Tecnicatura Superior en Desarrollo de Software se desarrolla en el Turno Tarde, en la Sede San Pedro."],
            informal: ["Las clases de Software se dictan a la tarde en la Sede San Pedro."],
            molesto: ["Le informamos que las clases de Software son durante el Turno Tarde en San Pedro."]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Empresas dedicadas al desarrollo de software por encargo o productos propios.</li><li>Organizaciones proveedoras de servicios de asesoramiento y consultoría IT.</li><li>Departamentos de tecnología en empresas de diversos rubros.</li><li>Trabajo autónomo y generación de emprendimientos tecnológicos propios.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Empresas dedicadas al desarrollo de software por encargo o productos propios.</li><li>Organizaciones proveedoras de servicios de asesoramiento y consultoría IT.</li><li>Departamentos de tecnología en empresas de diversos rubros.</li><li>Trabajo autónomo y generación de emprendimientos tecnológicos propios.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Empresas dedicadas al desarrollo de software por encargo o productos propios.</li><li>Organizaciones proveedoras de servicios de asesoramiento y consultoría IT.</li><li>Departamentos de tecnología en empresas de diversos rubros.</li><li>Trabajo autónomo y generación de emprendimientos tecnológicos propios.</li></ul>"]
        }
    },
    carrera_automatizacion: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Libertador**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Desarrollar y evaluar proyectos de automatización e instalaciones con dispositivos robóticos.</li><li>Desarrollar prototipos y resolver problemas operativos de máquinas industriales.</li><li>Mantener, operar y programar controladores lógicos.</li><li>Gestionar y asesorar técnica y comercialmente sobre equipos de automatización.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Libertador**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Desarrollar y evaluar proyectos de automatización e instalaciones con dispositivos robóticos.</li><li>Desarrollar prototipos y resolver problemas operativos de máquinas industriales.</li><li>Mantener, operar y programar controladores lógicos.</li><li>Gestionar y asesorar técnica y comercialmente sobre equipos de automatización.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede Libertador**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Desarrollar y evaluar proyectos de automatización e instalaciones con dispositivos robóticos.</li><li>Desarrollar prototipos y resolver problemas operativos de máquinas industriales.</li><li>Mantener, operar y programar controladores lógicos.</li><li>Gestionar y asesorar técnica y comercialmente sobre equipos de automatización.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["<ul><li><b>1° Año:</b> Física Aplicada, Matemática, Comunicación, Sistemas de Representación, Electrónica Industrial, Electromecánica, Mecatrónica I, Prácticas I</li><li><b>2° Año:</b> Ciencia y Sociedad, Procesos Productivos, Mecatrónica II, Automatización Industrial, Inglés, Mecánica, EDI I, Prácticas II</li><li><b>3° Año:</b> Emprendimientos, Ética, Materiales, Organización, Mecatrónica III, Mantenimiento, EDI II, Metrología, Prácticas III</li></ul>"],
            informal: ["<ul><li><b>1° Año:</b> Física, Matemática, Comunicación, Sistemas, Electrónica, Electromecánica, Mecatrónica I, Prácticas I</li><li><b>2° Año:</b> Ciencia y Sociedad, Procesos, Mecatrónica II, Automatización, Inglés, Mecánica, EDI I, Prácticas II</li><li><b>3° Año:</b> Emprendimientos, Ética, Materiales, Organización, Mecatrónica III, Mantenimiento, EDI II, Metrología, Prácticas III</li></ul>"],
            molesto: ["El plan de estudios es:<br><ul><li><b>1° Año:</b> Física Aplicada, Matemática, Comunicación, Sistemas, Electrónica Industrial, Electromecánica, Mecatrónica I, Prácticas I</li><li><b>2° Año:</b> Ciencia y Sociedad, Procesos, Mecatrónica II, Automatización, Inglés, Mecánica, EDI I, Prácticas II</li><li><b>3° Año:</b> Emprendimientos, Ética, Materiales, Organización, Mecatrónica III, Mantenimiento, EDI II, Metrología, Prácticas III</li></ul>"]
        },
        horario_atencion: {
            formal: ["El cursado de la Tecnicatura Superior en Automatización y Robótica se desarrolla en el Turno Noche, en la Sede Libertador."],
            informal: ["Las clases de Automatización y Robótica se dictan a la noche en la Sede Libertador."],
            molesto: ["Le informamos que las clases son durante el Turno Noche en Sede Libertador."]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Industrias mecánicas, metalmecánicas y de producción.</li><li>Organizaciones aeronáuticas o robótica aplicada a la medicina.</li><li>Consultoras de procesos industriales y ambientales.</li><li>Sistemas de informática industrial y agropecuarias automatizadas.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Industrias mecánicas, metalmecánicas y de producción.</li><li>Organizaciones aeronáuticas o robótica aplicada a la medicina.</li><li>Consultoras de procesos industriales y ambientales.</li><li>Sistemas de informática industrial y agropecuarias automatizadas.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Industrias mecánicas, metalmecánicas y de producción.</li><li>Organizaciones aeronáuticas o robótica aplicada a la medicina.</li><li>Consultoras de procesos industriales y ambientales.</li><li>Sistemas de informática industrial y agropecuarias automatizadas.</li></ul>"]
        }
    },
    carrera_lengua: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Perico**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Planificar, guiar y evaluar procesos de enseñanza-aprendizaje en el ciclo básico y orientado de la educación secundaria.</li><li>Desarrollar prácticas docentes adaptadas a las necesidades de los estudiantes y el contexto escolar.</li><li>Participar en equipos interdisciplinarios para el diseño de proyectos educativos, de investigación y evaluación curricular.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Perico**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Planificar, guiar y evaluar procesos de enseñanza-aprendizaje en el ciclo básico y orientado de la educación secundaria.</li><li>Desarrollar prácticas docentes adaptadas a las necesidades de los estudiantes y el contexto escolar.</li><li>Participar en equipos interdisciplinarios para el diseño de proyectos educativos, de investigación y evaluación curricular.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede Perico**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Planificar, guiar y evaluar procesos de enseñanza-aprendizaje en el ciclo básico y orientado de la educación secundaria.</li><li>Desarrollar prácticas docentes adaptadas a las necesidades de los estudiantes y el contexto escolar.</li><li>Participar en equipos interdisciplinarios para el diseño de proyectos educativos, de investigación y evaluación curricular.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["<ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Prácticas del Lenguaje, Gramática I, Teoría y Crítica Literaria, Culturas Literarias, Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica General, Sujeto de la Educación, Gramática II, Didáctica de las Ciencias del Lenguaje, Metodologías Lingüísticas, Literatura Latinoamericana, Práctica II</li><li><b>3° Año:</b> TIC, Sociología, ESI, Lingüística Aplicada, Literatura Argentina, Didáctica de la Literatura, Semiótica, Práctica III</li><li><b>4° Año:</b> Ética, Historia Crítica de la Lengua Española, Literatura del NOA, Literatura Juvenil, Unidad Curricular Institucional, Residencia Pedagógica</li></ul>"],
            informal: ["<ul><li><b>1° Año:</b> Pedagogía, Psicología, Alfabetización Acad., Prácticas del Lenguaje, Gramática I, Teoría Literaria, Culturas Literarias, Práctica I</li><li><b>2° Año:</b> Filosofía, Políticas Educ., Didáctica Gral, Sujeto Educ., Gramática II, Didáctica del Lenguaje, Metodologías, Lit. Latinoamericana, Práctica II</li><li><b>3° Año:</b> TIC, Sociología, ESI, Lingüística Aplicada, Lit. Argentina, Didáctica Lit., Semiótica, Práctica III</li><li><b>4° Año:</b> Ética, Historia de la Lengua, Lit. del NOA, Lit. Juvenil, Unidad Curricular, Residencia</li></ul>"],
            molesto: ["Le pasamos el plan:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Prácticas del Lenguaje, Gramática I, Teoría y Crítica Literaria, Culturas Literarias, Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica General, Sujeto de la Educación, Gramática II, Didáctica de las Ciencias del Lenguaje, Metodologías Lingüísticas, Literatura Latinoamericana, Práctica II</li><li><b>3° Año:</b> TIC, Sociología, ESI, Lingüística Aplicada, Literatura Argentina, Didáctica de la Literatura, Semiótica, Práctica III</li><li><b>4° Año:</b> Ética, Historia Crítica de la Lengua Española, Literatura del NOA, Literatura Juvenil, Unidad Curricular Institucional, Residencia Pedagógica</li></ul>"]
        },
        horario_atencion: {
            formal: ["El Profesorado de Educación Secundaria en Lengua y Literatura se dicta en el Turno Noche (de 18:00 a 22:00 hs), en la Sede Perico."],
            informal: ["Las clases del profesorado de Lengua se dictan a la noche (de 18 a 22 hs) en la Sede Perico."],
            molesto: ["Le informamos que las clases de Lengua son durante el Turno Noche en Perico."]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario (gestión pública, privada, cooperativa y social).</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación provincial.</li><li>Instituciones abocadas a la capacitación e investigación en Lengua y Literatura.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario (gestión pública, privada, cooperativa y social).</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación provincial.</li><li>Instituciones abocadas a la capacitación e investigación en Lengua y Literatura.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario (gestión pública, privada, cooperativa y social).</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación provincial.</li><li>Instituciones abocadas a la capacitación e investigación en Lengua y Literatura.</li></ul>"]
        }
    },
    carrera_historia: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Guiar y evaluar procesos de enseñanza de conocimientos históricos en el nivel secundario.</li><li>Integrar la práctica docente con las problemáticas y contextos socioculturales de los alumnos.</li><li>Diseñar e implementar proyectos de investigación y evaluación institucional relacionados a la Historia.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Guiar y evaluar procesos de enseñanza de conocimientos históricos en el nivel secundario.</li><li>Integrar la práctica docente con las problemáticas y contextos socioculturales de los alumnos.</li><li>Diseñar e implementar proyectos de investigación y evaluación institucional relacionados a la Historia.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Guiar y evaluar procesos de enseñanza de conocimientos históricos en el nivel secundario.</li><li>Integrar la práctica docente con las problemáticas y contextos socioculturales de los alumnos.</li><li>Diseñar e implementar proyectos de investigación y evaluación institucional relacionados a la Historia.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["<ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Introducción a la Historia, Historia Mundial I, Historia de América I, Geografía, Práctica I</li><li><b>2° Año:</b> Didáctica General, Filosofía, Políticas Educativas, Sujeto de la Educación, Historia Argentina I, Historia Mundial II, Práctica II</li><li><b>3° Año:</b> ESI, TIC, Sociología de la Educación, Historia Argentina II, Historia Mundial III, Epistemología de la Historia, Didáctica de la Historia, Historia de Jujuy, Práctica III</li><li><b>4° Año:</b> Ética, Historia de América Contemporánea, Investigación de Historia Regional, Historia Mundial IV, Unidad Institucional, Residencia Pedagógica</li></ul>"],
            informal: ["<ul><li><b>1° Año:</b> Pedagogía, Psicología, Alfabetización Acad., Intro a la Historia, Historia Mundial I, Historia de América I, Geografía, Práctica I</li><li><b>2° Año:</b> Didáctica Gral, Filosofía, Políticas Educativas, Sujeto Educ., Historia Argentina I, Historia Mundial II, Práctica II</li><li><b>3° Año:</b> ESI, TIC, Sociología, Historia Argentina II, Historia Mundial III, Epistemología, Didáctica de la Historia, Historia de Jujuy, Práctica III</li><li><b>4° Año:</b> Ética, Historia América Contemp., Investigación Regional, Historia Mundial IV, Unidad Institucional, Residencia</li></ul>"],
            molesto: ["Plan de Historia:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Introducción a la Historia, Historia Mundial I, Historia de América I, Geografía, Práctica I</li><li><b>2° Año:</b> Didáctica General, Filosofía, Políticas Educativas, Sujeto de la Educación, Historia Argentina I, Historia Mundial II, Práctica II</li><li><b>3° Año:</b> ESI, TIC, Sociología de la Educación, Historia Argentina II, Historia Mundial III, Epistemología de la Historia, Didáctica de la Historia, Historia de Jujuy, Práctica III</li><li><b>4° Año:</b> Ética, Historia de América Contemporánea, Investigación de Historia Regional, Historia Mundial IV, Unidad Institucional, Residencia Pedagógica</li></ul>"]
        },
        horario_atencion: {
            formal: ["El Profesorado de Educación Secundaria en Historia se dicta en el Turno Mañana y Turno Tarde, en la Sede San Pedro."],
            informal: ["Las clases del profesorado de Historia se dictan a la mañana y a la tarde en la Sede San Pedro."],
            molesto: ["Le informamos que las clases de Historia se imparten en los Turnos Mañana y Tarde en San Pedro."]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario de gestión pública, privada y social.</li><li>Programas y proyectos socioeducativos del Ministerio de Educación.</li><li>Centros de investigación histórica y capacitación docente.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario de gestión pública, privada y social.</li><li>Programas y proyectos socioeducativos del Ministerio de Educación.</li><li>Centros de investigación histórica y capacitación docente.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario de gestión pública, privada y social.</li><li>Programas y proyectos socioeducativos del Ministerio de Educación.</li><li>Centros de investigación histórica y capacitación docente.</li></ul>"]
        }
    },
    carrera_psicologia: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Libertador**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Conducir procesos de enseñanza-aprendizaje con sólida formación disciplinar, pedagógica y tecnológica en el campo de la Psicología.</li><li>Tomar decisiones fundamentadas para resolver problemáticas del contexto escolar mediante recursos tecnológicos.</li><li>Integrar equipos interdisciplinarios para investigación y diseño de proyectos socioeducativos.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede Libertador**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Conducir procesos de enseñanza-aprendizaje con sólida formación disciplinar, pedagógica y tecnológica en el campo de la Psicología.</li><li>Tomar decisiones fundamentadas para resolver problemáticas del contexto escolar mediante recursos tecnológicos.</li><li>Integrar equipos interdisciplinarios para investigación y diseño de proyectos socioeducativos.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede Libertador**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Conducir procesos de enseñanza-aprendizaje con sólida formación disciplinar, pedagógica y tecnológica en el campo de la Psicología.</li><li>Tomar decisiones fundamentadas para resolver problemáticas del contexto escolar mediante recursos tecnológicos.</li><li>Integrar equipos interdisciplinarios para investigación y diseño de proyectos socioeducativos.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["<ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización, Psicología General, Psicofisiología, Psicología Evolutiva I, Antropología Social, Práctica I</li><li><b>2° Año:</b> Didáctica General, Filosofía, Políticas Educativas, Sujeto de la Educación, Psicología Social, Psicología y Cultura, Historia de la Psicología, Psicología Evolutiva II, Práctica II</li><li><b>3° Año:</b> ESI, TIC, Sociología, Orientación Vocacional, Seminario Psicoanálisis, Didáctica de la Psicología, Teoría y Técnica de Grupo, Práctica III</li><li><b>4° Año:</b> Ética, Problemáticas Psicosociales, Psicología de las Instituciones, Asesoramiento Pedagógico, Unidad Institucional, Residencia</li></ul>"],
            informal: ["<ul><li><b>1° Año:</b> Pedagogía, Psicología Educ., Alfabetización, Psicología General, Psicofisiología, Psicología Evolutiva I, Antropología, Práctica I</li><li><b>2° Año:</b> Didáctica Gral, Filosofía, Políticas Educ., Sujeto Educ., Psicología Social, Psicología y Cultura, Hist. de la Psicología, Psi. Evolutiva II, Práctica II</li><li><b>3° Año:</b> ESI, TIC, Sociología, Orientación Vocacional, Psicoanálisis, Didáctica de la Psicología, Teoría de Grupo, Práctica III</li><li><b>4° Año:</b> Ética, Problemáticas Psicosociales, Psicología Institucional, Asesoramiento Pedagógico, Unidad Institucional, Residencia</li></ul>"],
            molesto: ["Plan de Psicología:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización, Psicología General, Psicofisiología, Psicología Evolutiva I, Antropología Social, Práctica I</li><li><b>2° Año:</b> Didáctica General, Filosofía, Políticas Educativas, Sujeto de la Educación, Psicología Social, Psicología y Cultura, Historia de la Psicología, Psicología Evolutiva II, Práctica II</li><li><b>3° Año:</b> ESI, TIC, Sociología, Orientación Vocacional, Seminario Psicoanálisis, Didáctica de la Psicología, Teoría y Técnica de Grupo, Práctica III</li><li><b>4° Año:</b> Ética, Problemáticas Psicosociales, Psicología de las Instituciones, Asesoramiento Pedagógico, Unidad Institucional, Residencia</li></ul>"]
        },
        horario_atencion: {
            formal: ["El Profesorado de Educación Secundaria en Psicología se dicta en el Turno Noche, en la Sede Libertador."],
            informal: ["Las clases del profesorado de Psicología se dictan a la noche en la Sede Libertador."],
            molesto: ["Le informamos que las clases de Psicología son durante el Turno Noche en Libertador."]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario (gestión pública, privada y social).</li><li>Roles diversos en escuelas: docente, docente tutor, preceptor y referente de ESI (Educación Sexual Integral).</li><li>Programas del Ministerio de Educación orientados a la intervención psicosocial.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario (gestión pública, privada y social).</li><li>Roles diversos en escuelas: docente, docente tutor, preceptor y referente de ESI (Educación Sexual Integral).</li><li>Programas del Ministerio de Educación orientados a la intervención psicosocial.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br><ul><li>Instituciones educativas de nivel secundario (gestión pública, privada y social).</li><li>Roles diversos en escuelas: docente, docente tutor, preceptor y referente de ESI (Educación Sexual Integral).</li><li>Programas del Ministerio de Educación orientados a la intervención psicosocial.</li></ul>"]
        }
    },
    ciencia_datos: {
        descripcion_carrera: {
            formal: ["La Ciencia de Datos ocupa un lugar central en las organizaciones y su uso es cada vez más intensivo en la toma de decisiones en infinidad de sectores profesionales. Dentro de la Ciencia de Datos encontramos diferentes técnicas, incluyendo la Estadística y la Inteligencia Artificial (Aprendizaje Automático o Machine Learning).<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Ciencia de Datos e Inteligencia Artificial estará capacitado para:<br><ul><li>Realizar proyectos de innovación que involucren tanto el uso de datos como de IA.</li><li>Pensar con criterio estadístico situaciones de trabajo que impliquen una amplia cantidad de datos.</li><li>Conocer técnicas específicas para explorar, limpiar y preparar diversas fuentes de datos.</li><li>Construir y optimizar algoritmos de Deep Learning para imitar habilidades humanas básicas (visión, lenguaje, toma de decisiones).</li><li>Construir redes neuronales y liderar proyectos que implementen visión por computadora.</li><li>Aplicar IA para procesar audio y texto (reconocimiento del habla, chatbots, traducción automática, etc.).</li></ul>"],
            informal: ["La Ciencia de Datos ocupa un lugar central en las organizaciones y su uso es cada vez más intensivo en la toma de decisiones en infinidad de sectores profesionales. Dentro de la Ciencia de Datos encontramos diferentes técnicas, incluyendo la Estadística y la Inteligencia Artificial (Aprendizaje Automático o Machine Learning).<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Ciencia de Datos e Inteligencia Artificial estará capacitado para:<br><ul><li>Realizar proyectos de innovación que involucren tanto el uso de datos como de IA.</li><li>Pensar con criterio estadístico situaciones de trabajo que impliquen una amplia cantidad de datos.</li><li>Conocer técnicas específicas para explorar, limpiar y preparar diversas fuentes de datos.</li><li>Construir y optimizar algoritmos de Deep Learning para imitar habilidades humanas básicas (visión, lenguaje, toma de decisiones).</li><li>Construir redes neuronales y liderar proyectos que implementen visión por computadora.</li><li>Aplicar IA para procesar audio y texto (reconocimiento del habla, chatbots, traducción automática, etc.).</li></ul>"],
            molesto: ["La Ciencia de Datos ocupa un lugar central en las organizaciones y su uso es cada vez más intensivo en la toma de decisiones en infinidad de sectores profesionales. Dentro de la Ciencia de Datos encontramos diferentes técnicas, incluyendo la Estadística y la Inteligencia Artificial (Aprendizaje Automático o Machine Learning).<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Ciencia de Datos e Inteligencia Artificial estará capacitado para:<br><ul><li>Realizar proyectos de innovación que involucren tanto el uso de datos como de IA.</li><li>Pensar con criterio estadístico situaciones de trabajo que impliquen una amplia cantidad de datos.</li><li>Conocer técnicas específicas para explorar, limpiar y preparar diversas fuentes de datos.</li><li>Construir y optimizar algoritmos de Deep Learning para imitar habilidades humanas básicas (visión, lenguaje, toma de decisiones).</li><li>Construir redes neuronales y liderar proyectos que implementen visión por computadora.</li><li>Aplicar IA para procesar audio y texto (reconocimiento del habla, chatbots, traducción automática, etc.).</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial de la carrera de Ciencia de Datos se estructura de la siguiente manera:<br><ul><li><b>1° Año:</b> se cursan Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b> se cursan Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b> se cursan Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III</li></ul>",
            "Le detallamos la distribución anual de materias de Ciencia de Datos:<br><ul><li><b>1° Año:</b> Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I; </li><li><b>2° Año:</b> Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II; </li><li><b>3° Año:</b> Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III</li></ul>",
            "Le recordamos que el plan de estudios oficial de la carrera de Ciencia de Datos se estructura de la siguiente manera:<br><ul><li><b>1° Año:</b> se cursan Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b> se cursan Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b> se cursan Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Ciencia de Datos está buenísimo y dura 3 años!:<br><ul><li><b>1° Año:</b> tenés Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b> cursás Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b> cerrás con Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III</li></ul>",
            "Te cuento cómo se dividen las materias de Ciencia de Datos:<br><ul><li><b>1° Año:</b> tiene Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas I y EDI I</li><li><b>2° Año:</b> ves Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas II y EDI II</li><li><b>3° Año:</b> cursás Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas III</li></ul>",
            "¡Te paso este dato! ¡El plan de Ciencia de Datos está buenísimo y dura 3 años!:<br><ul><li><b>1° Año:</b> tenés Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b> cursás Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b> cerrás con Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le presentamos detalladamente el plan de estudios completo de Ciencia de Datos:<br><ul><li><b>1° Año:</b> Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas I y EDI I</li><li><b>2° Año:</b> Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas II y EDI II</li><li><b>3° Año:</b> Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias obligatorias de Ciencia de Datos por año son:<br><ul><li><b>1° Año:</b> Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I, EDI I</li><li><b>2° Año:</b> Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas II, EDI II</li><li><b>3° Año:</b> Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le presentamos detalladamente el plan de estudios completo de Ciencia de Datos:<br><ul><li><b>1° Año:</b> Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas I y EDI I</li><li><b>2° Año:</b> Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas II y EDI II</li><li><b>3° Año:</b> Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Ciencia de Datos e Inteligencia Artificial podrá coordinar equipos de trabajo y dirigir emprendimientos de pequeña y mediana envergadura de servicios propios de su campo.<br><br>Podrá trabajar en:<br><ul><li>Organizaciones tanto de gestión pública como privada en diferentes campos (salud, educación, marketing, comercialización, telefonía, agro, redes sociales, etc.).</li><li>De manera autónoma ofreciendo sus servicios a clientes particulares.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Ciencia de Datos e Inteligencia Artificial podrá coordinar equipos de trabajo y dirigir emprendimientos de pequeña y mediana envergadura de servicios propios de su campo.<br><br>Podrá trabajar en:<br><ul><li>Organizaciones tanto de gestión pública como privada en diferentes campos (salud, educación, marketing, comercialización, telefonía, agro, redes sociales, etc.).</li><li>De manera autónoma ofreciendo sus servicios a clientes particulares.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Ciencia de Datos e Inteligencia Artificial podrá coordinar equipos de trabajo y dirigir emprendimientos de pequeña y mediana envergadura de servicios propios de su campo.<br><br>Podrá trabajar en:<br><ul><li>Organizaciones tanto de gestión pública como privada en diferentes campos (salud, educación, marketing, comercialización, telefonía, agro, redes sociales, etc.).</li><li>De manera autónoma ofreciendo sus servicios a clientes particulares.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial se desarrolla de lunes a viernes en el Turno Mañana (08:00 a 12:30 horas).",
            "Las clases de Ciencia de Datos se dictan durante el Turno Mañana, de lunes a viernes en el horario de 08:00 a 12:30 hs.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial se desarrolla de lunes a viernes en el Turno Mañana (08:00 a 12:30 horas). Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial a la mañana, de lunes a viernes de 08:00 a 12:30 hs.",
            "El horario de clases de Ciencia de Datos es en el Turno Mañana, de lunes a viernes de 08:00 a 12:30.",
            "¡Te paso este dato! Se cursa presencial a la mañana, de lunes a viernes de 08:00 a 12:30 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Confirmamos que el horario de cursado de Ciencia de Datos es en el Turno Mañana, de lunes a viernes de 08:00 a 12:30 horas.",
            "Pedimos disculpas por los inconvenientes. Le informamos que la carrera de Ciencia de Datos se dicta en el Turno Mañana (de lunes a viernes de 08:00 a 12:30 hs).",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Confirmamos que el horario de cursado de Ciencia de Datos es en el Turno Mañana, de lunes a viernes de 08:00 a 12:30 horas. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencia de Datos e IA</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "El coordinador de la Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial es el Ing. Pablo Vilte. Sus horarios de consulta presencial son los días Martes de 10:00 a 12:00 hs. y Jueves de 08:00 a 10:00 hs.",
            "Para comunicarse con la coordinación de Ciencia de Datos, puede contactar al Ing. Pablo Vilte en sus horarios de atención: Martes de 10:00 a 12:00 hs. y Jueves de 08:00 a 10:00 hs.",
            "Le recordamos que el coordinador de la Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial es el Ing. Pablo Vilte. Sus horarios de consulta presencial son los días Martes de 10:00 a 12:00 hs. y Jueves de 08:00 a 10:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "El coordinador de Ciencia de Datos es el Ing. Pablo Vilte. Lo podés encontrar para consultas los Martes de 10:00 a 12:00 hs. y los Jueves de 08:00 a 10:00 hs.",
            "Si necesitás hablar con el coordinador de la carrera, podés consultar al Ing. Pablo Vilte los Martes de 10:00 a 12:00 hs. o Jueves de 08:00 a 10:00 hs.",
            "¡Te paso este dato! El coordinador de Ciencia de Datos es el Ing. Pablo Vilte. Lo podés encontrar para consultas los Martes de 10:00 a 12:00 hs. y los Jueves de 08:00 a 10:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. El coordinador responsable es el Ing. Pablo Vilte, y atiende consultas presenciales los Martes de 10:00 a 12:00 hs. y Jueves de 08:00 a 10:00 hs.",
            "Pedimos disculpas por los inconvenientes. Le informamos que el Ing. Pablo Vilte coordina la carrera. Sus horarios de consulta son Martes de 10:00 a 12:00 hs. y Jueves de 08:00 a 10:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. El coordinador responsable es el Ing. Pablo Vilte, y atiende consultas presenciales los Martes de 10:00 a 12:00 hs. y Jueves de 08:00 a 10:00 hs. Agradecemos su comprensión."
        ]
        }
    },
    gestion_juridica: {
        descripcion_carrera: {
            formal: ["La Tecnicatura Superior en Gestión Jurídica es una carrera de educación superior técnica orientada a formar profesionales con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Gestión Jurídica será un profesional con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial. Le permitirá:<br><ul><li>Desempeñarse como técnico auxiliar en distintas reparticiones de la administración pública, justicia, gobierno, municipios, registros públicos, etc.</li><li>Desempeñarse como técnico en estudios jurídicos, contables y notariales (en dependencia o independiente).</li><li>Colaborar en departamentos legales de empresas (ej: contratos mercantiles, civiles, laborales).</li><li>Diligenciar y gestionar trámites en organismos públicos y privados (DGR, AFIP, Municipalidad, ANSES, Registros, etc.).</li><li>Formar, conducir e integrar empresas de servicios de tramitación de expedientes judiciales y administrativos.</li><li>Ofrecer servicios tercerizados a organizaciones públicas y privadas en cuestiones prácticas de la especialización jurídica.</li></ul>"],
            informal: ["La Tecnicatura Superior en Gestión Jurídica es una carrera de educación superior técnica orientada a formar profesionales con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Gestión Jurídica será un profesional con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial. Le permitirá:<br><ul><li>Desempeñarse como técnico auxiliar en distintas reparticiones de la administración pública, justicia, gobierno, municipios, registros públicos, etc.</li><li>Desempeñarse como técnico en estudios jurídicos, contables y notariales (en dependencia o independiente).</li><li>Colaborar en departamentos legales de empresas (ej: contratos mercantiles, civiles, laborales).</li><li>Diligenciar y gestionar trámites en organismos públicos y privados (DGR, AFIP, Municipalidad, ANSES, Registros, etc.).</li><li>Formar, conducir e integrar empresas de servicios de tramitación de expedientes judiciales y administrativos.</li><li>Ofrecer servicios tercerizados a organizaciones públicas y privadas en cuestiones prácticas de la especialización jurídica.</li></ul>"],
            molesto: ["La Tecnicatura Superior en Gestión Jurídica es una carrera de educación superior técnica orientada a formar profesionales con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Gestión Jurídica será un profesional con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial. Le permitirá:<br><ul><li>Desempeñarse como técnico auxiliar en distintas reparticiones de la administración pública, justicia, gobierno, municipios, registros públicos, etc.</li><li>Desempeñarse como técnico en estudios jurídicos, contables y notariales (en dependencia o independiente).</li><li>Colaborar en departamentos legales de empresas (ej: contratos mercantiles, civiles, laborales).</li><li>Diligenciar y gestionar trámites en organismos públicos y privados (DGR, AFIP, Municipalidad, ANSES, Registros, etc.).</li><li>Formar, conducir e integrar empresas de servicios de tramitación de expedientes judiciales y administrativos.</li><li>Ofrecer servicios tercerizados a organizaciones públicas y privadas en cuestiones prácticas de la especialización jurídica.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Gestión Jurídica consta de:<br><ul><li><b>1° Año:</b>  Introducción al derecho, Derecho privado I, Informática aplicada a la gestión administrativa y judicial I, Gestión de calidad, Comunicación oral y escrita, Derecho público I y Práctica profesionalizante I</li><li><b>2° Año:</b>  Derecho privado II, Relaciones humanas en el trabajo, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática aplicada a la gestión administrativa y judicial II y Práctica profesionalizante II</li><li><b>3° Año:</b>  Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología del técnico en gestión jurídica, Herramientas de mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica profesionalizante III</li></ul>",
            "Le detallamos la distribución curricular anual de Gestión Jurídica:<br><ul><li><b>1° Año:</b>  Introducción al derecho, Derecho privado I, Informática I, Gestión de calidad, Comunicación, Derecho público I, Práctica I</li><li><b>2° Año:</b>  Derecho privado II, Relaciones humanas, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática II, Práctica II</li><li><b>3° Año:</b>  Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología, Mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica III</li></ul>",
            "Le recordamos que el plan de estudios oficial para Gestión Jurídica consta de:<br><ul><li><b>1° Año:</b>  Introducción al derecho, Derecho privado I, Informática aplicada a la gestión administrativa y judicial I, Gestión de calidad, Comunicación oral y escrita, Derecho público I y Práctica profesionalizante I</li><li><b>2° Año:</b>  Derecho privado II, Relaciones humanas en el trabajo, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática aplicada a la gestión administrativa y judicial II y Práctica profesionalizante II</li><li><b>3° Año:</b>  Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología del técnico en gestión jurídica, Herramientas de mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica profesionalizante III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Gestión Jurídica está muy completo!:<br><ul><li><b>1° Año:</b>  cursás: Introducción al derecho, Derecho privado I, Informática aplicada I, Gestión de calidad, Comunicación, Derecho público I y Práctica I</li><li><b>2° Año:</b>  tenés: Derecho privado II, Relaciones humanas, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática II y Práctica II</li><li><b>3° Año:</b>  ves: Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología, Mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica III</li></ul>",
            "Te cuento las materias de Gestión Jurídica:<br><ul><li><b>1° Año:</b>  arranca con Introducción al derecho, Derecho privado I, Informática I, Gestión de calidad, Comunicación, Derecho público I y Práctica I</li><li><b>2° Año:</b>  cursás Derecho privado II, Relaciones humanas, Gestión de automotores/inmuebles, Derecho público II, EDI I, Informática II y Práctica II. Cerrás </li><li><b>3° Año:</b>  con Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética, Mediación, Gestión previsional, EDI II, Derecho privado III y Práctica III</li></ul>",
            "¡Te paso este dato! ¡El plan de Gestión Jurídica está muy completo!:<br><ul><li><b>1° Año:</b>  cursás: Introducción al derecho, Derecho privado I, Informática aplicada I, Gestión de calidad, Comunicación, Derecho público I y Práctica I</li><li><b>2° Año:</b>  tenés: Derecho privado II, Relaciones humanas, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática II y Práctica II</li><li><b>3° Año:</b>  ves: Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología, Mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le detallamos el plan de estudios completo de Gestión Jurídica:<br><ul><li><b>1° Año:</b>  Introducción al derecho, Derecho privado I, Informática I, Gestión de calidad, Comunicación, Derecho público I, Práctica I</li><li><b>2° Año:</b>  Derecho privado II, Relaciones humanas, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática II, Práctica II</li><li><b>3° Año:</b>  Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología, Mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias de Gestión Jurídica son:<br><ul><li><b>1° Año:</b>  Introducción al derecho, Derecho privado I, Informática I, Gestión de calidad, Comunicación, Derecho público I, Práctica I</li><li><b>2° Año:</b>  Derecho privado II, Relaciones humanas, Gestión automotor/inmobiliario, Derecho público II, EDI I, Informática II, Práctica II</li><li><b>3° Año:</b>  Gestión administrativa/judicial, Gestión notarial, Planeamiento estratégico, Ética, Mediación, Gestión previsional, EDI II, Derecho privado III, Práctica III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le detallamos el plan de estudios completo de Gestión Jurídica:<br><ul><li><b>1° Año:</b>  Introducción al derecho, Derecho privado I, Informática I, Gestión de calidad, Comunicación, Derecho público I, Práctica I</li><li><b>2° Año:</b>  Derecho privado II, Relaciones humanas, Gestión del automotor e inmobiliario, Derecho público II, EDI I, Informática II, Práctica II</li><li><b>3° Año:</b>  Gestión administrativa y judicial, Gestión notarial, Planeamiento estratégico, Ética y deontología, Mediación y negociación, Gestión previsional, EDI II, Derecho privado III y Práctica III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El egresado de esta Carrera, podrá desempeñarse en:<br><ul><li>Actividad privada (Estudios Jurídicos, Bancos, Agencias, Registros, Empresas).</li><li>Registro General de la Propiedad Inmueble, Registros Nacionales del Automotor, Registro de Créditos Prendarios, Registro de Estado y de Capacidad Civil de las personas.</li><li>Asesorías Jurídicas de las distintas reparticiones estatales.</li><li>Tribunales Provinciales y Federales.</li><li>ANSES.</li><li>Dependencias de la Provincia y de las Municipalidad, de Empresas de Seguros, ART, entre otras.</li><li>Poder ejecutivo y Legislativo Provincial.</li><li>Estudios Jurídicos independientes.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El egresado de esta Carrera, podrá desempeñarse en:<br><ul><li>Actividad privada (Estudios Jurídicos, Bancos, Agencias, Registros, Empresas).</li><li>Registro General de la Propiedad Inmueble, Registros Nacionales del Automotor, Registro de Créditos Prendarios, Registro de Estado y de Capacidad Civil de las personas.</li><li>Asesorías Jurídicas de las distintas reparticiones estatales.</li><li>Tribunales Provinciales y Federales.</li><li>ANSES.</li><li>Dependencias de la Provincia y de las Municipalidad, de Empresas de Seguros, ART, entre otras.</li><li>Poder ejecutivo y Legislativo Provincial.</li><li>Estudios Jurídicos independientes.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El egresado de esta Carrera, podrá desempeñarse en:<br><ul><li>Actividad privada (Estudios Jurídicos, Bancos, Agencias, Registros, Empresas).</li><li>Registro General de la Propiedad Inmueble, Registros Nacionales del Automotor, Registro de Créditos Prendarios, Registro de Estado y de Capacidad Civil de las personas.</li><li>Asesorías Jurídicas de las distintas reparticiones estatales.</li><li>Tribunales Provinciales y Federales.</li><li>ANSES.</li><li>Dependencias de la Provincia y de las Municipalidad, de Empresas de Seguros, ART, entre otras.</li><li>Poder ejecutivo y Legislativo Provincial.</li><li>Estudios Jurídicos independientes.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Gestión Jurídica se desarrolla durante el Turno Tarde.",
            "Las clases de Gestión Jurídica se dictan en el Turno Tarde en la Sede Central.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Gestión Jurídica se desarrolla durante el Turno Tarde. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la tarde.",
            "El horario de clases de Gestión Jurídica corresponde al Turno Tarde.",
            "¡Te paso este dato! Se cursa presencial por la tarde. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Gestión Jurídica se dictan durante el Turno Tarde.",
            "Pedimos disculpas. Confirmamos que la carrera de Gestión Jurídica se cursa en el Turno Tarde.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Gestión Jurídica se dictan durante el Turno Tarde. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Gestión Jurídica</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 1</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora de la Tecnicatura Superior en Gestión Jurídica es la Prof. Silvia Cichello. Sus horarios de consulta presencial son los días Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y de 15:40 a 18:20 hs.",
            "Para contactar a la coordinación de Gestión Jurídica, puede consultar a la Prof. Silvia Cichello los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y de 15:40 a 18:20 hs.",
            "Le recordamos que la coordinadora de la Tecnicatura Superior en Gestión Jurídica es la Prof. Silvia Cichello. Sus horarios de consulta presencial son los días Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y de 15:40 a 18:20 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Gestión Jurídica es la Prof. Silvia Cichello. La podés consultar los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "Si necesitás hablar con la coordinadora Silvia Cichello, atiende consultas los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "¡Te paso este dato! La coordinadora de Gestión Jurídica es la Prof. Silvia Cichello. La podés consultar los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora responsable es la Prof. Silvia Cichello, quien atiende los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que la Prof. Silvia Cichello coordina Gestión Jurídica; atiende consultas los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora responsable es la Prof. Silvia Cichello, quien atiende los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs. Agradecemos su comprensión."
        ]
        }
    },
    ciencia_politica: {
        descripcion_carrera: {
            formal: ["El Profesorado de Educación Secundaria en Ciencia Política es una carrera de educación superior de 4 años, orientada a formar docentes capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares del campo de la formación ciudadana y el derecho.<br><br><b>Perfil del Egresado:</b><br>El Profesor de Educación Secundaria en Ciencia Política es un profesional capacitado para:<br><ul><li>Planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curricular pertenecientes al campo de la formación ciudadana y el derecho.</li><li>Desarrollar su práctica docente teniendo en cuenta las características y necesidades de los estudiantes de nivel secundario, los vínculos con otros docentes y las problemáticas surgidas de la relación entre el contexto interno y externo de las escuelas.</li><li>Participar en equipos interdisciplinarios para el diseño e implementación de proyectos educativos, de investigación y evaluación curricular e institucional relacionados con la Ciencia Política.</li></ul>"],
            informal: ["El Profesorado de Educación Secundaria en Ciencia Política es una carrera de educación superior de 4 años, orientada a formar docentes capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares del campo de la formación ciudadana y el derecho.<br><br><b>Perfil del Egresado:</b><br>El Profesor de Educación Secundaria en Ciencia Política es un profesional capacitado para:<br><ul><li>Planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curricular pertenecientes al campo de la formación ciudadana y el derecho.</li><li>Desarrollar su práctica docente teniendo en cuenta las características y necesidades de los estudiantes de nivel secundario, los vínculos con otros docentes y las problemáticas surgidas de la relación entre el contexto interno y externo de las escuelas.</li><li>Participar en equipos interdisciplinarios para el diseño e implementación de proyectos educativos, de investigación y evaluación curricular e institucional relacionados con la Ciencia Política.</li></ul>"],
            molesto: ["El Profesorado de Educación Secundaria en Ciencia Política es una carrera de educación superior de 4 años, orientada a formar docentes capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares del campo de la formación ciudadana y el derecho.<br><br><b>Perfil del Egresado:</b><br>El Profesor de Educación Secundaria en Ciencia Política es un profesional capacitado para:<br><ul><li>Planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curricular pertenecientes al campo de la formación ciudadana y el derecho.</li><li>Desarrollar su práctica docente teniendo en cuenta las características y necesidades de los estudiantes de nivel secundario, los vínculos con otros docentes y las problemáticas surgidas de la relación entre el contexto interno y externo de las escuelas.</li><li>Participar en equipos interdisciplinarios para el diseño e implementación de proyectos educativos, de investigación y evaluación curricular e institucional relacionados con la Ciencia Política.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Ciencia Política se distribuye en 4 años de la siguiente manera:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Introducción a la Ciencia Política, Sociología, Construcción para la Ciudadanía, Introducción al Derecho y Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, Educación Sexual Integral, Sujeto de la Educación, Teoría Política I, Derecho Constitucional, Didáctica de la Ciencia Política, Derecho Privado I y Práctica II</li><li><b>3° Año:</b>  Integración de TIC, Sociología de la Educación, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía Política y Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, Derecho Administrativo, Investigación en Ciencia Política, Derecho del Trabajo, Unidad de Definición Institucional y Residencia Pedagógica</li></ul>",
            "Le detallamos la estructura curricular de Ciencia Política:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Introducción a la Ciencia Política, Sociología, Construcción para la Ciudadanía, Introducción al Derecho, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, ESI, Sujeto de la Educación, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I, Práctica II</li><li><b>3° Año:</b>  Integración de TIC, Sociología de la Educación, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía Política, Práctica III</li><li><b>4° Año:</b>  Ética Docente, Derecho Administrativo, Investigación, Derecho del Trabajo, Unidad Institucional, Residencia</li></ul>",
            "Le recordamos que el plan de estudios oficial para Ciencia Política se distribuye en 4 años de la siguiente manera:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Introducción a la Ciencia Política, Sociología, Construcción para la Ciudadanía, Introducción al Derecho y Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, Educación Sexual Integral, Sujeto de la Educación, Teoría Política I, Derecho Constitucional, Didáctica de la Ciencia Política, Derecho Privado I y Práctica II</li><li><b>3° Año:</b>  Integración de TIC, Sociología de la Educación, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía Política y Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, Derecho Administrativo, Investigación en Ciencia Política, Derecho del Trabajo, Unidad de Definición Institucional y Residencia Pedagógica. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El profesorado dura 4 años y tiene estas materias!:<br><ul><li><b>1° Año:</b>  cursás Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Introducción a la Ciencia Política, Sociología, Construcción para la Ciudadanía, Introducción al Derecho y Práctica I</li><li><b>2° Año:</b>  tenés Filosofía, Historia de las Políticas Educativas, ESI, Sujeto de la Educación, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I y Práctica II</li><li><b>3° Año:</b>  cursás TIC, Sociología de la Educación, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía Política y Práctica III</li><li><b>4° Año:</b>  hacés Ética Docente, Derecho Administrativo, Investigación, Derecho del Trabajo, Unidad Institucional y la Residencia Pedagógica</li></ul>",
            "Te comento el plan de Ciencia Política por años:<br><ul><li><b>1° Año:</b>  tiene Pedagogía, Psicología, Alfabetización, Didáctica, Introducción a la Ciencia Política, Sociología, Ciudadanía, Introducción al Derecho y Práctica I</li><li><b>2° Año:</b>  ves Filosofía, Historia de la Educación, ESI, Sujeto, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I y Práctica II</li><li><b>3° Año:</b>  cursás TIC, Sociología Educativa, Formación Ética, Política Internacional, Teoría Política II, Derecho Privado II, Economía y Práctica III. El último año cerrás con Ética Docente, Derecho Administrativo, Investigación, Derecho del Trabajo, Unidad Institucional y la Residencia</li></ul>",
            "¡Te paso este dato! ¡El profesorado dura 4 años y tiene estas materias!:<br><ul><li><b>1° Año:</b>  cursás Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Introducción a la Ciencia Política, Sociología, Construcción para la Ciudadanía, Introducción al Derecho y Práctica I</li><li><b>2° Año:</b>  tenés Filosofía, Historia de las Políticas Educativas, ESI, Sujeto de la Educación, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I y Práctica II</li><li><b>3° Año:</b>  cursás TIC, Sociología de la Educación, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía Política y Práctica III</li><li><b>4° Año:</b>  hacés Ética Docente, Derecho Administrativo, Investigación, Derecho del Trabajo, Unidad Institucional y la Residencia Pedagógica. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo del Profesorado:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización, Didáctica, Introducción a la Ciencia Política, Sociología, Ciudadanía, Introducción al Derecho, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, ESI, Sujeto, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I, Práctica II</li><li><b>3° Año:</b>  TIC, Sociología Educativa, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía, Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, Derecho Administrativo, Investigación en Ciencia Política, Derecho del Trabajo, Unidad Institucional y Residencia Pedagógica</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las asignaturas por año del profesorado de Ciencia Política son:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Intro. Ciencia Política, Sociología, Ciudadanía, Intro. Derecho, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia Educación, ESI, Sujeto, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I, Práctica II</li><li><b>3° Año:</b>  TIC, Sociología Educación, Formación Ética, Política Internacional, Teoría Política II, Derecho Privado II, Economía, Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, Derecho Administrativo, Investigación, Derecho del Trabajo, Unidad Institucional, Residencia</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo del Profesorado:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización, Didáctica, Introducción a la Ciencia Política, Sociología, Ciudadanía, Introducción al Derecho, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, ESI, Sujeto, Teoría Política I, Derecho Constitucional, Didáctica, Derecho Privado I, Práctica II</li><li><b>3° Año:</b>  TIC, Sociología Educativa, Formación Ética, Política y Relaciones Internacionales, Teoría Política II, Derecho Privado II, Economía, Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, Derecho Administrativo, Investigación en Ciencia Política, Derecho del Trabajo, Unidad Institucional y Residencia Pedagógica. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Profesor en Ciencia Política podrá insertarse profesionalmente en:<br><ul><li>Instituciones educativas de nivel secundario de gestión pública, privada, cooperativa y social.</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia.</li><li>Instituciones abocadas a la investigación y la capacitación.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Profesor en Ciencia Política podrá insertarse profesionalmente en:<br><ul><li>Instituciones educativas de nivel secundario de gestión pública, privada, cooperativa y social.</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia.</li><li>Instituciones abocadas a la investigación y la capacitación.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Profesor en Ciencia Política podrá insertarse profesionalmente en:<br><ul><li>Instituciones educativas de nivel secundario de gestión pública, privada, cooperativa y social.</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia.</li><li>Instituciones abocadas a la investigación y la capacitación.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial del Profesorado de Educación Secundaria en Ciencia Política se desarrolla durante el Turno Mañana.",
            "Las clases de Ciencia Política se dictan en el Turno Mañana en la Sede Central.",
            "Le recordamos que el cursado presencial del Profesorado de Educación Secundaria en Ciencia Política se desarrolla durante el Turno Mañana. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial a la mañana.",
            "El horario de clases de Ciencia Política corresponde al Turno Mañana.",
            "¡Te paso este dato! Se cursa presencial a la mañana. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Ciencia Política se dictan durante el Turno Mañana.",
            "Pedimos disculpas. Confirmamos que la carrera de Ciencia Política se cursa en el Turno Mañana.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Ciencia Política se dictan durante el Turno Mañana. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencia Política</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 35</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora del Profesorado de Educación Secundaria en Ciencia Política es la Prof. Silvia Cichello. Sus horarios de consulta presencial son los días Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y de 15:40 a 18:20 hs.",
            "Para contactar a la coordinación de Ciencia Política, puede consultar a la Prof. Silvia Cichello los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y de 15:40 a 18:20 hs.",
            "Le recordamos que la coordinadora del Profesorado de Educación Secundaria en Ciencia Política es la Prof. Silvia Cichello. Sus horarios de consulta presencial son los días Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y de 15:40 a 18:20 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Ciencia Política es la Prof. Silvia Cichello. La podés consultar los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "Si necesitás hablar con la coordinadora Silvia Cichello, atiende consultas los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "¡Te paso este dato! La coordinadora de Ciencia Política es la Prof. Silvia Cichello. La podés consultar los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora responsable es la Prof. Silvia Cichello, quien atiende los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que la Prof. Silvia Cichello coordina Ciencia Política; atiende consultas los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora responsable es la Prof. Silvia Cichello, quien atiende los Lunes de 16:00 a 18:40 hs., Miércoles de 09:20 a 12:00 hs., y Jueves de 08:00 a 12:00 hs. y 15:40 a 18:20 hs. Agradecemos su comprensión."
        ]
        }
    },    carrera_educacion_especial: {
        descripcion_carrera: {
            formal: ["Contamos con dos orientaciones distintas para el Profesorado de Educación Especial, dependiendo de la Sede. Por favor, seleccione la que desea consultar:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            informal: ["¡Tenemos dos orientaciones de Educación Especial! Elegí la sede que te interese para ver los detalles:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            molesto: ["La carrera se divide en dos orientaciones. Indique cuál le interesa:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"]
        },
        plan_estudios_completo: {
            formal: ["Por favor, seleccione la orientación para ver el plan de estudios:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            informal: ["Por favor, seleccione la orientación para ver el plan de estudios:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            molesto: ["Por favor, seleccione la orientación para ver el plan de estudios:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"]
        },
        campo_laboral: {
            formal: ["Por favor, seleccione la orientación para ver el campo laboral:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            informal: ["Por favor, seleccione la orientación para ver el campo laboral:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            molesto: ["Por favor, seleccione la orientación para ver el campo laboral:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"]
        },
        horario_atencion: {
            formal: ["Por favor, seleccione la orientación para ver los horarios:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            informal: ["Por favor, seleccione la orientación para ver los horarios:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            molesto: ["Por favor, seleccione la orientación para ver los horarios:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"]
        },
        coordinador: {
            formal: ["Por favor, seleccione la orientación para ver al coordinador:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            informal: ["Por favor, seleccione la orientación para ver al coordinador:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"],
            molesto: ["Por favor, seleccione la orientación para ver al coordinador:<br><br><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_intelectual\">Especial Orientación Intelectual - Sede Central</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Información de carrera_especial_sordos\">Especial Orientación Sordo Hipoacúsicos - San Pedro</button></div>"]
        },
        nombre: "Profesorado de Educación Especial (Ambas Orientaciones)"
    },
    carrera_especial_intelectual: {
        descripcion_carrera: {
            formal: ["El Profesorado de Educación Especial con Orientación en Discapacidad Intelectual forma profesionales capacitados para acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.<br><br><b>Perfil del Egresado:</b><br>El Profesor de Educación Especial con Orientación en Discapacidad Intelectual es un profesional capacitado para:<br><ul><li>Acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.</li><li>Elaborar diseños universales de aprendizaje en el marco de un enfoque inclusivo de la educación respetuoso de la diversidad.</li><li>Planificar las tareas de aprendizaje en los escenarios específicos que surgen del abordaje de la Modalidad de Educación Especial en articulación con los distintos niveles, modalidades, ámbitos no formales, y centros vinculados con la salud asegurando entornos de accesibilidad y participación.</li><li>Evaluar pedagógicamente a sus estudiantes para generar estrategias diversificadas que respeten los tiempos, ritmos y estilos de aprendizaje.</li><li>Elaborar proyectos pedagógicos y socio comunitarios desde la perspectiva del Modelo social de discapacidad.</li></ul>"],
            informal: ["El Profesorado de Educación Especial con Orientación en Discapacidad Intelectual forma profesionales capacitados para acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.<br><br><b>Perfil del Egresado:</b><br>El Profesor de Educación Especial con Orientación en Discapacidad Intelectual es un profesional capacitado para:<br><ul><li>Acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.</li><li>Elaborar diseños universales de aprendizaje en el marco de un enfoque inclusivo de la educación respetuoso de la diversidad.</li><li>Planificar las tareas de aprendizaje en los escenarios específicos que surgen del abordaje de la Modalidad de Educación Especial en articulación con los distintos niveles, modalidades, ámbitos no formales, y centros vinculados con la salud asegurando entornos de accesibilidad y participación.</li><li>Evaluar pedagógicamente a sus estudiantes para generar estrategias diversificadas que respeten los tiempos, ritmos y estilos de aprendizaje.</li><li>Elaborar proyectos pedagógicos y socio comunitarios desde la perspectiva del Modelo social de discapacidad.</li></ul>"],
            molesto: ["El Profesorado de Educación Especial con Orientación en Discapacidad Intelectual forma profesionales capacitados para acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.<br><br><b>Perfil del Egresado:</b><br>El Profesor de Educación Especial con Orientación en Discapacidad Intelectual es un profesional capacitado para:<br><ul><li>Acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.</li><li>Elaborar diseños universales de aprendizaje en el marco de un enfoque inclusivo de la educación respetuoso de la diversidad.</li><li>Planificar las tareas de aprendizaje en los escenarios específicos que surgen del abordaje de la Modalidad de Educación Especial en articulación con los distintos niveles, modalidades, ámbitos no formales, y centros vinculados con la salud asegurando entornos de accesibilidad y participación.</li><li>Evaluar pedagógicamente a sus estudiantes para generar estrategias diversificadas que respeten los tiempos, ritmos y estilos de aprendizaje.</li><li>Elaborar proyectos pedagógicos y socio comunitarios desde la perspectiva del Modelo social de discapacidad.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["El plan de estudios (4 años) es el siguiente:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica de la Lengua, Matemática, Comunicación, Lenguaje y sus alteraciones, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b> TIC y Discapacidad, Sociología de la Educación, Didáctica de Sociales y Naturales, Abordaje Pedagógico III, Abordajes Complejos y Práctica III</li><li><b>4° Año:</b> ESI y Discapacidad Intelectual, Ética Profesional, Perspectiva del adulto con Discapacidad Intelectual, Unidad de opción institucional (x2) y Residencia Pedagógica</li></ul>"],
            informal: ["El plan de estudios (4 años) es el siguiente:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica de la Lengua, Matemática, Comunicación, Lenguaje y sus alteraciones, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b> TIC y Discapacidad, Sociología de la Educación, Didáctica de Sociales y Naturales, Abordaje Pedagógico III, Abordajes Complejos y Práctica III</li><li><b>4° Año:</b> ESI y Discapacidad Intelectual, Ética Profesional, Perspectiva del adulto con Discapacidad Intelectual, Unidad de opción institucional (x2) y Residencia Pedagógica</li></ul>"],
            molesto: ["El plan de estudios (4 años) es el siguiente:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica de la Lengua, Matemática, Comunicación, Lenguaje y sus alteraciones, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b> TIC y Discapacidad, Sociología de la Educación, Didáctica de Sociales y Naturales, Abordaje Pedagógico III, Abordajes Complejos y Práctica III</li><li><b>4° Año:</b> ESI y Discapacidad Intelectual, Ética Profesional, Perspectiva del adulto con Discapacidad Intelectual, Unidad de opción institucional (x2) y Residencia Pedagógica</li></ul>"]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Profesor de Educación Especial podrá insertarse profesionalmente en:<br><br><b>Ámbito Educativo:</b><br><ul><li>Escuelas de todos los niveles y modalidades obligatorios.</li><li>Acompañamiento a las trayectorias de los estudiantes con discapacidad intelectual.</li><li>Co enseñanza con docentes de las instituciones de educación común.</li><li>Abordaje Institucional: identificación y eliminación de barreras y promoción de la participación.</li><li>Fortalecimiento de acciones de educación inclusiva de enseñanza y aprendizaje.</li><li>Configuraciones de Apoyos para la inclusión.</li><li>Trabajo en equipo y Abordaje interdisciplinario con profesionales (psicólogos, fonoaudiólogos, trabajadores sociales, otros).</li></ul><br><b>Ámbito de la Salud:</b><br><ul><li>Trabajo independiente: Acompañamiento a trayectorias de los estudiantes con discapacidad intelectual en escuelas comunes y acompañamiento pedagógico.</li><li>Abordaje Interdisciplinario con otros profesionales.</li><li>Centros educativos y de rehabilitación (privados).</li></ul><br><b>Ámbito Socio Comunitario:</b><br><ul><li>Clubes deportivos y recreativos, catequesis, centros comunitarios y vecinales, ONG y en todo aquel escenario donde esté presente la persona con discapacidad con la función de eliminar las barreras y promover su inclusión.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Profesor de Educación Especial podrá insertarse profesionalmente en:<br><br><b>Ámbito Educativo:</b><br><ul><li>Escuelas de todos los niveles y modalidades obligatorios.</li><li>Acompañamiento a las trayectorias de los estudiantes con discapacidad intelectual.</li><li>Co enseñanza con docentes de las instituciones de educación común.</li><li>Abordaje Institucional: identificación y eliminación de barreras y promoción de la participación.</li><li>Fortalecimiento de acciones de educación inclusiva de enseñanza y aprendizaje.</li><li>Configuraciones de Apoyos para la inclusión.</li><li>Trabajo en equipo y Abordaje interdisciplinario con profesionales (psicólogos, fonoaudiólogos, trabajadores sociales, otros).</li></ul><br><b>Ámbito de la Salud:</b><br><ul><li>Trabajo independiente: Acompañamiento a trayectorias de los estudiantes con discapacidad intelectual en escuelas comunes y acompañamiento pedagógico.</li><li>Abordaje Interdisciplinario con otros profesionales.</li><li>Centros educativos y de rehabilitación (privados).</li></ul><br><b>Ámbito Socio Comunitario:</b><br><ul><li>Clubes deportivos y recreativos, catequesis, centros comunitarios y vecinales, ONG y en todo aquel escenario donde esté presente la persona con discapacidad con la función de eliminar las barreras y promover su inclusión.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Profesor de Educación Especial podrá insertarse profesionalmente en:<br><br><b>Ámbito Educativo:</b><br><ul><li>Escuelas de todos los niveles y modalidades obligatorios.</li><li>Acompañamiento a las trayectorias de los estudiantes con discapacidad intelectual.</li><li>Co enseñanza con docentes de las instituciones de educación común.</li><li>Abordaje Institucional: identificación y eliminación de barreras y promoción de la participación.</li><li>Fortalecimiento de acciones de educación inclusiva de enseñanza y aprendizaje.</li><li>Configuraciones de Apoyos para la inclusión.</li><li>Trabajo en equipo y Abordaje interdisciplinario con profesionales (psicólogos, fonoaudiólogos, trabajadores sociales, otros).</li></ul><br><b>Ámbito de la Salud:</b><br><ul><li>Trabajo independiente: Acompañamiento a trayectorias de los estudiantes con discapacidad intelectual en escuelas comunes y acompañamiento pedagógico.</li><li>Abordaje Interdisciplinario con otros profesionales.</li><li>Centros educativos y de rehabilitación (privados).</li></ul><br><b>Ámbito Socio Comunitario:</b><br><ul><li>Clubes deportivos y recreativos, catequesis, centros comunitarios y vecinales, ONG y en todo aquel escenario donde esté presente la persona con discapacidad con la función de eliminar las barreras y promover su inclusión.</li></ul>"]
        },
        horario_atencion: {
            formal: ["El cursado presencial se desarrolla en los Turnos Mañana y Noche, en Casa Central."],
            informal: ["Las clases se dictan en los Turnos Mañana y Noche, en Casa Central."],
            molesto: ["Horarios correspondientes a Turnos Mañana y Noche (Central)."]
        },
        coordinador: {
            formal: ["La coordinadora es la Prof. Jimena Cabrera. (Días Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.)"],
            informal: ["La coordinadora es la Prof. Jimena Cabrera. (Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.)"],
            molesto: ["La coordinación está a cargo de la Prof. Jimena Cabrera."]
        },
        nombre: "Profesorado de Educación Especial con Orientación en Discapacidad Intelectual"
    },

    carrera_especial_sordos: {
        descripcion_carrera: {
            formal: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Acompañar el proceso educativo de estudiantes con discapacidad sensorial auditiva a través del diseño de propuestas pedagógicas accesibles.</li><li>Elaborar propuestas pedagógicas inclusivas.</li><li>Planificar las tareas de aprendizaje en Modalidad Especial asegurando entornos de accesibilidad.</li><li>Evaluar pedagógicamente para generar estrategias diversificadas.</li><li>Elaborar proyectos pedagógicos y socio comunitarios.</li></ul>"],
            informal: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Acompañar el proceso educativo de estudiantes con discapacidad sensorial auditiva a través del diseño de propuestas pedagógicas accesibles.</li><li>Elaborar propuestas pedagógicas inclusivas.</li><li>Planificar las tareas de aprendizaje en Modalidad Especial asegurando entornos de accesibilidad.</li><li>Evaluar pedagógicamente para generar estrategias diversificadas.</li><li>Elaborar proyectos pedagógicos y socio comunitarios.</li></ul>"],
            molesto: ["💡 Esta carrera se dicta exclusivamente en la **Sede San Pedro**.<br><br><b>Perfil del Egresado:</b><br><ul><li>Acompañar el proceso educativo de estudiantes con discapacidad sensorial auditiva a través del diseño de propuestas pedagógicas accesibles.</li><li>Elaborar propuestas pedagógicas inclusivas.</li><li>Planificar las tareas de aprendizaje en Modalidad Especial asegurando entornos de accesibilidad.</li><li>Evaluar pedagógicamente para generar estrategias diversificadas.</li><li>Elaborar proyectos pedagógicos y socio comunitarios.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: ["El plan de estudios (4 años) es el siguiente:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico Bilingüe y Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica de Lengua y Matemática, Comunicación, Lenguaje, Lengua de Señas Argentinas I, Abordaje Pedagógico (Nivel Primario) y Práctica II</li><li><b>3° Año:</b> TIC y Discapacidad Auditiva, Sociología de la Educación, Didáctica de Sociales y Naturales, Lengua de Señas Argentinas II, Abordaje Pedagógico (Nivel Secundario) y Práctica III</li><li><b>4° Año:</b> ESI, Ética Profesional, Abordaje Pedagógico Complejo y Psicomotriz, Perspectiva Educativa, Social y Laboral, Unidad de opción institucional y Residencia Pedagógica</li></ul>"],
            informal: ["El plan de estudios (4 años) es el siguiente:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico Bilingüe y Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica de Lengua y Matemática, Comunicación, Lenguaje, Lengua de Señas Argentinas I, Abordaje Pedagógico (Nivel Primario) y Práctica II</li><li><b>3° Año:</b> TIC y Discapacidad Auditiva, Sociología de la Educación, Didáctica de Sociales y Naturales, Lengua de Señas Argentinas II, Abordaje Pedagógico (Nivel Secundario) y Práctica III</li><li><b>4° Año:</b> ESI, Ética Profesional, Abordaje Pedagógico Complejo y Psicomotriz, Perspectiva Educativa, Social y Laboral, Unidad de opción institucional y Residencia Pedagógica</li></ul>"],
            molesto: ["El plan de estudios (4 años) es el siguiente:<br><ul><li><b>1° Año:</b> Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico Bilingüe y Práctica I</li><li><b>2° Año:</b> Filosofía, Historia de las Políticas Educativas, Didáctica de Lengua y Matemática, Comunicación, Lenguaje, Lengua de Señas Argentinas I, Abordaje Pedagógico (Nivel Primario) y Práctica II</li><li><b>3° Año:</b> TIC y Discapacidad Auditiva, Sociología de la Educación, Didáctica de Sociales y Naturales, Lengua de Señas Argentinas II, Abordaje Pedagógico (Nivel Secundario) y Práctica III</li><li><b>4° Año:</b> ESI, Ética Profesional, Abordaje Pedagógico Complejo y Psicomotriz, Perspectiva Educativa, Social y Laboral, Unidad de opción institucional y Residencia Pedagógica</li></ul>"]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>La Ley N° 26.206 define:<br><ul><li>Educación Especial</li><li>Educación Común (Nivel Inicial, Primario y Secundario)</li><li>Educación No Formal</li><li>Entidades de Desarrollo Social y Laboral</li><li>Ámbitos de la Salud y Seguridad</li><li>Instituciones No Gubernamentales</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>La Ley N° 26.206 define:<br><ul><li>Educación Especial</li><li>Educación Común (Nivel Inicial, Primario y Secundario)</li><li>Educación No Formal</li><li>Entidades de Desarrollo Social y Laboral</li><li>Ámbitos de la Salud y Seguridad</li><li>Instituciones No Gubernamentales</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>La Ley N° 26.206 define:<br><ul><li>Educación Especial</li><li>Educación Común (Nivel Inicial, Primario y Secundario)</li><li>Educación No Formal</li><li>Entidades de Desarrollo Social y Laboral</li><li>Ámbitos de la Salud y Seguridad</li><li>Instituciones No Gubernamentales</li></ul>"]
        },
        horario_atencion: {
            formal: ["El cursado se desarrolla en el Turno Noche, en la Sede San Pedro."],
            informal: ["Las clases se dictan en el Turno Noche, en Sede San Pedro."],
            molesto: ["Turno Noche (San Pedro)."]
        },
        coordinador: {
            formal: ["La Coordinación de la Carrera en Sede San Pedro atiende en horarios específicos a confirmar en la sede administrativa."],
            informal: ["Podés acercarte a la Sede San Pedro para consultar los horarios de coordinación."],
            molesto: ["Atención en Sede San Pedro."]
        },
        nombre: "Profesorado de Educación Especial con Orientación en Sordos e Hipoacúsicos"
    },

    ciencias_sagradas: {
        descripcion_carrera: {
            formal: ["El Profesorado en Ciencias Sagradas es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.<br><br><b>Perfil del Egresado:</b><br>El Profesor en Ciencias Sagradas es un profesional capacitado para:<br><ul><li>Planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.</li><li>Desarrollar su práctica docente teniendo en cuenta las características y necesidades de los estudiantes, los vínculos con otros docentes, las familias y las problemáticas surgidas de la relación entre el contexto interno y externo de las escuelas.</li><li>Participar en equipos interdisciplinarios para el diseño e implementación de proyectos de pastoral educativa.</li></ul>"],
            informal: ["El Profesorado en Ciencias Sagradas es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.<br><br><b>Perfil del Egresado:</b><br>El Profesor en Ciencias Sagradas es un profesional capacitado para:<br><ul><li>Planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.</li><li>Desarrollar su práctica docente teniendo en cuenta las características y necesidades de los estudiantes, los vínculos con otros docentes, las familias y las problemáticas surgidas de la relación entre el contexto interno y externo de las escuelas.</li><li>Participar en equipos interdisciplinarios para el diseño e implementación de proyectos de pastoral educativa.</li></ul>"],
            molesto: ["El Profesorado en Ciencias Sagradas es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.<br><br><b>Perfil del Egresado:</b><br>El Profesor en Ciencias Sagradas es un profesional capacitado para:<br><ul><li>Planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.</li><li>Desarrollar su práctica docente teniendo en cuenta las características y necesidades de los estudiantes, los vínculos con otros docentes, las familias y las problemáticas surgidas de la relación entre el contexto interno y externo de las escuelas.</li><li>Participar en equipos interdisciplinarios para el diseño e implementación de proyectos de pastoral educativa.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial de Ciencias Sagradas se organiza en 4 años:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía y Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, Sujeto de la Educación, Didáctica de la Formación Religiosa (Inicial/Primaria), Cristología, Antropología Filosófica, Ética, Seminario Bíblico II y Práctica II</li><li><b>3° Año:</b>  ESI, Integración de TIC, Sociología de la Educación, Eclesiología, Formación Ética y Ciudadana, Bioética, Didáctica de la Formación Religiosa (Secundaria), Didáctica de la Formación Ética y Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, La Formación Religiosa y el Sujeto con Discapacidad, Ecumenismo y Diálogo Interreligioso, Tradiciones Religiosas y Religiosidad Popular, dos Unidades de Definición Institucional y Residencia Pedagógica</li></ul>",
            "Le detallamos la distribución anual de Ciencias Sagradas:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización, Didáctica, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de la Educación, Sujeto de la Educación, Didáctica de la Formación Religiosa I, Cristología, Antropología Filosófica, Ética, Seminario Bíblico II, Práctica II</li><li><b>3° Año:</b>  ESI, TIC, Sociología de la Educación, Eclesiología, Formación Ética, Bioética, Didáctica de Formación Religiosa II, Didáctica de Formación Ética, Práctica III</li><li><b>4° Año:</b>  Ética Docente, Formación Religiosa y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos Unidades Institucionales, Residencia</li></ul>",
            "Le recordamos que el plan de estudios oficial de Ciencias Sagradas se organiza en 4 años:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía y Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, Sujeto de la Educación, Didáctica de la Formación Religiosa (Inicial/Primaria), Cristología, Antropología Filosófica, Ética, Seminario Bíblico II y Práctica II</li><li><b>3° Año:</b>  ESI, Integración de TIC, Sociología de la Educación, Eclesiología, Formación Ética y Ciudadana, Bioética, Didáctica de la Formación Religiosa (Secundaria), Didáctica de la Formación Ética y Práctica III</li><li><b>4° Año:</b>  Ética Profesional Docente, La Formación Religiosa y el Sujeto con Discapacidad, Ecumenismo y Diálogo Interreligioso, Tradiciones Religiosas y Religiosidad Popular, dos Unidades de Definición Institucional y Residencia Pedagógica. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan dura 4 años!:<br><ul><li><b>1° Año:</b>  tenés Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía y Práctica I</li><li><b>2° Año:</b>  cursás Filosofía, Historia de las Políticas Educativas, Sujeto de la Educación, Didáctica de la Formación Religiosa (Inicial y Primaria), Cristología, Antropología Filosófica, Ética, Seminario Bíblico II y Práctica II</li><li><b>3° Año:</b>  ves ESI, TIC, Sociología de la Educación, Eclesiología, Formación Ética, Bioética, Didáctica de Formación Religiosa (Secundaria), Didáctica de Formación Ética y Práctica III</li><li><b>4° Año:</b>  cerrás con Ética Docente, Formación Religiosa y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos materias de opción institucional y la Residencia</li></ul>",
            "Te cuento el plan de Ciencias Sagradas por año:<br><ul><li><b>1° Año:</b>  tiene Pedagogía, Psicología, Alfabetización, Didáctica, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía y Práctica I</li><li><b>2° Año:</b>  tiene Filosofía, Historia, Sujeto, Didáctica de Formación Religiosa (Inicial/Primaria), Cristología, Antropología, Ética, Seminario Bíblico II y Práctica II</li><li><b>3° Año:</b>  tiene ESI, TIC, Sociología, Eclesiología, Formación Ética, Bioética, Didáctica de Formación Religiosa (Secundaria), Didáctica de Formación Ética y Práctica III</li><li><b>4° Año:</b>  cursás Ética Docente, Formación Religiosa y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos materias institucionales y la Residencia</li></ul>",
            "¡Te paso este dato! ¡El plan dura 4 años!:<br><ul><li><b>1° Año:</b>  tenés Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía y Práctica I</li><li><b>2° Año:</b>  cursás Filosofía, Historia de las Políticas Educativas, Sujeto de la Educación, Didáctica de la Formación Religiosa (Inicial y Primaria), Cristología, Antropología Filosófica, Ética, Seminario Bíblico II y Práctica II</li><li><b>3° Año:</b>  ves ESI, TIC, Sociología de la Educación, Eclesiología, Formación Ética, Bioética, Didáctica de Formación Religiosa (Secundaria), Didáctica de Formación Ética y Práctica III</li><li><b>4° Año:</b>  cerrás con Ética Docente, Formación Religiosa y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos materias de opción institucional y la Residencia. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Las asignaturas de Ciencias Sagradas son:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia, Sujeto, Didáctica Formación Religiosa (Inicial/Primaria), Cristología, Antropología, Ética, Seminario Bíblico II, Práctica II</li><li><b>3° Año:</b>  ESI, TIC, Sociología, Eclesiología, Formación Ética, Bioética, Didáctica Formación Religiosa (Secundaria), Didáctica Formación Ética, Práctica III</li><li><b>4° Año:</b>  Ética Docente, Formación Religiosa y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos Unidades de Definición Institucional y Residencia Pedagógica</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias obligatorias por año del profesorado de Ciencias Sagradas son:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Teología Fundamental, Seminario Bíblico I, Filosofía, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia, Sujeto, Didáctica de Religión I, Cristología, Antropología, Ética, Seminario Bíblico II, Práctica II</li><li><b>3° Año:</b>  ESI, TIC, Sociología, Eclesiología, Formación Ética, Bioética, Didáctica de Religión II, Didáctica de Ética, Práctica III</li><li><b>4° Año:</b>  Docente, Religión y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos Unidades de Definición Institucional, Residencia</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Las asignaturas de Ciencias Sagradas son:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Teología Fundamental, Seminario Bíblico I, Historia de la Filosofía, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia, Sujeto, Didáctica Formación Religiosa (Inicial/Primaria), Cristología, Antropología, Ética, Seminario Bíblico II, Práctica II</li><li><b>3° Año:</b>  ESI, TIC, Sociología, Eclesiología, Formación Ética, Bioética, Didáctica Formación Religiosa (Secundaria), Didáctica Formación Ética, Práctica III</li><li><b>4° Año:</b>  Ética Docente, Formación Religiosa y Discapacidad, Ecumenismo, Tradiciones Religiosas, dos Unidades de Definición Institucional y Residencia Pedagógica. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Profesor en Ciencias Sagradas podrá insertarse profesionalmente en:<br><ul><li>Instituciones educativas confesionales, en los tres niveles obligatorios: inicial, primaria y secundaria.</li><li>En las instituciones escolares podrá ocupar distintos roles tales como: docente, docente tutor, preceptor, coordinador de pastoral, referente de ESI.</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia.</li><li>Proyectos de pastoral sociocomunitaria.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Profesor en Ciencias Sagradas podrá insertarse profesionalmente en:<br><ul><li>Instituciones educativas confesionales, en los tres niveles obligatorios: inicial, primaria y secundaria.</li><li>En las instituciones escolares podrá ocupar distintos roles tales como: docente, docente tutor, preceptor, coordinador de pastoral, referente de ESI.</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia.</li><li>Proyectos de pastoral sociocomunitaria.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Profesor en Ciencias Sagradas podrá insertarse profesionalmente en:<br><ul><li>Instituciones educativas confesionales, en los tres niveles obligatorios: inicial, primaria y secundaria.</li><li>En las instituciones escolares podrá ocupar distintos roles tales como: docente, docente tutor, preceptor, coordinador de pastoral, referente de ESI.</li><li>Programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia.</li><li>Proyectos de pastoral sociocomunitaria.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial del Profesorado en Ciencias Sagradas se desarrolla durante el Turno Noche.",
            "Las clases de Ciencias Sagradas se dictan de lunes a viernes en el Turno Noche.",
            "Le recordamos que el cursado presencial del Profesorado en Ciencias Sagradas se desarrolla durante el Turno Noche. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la noche.",
            "El horario de clases de Ciencias Sagradas corresponde al Turno Noche.",
            "¡Te paso este dato! Se cursa presencial por la noche. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Ciencias Sagradas se dictan durante el Turno Noche.",
            "Pedimos disculpas. Confirmamos que la carrera de Ciencias Sagradas se cursa en el Turno Noche.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Ciencias Sagradas se dictan durante el Turno Noche. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Ciencias Sagradas</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 21</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 20</span></div><div class="aula-row"><span class="aula-year">4° Año</span><span class="aula-badge">Aula 33</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora del Profesorado en Ciencias Sagradas es la Prof. Susana Villa. Sus horarios de consulta presencial son los días Martes de 17:00 a 20:00 hs., y Miércoles y Jueves de 18:00 a 20:30 hs.",
            "Para contactar a la coordinación de Ciencias Sagradas, puede consultar a la Prof. Susana Villa los Martes de 17:00 a 20:00 hs., y Miércoles y Jueves de 18:00 a 20:30 hs.",
            "Le recordamos que la coordinadora del Profesorado en Ciencias Sagradas es la Prof. Susana Villa. Sus horarios de consulta presencial son los días Martes de 17:00 a 20:00 hs., y Miércoles y Jueves de 18:00 a 20:30 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Ciencias Sagradas es la Prof. Susana Villa. La podés consultar los Martes de 17:00 a 20:00 hs., y los Miércoles y Jueves de 18:00 a 20:30 hs.",
            "Si necesitás hablar con la coordinadora Susana Villa, atiende consultas los Martes de 17:00 a 20:00 hs., y los Miércoles y Jueves de 18:00 a 20:30 hs.",
            "¡Te paso este dato! La coordinadora de Ciencias Sagradas es la Prof. Susana Villa. La podés consultar los Martes de 17:00 a 20:00 hs., y los Miércoles y Jueves de 18:00 a 20:30 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora responsable es la Prof. Susana Villa, quien atiende consultas los Martes de 17:00 a 20:00 hs., y Miércoles y Jueves de 18:00 a 20:30 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que la Prof. Susana Villa coordina la carrera; atiende consultas los Martes de 17:00 a 20:00 hs., y Miércoles y Jueves de 18:00 a 20:30 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora responsable es la Prof. Susana Villa, quien atiende consultas los Martes de 17:00 a 20:00 hs., y Miércoles y Jueves de 18:00 a 20:30 hs. Agradecemos su comprensión."
        ]
        }
    },
    gestion_ambiental: {
        descripcion_carrera: {
            formal: ["La Tecnicatura Superior en Gestión Ambiental es una carrera de educación superior técnica orientada a formar profesionales capacitados para participar en acciones ambientales clave como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Gestión Ambiental será un profesional capacitado para:<br><ul><li>Participar en acciones tales como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.</li><li>Aplicar métodos y técnicas de monitoreo y recopilación de datos, tales como muestras de suelos, aguas, gaseosas, productos químicos industriales de baja peligrosidad respetando los protocolos establecidos.</li><li>Supervisar los procedimientos de manejo de insumos y residuos, tanto de índoles material como energética.</li><li>Verificar la aplicación de la normativa ambiental vigente tanto de cumplimiento obligatorio como voluntario.</li><li>Realizar inspecciones y auditorías ambientales.</li><li>Asesorar en el proceso de certificación de normas de calidad ambiental.</li><li>Fomentar la incorporación de la variable ambiental como un valor agregado en la comercialización de servicios y productos.</li><li>Asesorar la adquisición de suministros de bajo impacto ambiental.</li><li>Generar propuestas, programas y/o proyectos orientados a resolver problemas ambientales desde una perspectiva sustentable.</li><li>Gestionar ante organismos públicos y privados la tramitación de expedientes relativos a cuestiones ambientales públicas o privadas.</li><li>Planificar e implementar programas y campañas de información y educación ambiental.</li><li>Interactuar con profesionales de distintos campos en el relevamiento, evaluación y gestión de las condiciones ambientales y en la prevención de accidentes, tanto en el ámbito de trabajo como en la comunidad en la que se encuentra.</li></ul>"],
            informal: ["La Tecnicatura Superior en Gestión Ambiental es una carrera de educación superior técnica orientada a formar profesionales capacitados para participar en acciones ambientales clave como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Gestión Ambiental será un profesional capacitado para:<br><ul><li>Participar en acciones tales como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.</li><li>Aplicar métodos y técnicas de monitoreo y recopilación de datos, tales como muestras de suelos, aguas, gaseosas, productos químicos industriales de baja peligrosidad respetando los protocolos establecidos.</li><li>Supervisar los procedimientos de manejo de insumos y residuos, tanto de índoles material como energética.</li><li>Verificar la aplicación de la normativa ambiental vigente tanto de cumplimiento obligatorio como voluntario.</li><li>Realizar inspecciones y auditorías ambientales.</li><li>Asesorar en el proceso de certificación de normas de calidad ambiental.</li><li>Fomentar la incorporación de la variable ambiental como un valor agregado en la comercialización de servicios y productos.</li><li>Asesorar la adquisición de suministros de bajo impacto ambiental.</li><li>Generar propuestas, programas y/o proyectos orientados a resolver problemas ambientales desde una perspectiva sustentable.</li><li>Gestionar ante organismos públicos y privados la tramitación de expedientes relativos a cuestiones ambientales públicas o privadas.</li><li>Planificar e implementar programas y campañas de información y educación ambiental.</li><li>Interactuar con profesionales de distintos campos en el relevamiento, evaluación y gestión de las condiciones ambientales y en la prevención de accidentes, tanto en el ámbito de trabajo como en la comunidad en la que se encuentra.</li></ul>"],
            molesto: ["La Tecnicatura Superior en Gestión Ambiental es una carrera de educación superior técnica orientada a formar profesionales capacitados para participar en acciones ambientales clave como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Gestión Ambiental será un profesional capacitado para:<br><ul><li>Participar en acciones tales como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.</li><li>Aplicar métodos y técnicas de monitoreo y recopilación de datos, tales como muestras de suelos, aguas, gaseosas, productos químicos industriales de baja peligrosidad respetando los protocolos establecidos.</li><li>Supervisar los procedimientos de manejo de insumos y residuos, tanto de índoles material como energética.</li><li>Verificar la aplicación de la normativa ambiental vigente tanto de cumplimiento obligatorio como voluntario.</li><li>Realizar inspecciones y auditorías ambientales.</li><li>Asesorar en el proceso de certificación de normas de calidad ambiental.</li><li>Fomentar la incorporación de la variable ambiental como un valor agregado en la comercialización de servicios y productos.</li><li>Asesorar la adquisición de suministros de bajo impacto ambiental.</li><li>Generar propuestas, programas y/o proyectos orientados a resolver problemas ambientales desde una perspectiva sustentable.</li><li>Gestionar ante organismos públicos y privados la tramitación de expedientes relativos a cuestiones ambientales públicas o privadas.</li><li>Planificar e implementar programas y campañas de información y educación ambiental.</li><li>Interactuar con profesionales de distintos campos en el relevamiento, evaluación y gestión de las condiciones ambientales y en la prevención de accidentes, tanto en el ámbito de trabajo como en la comunidad en la que se encuentra.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Gestión Ambiental consta de:<br><ul><li><b>1° Año:</b>  Biología, Matemática y Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales y Ambientales, Gestión Ambiental Digital, Alfabetización Académica y Comunicación, y Práctica Profesionalizante I</li><li><b>2° Año:</b>  Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación y Toxicología Ambiental, Espacio de Definición Institucional I (EDI I), Economía Ambiental, Ecología y Desarrollo Sostenible, Metodología de la Investigación y Práctica Profesionalizante II</li><li><b>3° Año:</b>  Educación y Comunicación Ambiental, Ordenamiento Ambiental del Territorio, Ética y Deontología Profesional, Sistemas de Gestión y Auditorías Ambientales, Evaluaciones de Impacto Ambiental, Seguridad Ambiental y Laboral, EDI II, Gestión Ambiental Minera, Planificación y Gestión de Proyectos, y Práctica Profesional III</li></ul>",
            "Le detallamos la distribución anual de materias de Gestión Ambiental:<br><ul><li><b>1° Año:</b>  Biología, Matemática/Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales/Ambientales, Gestión Digital, Alfabetización, Práctica I</li><li><b>2° Año:</b>  Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación/Toxicología, EDI I, Economía Ambiental, Ecología/Desarrollo Sostenible, Metodología, Práctica II</li><li><b>3° Año:</b>  Educación/Comunicación Ambiental, Ordenamiento Ambiental, Ética, Sistemas de Gestión y Auditorías, Evaluación de Impacto Ambiental, Seguridad Ambiental/Laboral, EDI II, Gestión Ambiental Minera, Planificación de Proyectos, Práctica III</li></ul>",
            "Le recordamos que el plan de estudios oficial para Gestión Ambiental consta de:<br><ul><li><b>1° Año:</b>  Biología, Matemática y Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales y Ambientales, Gestión Ambiental Digital, Alfabetización Académica y Comunicación, y Práctica Profesionalizante I</li><li><b>2° Año:</b>  Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación y Toxicología Ambiental, Espacio de Definición Institucional I (EDI I), Economía Ambiental, Ecología y Desarrollo Sostenible, Metodología de la Investigación y Práctica Profesionalizante II</li><li><b>3° Año:</b>  Educación y Comunicación Ambiental, Ordenamiento Ambiental del Territorio, Ética y Deontología Profesional, Sistemas de Gestión y Auditorías Ambientales, Evaluaciones de Impacto Ambiental, Seguridad Ambiental y Laboral, EDI II, Gestión Ambiental Minera, Planificación y Gestión de Proyectos, y Práctica Profesional III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Gestión Ambiental dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés: Biología, Matemática y Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales y Ambientales, Gestión Ambiental Digital, Alfabetización y Práctica I</li><li><b>2° Año:</b>  cursás: Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación y Toxicología, EDI I, Economía Ambiental, Ecología y Sostenibilidad, Metodología y Práctica II</li><li><b>3° Año:</b>  ves: Educación y Comunicación Ambiental, Ordenamiento Ambiental, Ética, Sistemas de Gestión, Evaluación de Impacto Ambiental, Seguridad Ambiental, EDI II, Gestión Ambiental Minera, Proyectos y Práctica III</li></ul>",
            "Te cuento las materias de Gestión Ambiental:<br><ul><li><b>1° Año:</b>  ves Biología, Matemática, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales, Gestión Digital, Alfabetización y Práctica I</li><li><b>2° Año:</b>  tiene Derecho Ambiental, Gestión de Residuos, Química Ambiental, Toxicología, EDI I, Economía, Ecología, Metodología y Práctica II. Cierran </li><li><b>3° Año:</b>  con Educación Ambiental, Ordenamiento de Territorios, Ética, Auditorías Ambientales, Evaluación de Impacto, Seguridad Laboral, EDI II, Gestión Minera, Proyectos y Práctica III</li></ul>",
            "¡Te paso este dato! ¡El plan de Gestión Ambiental dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés: Biología, Matemática y Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales y Ambientales, Gestión Ambiental Digital, Alfabetización y Práctica I</li><li><b>2° Año:</b>  cursás: Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación y Toxicología, EDI I, Economía Ambiental, Ecología y Sostenibilidad, Metodología y Práctica II</li><li><b>3° Año:</b>  ves: Educación y Comunicación Ambiental, Ordenamiento Ambiental, Ética, Sistemas de Gestión, Evaluación de Impacto Ambiental, Seguridad Ambiental, EDI II, Gestión Ambiental Minera, Proyectos y Práctica III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo de Gestión Ambiental:<br><ul><li><b>1° Año:</b>  Biología, Matemática y Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales, Gestión Digital, Alfabetización y Práctica I</li><li><b>2° Año:</b>  Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación, EDI I, Economía, Ecología, Metodología y Práctica II</li><li><b>3° Año:</b>  Educación Ambiental, Ordenamiento Territorial, Ética, Auditorías Ambientales, Evaluación de Impacto, Seguridad Ambiental, EDI II, Gestión Minera, Proyectos y Práctica III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias oficiales de Gestión Ambiental son:<br><ul><li><b>1° Año:</b>  Biología, Matemática, Física, Química, Cs. de la Tierra, Inglés, Dinámicas Sociales, Gestión Digital, Alfabetización, Práctica I</li><li><b>2° Año:</b>  Derecho Ambiental, Residuos, Química Ambiental, Toxicología, EDI I, Economía Ambiental, Ecología, Metodología, Práctica II</li><li><b>3° Año:</b>  Educación Ambiental, Ordenamiento Territorial, Ética, Auditorías, Impacto Ambiental, Seguridad, EDI II, Gestión Minera, Proyectos, Práctica III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo de Gestión Ambiental:<br><ul><li><b>1° Año:</b>  Biología, Matemática y Estadística, Física, Química, Ciencias de la Tierra, Inglés, Dinámicas Sociales, Gestión Digital, Alfabetización y Práctica I</li><li><b>2° Año:</b>  Derecho Ambiental, Gestión de Residuos, Química Ambiental, Contaminación, EDI I, Economía, Ecología, Metodología y Práctica II</li><li><b>3° Año:</b>  Educación Ambiental, Ordenamiento Territorial, Ética, Auditorías Ambientales, Evaluación de Impacto, Seguridad Ambiental, EDI II, Gestión Minera, Proyectos y Práctica III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Gestión Ambiental tiene un amplio horizonte de empleabilidad en diversos sectores tales como industrias, organismos públicos, ong’s, empresas privadas, entre otros.<br><br>Puede desempeñarse en los siguientes ámbitos ocupacionales encargados del planeamiento y gestión ambiental: secretarías de medio ambiente o de ecología, departamentos de medio ambiente en industrias, o sus equivalentes.<br><br>Los técnicos también podrán actuar en departamentos de abastecimiento de insumos e instrumentos medioambientales."],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Gestión Ambiental tiene un amplio horizonte de empleabilidad en diversos sectores tales como industrias, organismos públicos, ong’s, empresas privadas, entre otros.<br><br>Puede desempeñarse en los siguientes ámbitos ocupacionales encargados del planeamiento y gestión ambiental: secretarías de medio ambiente o de ecología, departamentos de medio ambiente en industrias, o sus equivalentes.<br><br>Los técnicos también podrán actuar en departamentos de abastecimiento de insumos e instrumentos medioambientales."],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Gestión Ambiental tiene un amplio horizonte de empleabilidad en diversos sectores tales como industrias, organismos públicos, ong’s, empresas privadas, entre otros.<br><br>Puede desempeñarse en los siguientes ámbitos ocupacionales encargados del planeamiento y gestión ambiental: secretarías de medio ambiente o de ecología, departamentos de medio ambiente en industrias, o sus equivalentes.<br><br>Los técnicos también podrán actuar en departamentos de abastecimiento de insumos e instrumentos medioambientales."]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Gestión Ambiental se desarrolla durante el Turno Noche.",
            "Las clases de Gestión Ambiental se dictan en el Turno Noche en la Sede Central.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Gestión Ambiental se desarrolla durante el Turno Noche. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la noche.",
            "El horario de clases de Gestión Ambiental corresponde al Turno Noche.",
            "¡Te paso este dato! Se cursa presencial por la noche. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Gestión Ambiental se dictan durante el Turno Noche.",
            "Pedimos disculpas. Confirmamos que la carrera de Gestión Ambiental se cursa en el Turno Noche.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Gestión Ambiental se dictan durante el Turno Noche. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Gestión Ambiental</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 30</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 31</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "El coordinador de la Tecnicatura Superior en Gestión Ambiental es el Ing. Jose Valverde. Sus horarios de consulta presencial son los días Lunes y Jueves de 19:20 a 21:20 hs.",
            "Para contactar a la coordinación de Gestión Ambiental, puede consultar al Ing. Jose Valverde los Lunes y Jueves de 19:20 a 21:20 hs.",
            "Le recordamos que el coordinador de la Tecnicatura Superior en Gestión Ambiental es el Ing. Jose Valverde. Sus horarios de consulta presencial son los días Lunes y Jueves de 19:20 a 21:20 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "El coordinador de Gestión Ambiental es el Ing. Jose Valverde. Lo podés consultar los Lunes y Jueves de 19:20 a 21:20 hs.",
            "Si necesitás hablar con el coordinador Jose Valverde, atiende consultas los Lunes y Jueves de 19:20 a 21:20 hs.",
            "¡Te paso este dato! El coordinador de Gestión Ambiental es el Ing. Jose Valverde. Lo podés consultar los Lunes y Jueves de 19:20 a 21:20 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. El coordinador responsable es el Ing. Jose Valverde, quien atiende consultas los Lunes y Jueves de 19:20 a 21:20 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que el Ing. Jose Valverde coordina Gestión Ambiental; atiende consultas los Lunes y Jueves de 19:20 a 21:20 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. El coordinador responsable es el Ing. Jose Valverde, quien atiende consultas los Lunes y Jueves de 19:20 a 21:20 hs. Agradecemos su comprensión."
        ]
        }
    },
    ninez_adolescencia_familia: {
        descripcion_carrera: {
            formal: ["Esta tecnicatura forma profesionales capaces de intervenir en distintos espacios públicos y organizaciones de la sociedad civil, promoviendo y protegiendo los derechos de niños, niñas y adolescentes. Se enfoca en el marco normativo de la Protección Integral (Ley 26.061), fomentando un espíritu crítico y el respeto por los Derechos Humanos.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Niñez, Adolescencia y Familia estará capacitado profesionalmente para:<br><ul><li>Trabajar en organismos de gestión pública estatal u organizaciones de la sociedad civil, contribuyendo a la promoción, prevención y protección de los derechos de las personas.</li><li>Elaborar dispositivos y estrategias para el acceso de niños, niñas, adolescentes y familias a la educación, la salud, la seguridad, la recreación, etc.</li><li>Contribuir a garantizar la aplicación de la normativa vigente en las prácticas profesionales.</li><li>Articular con actores del Sistema de Protección de derechos la implementación de acciones desde la corresponsabilidad.</li><li>Coordinar e integrar equipos de trabajo interdisciplinarios.</li><li>Acompañar a las familias en situaciones de vulnerabilidad.</li><li>Promover programas, proyectos y acciones que garanticen derechos.</li><li>Participar en el proceso de orientación y acompañamiento a adolescentes y sus familias.</li><li>Coordinar grupos de niños y adolescentes para implementar actividades recreativas y educativas desde la educación no formal.</li><li>Asesorar a organizaciones sociales, organismos públicos y/o privados.</li><li>Diseñar y elaborar dispositivos de comunicación y difusión para promover el acceso a los derechos.</li></ul>"],
            informal: ["Esta tecnicatura forma profesionales capaces de intervenir en distintos espacios públicos y organizaciones de la sociedad civil, promoviendo y protegiendo los derechos de niños, niñas y adolescentes. Se enfoca en el marco normativo de la Protección Integral (Ley 26.061), fomentando un espíritu crítico y el respeto por los Derechos Humanos.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Niñez, Adolescencia y Familia estará capacitado profesionalmente para:<br><ul><li>Trabajar en organismos de gestión pública estatal u organizaciones de la sociedad civil, contribuyendo a la promoción, prevención y protección de los derechos de las personas.</li><li>Elaborar dispositivos y estrategias para el acceso de niños, niñas, adolescentes y familias a la educación, la salud, la seguridad, la recreación, etc.</li><li>Contribuir a garantizar la aplicación de la normativa vigente en las prácticas profesionales.</li><li>Articular con actores del Sistema de Protección de derechos la implementación de acciones desde la corresponsabilidad.</li><li>Coordinar e integrar equipos de trabajo interdisciplinarios.</li><li>Acompañar a las familias en situaciones de vulnerabilidad.</li><li>Promover programas, proyectos y acciones que garanticen derechos.</li><li>Participar en el proceso de orientación y acompañamiento a adolescentes y sus familias.</li><li>Coordinar grupos de niños y adolescentes para implementar actividades recreativas y educativas desde la educación no formal.</li><li>Asesorar a organizaciones sociales, organismos públicos y/o privados.</li><li>Diseñar y elaborar dispositivos de comunicación y difusión para promover el acceso a los derechos.</li></ul>"],
            molesto: ["Esta tecnicatura forma profesionales capaces de intervenir en distintos espacios públicos y organizaciones de la sociedad civil, promoviendo y protegiendo los derechos de niños, niñas y adolescentes. Se enfoca en el marco normativo de la Protección Integral (Ley 26.061), fomentando un espíritu crítico y el respeto por los Derechos Humanos.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Niñez, Adolescencia y Familia estará capacitado profesionalmente para:<br><ul><li>Trabajar en organismos de gestión pública estatal u organizaciones de la sociedad civil, contribuyendo a la promoción, prevención y protección de los derechos de las personas.</li><li>Elaborar dispositivos y estrategias para el acceso de niños, niñas, adolescentes y familias a la educación, la salud, la seguridad, la recreación, etc.</li><li>Contribuir a garantizar la aplicación de la normativa vigente en las prácticas profesionales.</li><li>Articular con actores del Sistema de Protección de derechos la implementación de acciones desde la corresponsabilidad.</li><li>Coordinar e integrar equipos de trabajo interdisciplinarios.</li><li>Acompañar a las familias en situaciones de vulnerabilidad.</li><li>Promover programas, proyectos y acciones que garanticen derechos.</li><li>Participar en el proceso de orientación y acompañamiento a adolescentes y sus familias.</li><li>Coordinar grupos de niños y adolescentes para implementar actividades recreativas y educativas desde la educación no formal.</li><li>Asesorar a organizaciones sociales, organismos públicos y/o privados.</li><li>Diseñar y elaborar dispositivos de comunicación y difusión para promover el acceso a los derechos.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para la Tecnicatura en Niñez, Adolescencia y Familia consta de la siguiente estructura anual:<br><ul><li><b>1° Año:</b>  se cursan Introducción a la Niñez, Adolescencia y Familia, Sistema de Protección de Derechos, Recursos de la Comunidad, Metodología de la Investigación Social, Sociología de la Infancia y Adolescencia, Psicología de los Ciclos Vitales, Alfabetización Académica y Comunicación, Informática y Nuevas Tecnologías, y Práctica Profesionalizante I</li><li><b>2° Año:</b>  se cursan Derecho de Niñez, Adolescencia y Familia, Problemáticas de Niñez, Adolescencia y Familia I, Planificación Sociocomunitaria, Políticas Públicas, Dispositivos de Intervención Grupal, Estadística Descriptiva Aplicada, Salud Mental, EDI I, y Práctica Profesionalizante II</li><li><b>3° Año:</b>  se cursan Problemáticas de Niñez, Adolescencia y Familia II, Adolescentes en Conflicto con la Ley, Salud Integral y Políticas de Cuidado, Familia y Discapacidad, Mediación y Resolución de Conflictos, Seminario de Sistematización, Ética Profesional, EDI II, y Práctica Profesionalizante III</li></ul>",
            "Le detallamos la distribución anual de materias de Niñez y Familia:<br><ul><li><b>1° Año:</b>  Introducción a la Niñez, Adolescencia y Familia, Sistema de Protección de Derechos, Recursos de la Comunidad, Metodología de la Investigación, Sociología de la Infancia, Psicología de los Ciclos Vitales, Alfabetización Académica, Informática, Práctica I</li><li><b>2° Año:</b>  Derecho de Niñez, Problemáticas I, Planificación Sociocomunitaria, Políticas Públicas, Dispositivos Grupales, Estadística, Salud Mental, EDI, Práctica II</li><li><b>3° Año:</b>  Problemáticas II, Adolescentes en Conflicto con la Ley, Salud Integral, Familia y Discapacidad, Mediación, Seminario de Sistematización, Ética, EDI II, Práctica III</li></ul>",
            "Le recordamos que el plan de estudios oficial para la Tecnicatura en Niñez, Adolescencia y Familia consta de la siguiente estructura anual:<br><ul><li><b>1° Año:</b>  se cursan Introducción a la Niñez, Adolescencia y Familia, Sistema de Protección de Derechos, Recursos de la Comunidad, Metodología de la Investigación Social, Sociología de la Infancia y Adolescencia, Psicología de los Ciclos Vitales, Alfabetización Académica y Comunicación, Informática y Nuevas Tecnologías, y Práctica Profesionalizante I</li><li><b>2° Año:</b>  se cursan Derecho de Niñez, Adolescencia y Familia, Problemáticas de Niñez, Adolescencia y Familia I, Planificación Sociocomunitaria, Políticas Públicas, Dispositivos de Intervención Grupal, Estadística Descriptiva Aplicada, Salud Mental, EDI I, y Práctica Profesionalizante II</li><li><b>3° Año:</b>  se cursan Problemáticas de Niñez, Adolescencia y Familia II, Adolescentes en Conflicto con la Ley, Salud Integral y Políticas de Cuidado, Familia y Discapacidad, Mediación y Resolución de Conflictos, Seminario de Sistematización, Ética Profesional, EDI II, y Práctica Profesionalizante III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Niñez y Familia dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés: Introducción a la Niñez, Adolescencia y Familia, Sistema de Protección de Derechos, Recursos de la Comunidad, Metodología de la Investigación Social, Sociología de la Infancia y Adolescencia, Psicología de los Ciclos Vitales, Alfabetización Académica, Informática y Práctica I</li><li><b>2° Año:</b>  cursás: Derecho de Niñez, Problemáticas I, Planificación Sociocomunitaria, Políticas Públicas, Dispositivos de Intervención Grupal, Estadística Descriptiva, Salud Mental, EDI y Práctica II</li><li><b>3° Año:</b>  ves: Problemáticas II, Adolescentes en Conflicto con la Ley, Salud Integral y Políticas de Cuidado, Familia y Discapacidad, Mediación y Resolución de Conflictos, Seminario de Sistematización, Ética Profesional, EDI II y Práctica III</li></ul>",
            "Te cuento las materias de Niñez, Adolescencia y Familia por años:<br><ul><li><b>1° Año:</b>  tiene Introducción a la Niñez, Protección de Derechos, Recursos de la Comunidad, Metodología de Investigación, Sociología de Infancia, Psicología, Alfabetización, Informática y Práctica I</li><li><b>2° Año:</b>  cursás Derecho, Problemáticas I, Planificación Sociocomunitaria, Políticas Públicas, Intervención Grupal, Estadística, Salud Mental, EDI y Práctica II. Cierran </li><li><b>3° Año:</b>  con Problemáticas II, Adolescentes en Conflicto con la Ley, Salud Integral, Familia y Discapacidad, Mediación, Seminario, Ética, EDI II y Práctica III</li></ul>",
            "¡Te paso este dato! ¡El plan de Niñez y Familia dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés: Introducción a la Niñez, Adolescencia y Familia, Sistema de Protección de Derechos, Recursos de la Comunidad, Metodología de la Investigación Social, Sociología de la Infancia y Adolescencia, Psicología de los Ciclos Vitales, Alfabetización Académica, Informática y Práctica I</li><li><b>2° Año:</b>  cursás: Derecho de Niñez, Problemáticas I, Planificación Sociocomunitaria, Políticas Públicas, Dispositivos de Intervención Grupal, Estadística Descriptiva, Salud Mental, EDI y Práctica II</li><li><b>3° Año:</b>  ves: Problemáticas II, Adolescentes en Conflicto con la Ley, Salud Integral y Políticas de Cuidado, Familia y Discapacidad, Mediación y Resolución de Conflictos, Seminario de Sistematización, Ética Profesional, EDI II y Práctica III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le detallamos el plan de estudios completo de Niñez, Adolescencia y Familia:<br><ul><li><b>1° Año:</b>  Introducción a la Niñez, Protección de Derechos, Recursos de la Comunidad, Metodología de Investigación, Sociología de Infancia, Psicología, Alfabetización, Informática y Práctica I</li><li><b>2° Año:</b>  Derecho, Problemáticas I, Planificación, Políticas Públicas, Intervención Grupal, Estadística, Salud Mental, EDI, Práctica II</li><li><b>3° Año:</b>  Problemáticas II, Conflicto con la Ley, Salud Integral, Familia y Discapacidad, Mediación, Seminario, Ética, EDI II y Práctica III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias de la tecnicatura por año son:<br><ul><li><b>1° Año:</b>  Introducción a la Niñez, Protección de Derechos, Recursos, Metodología, Sociología, Psicología, Alfabetización, Informática, Práctica I</li><li><b>2° Año:</b>  Derecho, Problemáticas I, Planificación, Políticas Públicas, Intervención Grupal, Estadística, Salud Mental, EDI, Práctica II</li><li><b>3° Año:</b>  Problemáticas II, Conflicto con la Ley, Salud Integral, Familia y Discapacidad, Mediación, Seminario, Ética, EDI II, Práctica III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le detallamos el plan de estudios completo de Niñez, Adolescencia y Familia:<br><ul><li><b>1° Año:</b>  Introducción a la Niñez, Protección de Derechos, Recursos de la Comunidad, Metodología de Investigación, Sociología de Infancia, Psicología, Alfabetización, Informática y Práctica I</li><li><b>2° Año:</b>  Derecho, Problemáticas I, Planificación, Políticas Públicas, Intervención Grupal, Estadística, Salud Mental, EDI, Práctica II</li><li><b>3° Año:</b>  Problemáticas II, Conflicto con la Ley, Salud Integral, Familia y Discapacidad, Mediación, Seminario, Ética, EDI II y Práctica III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El técnico en Niñez, Adolescencia y Familia está habilitado para insertarse en las organizaciones que trabajan con niños, niñas y adolescentes, en la comunidad y, en la cotidianeidad de las familias. En organizaciones, tales como:<br><ul><li>Organismos públicos nacionales, provinciales, locales.</li><li>Organismos multilaterales.</li><li>Organizaciones de la Sociedad Civil.</li><li>Equipos de trabajo disciplinares y/o interdisciplinares.</li></ul><br>Podrá desempeñar su actividad profesional, de forma independiente o en relación de dependencia."],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El técnico en Niñez, Adolescencia y Familia está habilitado para insertarse en las organizaciones que trabajan con niños, niñas y adolescentes, en la comunidad y, en la cotidianeidad de las familias. En organizaciones, tales como:<br><ul><li>Organismos públicos nacionales, provinciales, locales.</li><li>Organismos multilaterales.</li><li>Organizaciones de la Sociedad Civil.</li><li>Equipos de trabajo disciplinares y/o interdisciplinares.</li></ul><br>Podrá desempeñar su actividad profesional, de forma independiente o en relación de dependencia."],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El técnico en Niñez, Adolescencia y Familia está habilitado para insertarse en las organizaciones que trabajan con niños, niñas y adolescentes, en la comunidad y, en la cotidianeidad de las familias. En organizaciones, tales como:<br><ul><li>Organismos públicos nacionales, provinciales, locales.</li><li>Organismos multilaterales.</li><li>Organizaciones de la Sociedad Civil.</li><li>Equipos de trabajo disciplinares y/o interdisciplinares.</li></ul><br>Podrá desempeñar su actividad profesional, de forma independiente o en relación de dependencia."]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Niñez, Adolescencia y Familia se desarrolla durante el Turno Tarde.",
            "Las clases de Niñez, Adolescencia y Familia se dictan de lunes a viernes en el Turno Tarde.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Niñez, Adolescencia y Familia se desarrolla durante el Turno Tarde. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la tarde.",
            "El horario de clases de Niñez y Familia corresponde al Turno Tarde.",
            "¡Te paso este dato! Se cursa presencial por la tarde. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Niñez, Adolescencia y Familia se dictan durante el Turno Tarde.",
            "Pedimos disculpas. Confirmamos que la carrera de Niñez, Adolescencia y Familia se cursa en el Turno Tarde.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Niñez, Adolescencia y Familia se dictan durante el Turno Tarde. Agradecemos su comprensión."
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora de la Tecnicatura Superior en Niñez, Adolescencia y Familia es la Lic. Mariela Garcia. Sus horarios de consulta presencial son los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs.",
            "Para contactar a la coordinación de Niñez, Adolescencia y Familia, puede consultar a la Lic. Mariela Garcia en sus horarios de atención presencial: Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs.",
            "Le recordamos que la coordinadora de la Tecnicatura Superior en Niñez, Adolescencia y Familia es la Lic. Mariela Garcia. Sus horarios de consulta presencial son los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Niñez y Familia es la Lic. Mariela Garcia. La podés consultar los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs.",
            "Si necesitás hablar con la coordinadora Mariela Garcia, atiende consultas los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs.",
            "¡Te paso este dato! La coordinadora de Niñez y Familia es la Lic. Mariela Garcia. La podés consultar los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora responsable es la Lic. Mariela Garcia, quien atiende los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs.",
            "Pedimos disculpas por los inconvenientes. Le informamos que la Lic. Mariela Garcia coordina la carrera. Sus horarios de consulta son Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora responsable es la Lic. Mariela Garcia, quien atiende los Lunes de 08:00 a 10:00 hs., Martes de 14:30 a 16:30 hs., Miércoles de 08:30 a 10:30 hs. y de 13:00 a 15:00 hs., Jueves de 16:00 a 18:00 hs., y Viernes de 15:30 a 17:30 hs. Agradecemos su comprensión."
        ]
        }
    },
    laboratorio_analisis_clinicos: {
        descripcion_carrera: {
            formal: ["El Técnico Superior en Laboratorio de Análisis Clínicos está capacitado para atender a la persona y obtener materiales biológicos para su análisis, aportando a la producción de información a través de la ejecución de procedimientos analíticos. Realiza su trabajo con la supervisión del Bioquímico/a o Profesional a cargo del Laboratorio.<br><br><b>Funciones Profesionales:</b><br><ul><li><b>Atender a la persona y obtener materiales biológicos:</b> Implica identificar a la persona, tomar muestras (sangre venosa, etc.), preparar material biológico y las muestras a analizar.</li><li><b>Aportar a la producción de información analítica:</b> Ejecutar procedimientos, operar instrumental (manual y/o automatizado), contribuir al aseguramiento de la calidad y confeccionar registros e informes.</li><li><b>Gestionar su proceso de trabajo:</b> Acondicionar su área, registrar resultados, seguir el funcionamiento del instrumental, participar en el control de stock y en la actualización del Manual de Procedimientos.</li><li><b>Involucrarse en la mejora continua:</b> Participar en acciones de educación continua y proyectos de investigación.</li></ul>"],
            informal: ["El Técnico Superior en Laboratorio de Análisis Clínicos está capacitado para atender a la persona y obtener materiales biológicos para su análisis, aportando a la producción de información a través de la ejecución de procedimientos analíticos. Realiza su trabajo con la supervisión del Bioquímico/a o Profesional a cargo del Laboratorio.<br><br><b>Funciones Profesionales:</b><br><ul><li><b>Atender a la persona y obtener materiales biológicos:</b> Implica identificar a la persona, tomar muestras (sangre venosa, etc.), preparar material biológico y las muestras a analizar.</li><li><b>Aportar a la producción de información analítica:</b> Ejecutar procedimientos, operar instrumental (manual y/o automatizado), contribuir al aseguramiento de la calidad y confeccionar registros e informes.</li><li><b>Gestionar su proceso de trabajo:</b> Acondicionar su área, registrar resultados, seguir el funcionamiento del instrumental, participar en el control de stock y en la actualización del Manual de Procedimientos.</li><li><b>Involucrarse en la mejora continua:</b> Participar en acciones de educación continua y proyectos de investigación.</li></ul>"],
            molesto: ["El Técnico Superior en Laboratorio de Análisis Clínicos está capacitado para atender a la persona y obtener materiales biológicos para su análisis, aportando a la producción de información a través de la ejecución de procedimientos analíticos. Realiza su trabajo con la supervisión del Bioquímico/a o Profesional a cargo del Laboratorio.<br><br><b>Funciones Profesionales:</b><br><ul><li><b>Atender a la persona y obtener materiales biológicos:</b> Implica identificar a la persona, tomar muestras (sangre venosa, etc.), preparar material biológico y las muestras a analizar.</li><li><b>Aportar a la producción de información analítica:</b> Ejecutar procedimientos, operar instrumental (manual y/o automatizado), contribuir al aseguramiento de la calidad y confeccionar registros e informes.</li><li><b>Gestionar su proceso de trabajo:</b> Acondicionar su área, registrar resultados, seguir el funcionamiento del instrumental, participar en el control de stock y en la actualización del Manual de Procedimientos.</li><li><b>Involucrarse en la mejora continua:</b> Participar en acciones de educación continua y proyectos de investigación.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Laboratorio de Análisis Clínicos se estructura de la siguiente manera:<br><ul><li><b>1° Año:</b>  se cursan Procesos tecnológicos de laboratorio, Física y matemática, Formación religiosa, Psicología evolutiva, Química, Anatomía, histología y fisiología, Práctica de laboratorio I, Salud pública y Bioquímica clínica</li><li><b>2° Año:</b>  se cursan Inmunología y serología, Primeros auxilios, Ética y aspectos legales en salud, Metodología de la Investigación en salud, Microbiología humana, Doctrina social de la Iglesia, Práctica de laboratorio II, Tecnología de la información y la comunicación, e Higiene y Seguridad</li><li><b>3° Año:</b>  se cursan Inmunohematología, Humanización en salud, Bioética, Fisiopatología aplicada, Bioquímica Clínica II, Práctica de laboratorio III, Organización y gestión de las instituciones de salud, e Inglés técnico</li></ul>",
            "Le detallamos la distribución anual de materias de Análisis Clínicos:<br><ul><li><b>1° Año:</b>  Procesos tecnológicos, Física y matemática, Formación religiosa, Psicología evolutiva, Química, Anatomía/histología/fisiología, Práctica de laboratorio I, Salud pública, Bioquímica clínica</li><li><b>2° Año:</b>  Inmunología/serología, Primeros auxilios, Ética y aspectos legales, Metodología, Microbiología humana, Doctrina social de la Iglesia, Práctica II, TIC, Higiene y Seguridad</li><li><b>3° Año:</b>  Inmunohematología, Humanización, Bioética, Fisiopatología aplicada, Bioquímica Clínica II, Práctica III, Organización y gestión, Inglés técnico</li></ul>",
            "Le recordamos que el plan de estudios oficial para Laboratorio de Análisis Clínicos se estructura de la siguiente manera:<br><ul><li><b>1° Año:</b>  se cursan Procesos tecnológicos de laboratorio, Física y matemática, Formación religiosa, Psicología evolutiva, Química, Anatomía, histología y fisiología, Práctica de laboratorio I, Salud pública y Bioquímica clínica</li><li><b>2° Año:</b>  se cursan Inmunología y serología, Primeros auxilios, Ética y aspectos legales en salud, Metodología de la Investigación en salud, Microbiología humana, Doctrina social de la Iglesia, Práctica de laboratorio II, Tecnología de la información y la comunicación, e Higiene y Seguridad</li><li><b>3° Año:</b>  se cursan Inmunohematología, Humanización en salud, Bioética, Fisiopatología aplicada, Bioquímica Clínica II, Práctica de laboratorio III, Organización y gestión de las instituciones de salud, e Inglés técnico. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Análisis Clínicos dura 3 años!:<br><ul><li><b>1° Año:</b>  cursás: Procesos tecnológicos de laboratorio, Física y matemática, Formación religiosa, Psicología evolutiva, Química, Anatomía/fisiología, Práctica de laboratorio I, Salud pública y Bioquímica clínica</li><li><b>2° Año:</b>  tenés: Inmunología y serología, Primeros auxilios, Ética y leyes en salud, Metodología en salud, Microbiología humana, Doctrina social de la Iglesia, Práctica II, TIC e Higiene y Seguridad</li><li><b>3° Año:</b>  cerrás con: Inmunohematología, Humanización en salud, Bioética, Fisiopatología aplicada, Bioquímica Clínica II, Práctica III, Organización de salud e Inglés técnico</li></ul>",
            "Te comento el plan de estudios por año:<br><ul><li><b>1° Año:</b>  tiene Procesos tecnológicos, Física y matemática, Formación religiosa, Psicología, Química, Anatomía, Práctica I, Salud pública y Bioquímica clínica</li><li><b>2° Año:</b>  tiene Inmunología y serología, Primeros auxilios, Ética, Metodología, Microbiología, Doctrina social, Práctica II, TIC e Higiene y Seguridad. Cursás el último año con Inmunohematología, Humanización, Bioética, Fisiopatología, Bioquímica Clínica II, Práctica III, Organización de salud e Inglés técnico</li></ul>",
            "¡Te paso este dato! ¡El plan de Análisis Clínicos dura 3 años!:<br><ul><li><b>1° Año:</b>  cursás: Procesos tecnológicos de laboratorio, Física y matemática, Formación religiosa, Psicología evolutiva, Química, Anatomía/fisiología, Práctica de laboratorio I, Salud pública y Bioquímica clínica</li><li><b>2° Año:</b>  tenés: Inmunología y serología, Primeros auxilios, Ética y leyes en salud, Metodología en salud, Microbiología humana, Doctrina social de la Iglesia, Práctica II, TIC e Higiene y Seguridad</li><li><b>3° Año:</b>  cerrás con: Inmunohematología, Humanización en salud, Bioética, Fisiopatología aplicada, Bioquímica Clínica II, Práctica III, Organización de salud e Inglés técnico. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. El plan de estudios de la carrera consta de:<br><ul><li><b>1° Año:</b>  Procesos de laboratorio, Física y matemática, Formación religiosa, Psicología, Química, Anatomía/fisiología, Práctica I, Salud pública, Bioquímica clínica</li><li><b>2° Año:</b>  Inmunología, Primeros auxilios, Ética, Metodología, Microbiología, Doctrina social, Práctica II, TIC, Higiene y Seguridad</li><li><b>3° Año:</b>  Inmunohematología, Humanización, Bioética, Fisiopatología, Bioquímica Clínica II, Práctica III, Organización de salud, Inglés técnico</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las asignaturas obligatorias por año son:<br><ul><li><b>1° Año:</b>  Procesos, Física/Matemática, Religión, Psicología, Química, Anatomía, Práctica I, Salud Pública, Bioquímica</li><li><b>2° Año:</b>  Inmunología, Primeros Auxilios, Ética, Metodología, Microbiología, Doctrina Social, Práctica II, TIC, Higiene</li><li><b>3° Año:</b>  Inmunohematología, Humanización, Bioética, Fisiopatología, Bioquímica II, Práctica III, Organización, Inglés Técnico</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. El plan de estudios de la carrera consta de:<br><ul><li><b>1° Año:</b>  Procesos de laboratorio, Física y matemática, Formación religiosa, Psicología, Química, Anatomía/fisiología, Práctica I, Salud pública, Bioquímica clínica</li><li><b>2° Año:</b>  Inmunología, Primeros auxilios, Ética, Metodología, Microbiología, Doctrina social, Práctica II, TIC, Higiene y Seguridad</li><li><b>3° Año:</b>  Inmunohematología, Humanización, Bioética, Fisiopatología, Bioquímica Clínica II, Práctica III, Organización de salud, Inglés técnico. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>Su área ocupacional es en el Sector Salud y en el marco de Instituciones Educativas y Empresas.<br><br>Podrá desempeñarse en:<br><ul><li>Hospitales, clínicas, sanatorios, laboratorios.</li><li>Centros de Salud y Áreas Programáticas.</li><li>Empresas.</li><li>Instituciones educativas.</li><li>Comités y grupos de trabajo disciplinares y/o interdisciplinares.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>Su área ocupacional es en el Sector Salud y en el marco de Instituciones Educativas y Empresas.<br><br>Podrá desempeñarse en:<br><ul><li>Hospitales, clínicas, sanatorios, laboratorios.</li><li>Centros de Salud y Áreas Programáticas.</li><li>Empresas.</li><li>Instituciones educativas.</li><li>Comités y grupos de trabajo disciplinares y/o interdisciplinares.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>Su área ocupacional es en el Sector Salud y en el marco de Instituciones Educativas y Empresas.<br><br>Podrá desempeñarse en:<br><ul><li>Hospitales, clínicas, sanatorios, laboratorios.</li><li>Centros de Salud y Áreas Programáticas.</li><li>Empresas.</li><li>Instituciones educativas.</li><li>Comités y grupos de trabajo disciplinares y/o interdisciplinares.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Laboratorio de Análisis Clínicos se desarrolla durante el Turno Tarde, en el horario de 14:00 a 18:00 hs.",
            "Las clases de Laboratorio de Análisis Clínicos se dictan de lunes a viernes en el Turno Tarde, de 14:00 a 18:00 hs.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Laboratorio de Análisis Clínicos se desarrolla durante el Turno Tarde, en el horario de 14:00 a 18:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la tarde, de 14:00 a 18:00 hs.",
            "El horario de clases de Laboratorio es en el Turno Tarde, de 14:00 a 18:00 hs.",
            "¡Te paso este dato! Se cursa presencial por la tarde, de 14:00 a 18:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Laboratorio de Análisis Clínicos se dictan durante el Turno Tarde (de 14:00 a 18:00 hs).",
            "Pedimos disculpas. Confirmamos que la carrera de Laboratorio se cursa en el Turno Tarde, en el horario de 14:00 a 18:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Laboratorio de Análisis Clínicos se dictan durante el Turno Tarde (de 14:00 a 18:00 hs). Agradecemos su comprensión."
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora de la Tecnicatura Superior en Laboratorio de Análisis Clínicos es la Bioqca. Susana Canil. Sus horarios de consulta presencial son los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs.",
            "Para contactar a la coordinación de Laboratorio, puede consultar a la Bioqca. Susana Canil los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs.",
            "Le recordamos que la coordinadora de la Tecnicatura Superior en Laboratorio de Análisis Clínicos es la Bioqca. Susana Canil. Sus horarios de consulta presencial son los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Laboratorio es la Bioqca. Susana Canil. La podés consultar los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs.",
            "Si necesitás hablar con la coordinadora Susana Canil, atiende consultas los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs.",
            "¡Te paso este dato! La coordinadora de Laboratorio es la Bioqca. Susana Canil. La podés consultar los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora responsable es la Bioqca. Susana Canil, quien atiende consultas los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que la Bioqca. Susana Canil coordina la carrera y realiza consultas los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora responsable es la Bioqca. Susana Canil, quien atiende consultas los Lunes y Miércoles de 14:00 a 16:00 hs., Martes de 16:00 a 18:00 hs., y Jueves de 14:00 a 18:00 hs. Agradecemos su comprensión."
        ]
        }
    },
    hemoterapia: {
        descripcion_carrera: {
            formal: ["El Técnico Superior en Hemoterapia está capacitado para preparar y ejecutar procesos de hemodonación. Podrá preparar el producto sanguíneo y la transfusión, atendiendo profesionalmente al donante.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Hemoterapia estará capacitado para:<br><ul><li>Realizar el fraccionamiento sanguíneo para la obtención de hemocomponentes y hemoderivados.</li><li>Calificar biológicamente los productos obtenidos determinando la compatibilidad sanguínea pretransfusional.</li><li>Realizar estudios inmunohematológicos de pacientes e intervenir en el estudio de la inmunohematología de embarazadas, puérperas y recién nacidos.</li><li>Diseñar y ejecutar proyectos comunitarios de promoción de la donación voluntaria de sangre y registro nacional de donantes de células madre.</li></ul>"],
            informal: ["El Técnico Superior en Hemoterapia está capacitado para preparar y ejecutar procesos de hemodonación. Podrá preparar el producto sanguíneo y la transfusión, atendiendo profesionalmente al donante.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Hemoterapia estará capacitado para:<br><ul><li>Realizar el fraccionamiento sanguíneo para la obtención de hemocomponentes y hemoderivados.</li><li>Calificar biológicamente los productos obtenidos determinando la compatibilidad sanguínea pretransfusional.</li><li>Realizar estudios inmunohematológicos de pacientes e intervenir en el estudio de la inmunohematología de embarazadas, puérperas y recién nacidos.</li><li>Diseñar y ejecutar proyectos comunitarios de promoción de la donación voluntaria de sangre y registro nacional de donantes de células madre.</li></ul>"],
            molesto: ["El Técnico Superior en Hemoterapia está capacitado para preparar y ejecutar procesos de hemodonación. Podrá preparar el producto sanguíneo y la transfusión, atendiendo profesionalmente al donante.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Hemoterapia estará capacitado para:<br><ul><li>Realizar el fraccionamiento sanguíneo para la obtención de hemocomponentes y hemoderivados.</li><li>Calificar biológicamente los productos obtenidos determinando la compatibilidad sanguínea pretransfusional.</li><li>Realizar estudios inmunohematológicos de pacientes e intervenir en el estudio de la inmunohematología de embarazadas, puérperas y recién nacidos.</li><li>Diseñar y ejecutar proyectos comunitarios de promoción de la donación voluntaria de sangre y registro nacional de donantes de células madre.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Hemoterapia se estructura en 3 años:<br><ul><li><b>1° Año:</b>  se cursan Educación y salud, Biología, genética e inmunología, Anatomía y fisiología humana, Hemoterapia y hemodonación, Psicología evolutiva, Metodología de la investigación, Primeros auxilios, Higiene y seguridad laboral, Práctica I y EDI I</li><li><b>2° Año:</b>  se cursan Microbiología y epidemiología, Calificación biológica, Taller de calificación biológica, Ética y aspectos legales en hemoterapia, Preparación de productos sanguíneos, Inglés técnico, Informática, Práctica II y EDI I</li><li><b>3° Año:</b>  se cursan Fisiología feto-neonatal, Gestión y calidad en bancos de sangre, Bioética, Fisiopatología aplicada, Transfusión, Psicología de las organizaciones de la salud, Inmunohematología, Práctica III y EDI II</li></ul>",
            "Le detallamos la distribución anual de materias de Hemoterapia:<br><ul><li><b>1° Año:</b>  Educación y salud, Biología/genética/inmunología, Anatomía/fisiología, Hemoterapia/hemodonación, Psicología evolutiva, Metodología, Primeros auxilios, Higiene/seguridad, Práctica I, EDI I</li><li><b>2° Año:</b>  Microbiología/epidemiología, Calificación biológica, Taller de calificación, Ética y aspectos legales, Preparación de productos sanguíneos, Inglés técnico, Informática, Práctica II, EDI I</li><li><b>3° Año:</b>  Fisiología feto-neonatal, Gestión/calidad en bancos de sangre, Bioética, Fisiopatología aplicada, Transfusión, Psicología organizacional, Inmunohematología, Práctica III, EDI II</li></ul>",
            "Le recordamos que el plan de estudios oficial para Hemoterapia se estructura en 3 años:<br><ul><li><b>1° Año:</b>  se cursan Educación y salud, Biología, genética e inmunología, Anatomía y fisiología humana, Hemoterapia y hemodonación, Psicología evolutiva, Metodología de la investigación, Primeros auxilios, Higiene y seguridad laboral, Práctica I y EDI I</li><li><b>2° Año:</b>  se cursan Microbiología y epidemiología, Calificación biológica, Taller de calificación biológica, Ética y aspectos legales en hemoterapia, Preparación de productos sanguíneos, Inglés técnico, Informática, Práctica II y EDI I</li><li><b>3° Año:</b>  se cursan Fisiología feto-neonatal, Gestión y calidad en bancos de sangre, Bioética, Fisiopatología aplicada, Transfusión, Psicología de las organizaciones de la salud, Inmunohematología, Práctica III y EDI II. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Hemoterapia dura 3 años!:<br><ul><li><b>1° Año:</b>  cursás: Educación y salud, Biología, genética e inmunología, Anatomía y fisiología, Hemoterapia y hemodonación, Psicología, Metodología, Primeros auxilios, Higiene y seguridad, Práctica I y EDI I</li><li><b>2° Año:</b>  tenés: Microbiología y epidemiología, Calificación biológica y su Taller, Ética y leyes en hemoterapia, Preparación de productos sanguíneos, Inglés técnico, Informática, Práctica II y EDI I</li><li><b>3° Año:</b>  cerrás con: Fisiología feto-neonatal, Gestión y calidad en bancos de sangre, Bioética, Fisiopatología, Transfusión, Psicología de organizaciones de salud, Inmunohematología, Práctica III y EDI II</li></ul>",
            "Te cuento cómo se dividen las materias por años:<br><ul><li><b>1° Año:</b>  tiene Educación y salud, Biología/inmunología, Anatomía/fisiología, Hemoterapia/hemodonación, Psicología, Metodología, Primeros auxilios, Higiene, Práctica I y EDI I</li><li><b>2° Año:</b>  ves Microbiología, Calificación biológica (teoría y taller), Ética, Preparación de productos sanguíneos, Inglés, Informática, Práctica II y EDI I. En </li><li><b>3° Año:</b>  cursás Fisiología feto-neonatal, Gestión de bancos de sangre, Bioética, Fisiopatología, Transfusión, Psicología, Inmunohematología, Práctica III y EDI II</li></ul>",
            "¡Te paso este dato! ¡El plan de Hemoterapia dura 3 años!:<br><ul><li><b>1° Año:</b>  cursás: Educación y salud, Biología, genética e inmunología, Anatomía y fisiología, Hemoterapia y hemodonación, Psicología, Metodología, Primeros auxilios, Higiene y seguridad, Práctica I y EDI I</li><li><b>2° Año:</b>  tenés: Microbiología y epidemiología, Calificación biológica y su Taller, Ética y leyes en hemoterapia, Preparación de productos sanguíneos, Inglés técnico, Informática, Práctica II y EDI I</li><li><b>3° Año:</b>  cerrás con: Fisiología feto-neonatal, Gestión y calidad en bancos de sangre, Bioética, Fisiopatología, Transfusión, Psicología de organizaciones de salud, Inmunohematología, Práctica III y EDI II. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo de Hemoterapia:<br><ul><li><b>1° Año:</b>  Educación y salud, Biología, Anatomía/fisiología, Hemoterapia/hemodonación, Psicología, Metodología, Primeros auxilios, Higiene, Práctica I, EDI I</li><li><b>2° Año:</b>  Microbiología, Calificación biológica, Taller, Ética, Preparación de productos, Inglés, Informática, Práctica II, EDI I</li><li><b>3° Año:</b>  Fisiología feto-neonatal, Gestión de bancos, Bioética, Fisiopatología, Transfusión, Psicología, Inmunohematología, Práctica III, EDI II</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias de la tecnicatura por año son:<br><ul><li><b>1° Año:</b>  Educación/Salud, Biología/Genética, Anatomía, Hemoterapia, Psicología, Metodología, Primeros Auxilios, Higiene, Práctica I, EDI I</li><li><b>2° Año:</b>  Microbiología, Calificación Biológica, Taller, Ética, Preparación de Productos, Inglés, Informática, Práctica II, EDI I</li><li><b>3° Año:</b>  Fisiología feto-neonatal, Gestión, Bioética, Fisiopatología, Transfusión, Psicología, Inmunohematología, Práctica III, EDI II</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo de Hemoterapia:<br><ul><li><b>1° Año:</b>  Educación y salud, Biología, Anatomía/fisiología, Hemoterapia/hemodonación, Psicología, Metodología, Primeros auxilios, Higiene, Práctica I, EDI I</li><li><b>2° Año:</b>  Microbiología, Calificación biológica, Taller, Ética, Preparación de productos, Inglés, Informática, Práctica II, EDI I</li><li><b>3° Año:</b>  Fisiología feto-neonatal, Gestión de bancos, Bioética, Fisiopatología, Transfusión, Psicología, Inmunohematología, Práctica III, EDI II. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>Su área ocupacional es primordialmente la de Salud. Podrá desempeñarse en:<br><ul><li>Hospitales, clínicas, sanatorios, laboratorios, bancos de sangre, Centros Regionales.</li><li>Comités de ética profesional.</li><li>Comités de docencia e investigación.</li><li>Empresas relacionadas con la especialidad.</li><li>Programas comunitarios relacionados con la especialidad.</li><li>Instituciones educativas.</li><li>Comités transfusionales hospitalarios.</li><li>Comités para la implementación de sistemas de calidad en ámbitos sanitarios.</li><li>Institutos de formación de recursos humanos.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>Su área ocupacional es primordialmente la de Salud. Podrá desempeñarse en:<br><ul><li>Hospitales, clínicas, sanatorios, laboratorios, bancos de sangre, Centros Regionales.</li><li>Comités de ética profesional.</li><li>Comités de docencia e investigación.</li><li>Empresas relacionadas con la especialidad.</li><li>Programas comunitarios relacionados con la especialidad.</li><li>Instituciones educativas.</li><li>Comités transfusionales hospitalarios.</li><li>Comités para la implementación de sistemas de calidad en ámbitos sanitarios.</li><li>Institutos de formación de recursos humanos.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>Su área ocupacional es primordialmente la de Salud. Podrá desempeñarse en:<br><ul><li>Hospitales, clínicas, sanatorios, laboratorios, bancos de sangre, Centros Regionales.</li><li>Comités de ética profesional.</li><li>Comités de docencia e investigación.</li><li>Empresas relacionadas con la especialidad.</li><li>Programas comunitarios relacionados con la especialidad.</li><li>Instituciones educativas.</li><li>Comités transfusionales hospitalarios.</li><li>Comités para la implementación de sistemas de calidad en ámbitos sanitarios.</li><li>Institutos de formación de recursos humanos.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Hemoterapia se desarrolla durante el Turno Tarde, en el horario de 13:30 a 18:00 hs.",
            "Las clases de Hemoterapia se dictan de lunes a viernes en el Turno Tarde, de 13:30 a 18:00 hs.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Hemoterapia se desarrolla durante el Turno Tarde, en el horario de 13:30 a 18:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la tarde, de 13:30 a 18:00 hs.",
            "El horario de clases de Hemoterapia es en el Turno Tarde, de 13:30 a 18:00 hs.",
            "¡Te paso este dato! Se cursa presencial por la tarde, de 13:30 a 18:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Hemoterapia se dictan durante el Turno Tarde (de 13:30 a 18:00 hs).",
            "Pedimos disculpas. Confirmamos que la carrera de Hemoterapia se cursa en el Turno Tarde, en el horario de 13:30 a 18:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Hemoterapia se dictan durante el Turno Tarde (de 13:30 a 18:00 hs). Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Hemoterapia</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 12</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 10</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "El coordinador de la Tecnicatura Superior en Hemoterapia es el T.S. Hemot. Alvaro Galarza. Sus horarios de consulta presencial son los días Jueves de 16:40 a 18:00 hs. y Viernes de 14:40 a 17:20 hs.",
            "Para comunicarse con la coordinación de Hemoterapia, puede contactar al T.S. Hemot. Alvaro Galarza los Jueves de 16:40 a 18:00 hs. y Viernes de 14:40 a 17:20 hs.",
            "Le recordamos que el coordinador de la Tecnicatura Superior en Hemoterapia es el T.S. Hemot. Alvaro Galarza. Sus horarios de consulta presencial son los días Jueves de 16:40 a 18:00 hs. y Viernes de 14:40 a 17:20 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "El coordinador de Hemoterapia es Alvaro Galarza. Lo podés consultar los Jueves de 16:40 a 18:00 hs. y los Viernes de 14:40 a 17:20 hs.",
            "Si necesitás hablar con el coordinador Alvaro Galarza, atiende consultas los Jueves de 16:40 a 18:00 hs. y los Viernes de 14:40 a 17:20 hs.",
            "¡Te paso este dato! El coordinador de Hemoterapia es Alvaro Galarza. Lo podés consultar los Jueves de 16:40 a 18:00 hs. y los Viernes de 14:40 a 17:20 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. El coordinador responsable es Alvaro Galarza, quien atiende los Jueves de 16:40 a 18:00 hs. y Viernes de 14:40 a 17:20 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que Alvaro Galarza coordina Hemoterapia; realiza consultas los Jueves de 16:40 a 18:00 hs. y Viernes de 14:40 a 17:20 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. El coordinador responsable es Alvaro Galarza, quien atiende los Jueves de 16:40 a 18:00 hs. y Viernes de 14:40 a 17:20 hs. Agradecemos su comprensión."
        ]
        }
    },
    acompanamiento_terapeutico: {
        descripcion_carrera: {
            formal: ["El Acompañante Terapéutico es un profesional capacitado para realizar un trabajo integral con el ser humano y su rehabilitación psicofísica, psiquiátrica y psicológica.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Acompañamiento Terapéutico estará capacitado para:<br><ul><li>Realizar tareas de seguimiento, sostén y apoyo de tratamiento a personas que presentan dificultades asociadas a diferentes patologías.</li><li>Realizar tareas de contención del paciente en la vida cotidiana.</li><li>Integrar equipos interdisciplinarios en las áreas de salud, intercambiando información y planeando colaborativamente estrategias.</li><li>Intervenir en situaciones problemáticas detectadas por un profesional y equipo de salud en todas las etapas vitales.</li><li>Participar en proyectos de investigación relacionados con las problemáticas de salud.</li></ul>"],
            informal: ["El Acompañante Terapéutico es un profesional capacitado para realizar un trabajo integral con el ser humano y su rehabilitación psicofísica, psiquiátrica y psicológica.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Acompañamiento Terapéutico estará capacitado para:<br><ul><li>Realizar tareas de seguimiento, sostén y apoyo de tratamiento a personas que presentan dificultades asociadas a diferentes patologías.</li><li>Realizar tareas de contención del paciente en la vida cotidiana.</li><li>Integrar equipos interdisciplinarios en las áreas de salud, intercambiando información y planeando colaborativamente estrategias.</li><li>Intervenir en situaciones problemáticas detectadas por un profesional y equipo de salud en todas las etapas vitales.</li><li>Participar en proyectos de investigación relacionados con las problemáticas de salud.</li></ul>"],
            molesto: ["El Acompañante Terapéutico es un profesional capacitado para realizar un trabajo integral con el ser humano y su rehabilitación psicofísica, psiquiátrica y psicológica.<br><br><b>Perfil del Egresado:</b><br>El Técnico Superior en Acompañamiento Terapéutico estará capacitado para:<br><ul><li>Realizar tareas de seguimiento, sostén y apoyo de tratamiento a personas que presentan dificultades asociadas a diferentes patologías.</li><li>Realizar tareas de contención del paciente en la vida cotidiana.</li><li>Integrar equipos interdisciplinarios en las áreas de salud, intercambiando información y planeando colaborativamente estrategias.</li><li>Intervenir en situaciones problemáticas detectadas por un profesional y equipo de salud en todas las etapas vitales.</li><li>Participar en proyectos de investigación relacionados con las problemáticas de salud.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Acompañamiento Terapéutico consta de la siguiente estructura anual:<br><ul><li><b>1° Año:</b>  se cursan Introducción al acompañamiento terapéutico, Primeros auxilios, Bases biológicas del comportamiento humano, Psicología general, Psicología del desarrollo de la niñez y la adolescencia, Psicología social y comunitaria, Políticas públicas y legislación en salud, Cristología y Prácticas profesionalizantes I</li><li><b>2° Año:</b>  se cursan Neurofisiopatología, Metodología de la investigación, Teorías y estrategias de abordaje en el acompañamiento terapéutico, Psicología del desarrollo del adulto y el adulto mayor, Psicopatología I, Estrategia de abordaje familiar, Psicomotricidad aplicada al acompañamiento terapéutico, Análisis de las organizaciones e instituciones, Dinámica de grupo y Práctica de acercamiento al campo</li><li><b>3° Año:</b>  se cursan Bioética y deontología, Principios de farmacología, Psicopatología II, TIC en el acompañamiento terapéutico, Discapacidad e inclusión, Técnicas de abordaje del acompañamiento terapéutico, Taller de redacción de informes, Taller de casos clínicos, Abordaje de urgencias en salud mental, Práctica profesionalizante III y EDI</li></ul>",
            "Le detallamos la distribución anual de materias de Acompañamiento Terapéutico:<br><ul><li><b>1° Año:</b>  Introducción al acompañamiento, Primeros auxilios, Bases biológicas, Psicología general, Psicología del desarrollo (niñez/adolescencia), Psicología social, Políticas públicas/legislación, Cristología, Prácticas I</li><li><b>2° Año:</b>  Neurofisiopatología, Metodología, Teorías y estrategias de abordaje, Psicología del desarrollo (adulto/mayor), Psicopatología I, Abordaje familiar, Psicomotricidad aplicada, Análisis organizacional, Dinámica de grupo, Práctica de campo</li><li><b>3° Año:</b>  Bioética/deontología, Farmacología, Psicopatología II, TIC, Discapacidad/inclusión, Técnicas de abordaje, Redacción de informes, Casos clínicos, Urgencias en salud mental, Prácticas III y EDI</li></ul>",
            "Le recordamos que el plan de estudios oficial para Acompañamiento Terapéutico consta de la siguiente estructura anual:<br><ul><li><b>1° Año:</b>  se cursan Introducción al acompañamiento terapéutico, Primeros auxilios, Bases biológicas del comportamiento humano, Psicología general, Psicología del desarrollo de la niñez y la adolescencia, Psicología social y comunitaria, Políticas públicas y legislación en salud, Cristología y Prácticas profesionalizantes I</li><li><b>2° Año:</b>  se cursan Neurofisiopatología, Metodología de la investigación, Teorías y estrategias de abordaje en el acompañamiento terapéutico, Psicología del desarrollo del adulto y el adulto mayor, Psicopatología I, Estrategia de abordaje familiar, Psicomotricidad aplicada al acompañamiento terapéutico, Análisis de las organizaciones e instituciones, Dinámica de grupo y Práctica de acercamiento al campo</li><li><b>3° Año:</b>  se cursan Bioética y deontología, Principios de farmacología, Psicopatología II, TIC en el acompañamiento terapéutico, Discapacidad e inclusión, Técnicas de abordaje del acompañamiento terapéutico, Taller de redacción de informes, Taller de casos clínicos, Abordaje de urgencias en salud mental, Práctica profesionalizante III y EDI. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Acompañamiento Terapéutico dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés Introducción al acompañamiento, Primeros auxilios, Bases biológicas del comportamiento, Psicología general, Psicología del desarrollo, Psicología social, Políticas de salud, Cristología y Prácticas I</li><li><b>2° Año:</b>  cursás Neurofisiopatología, Metodología, Teorías y estrategias de abordaje, Psicología del desarrollo (adultos), Psicopatología I, Abordaje familiar, Psicomotricidad aplicada, Análisis de instituciones, Dinámica de grupo y Prácticas</li><li><b>3° Año:</b>  cerrás con Bioética, Farmacología, Psicopatología II, TIC, Discapacidad e inclusión, Técnicas de abordaje, Redacción de informes, Casos clínicos, Urgencias en salud mental, Prácticas III y EDI</li></ul>",
            "Te comento cómo se dividen las materias de Acompañamiento Terapéutico:<br><ul><li><b>1° Año:</b>  cursás Introducción, Primeros auxilios, Bases biológicas, Psicología general, del desarrollo y social, Políticas de salud, Cristología y Prácticas I</li><li><b>2° Año:</b>  ves Neurofisiopatología, Metodología, Estrategias de abordaje, Psicología del adulto, Psicopatología I, Abordaje familiar, Psicomotricidad, Análisis institucional, Dinámicas de grupo y Prácticas</li><li><b>3° Año:</b>  hacés Bioética, Farmacología, Psicopatología II, TIC, Discapacidad e inclusión, Técnicas, Taller de informes, Casos clínicos, Urgencias de salud mental, Prácticas III y EDI</li></ul>",
            "¡Te paso este dato! ¡El plan de Acompañamiento Terapéutico dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés Introducción al acompañamiento, Primeros auxilios, Bases biológicas del comportamiento, Psicología general, Psicología del desarrollo, Psicología social, Políticas de salud, Cristología y Prácticas I</li><li><b>2° Año:</b>  cursás Neurofisiopatología, Metodología, Teorías y estrategias de abordaje, Psicología del desarrollo (adultos), Psicopatología I, Abordaje familiar, Psicomotricidad aplicada, Análisis de instituciones, Dinámica de grupo y Prácticas</li><li><b>3° Año:</b>  cerrás con Bioética, Farmacología, Psicopatología II, TIC, Discapacidad e inclusión, Técnicas de abordaje, Redacción de informes, Casos clínicos, Urgencias en salud mental, Prácticas III y EDI. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos la demora. A continuación le detallamos el plan de estudios de Acompañamiento Terapéutico:<br><ul><li><b>1° Año:</b>  Introducción, Primeros auxilios, Bases biológicas, Psicología (general, desarrollo, social), Políticas de salud, Cristología y Prácticas I</li><li><b>2° Año:</b>  Neurofisiopatología, Metodología, Estrategias de abordaje, Psicología del adulto, Psicopatología I, Abordaje familiar, Psicomotricidad, Análisis institucional, Dinámica de grupo y Prácticas</li><li><b>3° Año:</b>  Bioética, Farmacología, Psicopatología II, TIC, Discapacidad/inclusión, Técnicas, Informes, Casos clínicos, Urgencias, Prácticas III y EDI</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias oficiales por año son:<br><ul><li><b>1° Año:</b>  Introducción al acompañamiento, Primeros Auxilios, Bases Biológicas, Psicología (General, Desarrollo, Social), Políticas, Cristología, Prácticas I</li><li><b>2° Año:</b>  Neurofisiopatología, Metodología, Teorías y abordajes, Psicología Adulto, Psicopatología I, Estrategia Familiar, Psicomotricidad, Análisis Institucional, Dinámica de Grupo, Prácticas</li><li><b>3° Año:</b>  Bioética, Farmacología, Psicopatología II, TIC, Discapacidad/Inclusión, Técnicas, Redacción Informes, Casos Clínicos, Urgencias Mental, Prácticas III, EDI</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. A continuación le detallamos el plan de estudios de Acompañamiento Terapéutico:<br><ul><li><b>1° Año:</b>  Introducción, Primeros auxilios, Bases biológicas, Psicología (general, desarrollo, social), Políticas de salud, Cristología y Prácticas I</li><li><b>2° Año:</b>  Neurofisiopatología, Metodología, Estrategias de abordaje, Psicología del adulto, Psicopatología I, Abordaje familiar, Psicomotricidad, Análisis institucional, Dinámica de grupo y Prácticas</li><li><b>3° Año:</b>  Bioética, Farmacología, Psicopatología II, TIC, Discapacidad/inclusión, Técnicas, Informes, Casos clínicos, Urgencias, Prácticas III y EDI. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Acompañante Terapéutico brindará acompañamiento a personas con padecimientos mentales y sus familias, y desarrollará actividades de prevención y promoción de la salud a través de un abordaje interdisciplinario.<br><br>Podrá desempeñarse en:<br><ul><li>El ámbito judicial, educativo, el domicilio.</li><li>Hospitales, centros educativos terapéuticos, clínicas, residencias, hogares, casas de medio camino, instituciones de rehabilitación.</li><li>Espacios públicos y comunitarios.</li><li>Trabajando con niños, adolescentes, adultos y adultos mayores.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Acompañante Terapéutico brindará acompañamiento a personas con padecimientos mentales y sus familias, y desarrollará actividades de prevención y promoción de la salud a través de un abordaje interdisciplinario.<br><br>Podrá desempeñarse en:<br><ul><li>El ámbito judicial, educativo, el domicilio.</li><li>Hospitales, centros educativos terapéuticos, clínicas, residencias, hogares, casas de medio camino, instituciones de rehabilitación.</li><li>Espacios públicos y comunitarios.</li><li>Trabajando con niños, adolescentes, adultos y adultos mayores.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Acompañante Terapéutico brindará acompañamiento a personas con padecimientos mentales y sus familias, y desarrollará actividades de prevención y promoción de la salud a través de un abordaje interdisciplinario.<br><br>Podrá desempeñarse en:<br><ul><li>El ámbito judicial, educativo, el domicilio.</li><li>Hospitales, centros educativos terapéuticos, clínicas, residencias, hogares, casas de medio camino, instituciones de rehabilitación.</li><li>Espacios públicos y comunitarios.</li><li>Trabajando con niños, adolescentes, adultos y adultos mayores.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Acompañamiento Terapéutico se desarrolla durante el Turno Tarde.",
            "Las clases de Acompañamiento Terapéutico se dictan de lunes a viernes en el Turno Tarde.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Acompañamiento Terapéutico se desarrolla durante el Turno Tarde. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la tarde.",
            "El horario de clases de Acompañamiento Terapéutico corresponde al Turno Tarde.",
            "¡Te paso este dato! Se cursa presencial por la tarde. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Acompañamiento Terapéutico se dictan durante el Turno Tarde.",
            "Pedimos disculpas. Confirmamos que la carrera de Acompañamiento Terapéutico se cursa en el Turno Tarde.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Acompañamiento Terapéutico se dictan durante el Turno Tarde. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Acomp. Terapéutico</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 25</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 22</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 33</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora de la Tecnicatura Superior en Acompañamiento Terapéutico es la Lic. Lorena Santillan. Sus horarios de consulta presencial son los Jueves de 15:20 a 18:00 hs. y Viernes de 14:00 a 15:20 hs.",
            "Para contactar a la coordinación de Acompañamiento Terapéutico, puede consultar a la Lic. Lorena Santillan los Jueves de 15:20 a 18:00 hs. y Viernes de 14:00 a 15:20 hs.",
            "Le recordamos que la coordinadora de la Tecnicatura Superior en Acompañamiento Terapéutico es la Lic. Lorena Santillan. Sus horarios de consulta presencial son los Jueves de 15:20 a 18:00 hs. y Viernes de 14:00 a 15:20 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Acompañamiento Terapéutico es la Lic. Lorena Santillan. La podés consultar los Jueves de 15:20 a 18:00 hs. y los Viernes de 14:00 a 15:20 hs.",
            "Si necesitás hablar con la coordinadora Lorena Santillan, atiende consultas los Jueves de 15:20 a 18:00 hs. y los Viernes de 14:00 a 15:20 hs.",
            "¡Te paso este dato! La coordinadora de Acompañamiento Terapéutico es la Lic. Lorena Santillan. La podés consultar los Jueves de 15:20 a 18:00 hs. y los Viernes de 14:00 a 15:20 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora responsable es la Lic. Lorena Santillan, quien atiende consultas los Jueves de 15:20 a 18:00 hs. y Viernes de 14:00 a 15:20 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que la Lic. Lorena Santillan coordina la carrera y realiza consultas los Jueves de 15:20 a 18:00 hs. y Viernes de 14:00 a 15:20 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora responsable es la Lic. Lorena Santillan, quien atiende consultas los Jueves de 15:20 a 18:00 hs. y Viernes de 14:00 a 15:20 hs. Agradecemos su comprensión."
        ]
        }
    },
    administracion_empresas: {
        descripcion_carrera: {
            formal: ["La Tecnicatura Superior en Administración de Empresas es una carrera de educación superior técnica de 3 años, orientada a formar profesionales con capacidades analíticas y prácticas para planificar, organizar, dirigir y evaluar organizaciones, gestionando recursos humanos, materiales y financieros, y optimizando el uso de sistemas tecnológicos de información empresarial.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Administración de Empresas será un profesional capaz de:<br><ul><li>Desempeñarse en las áreas administrativas de una organización.</li><li>Manejar idóneamente sistemas tecnológicos y de información empresarial.</li><li>Realizar diagnósticos, la planeación, la gestión y la evaluación de organizaciones.</li><li>Organizar y gestionar recursos humanos, materiales y financieros.</li><li>Planificar, diseñar, evaluar y/o ejecutar proyectos de emprendimientos productivos, de inversión, sociales, etc.</li><li>Manejar adecuadamente las relaciones institucionales, la atención al cliente y la comunicación interpersonal.</li><li>Participar en equipos interdisciplinarios para el desarrollo local y regional.</li><li>Identificar y aprovechar oportunidades de desarrollo, especialmente a través de PyMEs y de empresas familiares.</li></ul>"],
            informal: ["La Tecnicatura Superior en Administración de Empresas es una carrera de educación superior técnica de 3 años, orientada a formar profesionales con capacidades analíticas y prácticas para planificar, organizar, dirigir y evaluar organizaciones, gestionando recursos humanos, materiales y financieros, y optimizando el uso de sistemas tecnológicos de información empresarial.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Administración de Empresas será un profesional capaz de:<br><ul><li>Desempeñarse en las áreas administrativas de una organización.</li><li>Manejar idóneamente sistemas tecnológicos y de información empresarial.</li><li>Realizar diagnósticos, la planeación, la gestión y la evaluación de organizaciones.</li><li>Organizar y gestionar recursos humanos, materiales y financieros.</li><li>Planificar, diseñar, evaluar y/o ejecutar proyectos de emprendimientos productivos, de inversión, sociales, etc.</li><li>Manejar adecuadamente las relaciones institucionales, la atención al cliente y la comunicación interpersonal.</li><li>Participar en equipos interdisciplinarios para el desarrollo local y regional.</li><li>Identificar y aprovechar oportunidades de desarrollo, especialmente a través de PyMEs y de empresas familiares.</li></ul>"],
            molesto: ["La Tecnicatura Superior en Administración de Empresas es una carrera de educación superior técnica de 3 años, orientada a formar profesionales con capacidades analíticas y prácticas para planificar, organizar, dirigir y evaluar organizaciones, gestionando recursos humanos, materiales y financieros, y optimizando el uso de sistemas tecnológicos de información empresarial.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Administración de Empresas será un profesional capaz de:<br><ul><li>Desempeñarse en las áreas administrativas de una organización.</li><li>Manejar idóneamente sistemas tecnológicos y de información empresarial.</li><li>Realizar diagnósticos, la planeación, la gestión y la evaluación de organizaciones.</li><li>Organizar y gestionar recursos humanos, materiales y financieros.</li><li>Planificar, diseñar, evaluar y/o ejecutar proyectos de emprendimientos productivos, de inversión, sociales, etc.</li><li>Manejar adecuadamente las relaciones institucionales, la atención al cliente y la comunicación interpersonal.</li><li>Participar en equipos interdisciplinarios para el desarrollo local y regional.</li><li>Identificar y aprovechar oportunidades de desarrollo, especialmente a través de PyMEs y de empresas familiares.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Administración de Empresas consta de:<br><ul><li><b>1° Año:</b>  se cursan Introducción a la administración, Macroeconomía, Fundamentos de contabilidad sistemática, Matemática, EDI I, Derecho civil y comercial, Psicología y comportamiento organizacional, y Práctica profesionalizante I</li><li><b>2° Año:</b>  se cursan Sistemas administrativos, Marketing, Gestión de capital humano, Contabilidad para la gestión, Estadística aplicada a la administración, Derecho laboral y societario, Microeconomía, economía regional y desarrollo local, y Práctica profesionalizante II</li><li><b>3° Año:</b>  se cursan Formulación y evaluación de proyectos, Administración financiera, Gestión de logística en Pyme, Gestión de Pyme y empresas familiares, Costos y presupuesto, Informática, Liderazgo y ambiente laboral, EDI II, y Práctica profesionalizante III</li></ul>",
            "Le detallamos la distribución anual de materias de Administración:<br><ul><li><b>1° Año:</b>  Introducción a la administración, Macroeconomía, Fundamentos de contabilidad, Matemática, EDI I, Derecho civil/comercial, Psicología organizacional, Prácticas I</li><li><b>2° Año:</b>  Sistemas administrativos, Marketing, Capital humano, Contabilidad para la gestión, Estadística aplicada, Derecho laboral/societario, Microeconomía/desarrollo local, Prácticas II</li><li><b>3° Año:</b>  Formulación y evaluación de proyectos, Administración financiera, Logística en Pyme, Gestión de Pyme/empresas familiares, Costos y presupuesto, Informática, Liderazgo, EDI II, Prácticas III</li></ul>",
            "Le recordamos que el plan de estudios oficial para Administración de Empresas consta de:<br><ul><li><b>1° Año:</b>  se cursan Introducción a la administración, Macroeconomía, Fundamentos de contabilidad sistemática, Matemática, EDI I, Derecho civil y comercial, Psicología y comportamiento organizacional, y Práctica profesionalizante I</li><li><b>2° Año:</b>  se cursan Sistemas administrativos, Marketing, Gestión de capital humano, Contabilidad para la gestión, Estadística aplicada a la administración, Derecho laboral y societario, Microeconomía, economía regional y desarrollo local, y Práctica profesionalizante II</li><li><b>3° Año:</b>  se cursan Formulación y evaluación de proyectos, Administración financiera, Gestión de logística en Pyme, Gestión de Pyme y empresas familiares, Costos y presupuesto, Informática, Liderazgo y ambiente laboral, EDI II, y Práctica profesionalizante III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Administración dura 3 años!:<br><ul><li><b>1° Año:</b>  cursás Introducción a la administración, Macroeconomía, Fundamentos de contabilidad, Matemática, EDI I, Derecho civil y comercial, Psicología organizacional y Práctica I</li><li><b>2° Año:</b>  tenés Sistemas administrativos, Marketing, Gestión de capital humano (recursos humanos), Contabilidad de gestión, Estadística, Derecho laboral y societario, Microeconomía y desarrollo local, y Práctica II</li><li><b>3° Año:</b>  cerrás con Formulación y evaluación de proyectos, Administración financiera, Logística en Pyme, Gestión de PyMEs y empresas familiares, Costos y presupuestos, Informática, Liderazgo y ambiente laboral, EDI II y Práctica III</li></ul>",
            "Te cuento las materias de Administración por años:<br><ul><li><b>1° Año:</b>  arranca con Introducción a la administración, Macroeconomía, Contabilidad básica, Matemática, EDI I, Derecho civil/comercial, Psicología y Práctica I</li><li><b>2° Año:</b>  cursás Sistemas administrativos, Marketing, Capital humano, Contabilidad para gestión, Estadística, Derecho laboral/societario, Microeconomía/economía regional y Práctica II</li><li><b>3° Año:</b>  cursás Formulación de proyectos, Finanzas, Logística en Pymes, Empresas familiares, Costos, Informática, Liderazgo, EDI II y Práctica III</li></ul>",
            "¡Te paso este dato! ¡El plan de Administración dura 3 años!:<br><ul><li><b>1° Año:</b>  cursás Introducción a la administración, Macroeconomía, Fundamentos de contabilidad, Matemática, EDI I, Derecho civil y comercial, Psicología organizacional y Práctica I</li><li><b>2° Año:</b>  tenés Sistemas administrativos, Marketing, Gestión de capital humano (recursos humanos), Contabilidad de gestión, Estadística, Derecho laboral y societario, Microeconomía y desarrollo local, y Práctica II</li><li><b>3° Año:</b>  cerrás con Formulación y evaluación de proyectos, Administración financiera, Logística en Pyme, Gestión de PyMEs y empresas familiares, Costos y presupuestos, Informática, Liderazgo y ambiente laboral, EDI II y Práctica III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le detallamos el plan de estudios completo de Administración de Empresas:<br><ul><li><b>1° Año:</b>  Introducción a la administración, Macroeconomía, Fundamentos de contabilidad, Matemática, EDI I, Derecho civil/comercial, Psicología organizacional, Prácticas I</li><li><b>2° Año:</b>  Sistemas administrativos, Marketing, Capital humano, Contabilidad para la gestión, Estadística aplicada, Derecho laboral/societario, Microeconomía/desarrollo local, Prácticas II</li><li><b>3° Año:</b>  Formulación y evaluación de proyectos, Administración financiera, Logística en Pyme, Gestión de Pyme/empresas familiares, Costos y presupuesto, Informática, Liderazgo, EDI II, Prácticas III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias obligatorias de Administración por año son:<br><ul><li><b>1° Año:</b>  Introducción, Macroeconomía, Contabilidad, Matemática, EDI I, Derecho civil y comercial, Psicología, Práctica I</li><li><b>2° Año:</b>  Sistemas, Marketing, Capital Humano, Contabilidad Gestión, Estadística, Derecho laboral, Microeconomía, Práctica II</li><li><b>3° Año:</b>  Formulación Proyectos, Finanzas, Logística, Pymes y Empresas Familiares, Costos, Informática, Liderazgo, EDI II, Práctica III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le detallamos el plan de estudios completo de Administración de Empresas:<br><ul><li><b>1° Año:</b>  Introducción a la administración, Macroeconomía, Fundamentos de contabilidad, Matemática, EDI I, Derecho civil/comercial, Psicología organizacional, Prácticas I</li><li><b>2° Año:</b>  Sistemas administrativos, Marketing, Capital humano, Contabilidad para la gestión, Estadística aplicada, Derecho laboral/societario, Microeconomía/desarrollo local, Prácticas II</li><li><b>3° Año:</b>  Formulación y evaluación de proyectos, Administración financiera, Logística en Pyme, Gestión de Pyme/empresas familiares, Costos y presupuesto, Informática, Liderazgo, EDI II, Prácticas III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Administración de Empresas podrá desempeñarse profesionalmente en los ámbitos empresariales y del mundo de la producción local o regional."],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Administración de Empresas podrá desempeñarse profesionalmente en los ámbitos empresariales y del mundo de la producción local o regional."],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Administración de Empresas podrá desempeñarse profesionalmente en los ámbitos empresariales y del mundo de la producción local o regional."]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Administración de Empresas se desarrolla de lunes a viernes en los Turnos Tarde y Noche.",
            "Las clases de Administración de Empresas se dictan durante los Turnos Tarde y Noche en la Sede Central.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Administración de Empresas se desarrolla de lunes a viernes en los Turnos Tarde y Noche. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la tarde y por la noche.",
            "El horario de clases de Administración de Empresas corresponde a los Turnos Tarde y Noche.",
            "¡Te paso este dato! Se cursa presencial por la tarde y por la noche. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Administración de Empresas se dictan durante los Turnos Tarde y Noche.",
            "Pedimos disculpas. Confirmamos que la carrera de Administración de Empresas se cursa en los Turnos Tarde y Noche.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Administración de Empresas se dictan durante los Turnos Tarde y Noche. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Tarde)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 30</span></div></div><div class="aula-card"><div class="aula-card-title">Adm. de Empresas (Turno Noche)</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 34</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 36</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 37</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "El coordinador de la Tecnicatura Superior en Administración de Empresas es el Lic. Fernando Aranibar. Sus horarios de consulta presencial son los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs.",
            "Para contactar a la coordinación de Administración de Empresas, puede consultar al Lic. Fernando Aranibar los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs.",
            "Le recordamos que el coordinador de la Tecnicatura Superior en Administración de Empresas es el Lic. Fernando Aranibar. Sus horarios de consulta presencial son los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "El coordinador de Administración de Empresas es el Lic. Fernando Aranibar. Lo podés consultar los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs.",
            "Si necesitás hablar con el coordinador Fernando Aranibar, atiende consultas los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs.",
            "¡Te paso este dato! El coordinador de Administración de Empresas es el Lic. Fernando Aranibar. Lo podés consultar los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. El coordinador responsable es el Lic. Fernando Aranibar, quien atiende consultas los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que el Lic. Fernando Aranibar coordina la carrera y atiende consultas los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. El coordinador responsable es el Lic. Fernando Aranibar, quien atiende consultas los Lunes de 15:20 a 18:00 hs., Miércoles de 16:00 a 19:00 hs., y Viernes de 17:00 a 18:00 hs. y de 20:40 a 22:00 hs. Agradecemos su comprensión."
        ]
        }
    },
    administracion_publica: {
        descripcion_carrera: {
            formal: ["La Tecnicatura Superior en Administración Pública es una carrera técnica de 3 años, orientada a formar profesionales éticos y capacitados técnicamente para diagnosticar, formular, ejecutar y evaluar políticas públicas en los distintos niveles de gobierno y poderes del Estado.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Administración Pública será un profesional capaz de:<br><ul><li>Diagnosticar, formular, ejecutar y evaluar políticas públicas en distintos niveles jurisdiccionales y poderes del estado.</li><li>Integrar organizaciones que aspiran a ocupar espacios gubernamentales o influir en políticas públicas (partidos, ONGs, sindicatos, etc.).</li><li>Formar parte de organizaciones privadas que interactúan con el sector público.</li><li>Participar de centros o equipos de investigación.</li><li>Desempeñarse en organismos internacionales y multilaterales.</li><li>Estará preparado para ser protagonista y gestor en la organización pública, favoreciendo el desarrollo local a través de competencias técnicas y ética profesional.</li></ul>"],
            informal: ["La Tecnicatura Superior en Administración Pública es una carrera técnica de 3 años, orientada a formar profesionales éticos y capacitados técnicamente para diagnosticar, formular, ejecutar y evaluar políticas públicas en los distintos niveles de gobierno y poderes del Estado.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Administración Pública será un profesional capaz de:<br><ul><li>Diagnosticar, formular, ejecutar y evaluar políticas públicas en distintos niveles jurisdiccionales y poderes del estado.</li><li>Integrar organizaciones que aspiran a ocupar espacios gubernamentales o influir en políticas públicas (partidos, ONGs, sindicatos, etc.).</li><li>Formar parte de organizaciones privadas que interactúan con el sector público.</li><li>Participar de centros o equipos de investigación.</li><li>Desempeñarse en organismos internacionales y multilaterales.</li><li>Estará preparado para ser protagonista y gestor en la organización pública, favoreciendo el desarrollo local a través de competencias técnicas y ética profesional.</li></ul>"],
            molesto: ["La Tecnicatura Superior en Administración Pública es una carrera técnica de 3 años, orientada a formar profesionales éticos y capacitados técnicamente para diagnosticar, formular, ejecutar y evaluar políticas públicas en los distintos niveles de gobierno y poderes del Estado.<br><br><b>Perfil del Egresado:</b><br>Al finalizar la carrera el Técnico Superior en Administración Pública será un profesional capaz de:<br><ul><li>Diagnosticar, formular, ejecutar y evaluar políticas públicas en distintos niveles jurisdiccionales y poderes del estado.</li><li>Integrar organizaciones que aspiran a ocupar espacios gubernamentales o influir en políticas públicas (partidos, ONGs, sindicatos, etc.).</li><li>Formar parte de organizaciones privadas que interactúan con el sector público.</li><li>Participar de centros o equipos de investigación.</li><li>Desempeñarse en organismos internacionales y multilaterales.</li><li>Estará preparado para ser protagonista y gestor en la organización pública, favoreciendo el desarrollo local a través de competencias técnicas y ética profesional.</li></ul>"]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial de Administración Pública consta de:<br><ul><li><b>1° Año:</b>  se cursan Administración pública, Análisis de la realidad socioeconómica y política, Teología I, Introducción al derecho, Sistemas de comunicación en la gestión estatal, Economía, Antropología socio cultural y Práctica profesionalizante I</li><li><b>2° Año:</b>  se cursan Contabilidad pública, Matemática financiera y estadística, Derecho administrativo, Psicología social de las organizaciones, Metodología de la investigación social, Recursos humanos, Economía regional y desarrollo local, y Práctica profesionalizante II</li><li><b>3° Año:</b>  se cursan Políticas públicas, Tecnologías de la información y la comunicación, Planificación y gestión del desarrollo local, Administración financiera, Formulación y evaluación de proyectos, Evaluación y control de gestión, Ética y doctrina social de la Iglesia, y Práctica profesionalizante III</li></ul>",
            "Le detallamos la distribución anual de materias de Administración Pública:<br><ul><li><b>1° Año:</b>  Administración pública, Análisis socioeconómico/político, Teología I, Introducción al derecho, Sistemas de comunicación, Economía, Antropología, Prácticas I</li><li><b>2° Año:</b>  Contabilidad pública, Matemática financiera/estadística, Derecho administrativo, Psicología social de organizaciones, Metodología, Recursos humanos, Economía regional, Prácticas II</li><li><b>3° Año:</b>  Políticas públicas, TIC, Planificación y gestión de desarrollo local, Administración financiera, Formulación y evaluación de proyectos, Evaluación/control de gestión, Ética y doctrina social, Prácticas III</li></ul>",
            "Le recordamos que el plan de estudios oficial de Administración Pública consta de:<br><ul><li><b>1° Año:</b>  se cursan Administración pública, Análisis de la realidad socioeconómica y política, Teología I, Introducción al derecho, Sistemas de comunicación en la gestión estatal, Economía, Antropología socio cultural y Práctica profesionalizante I</li><li><b>2° Año:</b>  se cursan Contabilidad pública, Matemática financiera y estadística, Derecho administrativo, Psicología social de las organizaciones, Metodología de la investigación social, Recursos humanos, Economía regional y desarrollo local, y Práctica profesionalizante II</li><li><b>3° Año:</b>  se cursan Políticas públicas, Tecnologías de la información y la comunicación, Planificación y gestión del desarrollo local, Administración financiera, Formulación y evaluación de proyectos, Evaluación y control de gestión, Ética y doctrina social de la Iglesia, y Práctica profesionalizante III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Administración Pública dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés Administración pública, Análisis socioeconómico y político, Teología I, Introducción al derecho, Sistemas de comunicación estatal, Economía, Antropología y Práctica I</li><li><b>2° Año:</b>  cursás Contabilidad pública, Matemática financiera y estadística, Derecho administrativo, Psicología de las organizaciones, Metodología de investigación, Recursos humanos, Economía regional y Práctica II</li><li><b>3° Año:</b>  cerrás con Políticas públicas, TIC, Planificación del desarrollo local, Administración financiera, Formulación y evaluación de proyectos, Evaluación y control de gestión, Ética y doctrina social, y Práctica III</li></ul>",
            "Te cuento las materias de Administración Pública por año:<br><ul><li><b>1° Año:</b>  tiene Administración pública, Análisis de la realidad, Teología I, Introducción al derecho, Sistemas de comunicación, Economía, Antropología y Práctica I</li><li><b>2° Año:</b>  cursás Contabilidad pública, Matemática financiera, Derecho administrativo, Psicología de organizaciones, Metodología, Recursos humanos, Economía regional y Práctica II</li><li><b>3° Año:</b>  ves Políticas públicas, TIC, Planificación y gestión de desarrollo local, Finanzas, Formulación y evaluación de proyectos, Control de gestión, Ética y doctrina social, y Práctica III</li></ul>",
            "¡Te paso este dato! ¡El plan de Administración Pública dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés Administración pública, Análisis socioeconómico y político, Teología I, Introducción al derecho, Sistemas de comunicación estatal, Economía, Antropología y Práctica I</li><li><b>2° Año:</b>  cursás Contabilidad pública, Matemática financiera y estadística, Derecho administrativo, Psicología de las organizaciones, Metodología de investigación, Recursos humanos, Economía regional y Práctica II</li><li><b>3° Año:</b>  cerrás con Políticas públicas, TIC, Planificación del desarrollo local, Administración financiera, Formulación y evaluación de proyectos, Evaluación y control de gestión, Ética y doctrina social, y Práctica III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo de Administración Pública:<br><ul><li><b>1° Año:</b>  Administración pública, Análisis socioeconómico, Teología I, Introducción al derecho, Sistemas de comunicación, Economía, Antropología, Prácticas I</li><li><b>2° Año:</b>  Contabilidad pública, Matemática financiera, Derecho administrativo, Psicología social, Metodología, Recursos humanos, Economía regional, Prácticas II</li><li><b>3° Año:</b>  Políticas públicas, TIC, Planificación local, Administración financiera, Formulación de proyectos, Control de gestión, Ética, Prácticas III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias oficiales son:<br><ul><li><b>1° Año:</b>  Administración pública, Análisis realidad, Teología I, Introducción al derecho, Sistemas de comunicación, Economía, Antropología, Práctica I</li><li><b>2° Año:</b>  Contabilidad pública, Matemática financiera, Derecho administrativo, Psicología social, Metodología, Recursos humanos, Economía regional, Práctica II</li><li><b>3° Año:</b>  Políticas públicas, TIC, Desarrollo local, Administración financiera, Evaluación proyectos, Control de gestión, Ética, Práctica III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le presentamos el plan de estudios completo de Administración Pública:<br><ul><li><b>1° Año:</b>  Administración pública, Análisis socioeconómico, Teología I, Introducción al derecho, Sistemas de comunicación, Economía, Antropología, Prácticas I</li><li><b>2° Año:</b>  Contabilidad pública, Matemática financiera, Derecho administrativo, Psicología social, Metodología, Recursos humanos, Economía regional, Prácticas II</li><li><b>3° Año:</b>  Políticas públicas, TIC, Planificación local, Administración financiera, Formulación de proyectos, Control de gestión, Ética, Prácticas III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Administración Pública podrá desempeñarse en:<br><ul><li><b>ORGANIZACIONES:</b> Principalmente públicas, pero también ONG, fundaciones, etc.</li><li><b>ÁREAS:</b> Administrativo-contables, sociales, de planeamiento, recursos humanos, presupuestarias, financieras, logística, etc.</li><li><b>NIVELES:</b> Operativo, supervisión, consultivo (interno/externo), dirección, asesoramiento, etc.</li><li><b>SISTEMA LABORAL:</b> Bajo relación de dependencia o en forma autónoma.</li></ul>"],
            informal: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Administración Pública podrá desempeñarse en:<br><ul><li><b>ORGANIZACIONES:</b> Principalmente públicas, pero también ONG, fundaciones, etc.</li><li><b>ÁREAS:</b> Administrativo-contables, sociales, de planeamiento, recursos humanos, presupuestarias, financieras, logística, etc.</li><li><b>NIVELES:</b> Operativo, supervisión, consultivo (interno/externo), dirección, asesoramiento, etc.</li><li><b>SISTEMA LABORAL:</b> Bajo relación de dependencia o en forma autónoma.</li></ul>"],
            molesto: ["<b>Campo Profesional y Laboral:</b><br>El Técnico Superior en Administración Pública podrá desempeñarse en:<br><ul><li><b>ORGANIZACIONES:</b> Principalmente públicas, pero también ONG, fundaciones, etc.</li><li><b>ÁREAS:</b> Administrativo-contables, sociales, de planeamiento, recursos humanos, presupuestarias, financieras, logística, etc.</li><li><b>NIVELES:</b> Operativo, supervisión, consultivo (interno/externo), dirección, asesoramiento, etc.</li><li><b>SISTEMA LABORAL:</b> Bajo relación de dependencia o en forma autónoma.</li></ul>"]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial de la Tecnicatura Superior en Administración Pública se desarrolla durante el Turno Noche.",
            "Las clases de Administración Pública se dictan de lunes a viernes en el Turno Noche en la Sede Central.",
            "Le recordamos que el cursado presencial de la Tecnicatura Superior en Administración Pública se desarrolla durante el Turno Noche. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial por la noche.",
            "El horario de clases de Administración Pública corresponde al Turno Noche.",
            "¡Te paso este dato! Se cursa presencial por la noche. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que las clases de Administración Pública se dictan durante el Turno Noche.",
            "Pedimos disculpas. Confirmamos que la carrera de Administración Pública se cursa en el Turno Noche.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que las clases de Administración Pública se dictan durante el Turno Noche. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            `La distribución de aulas para esta carrera es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`,
            `Le informamos que las clases presenciales de esta carrera se dictan en:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`,
            `Le recordamos que la distribución de aulas asignada es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div> Quedamos a su disposición.`
        ],
            informal: [
            `¡Te paso las aulas! Buscá tu año:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`,
            `Mirá, acá tenés la distribución de aulas para esta carrera:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`,
            `¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`
        ],
            molesto: [
            `Le informamos la distribución de aulas asignada:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`,
            `Confirmamos que las aulas para esta carrera son:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`,
            `Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><div class="aula-card"><div class="aula-card-title">Adm. Pública</div><div class="aula-row"><span class="aula-year">1° Año</span><span class="aula-badge">Aula 23</span></div><div class="aula-row"><span class="aula-year">2° Año</span><span class="aula-badge">Aula 24</span></div><div class="aula-row"><span class="aula-year">3° Año</span><span class="aula-badge">Aula 26</span></div></div>`
        ]
        },
        coordinador: {
            formal: [
            "El coordinador de la Tecnicatura Superior en Administración Pública es el Ing. Rafael Romano. Sus horarios de consulta presencial son los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs.",
            "Para contactar a la coordinación de Administración Pública, puede consultar al Ing. Rafael Romano los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs.",
            "Le recordamos que el coordinador de la Tecnicatura Superior en Administración Pública es el Ing. Rafael Romano. Sus horarios de consulta presencial son los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "El coordinador de Administración Pública es el Ing. Rafael Romano. Lo podés consultar los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs.",
            "Si necesitás hablar con el coordinador Rafael Romano, atiende consultas los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs.",
            "¡Te paso este dato! El coordinador de Administración Pública es el Ing. Rafael Romano. Lo podés consultar los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. El coordinador responsable es el Ing. Rafael Romano, quien atiende consultas los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que el Ing. Rafael Romano coordina la carrera y realiza consultas los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. El coordinador responsable es el Ing. Rafael Romano, quien atiende consultas los Lunes de 19:20 a 21:20 hs., Martes de 18:00 a 20:00 hs., Miércoles de 18:00 a 19:20 hs., Jueves de 18:00 a 20:00 hs., y Viernes de 19:20 a 20:00 hs. Agradecemos su comprensión."
        ]
        }
    }
};

// Configuración de Fallbacks
const FALLBACKS = {
    formal: [
        "Disculpe la inconveniencia, pero no he logrado interpretar su solicitud con las reglas de consulta actuales de las tecnicaturas y profesorados. Por favor, refrasee su pregunta utilizando términos explícitos como 'carreras', 'horario' o 'inscripción'.",
        "Estimado/a, no logré comprender su consulta. Le sugerimos reformularla empleando términos como 'materias', 'contacto' o 'ubicación'.",
        "Disculpe las molestias. No disponemos de información automatizada para esa consulta. Por favor, intente con términos sencillos como 'requisitos' o 'duración'."
    ],
    informal: [
        "¡Uy, no entendí bien qué necesitás! Porfa, probá escribiendo de otra forma, por ejemplo usando palabras como 'materias', 'dirección', 'horarios' o 'salida laboral' así te puedo dar una mano.",
        "No entendí bien tu consulta. ¿Probás reescribiéndola con otras palabras? Podés preguntar por 'materias', 'coordinador' o 'contacto'.",
        "Mmm, no me quedó claro lo que buscás. ¿Me lo decís de otra forma? Intentá preguntar algo directo sobre las carreras o requisitos."
    ],
    molesto: [
        "Lamentamos no poder resolver su duda en este momento debido a que la estructura de la consulta no coincide con nuestro catálogo de ayuda automatizada. Para brindarle una solución inmediata, por favor indíquenos puntualmente si su duda refiere a 'horarios', 'requisitos' o 'plan de estudios'.",
        "Pedimos disculpas por los inconvenientes. No logramos interpretar su consulta. Si nos indica brevemente si busca 'requisitos', 'contacto' o 'carreras', le asistiremos de inmediato.",
        "Lamentamos las dificultades en la comunicación. Para agilizar la respuesta, le sugerimos reformular la pregunta utilizando palabras clave como 'coordinador', 'materias' o 'dirección'."
    ]
};

// Detección de intenciones con pipeline NLP de 2 niveles
function detectarIntenciones(texto) {
    const textoNormalizado = normalizar(texto);
    const palabrasTexto = textoNormalizado.split(/\W+/);

    // Pipeline NLP completo sobre la entrada del usuario
    const tokens = tokenizar(textoNormalizado);
    const tokensSinStopwords = eliminarStopwords(tokens);
    const tokensLematizados = tokensSinStopwords.map(t => lematizar(t));
    const tokensStemizados = tokensLematizados.map(t => stemizar(t));

    const intencionesEncontradas = [];

    for (const [intencion, palabras] of Object.entries(PALABRAS_CLAVE)) {
        // NIVEL 1: Coincidencia directa (flujo original preservado al 100%)
        const coincidenciaDirectaKw = palabras.find(p => contieneKeyword(textoNormalizado, palabrasTexto, p));
        if (coincidenciaDirectaKw) {
            intencionesEncontradas.push(intencion);
            continue;
        }

        // NIVEL 2: Coincidencia NLP (lematización + stemming sobre keywords preprocesadas)
        const kwProcesadas = PALABRAS_CLAVE_PROCESADAS[intencion];
        const coincideNLP = kwProcesadas.some(kw => {
            if (kw.esMultiPalabra) {
                // Multi-palabra: verificar que todos los lemmas aparezcan en los tokens lematizados
                return kw.lemmas.every(lemma => tokensLematizados.includes(lemma));
            }
            // Una sola palabra: comparar por lemma
            if (kw.lemmas.some(l => tokensLematizados.includes(l))) return true;
            // Comparar por stem (más agresivo, solo si el stem tiene >= 4 caracteres)
            if (kw.stems.some(s => s.length >= 4 && tokensStemizados.includes(s))) return true;
            return false;
        });

        if (coincideNLP) {
            intencionesEncontradas.push(intencion);
        }
    }
    const unicas = [...new Set(intencionesEncontradas)];
    let intencionesFinales = unicas;
    // Filter out generic intents if a specific sede intent is detected to avoid double answers and fallbacks
    if (intencionesFinales.some(i => i.startsWith('sede_'))) {
        intencionesFinales = intencionesFinales.filter(i => i !== 'carreras' && i !== 'informacion_sedes' && i !== 'ubicacion');
    }

    // Regla estricta: Si se pregunta por aranceles/cuotas, ignorar descripcion_carrera para no ensuciar la respuesta
    const intencionesAdmin = ['valor_cuota', 'valor_inscripcion', 'aranceles'];
    if (intencionesFinales.some(i => intencionesAdmin.includes(i))) {
        intencionesFinales = intencionesFinales.filter(i => i !== 'descripcion_carrera' && i !== 'campo_laboral');
    }

    // Regla estricta para tesorería: si pregunta por trámites/precios, priorizar eso sobre el horario genérico
    if (intencionesFinales.includes('tramites_tesoreria')) {
        // Solo eliminamos horario_tesoreria si no se detectó una intención directa o por NLP que contenga "horario" (pero para simplificar, la filtramos)
        intencionesFinales = intencionesFinales.filter(i => i !== 'horario_tesoreria');
    }

    // Si pregunta por el horario de tesorería, ignorar el horario de clases (horario_atencion)
    if (intencionesFinales.includes('horario_tesoreria')) {
        intencionesFinales = intencionesFinales.filter(i => i !== 'horario_atencion');
    }

    return intencionesFinales;
}

// Función principal para procesar el mensaje
export function procesarMensaje(texto, sessionId = 'default_session') {
    const sesion = obtenerSesion(sessionId);
    const tono = detectarTono(texto);
    const intenciones = detectarIntenciones(texto);

    // Limpiar contexto si hay términos genéricos/plurales
    const tL = texto.toLowerCase();
    if (tL.includes('cada carrera') || tL.includes('las carreras') || tL.includes('todas las')) {
        sesion.carreraContexto = null;
    }

    // Detectar si el texto menciona alguna carrera específica en la consulta actual
    const carreraDetectada = detectarCarrera(texto);
    if (carreraDetectada) {
        // Guardamos en la sesión para recordar el contexto
        sesion.carreraContexto = carreraDetectada;
    }

    // Si se detectó una carrera en la consulta actual, removemos las intenciones generales de listado
    if (carreraDetectada) {
        ['carreras', 'tecnicaturas', 'profesorados', carreraDetectada].forEach(intencionGeneral => {
            const idx = intenciones.indexOf(intencionGeneral);
            if (idx !== -1) {
                intenciones.splice(idx, 1);
            }
        });
    }

    // Si se pregunta específicamente por tecnicaturas o profesorados, eliminar la intención general de carreras
    if (intenciones.includes('tecnicaturas') || intenciones.includes('profesorados')) {
        const idx = intenciones.indexOf('carreras');
        if (idx !== -1) {
            intenciones.splice(idx, 1);
        }
    }

    // Si se detectó una carrera pero no hay intenciones de información específicas,
    // forzar la intención de descripción de carrera para evitar el fallback y dar información directa
    const tieneIntencionInfo = intenciones.some(i => [
        'descripcion_carrera',
        'plan_estudios_completo',
        'campo_laboral',
        'coordinador',
        'horario_atencion',
        'ubicacion',
        'contacto',
        'requisitos_inscripcion'
    ].includes(i));

    if (carreraDetectada && !tieneIntencionInfo) {
        intenciones.push('descripcion_carrera');
    }

    if (intenciones.length === 0) {
        const opciones = FALLBACKS[tono];
        const keyHistorico = `fallback_${tono}`;
        const lastIdx = sesion.historialVariaciones[keyHistorico];
        const newIdx = (lastIdx === undefined ? 0 : (lastIdx + 1)) % opciones.length;
        sesion.historialVariaciones[keyHistorico] = newIdx;
        return opciones[newIdx];
    }

    // Usar la carrera detectada o la guardada en la sesión
    const carreraAUsar = carreraDetectada || sesion.carreraContexto;

    // Ordenar intenciones de manera lógica e institucional
    const intencionesOrdenadas = intenciones.sort((a, b) => {
        return ORDEN_LOGICO_INTENCIONES.indexOf(a) - ORDEN_LOGICO_INTENCIONES.indexOf(b);
    });

    // Obtener las respuestas unificando el tono y alternando variaciones
    const respuestasSegmentadas = intencionesOrdenadas.map(intencion => {
        const tieneEspecifico = carreraAUsar && RESPUESTAS_CARRERA[carreraAUsar] && RESPUESTAS_CARRERA[carreraAUsar][intencion];
        
        let opciones;
        let keyHistorico;

        if (tieneEspecifico) {
            opciones = RESPUESTAS_CARRERA[carreraAUsar][intencion][tono];
            keyHistorico = `${intencion}_${tono}_${carreraAUsar}`;
        } else if (RESPUESTAS_GENERALES[intencion]) {
            // Lógica de Fallback de Sedes
            const carrerasAnexos = ['carrera_especial_sordos', 'carrera_mecatronica', 'carrera_software', 'carrera_automatizacion', 'carrera_lengua', 'carrera_historia', 'carrera_psicologia'];
            const requiereInfoCentral = ['distribucion_aulas', 'horarios', 'contacto', 'coordinador', 'requisitos', 'ubicacion', 'horario_atencion'];
            
            if ((carrerasAnexos.includes(carreraAUsar) || (intenciones.some(i => i.startsWith('sede_')))) && requiereInfoCentral.includes(intencion) && !tieneEspecifico) {
                opciones = ["⚠️ Información no disponible en este momento. Por favor, comunícate con administración."];
            } else {
                opciones = RESPUESTAS_GENERALES[intencion][tono];
            }
            keyHistorico = `${intencion}_${tono}_general`;
        } else {
            // Aclaración si la consulta requiere carrera pero no hay contexto
            opciones = generarAclaracionDinamica(intencion, tono);
            keyHistorico = `aclaracion_${tono}_${intencion}`;
        }

        // Alternar variaciones para evitar respuestas repetitivas consecutivas
        const lastIdx = sesion.historialVariaciones[keyHistorico];
        const newIdx = (lastIdx === undefined ? 0 : (lastIdx + 1)) % opciones.length;
        sesion.historialVariaciones[keyHistorico] = newIdx;

        return opciones[newIdx];
    });

    // Quitar duplicados en las respuestas (por ejemplo, si se dispararon dos aclaraciones)
    const respuestasUnicas = Array.from(new Set(respuestasSegmentadas));

    // Combinar en un único párrafo
    return respuestasUnicas.join(' ');
}

// Mantener getCarreras por compatibilidad con server.js
export function getCarreras() {
    return [
        {
            id: "ciencia_datos",
            nombre: "Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "gestion_juridica",
            nombre: "Tecnicatura Superior en Gestión Jurídica",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "ciencia_politica",
            nombre: "Profesorado de Educación Secundaria en Ciencia Política",
            duracion: "4 años",
            modalidad: "Presencial"
        },
        {
            id: "educacion_especial",
            nombre: "Profesorado de Educación Especial con Orientación en Discapacidad Intelectual",
            duracion: "4 años",
            modalidad: "Presencial"
        },
        {
            id: "ciencias_sagradas",
            nombre: "Profesorado en Ciencias Sagradas",
            duracion: "4 años",
            modalidad: "Presencial"
        },
        {
            id: "gestion_ambiental",
            nombre: "Tecnicatura Superior en Gestión Ambiental",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "ninez_adolescencia_familia",
            nombre: "Tecnicatura Superior en Niñez, Adolescencia y Familia",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "laboratorio_analisis_clinicos",
            nombre: "Tecnicatura Superior en Laboratorio de Análisis Clínicos",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "hemoterapia",
            nombre: "Tecnicatura Superior en Hemoterapia",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "acompanamiento_terapeutico",
            nombre: "Tecnicatura Superior en Acompañamiento Terapéutico",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "administracion_empresas",
            nombre: "Tecnicatura Superior en Administración de Empresas",
            duracion: "3 años",
            modalidad: "Presencial"
        },
        {
            id: "administracion_publica",
            nombre: "Tecnicatura Superior en Administración Pública",
            duracion: "3 años",
            modalidad: "Presencial"
        }
    ];
}
