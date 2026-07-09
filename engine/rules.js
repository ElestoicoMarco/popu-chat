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
        // Correcciones de saludos con letras extra que no llegan a 3 (ej: "holaa")
        '\\bhola+\\b': 'hola',
        '\\bbuenas+\\b': 'buenas',
        
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
    
    return t;
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
    if (textoNormalizado.includes('educacion especial') || 
        palabrasTexto.includes('discapacidad') || 
        palabrasTexto.includes('inclusiva') || 
        palabrasTexto.includes('inclusion') || 
        palabrasTexto.includes('especial') || 
        palabrasTexto.includes('especiales')) {
        return 'educacion_especial';
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
        palabrasTexto.includes('tramites') || 
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

    return null;
}

const PALABRAS_CLAVE = {
    saludo: ['hola', 'buenas', 'dia', 'tarde', 'noche', 'que tal', 'como va'],
    valor_cuota_2027: ['cuota 2027', 'arancel 2027', 'precio 2027', 'costo 2027', 'año que viene', 'proximo año', 'cuotas 2027'],
    valor_cuota: ['cuota', 'cuanto se paga', 'precio cuota', 'valor cuota', 'vencimiento cuota', 'arancel', 'mensualidad', 'cuanto cuesta la cuota', 'recargo', 'mora'],
    valor_inscripcion: ['valor inscripcion', 'precio inscripcion', 'cuanto cuesta la inscripcion', 'costo inscripcion', 'precio matricula', 'costo matricula', 'pagar inscripcion'],
    tramites_tesoreria: ['constancia', 'autenticacion', 'libreta', 'analitico', 'documentacion junta', 'duplicado titulo', 'biblioteca', 'tramite', 'precios tesoreria', 'aranceles tesoreria', 'tesoreria'],
    distribucion_aulas: ['aula', 'aulas', 'espacios', 'donde curso', 'que aula', 'turno mañana', 'turno tarde', 'turno noche', 'donde nos toca'],
    requisitos_duplicado: ['requisitos duplicado', 'otro ejemplar', 'extravio titulo', 'perdi el titulo', 'duplicado de titulo', 'perdi mi titulo', 'deterioro titulo'],
    carreras: ['carrera', 'carreras', 'oferta academica', 'estudiar', 'que tienen', 'que puedo cursar', 'que se dicta', 'dictan', 'oferta', 'ofertas', 'oferta educativa'],
    tecnicaturas: ['tecnicatura', 'tecnicaturas', 'tecnica', 'tecnicas', 'carreras tecnicas', 'carrera tecnica'],
    profesorados: ['profesorado', 'profesorados', 'profesor', 'profesores', 'docente', 'docentes', 'carreras docentes'],
    descripcion_carrera: ['de que trata', 'que es', 'descripcion', 'que hace', 'para que sirve', 'perfil', 'que aprendo'],
    plan_estudios_completo: ['materias', 'plan de estudio', 'asignaturas', 'materias de primero', 'que curso', 'materias de segundo', 'materias de tercero', 'primer año', 'segundo año', 'tercer año', 'cuarto año', 'plan de estudios'],
    campo_laboral: ['salida laboral', 'donde trabajar', 'trabajo', 'empleo', 'mercado laboral', 'de que puedo trabajar', 'empresas', 'litio', 'campo laboral', 'campo profesional', 'trabaja', 'salida'],
    coordinador: ['coordinador', 'coordinadora', 'coordinadores', 'silvia', 'cichello', 'jimena', 'cabrera', 'susana', 'villa', 'valverde', 'mariela', 'garcia', 'canil', 'galarza', 'santillan', 'aranibar', 'romano', 'pablo', 'vilte', 'consulta', 'horarios de consulta', 'horario de consulta', 'contacto del coordinador'],
    horario_atencion: ['horario', 'a que hora', 'atienden', 'abren', 'cierran', 'atencion', 'hasta que hora', 'cuando ir', 'horarios', 'turno', 'cursado', 'se cursa', 'cursa'],
    ubicacion: ['ubicacion', 'donde queda', 'direccion', 'donde estan', 'como llego', 'sede', 'mapa', 'san salvador', 'sarmiento', 'sarmiento 268'],
    contacto: ['contacto', 'telefono', 'mail', 'correo', 'llamar', 'email', 'comunicarme', 'comunicar', 'numero', 'tel', 'fijo', 'llamada'],
    requisitos_inscripcion: ['inscribirme', 'anotarme', 'requisitos', 'papeles', 'que necesito', 'titulo secundario', 'inscripcion', 'matricula'],
    agradecimiento: ['gracias', 'muchas gracias', 'genial', 'me sirvio', 'impecable', 'chau', 'adios']
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
            "Tesorería Informa - Valores de Cuota 2026:\nEl valor de la cuota mensual para todas las carreras es de $55.000.-, a excepción de las Carreras Especiales cuyo valor es de $60.000.-\n\nVencimientos: Las cuotas de todas las carreras vencen el último día de cada mes. Transcurrido ese plazo, se aplicará un recargo por cada mes de mora."
        ],
        informal: [
            "Para el año 2026, el valor de la cuota para casi todas las carreras es de $55.000 (las Carreras Especiales están en $60.000).\nAcordate que las cuotas vencen el último día de cada mes; si te pasás de esa fecha, se cobra un recargo por cada mes de atraso."
        ],
        molesto: [
            "Le informamos los valores vigentes para 2026: la cuota es de $55.000 para todas las carreras y $60.000 para las especiales. Vencen el último día de cada mes, sin excepción, y el atraso genera recargos."
        ]
    },
    valor_inscripcion: {
        formal: [
            "Tesorería Informa: El valor de inscripción para el Ciclo Lectivo 2026 es de $60.000.-"
        ],
        informal: [
            "Te comento que el valor de la inscripción para el ciclo 2026 está fijado en $60.000."
        ],
        molesto: [
            "Le informamos que el arancel de inscripción correspondiente al ciclo 2026 es de $60.000."
        ]
    },
    tramites_tesoreria: {
        formal: [
            "Tesorería Informa - Aranceles Ciclo Lectivo 2026:<br><ul><li><b>Constancias y Autenticaciones:</b> $3.800.-</li><li><b>Libretas:</b> $11.000.-</li><li><b>Analítico:</b> $7.500.-</li><li><b>Documentación p/ Junta:</b> $12.500.-</li><li><b>Duplicado de Título:</b> $27.000.-</li><li><b>Biblioteca:</b> $8.000.-</li></ul>"
        ],
        informal: [
            "Te paso los precios de tesorería para el 2026:<br><ul><li>Constancias y Autenticaciones: $3.800</li><li>Libretas: $11.000</li><li>Analítico: $7.500</li><li>Documentación p/ Junta: $12.500</li><li>Duplicado de Título: $27.000</li><li>Biblioteca: $8.000</li></ul>"
        ],
        molesto: [
            "Los aranceles de trámites para 2026 son:<br><ul><li>Constancias: $3.800</li><li>Libretas: $11.000</li><li>Analítico: $7.500</li><li>Doc. p/ Junta: $12.500</li><li>Duplicado de Título: $27.000</li><li>Biblioteca: $8.000</li></ul>"
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
    carreras: {
        formal: [
            "La oferta académica del IES N° 7 'Populorum Progressio' - INTELA consta de las siguientes carreras presenciales:<br><br><b>Tecnicaturas Superiores (3 años):</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div><br><b>Profesorados (4 años):</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div>"
        ],
        informal: [
            "¡Te cuento la oferta completa de carreras que podés cursar en el IES N° 7!<br><br><b>Tecnicaturas Superiores (3 años):</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div><br><b>Profesorados (4 años):</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div>"
        ],
        molesto: [
            "A continuación le detallamos la totalidad de las carreras dictadas en la institución:<br><br><b>Tecnicaturas (3 años):</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia de Datos e Inteligencia Artificial\">Ciencia de Datos e IA</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Jurídica\">Gestión Jurídica</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Gestión Ambiental\">Gestión Ambiental</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Niñez, Adolescencia y Familia\">Niñez y Familia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Laboratorio de Análisis Clínicos\">Laboratorio Clínico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Hemoterapia\">Hemoterapia</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Acompañamiento Terapéutico\">Acomp. Terapéutico</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración de Empresas\">Adm. de Empresas</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Administración Pública\">Adm. Pública</button></div><br><b>Profesorados (4 años):</b><div class=\"btn-list\"><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencia Política\">Ciencia Política</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Educación Especial\">Educación Especial</button><button class=\"quick-btn inline-quick-btn\" data-msg=\"Ciencias Sagradas\">Ciencias Sagradas</button></div>"
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
            "Para formalizar su inscripción definitiva en cualquier tecnicatura o profesorado, la normativa ministerial requiere la presentación de la siguiente documentación obligatoria: Título Secundario original autenticado (o constancia de título en trámite), fotocopia de Documento Nacional de Identidad (DNI), Partida de Nacimiento actualizada, constancia de CUIL y fotos tipo carnet.",
            "Los requisitos oficiales de ingreso del IES 7 constan de la entrega física en carpeta de: analítico del secundario completo, DNI, CUIL, partida de nacimiento y certificado de aptitud médica.",
            "Le recordamos que para formalizar su inscripción definitiva en cualquier tecnicatura o profesorado, la normativa ministerial requiere la presentación de la siguiente documentación obligatoria: Título Secundario original autenticado (o constancia de título en trámite), fotocopia de Documento Nacional de Identidad (DNI), Partida de Nacimiento actualizada, constancia de CUIL y fotos tipo carnet. Quedamos a su disposición para cualquier aclaración."
        ],
        informal: [
            "Para inscribirte tenés que presentar los papeles típicos: fotocopia de tu DNI, la constancia de CUIL, partida de nacimiento actualizada, fotos tipo carnet y el analítico del secundario (o la constancia de título en trámite).",
            "Anotarte es fácil, tenés que llevar una carpeta con: fotocopia de DNI, CUIL, partida de nacimiento, fotos carnet y el título secundario completo.",
            "¡Te paso este dato! Para inscribirte tenés que presentar los papeles típicos: fotocopia de tu DNI, la constancia de CUIL, partida de nacimiento actualizada, fotos tipo carnet y el analítico del secundario (o la constancia de título en trámite). Escribime cualquier otra consulta que tengas."
        ],
        molesto: [
            "Lamentamos sinceramente la demora. Le detallamos rigurosamente los requisitos obligatorios de inscripción: título secundario autenticado o en trámite, fotocopia de DNI, constancia de CUIL, partida de nacimiento actualizada y fotos carnet.",
            "Pedimos disculpas por los inconvenientes. Para evitar contratiempos, debe presentar de manera inmediata: analítico del secundario, fotocopia de DNI, CUIL, partida de nacimiento y certificado de salud.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Le detallamos rigurosamente los requisitos obligatorios de inscripción: título secundario autenticado o en trámite, fotocopia de DNI, constancia de CUIL, partida de nacimiento actualizada y fotos carnet. Agradecemos su comprensión."
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
        'distribucion_aulas': 'la distribución de aulas',
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
        'distribucion_aulas': 'Aulas de',
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
        { id: "Niñez, Adolescencia y Familia", label: "Niñez y Familia" },
        { id: "Laboratorio de Análisis Clínicos", label: "Laboratorio Clínico" },
        { id: "Hemoterapia", label: "Hemoterapia" },
        { id: "Acompañamiento Terapéutico", label: "Acomp. Terapéutico" },
        { id: "Administración de Empresas", label: "Adm. de Empresas" },
        { id: "Administración Pública", label: "Adm. Pública" }
    ];

    let btnHtml = '<br><br><div class="btn-list">';
    carreras.forEach(c => {
        btnHtml += `<button class="quick-btn inline-quick-btn" data-msg="${prefijo} ${c.id}">${c.label}</button>`;
    });
    btnHtml += '</div>';

    return [`${intro}${btnHtml}`];
}

// Respuestas específicas por carrera
const RESPUESTAS_CARRERA = {
    ciencia_datos: {
        descripcion_carrera: {
            formal: [
            "La Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial es una carrera de educación superior técnica de 3 años, orientada a formar profesionales capaces de recolectar, procesar, modelar y analizar grandes volúmenes de datos (Big Data), con el fin de automatizar procesos y transformar datos brutos en información estratégica para la toma de decisiones.",
            "Esta carrera se sitúa en la intersección de la matemática aplicada, la estadística y la programación avanzada. Los estudiantes aprenden a diseñar algoritmos para que los sistemas informáticos identifiquen patrones y 'aprendan' de forma autónoma (Machine Learning), resolviendo problemas complejos mediante analítica predictiva.",
            "Le recordamos que la Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial es una carrera de educación superior técnica de 3 años, orientada a formar profesionales capaces de recolectar, procesar, modelar y analizar grandes volúmenes de datos (Big Data), con el fin de automatizar procesos y transformar datos brutos en información estratégica para la toma de decisiones. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una carrera técnica de 3 años súper moderna. Vas a aprender a juntar, procesar y analizar toneladas de datos (Big Data) para automatizar procesos y tomar decisiones clave en empresas, mezclando programación avanzada, matemática y estadística.",
            "Básicamente, acá aprendés a programar algoritmos para que las computadoras detecten patrones y 'aprendan' solas (Machine Learning). Es la carrera ideal si te gusta la inteligencia artificial, la matemática aplicada y resolver problemas reales con datos.",
            "¡Te paso este dato! Es una carrera técnica de 3 años súper moderna. Vas a aprender a juntar, procesar y analizar toneladas de datos (Big Data) para automatizar procesos y tomar decisiones clave en empresas, mezclando programación avanzada, matemática y estadística. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora y le informamos de manera directa: esta carrera de 3 años forma profesionales en recolección, procesamiento y análisis de grandes volúmenes de datos (Big Data) e Inteligencia Artificial (Machine Learning) para la toma de decisiones estratégicas.",
            "Pedimos disculpas por los inconvenientes. La tecnicatura dura 3 años y capacita de manera directa en la intersección de matemática aplicada, estadística y programación avanzada para automatizar procesos e implementar analítica predictiva.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora y le informamos de manera directa: esta carrera de 3 años forma profesionales en recolección, procesamiento y análisis de grandes volúmenes de datos (Big Data) e Inteligencia Artificial (Machine Learning) para la toma de decisiones estratégicas. Agradecemos su comprensión."
        ]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial de la carrera de Ciencia de Datos se estructura de la siguiente manera:<br><ul><li><b>1° Año:</b>  se cursan Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b>  se cursan Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I, Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b>  se cursan Aprendizaje Profundo, Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas Profesionalizantes III</li></ul>",
            "Le detallamos la distribución anual de materias de Ciencia de Datos:<br><ul><li><b>1° Año:</b>  Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I; </li><li><b>2° Año:</b>  Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I, Prácticas Profesionalizantes II y EDI II; </li><li><b>3° Año:</b>  Aprendizaje Profundo, Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas Profesionalizantes III</li></ul>",
            "Le recordamos que el plan de estudios oficial de la carrera de Ciencia de Datos se estructura de la siguiente manera:<br><ul><li><b>1° Año:</b>  se cursan Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b>  se cursan Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I, Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b>  se cursan Aprendizaje Profundo, Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas Profesionalizantes III. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Ciencia de Datos está buenísimo y dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b>  cursás Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I (Machine Learning), Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b>  cerrás con Aprendizaje Profundo (Deep Learning), Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas Profesionalizantes III</li></ul>",
            "Te cuento cómo se dividen las materias de Ciencia de Datos:<br><ul><li><b>1° Año:</b>  tiene Álgebra, Análisis Matemático, Programación I (Python), Ciencia y TIC, Base de Datos (SQL), Redes, Prácticas I y EDI I</li><li><b>2° Año:</b>  ves Probabilidad y Estadística, Programación II (POO), Bases de Datos Avanzadas y NoSQL, Estructuras de Datos, Aprendizaje Automático I, Prácticas II y EDI II</li><li><b>3° Año:</b>  cursás Aprendizaje Profundo, Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética y Regulación de Datos, Seguridad y Prácticas III</li></ul>",
            "¡Te paso este dato! ¡El plan de Ciencia de Datos está buenísimo y dura 3 años!:<br><ul><li><b>1° Año:</b>  tenés Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I</li><li><b>2° Año:</b>  cursás Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I (Machine Learning), Prácticas Profesionalizantes II y EDI II</li><li><b>3° Año:</b>  cerrás con Aprendizaje Profundo (Deep Learning), Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas Profesionalizantes III. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. A continuación le presentamos detalladamente el plan de estudios completo de Ciencia de Datos:<br><ul><li><b>1° Año:</b>  Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas I y EDI I</li><li><b>2° Año:</b>  Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I, Prácticas II y EDI II</li><li><b>3° Año:</b>  Aprendizaje Profundo, Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas III</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias obligatorias de Ciencia de Datos por año son:<br><ul><li><b>1° Año:</b>  Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I, EDI I</li><li><b>2° Año:</b>  Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos, Aprendizaje Automático I, Prácticas II, EDI II</li><li><b>3° Año:</b>  Aprendizaje Profundo, Minería de Datos y Big Data, NLP, Ética, Seguridad de la Información y Prácticas III</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. A continuación le presentamos detalladamente el plan de estudios completo de Ciencia de Datos:<br><ul><li><b>1° Año:</b>  Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas I y EDI I</li><li><b>2° Año:</b>  Probabilidad y Estadística, Programación II, Bases de Datos Avanzadas, Estructura de Datos y Algoritmos, Aprendizaje Automático I, Prácticas II y EDI II</li><li><b>3° Año:</b>  Aprendizaje Profundo, Minería de Datos y Big Data, Procesamiento del Lenguaje Natural (NLP), Ética, Privacidad y Regulación de Datos, Seguridad de la Información y Prácticas III. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: [
            "El egresado en Ciencia de Datos posee un amplio campo en la Economía del Conocimiento.<br><ul><li>Puede desempeñarse en roles como Científico de Datos (Data Scientist), Analista de Datos (Data Analyst), Ingeniero de Machine Learning, Especialista en Inteligencia Artificial y Administrador/Arquitecto de Datos.</li><li>A nivel regional en Jujuy, la inserción se da en empresas de desarrollo de software locales, modernización del Estado provincial, y analítica predictiva en la industria del litio, minería, agricultura de precisión (tabaco y caña de azúcar) y la planta de energía solar de Cauchari.</li></ul>",
            "La salida laboral en Ciencia de Datos incluye la incorporación en empresas tecnológicas locales, nacionales e internacionales (bajo modalidad de trabajo remoto), así como en el ámbito público y privado.<br><ul><li>Los graduados se desempeñan aplicando modelos de Machine Learning, analizando datos estadísticos o administrando infraestructuras de datos en sectores clave de Jujuy como el litio, minería, agricultura de precisión y energía solar.</li></ul>",
            "Le recordamos que el egresado en Ciencia de Datos posee un amplio campo en la Economía del Conocimiento.<br><ul><li>Puede desempeñarse en roles como Científico de Datos (Data Scientist), Analista de Datos (Data Analyst), Ingeniero de Machine Learning, Especialista en Inteligencia Artificial y Administrador/Arquitecto de Datos.</li><li>A nivel regional en Jujuy, la inserción se da en empresas de desarrollo de software locales, modernización del Estado provincial, y analítica predictiva en la industria del litio, minería, agricultura de precisión (tabaco y caña de azúcar) y la planta de energía solar de Cauchari.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "En Ciencia de Datos tenés un montón de salida laboral.<br><ul><li>Podés laburar remoto para afuera o acá en Jujuy en empresas de software locales, en el Estado, o en industrias grandes de la región como las del litio, la minería, la agricultura de precisión (tabaco y caña) y la planta solar de Cauchari.</li><li>Los puestos van desde Analista de Datos y Científico de Datos hasta Ingeniero de Machine Learning o Especialista en IA.</li></ul>",
            "¡La salida profesional en Ciencia de Datos es enorme!<br><ul><li>Podés trabajar como Científico de Datos armando modelos de Machine Learning, como Analista de Datos creando tableros en PowerBI/Tableau, o como Ingeniero de IA instalando bots y sistemas inteligentes.</li><li>Hay mucha demanda en Jujuy (litio, minería, software y agricultura) y también podés laburar 100% remoto.</li></ul>",
            "¡Te paso este dato!<br><ul><li>En Ciencia de Datos tenés un montón de salida laboral.</li><li>Podés laburar remoto para afuera o acá en Jujuy en empresas de software locales, en el Estado, o en industrias grandes de la región como las del litio, la minería, la agricultura de precisión (tabaco y caña) y la planta solar de Cauchari.</li><li>Los puestos van desde Analista de Datos y Científico de Datos hasta Ingeniero de Machine Learning o Especialista en IA.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>La salida laboral de Ciencia de Datos abarca puestos de Científico de Datos, Analista de Datos, Ingeniero de Machine Learning, Especialista en IA y Administrador de Datos.</li><li>Los sectores de inserción en Jujuy son las empresas de software, modernización del Estado, litio, minería, agricultura de precisión (tabaco/caña) y la planta solar de Cauchari.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>Le informamos de forma concreta que los graduados en Ciencia de Datos trabajan de manera presencial o remota en áreas de Big Data, optimización e IA.</li><li>Hay alta demanda regional en la industria del litio, minería, agricultura tecnológica y el sector público provincial.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>La salida laboral de Ciencia de Datos abarca puestos de Científico de Datos, Analista de Datos, Ingeniero de Machine Learning, Especialista en IA y Administrador de Datos.</li><li>Los sectores de inserción en Jujuy son las empresas de software, modernización del Estado, litio, minería, agricultura de precisión (tabaco/caña) y la planta solar de Cauchari.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A23), 2°(A22), 3°(A10)</li></ul>"
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
            formal: [
            "La Tecnicatura Superior en Gestión Jurídica es una carrera de educación superior técnica orientada a formar profesionales con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial.",
            "Esta formación capacita en la administración y diligenciamiento de trámites jurídicos y administrativos, preparando al egresado tanto para el desempeño independiente como para integrar equipos y departamentos legales de empresas y entidades públicas.",
            "Le recordamos que la Tecnicatura Superior en Gestión Jurídica es una carrera de educación superior técnica orientada a formar profesionales con sólidos conocimientos sobre la gestión de los procesos jurídicos de toda índole: administrativo, registral y judicial. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una tecnicatura genial para aprender todo sobre cómo se gestionan los trámites y procesos jurídicos de tipo administrativo, judicial o registral en el ámbito público y privado.",
            "Básicamente, te forma para que domines la gestión de expedientes y trámites legales, trabajando en estudios jurídicos, notariales o departamentos legales de cualquier empresa.",
            "¡Te paso este dato! Es una tecnicatura genial para aprender todo sobre cómo se gestionan los trámites y procesos jurídicos de tipo administrativo, judicial o registral en el ámbito público y privado. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Le informamos que esta tecnicatura capacita de manera directa en la gestión de procesos jurídicos administrativos, registrales y judiciales para el ámbito público y privado.",
            "Pedimos disculpas por los inconvenientes. La carrera brinda una sólida formación en trámites jurídicos prácticos para desempeñarse de manera dependiente o independiente en organizaciones de todo tipo.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Le informamos que esta tecnicatura capacita de manera directa en la gestión de procesos jurídicos administrativos, registrales y judiciales para el ámbito público y privado. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Gestión Jurídica posee un perfil profesional versátil.<br><ul><li>Su campo ocupacional abarca el desempeño en la actividad privada (Estudios Jurídicos, Bancos, Agencias, Registros, Empresas); en organismos públicos como el Registro General de la Propiedad Inmueble, Registros del Automotor, Registro Prendario, Estado y Capacidad Civil; asesorías jurídicas del Estado; Tribunales Provinciales y Federales; ANSES; y dependencias provinciales o municipales.</li></ul>",
            "Los egresados están facultados para desempeñarse como técnicos auxiliares en la administración pública, justicia o registros; colaborar en departamentos legales corporativos (contratos mercantiles, laborales y civiles); diligenciar trámites en DGR, AFIP, Municipalidad y ANSES; o bien ofrecer servicios tercerizados e independientes de tramitación de expedientes.",
            "Le recordamos que el Técnico Superior en Gestión Jurídica posee un perfil profesional versátil.<br><ul><li>Su campo ocupacional abarca el desempeño en la actividad privada (Estudios Jurídicos, Bancos, Agencias, Registros, Empresas); en organismos públicos como el Registro General de la Propiedad Inmueble, Registros del Automotor, Registro Prendario, Estado y Capacidad Civil; asesorías jurídicas del Estado; Tribunales Provinciales y Federales; ANSES; y dependencias provinciales o municipales.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Como egresado vas a poder trabajar tanto en el sector público como en el privado.<br><ul><li>Tenés salida en estudios jurídicos, contables o notariales; en departamentos legales de empresas (viendo contratos y temas laborales); y haciendo trámites en organismos como la AFIP, DGR, ANSES y municipalidades.</li><li>También podés entrar en Tribunales, registros del automotor o de propiedad, o armar tu propia consultora de trámites.</li></ul>",
            "¡La salida laboral es muy variada!<br><ul><li>Podés laburar en el Registro de la Propiedad, del Automotor, en asesorías del Estado, en bancos, empresas, aseguradoras o ART.</li><li>Otra opción muy común es trabajar de forma independiente ofreciendo servicios de gestoría y tramitación de expedientes judiciales y administrativos.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Como egresado vas a poder trabajar tanto en el sector público como en el privado.</li><li>Tenés salida en estudios jurídicos, contables o notariales; en departamentos legales de empresas (viendo contratos y temas laborales); y haciendo trámites en organismos como la AFIP, DGR, ANSES y municipalidades.</li><li>También podés entrar en Tribunales, registros del automotor o de propiedad, o armar tu propia consultora de trámites.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>Los sectores de empleo directo de Gestión Jurídica son: estudios jurídicos, contables e independientes, bancos, empresas privadas, Registros del Automotor y de Propiedad Inmueble, asesorías del Estado, Tribunales Provinciales y Federales, ANSES, municipios y aseguradoras/ART.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>La salida laboral califica al egresado para desempeñarse como auxiliar administrativo y judicial en dependencias estatales y privadas, gestionando trámites en AFIP, DGR, ANSES y registros oficiales.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>Los sectores de empleo directo de Gestión Jurídica son: estudios jurídicos, contables e independientes, bancos, empresas privadas, Registros del Automotor y de Propiedad Inmueble, asesorías del Estado, Tribunales Provinciales y Federales, ANSES, municipios y aseguradoras/ART.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A1), 2°(A35), 3°(A37)</li></ul>"
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
            formal: [
            "El Profesorado de Educación Secundaria en Ciencia Política es una carrera de educación superior de 4 años, orientada a formar docentes capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares del campo de la formación ciudadana y el derecho.",
            "Esta carrera habilita profesionalmente para la práctica docente a nivel secundario, promoviendo el análisis de las problemáticas socioeducativas de la región, los vínculos interdisciplinarios y la participación en proyectos educativos y de investigación en Ciencia Política.",
            "Le recordamos que el Profesorado de Educación Secundaria en Ciencia Política es una carrera de educación superior de 4 años, orientada a formar docentes capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares del campo de la formación ciudadana y el derecho. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es un profesorado de 4 años que te prepara para dar clases en secundaria en materias de formación ciudadana, política y derecho, enseñándote a diseñar proyectos educativos e investigar en ciencia política.",
            "Si te gusta la docencia, la política y la formación ciudadana, esta carrera de 4 años te forma para guiar el aprendizaje de alumnos secundarios y participar de equipos de investigación y evaluación curricular.",
            "¡Te paso este dato! Es un profesorado de 4 años que te prepara para dar clases en secundaria en materias de formación ciudadana, política y derecho, enseñándote a diseñar proyectos educativos e investigar en ciencia política. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Le informamos que este profesorado de 4 años de duración capacita formalmente para la docencia en educación secundaria dentro del campo de la formación ciudadana, la política y el derecho.",
            "Pedimos disculpas por los inconvenientes. La carrera forma profesores capacitados para planificar y evaluar el aprendizaje a nivel secundario e integrar equipos de investigación en Ciencia Política.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Le informamos que este profesorado de 4 años de duración capacita formalmente para la docencia en educación secundaria dentro del campo de la formación ciudadana, la política y el derecho. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Profesor en Ciencia Política posee un campo laboral concentrado en el sector educativo e institucional.<br><ul><li>Podrá insertarse profesionalmente en instituciones de nivel secundario tanto de gestión pública, privada, cooperativa y social; en programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia de Jujuy; así como en instituciones abocadas a la investigación y la capacitación docente.</li></ul>",
            "La inserción profesional abarca la práctica docente de nivel medio en escuelas de cualquier modalidad de gestión; el diseño y coordinación de proyectos educativos regionales; y la participación activa en centros de capacitación e investigación pedagógica y política.",
            "Le recordamos que el Profesor en Ciencia Política posee un campo laboral concentrado en el sector educativo e institucional.<br><ul><li>Podrá insertarse profesionalmente en instituciones de nivel secundario tanto de gestión pública, privada, cooperativa y social; en programas y proyectos socioeducativos impulsados por el Ministerio de Educación de la Provincia de Jujuy; así como en instituciones abocadas a la investigación y la capacitación docente.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder dar clases en escuelas secundarias públicas, privadas, cooperativas o sociales de la provincia.<br><ul><li>También podés entrar a trabajar en proyectos socioeducativos que arme el Ministerio de Educación de Jujuy, o dedicarte a la investigación y la capacitación en institutos y centros especializados.</li></ul>",
            "¡El campo laboral principal es la docencia secundaria!<br><ul><li>Pero además de dar clases en colegios públicos o privados, podés sumarte a programas educativos del Ministerio, dictar talleres, o trabajar en institutos de investigación social y capacitación de profesores.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder dar clases en escuelas secundarias públicas, privadas, cooperativas o sociales de la provincia.</li><li>También podés entrar a trabajar en proyectos socioeducativos que arme el Ministerio de Educación de Jujuy, o dedicarte a la investigación y la capacitación en institutos y centros especializados.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>El campo ocupacional del Profesor en Ciencia Política se limita a: colegios secundarios públicos, privados, cooperativas y sociales; programas del Ministerio de Educación de la Provincia de Jujuy; e instituciones dedicadas a la investigación y capacitación profesional.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>El egresado se inserta de forma directa en el sistema educativo provincial de nivel secundario y en equipos de investigación curriculares y socioeducativos del Ministerio.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>El campo ocupacional del Profesor en Ciencia Política se limita a: colegios secundarios públicos, privados, cooperativas y sociales; programas del Ministerio de Educación de la Provincia de Jujuy; e instituciones dedicadas a la investigación y capacitación profesional.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A35), 2°(A31), 3°(A30), 4°(A33)</li></ul>"
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
    },
    educacion_especial: {
        descripcion_carrera: {
            formal: [
            "El Profesorado de Educación Especial con Orientación en Discapacidad Intelectual es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles.",
            "Esta formación se fundamenta en el desarrollo de diseños universales de aprendizaje (DUA) bajo un enfoque inclusivo respetuoso de la diversidad y el Modelo social de discapacidad, articulando acciones entre la Modalidad de Educación Especial, niveles educativos comunes y centros de salud.",
            "Le recordamos que el Profesorado de Educación Especial con Orientación en Discapacidad Intelectual es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para acompañar el proceso educativo de estudiantes con discapacidad intelectual a través del diseño de propuestas pedagógicas accesibles. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una carrera hermosa de 4 años que te forma para acompañar el aprendizaje de estudiantes con discapacidad intelectual, armando propuestas de enseñanza accesibles (DUA) y proyectos inclusivos basados en el modelo social de la discapacidad.",
            "Con este profesorado de 4 años vas a aprender a diseñar estrategias pedagógicas personalizadas, evaluar los ritmos de aprendizaje de cada alumno y trabajar en la inclusión de personas con discapacidad intelectual eliminando barreras sociales y escolares.",
            "¡Te paso este dato! Es una carrera hermosa de 4 años que te forma para acompañar el aprendizaje de estudiantes con discapacidad intelectual, armando propuestas de enseñanza accesibles (DUA) y proyectos inclusivos basados en el modelo social de la discapacidad. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Esta carrera de 4 años forma profesionales de manera rigurosa para diseñar propuestas pedagógicas accesibles y diseños universales de aprendizaje (DUA) dirigidos a estudiantes con discapacidad intelectual bajo la perspectiva de educación inclusiva.",
            "Pedimos disculpas por los inconvenientes. El profesorado capacita directamente en evaluación pedagógica, estrategias diversificadas y el desarrollo de proyectos socio-comunitarios desde el Modelo social de discapacidad.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Esta carrera de 4 años forma profesionales de manera rigurosa para diseñar propuestas pedagógicas accesibles y diseños universales de aprendizaje (DUA) dirigidos a estudiantes con discapacidad intelectual bajo la perspectiva de educación inclusiva. Agradecemos su comprensión."
        ]
        },
        plan_estudios_completo: {
            formal: [
            "El plan de estudios oficial para Educación Especial se estructura en 4 años de la siguiente manera:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, Didáctica de la Lengua y la Literatura, Didáctica de la Matemática, Comunicación, Lenguaje y sus alteraciones, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b>  TIC y Discapacidad, Sociología de la Educación, Didáctica de Ciencias Sociales, Didáctica de Ciencias Naturales, Abordaje Pedagógico III, Abordajes Pedagógicos Complejos y Práctica III</li><li><b>4° Año:</b>  ESI y Discapacidad Intelectual, Ética Profesional Docente, Perspectiva del adulto con Discapacidad Intelectual, dos Unidades de opción institucional y Residencia Pedagógica</li></ul>",
            "Le detallamos la distribución anual de materias de Educación Especial:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de la Educación, Didáctica de la Lengua, Didáctica de la Matemática, Comunicación y Lenguaje, Trastornos en el desarrollo, Abordaje Pedagógico II, Práctica II</li><li><b>3° Año:</b>  TIC y Discapacidad, Sociología de la Educación, Didáctica de Sociales, Didáctica de Naturales, Abordaje Pedagógico III, Abordajes Complejos, Práctica III</li><li><b>4° Año:</b>  ESI y Discapacidad, Ética Docente, Perspectiva del Adulto con Discapacidad, dos Unidades Institucionales, Residencia</li></ul>",
            "Le recordamos que el plan de estudios oficial para Educación Especial se estructura en 4 años de la siguiente manera:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia de las Políticas Educativas, Didáctica de la Lengua y la Literatura, Didáctica de la Matemática, Comunicación, Lenguaje y sus alteraciones, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b>  TIC y Discapacidad, Sociología de la Educación, Didáctica de Ciencias Sociales, Didáctica de Ciencias Naturales, Abordaje Pedagógico III, Abordajes Pedagógicos Complejos y Práctica III</li><li><b>4° Año:</b>  ESI y Discapacidad Intelectual, Ética Profesional Docente, Perspectiva del adulto con Discapacidad Intelectual, dos Unidades de opción institucional y Residencia Pedagógica. Quedamos a su disposición para cualquier aclaración</li></ul>"
        ],
            informal: [
            "¡El plan de Educación Especial dura 4 años!:<br><ul><li><b>1° Año:</b>  cursás: Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b>  tenés: Filosofía, Historia de las Políticas Educativas, Didáctica de Lengua, Didáctica de Matemática, Comunicación y Lenguaje, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b>  ves: TIC y Discapacidad, Sociología de la Educación, Didáctica de Sociales, Didáctica de Naturales, Abordaje Pedagógico III, Abordajes Complejos y Práctica III</li><li><b>4° Año:</b>  cerrás con: ESI y Discapacidad Intelectual, Ética Docente, Perspectiva del Adulto, dos materias de opción institucional y la Residencia</li></ul>",
            "Te comento el plan de Educación Especial:<br><ul><li><b>1° Año:</b>  tiene Pedagogía, Psicología, Alfabetización, Didáctica, Neuropsicobiología, Sujeto, Educación Temprana, Abordaje I y Práctica I</li><li><b>2° Año:</b>  tiene Filosofía, Historia, Didáctica de Lengua, Didáctica de Matemática, Comunicación, Trastornos en el desarrollo, Abordaje II y Práctica II</li><li><b>3° Año:</b>  ves TIC, Sociología, Didáctica de Sociales/Naturales, Abordaje III, Abordajes Complejos y Práctica III. Cursás el último año con ESI, Ética Docente, Perspectiva del Adulto, dos materias institucionales y la Residencia Pedagógica</li></ul>",
            "¡Te paso este dato! ¡El plan de Educación Especial dura 4 años!:<br><ul><li><b>1° Año:</b>  cursás: Pedagogía, Psicología Educacional, Alfabetización Académica, Didáctica General, Neuropsicobiología del Desarrollo, Sujeto de la Educación, Educación Temprana, Abordaje Pedagógico I y Práctica I</li><li><b>2° Año:</b>  tenés: Filosofía, Historia de las Políticas Educativas, Didáctica de Lengua, Didáctica de Matemática, Comunicación y Lenguaje, Trastornos en el desarrollo, Abordaje Pedagógico II y Práctica II</li><li><b>3° Año:</b>  ves: TIC y Discapacidad, Sociología de la Educación, Didáctica de Sociales, Didáctica de Naturales, Abordaje Pedagógico III, Abordajes Complejos y Práctica III</li><li><b>4° Año:</b>  cerrás con: ESI y Discapacidad Intelectual, Ética Docente, Perspectiva del Adulto, dos materias de opción institucional y la Residencia. Escribime cualquier otra consulta que tengas</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora. El plan de estudios de Educación Especial consta de:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Neuropsicobiología, Sujeto, Educación Temprana, Abordaje I, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia, Didáctica de Lengua y Matemática, Comunicación y Lenguaje, Trastornos en el desarrollo, Abordaje II, Práctica II</li><li><b>3° Año:</b>  TIC y Discapacidad, Sociología, Didáctica de Sociales/Naturales, Abordaje III, Abordajes Complejos, Práctica III</li><li><b>4° Año:</b>  ESI y Discapacidad, Docente, Perspectiva del Adulto con Discapacidad, dos Unidades Institucionales y Residencia Pedagógica</li></ul>",
            "Pedimos disculpas por los inconvenientes. Las materias anuales obligatorias de la carrera son:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Neuropsicobiología, Sujeto, Ed. Temprana, Abordaje I, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia, Didáctica de Lengua/Matemática, Comunicación, Trastornos en desarrollo, Abordaje II, Práctica II</li><li><b>3° Año:</b>  TIC, Sociología, Didáctica de Sociales/Naturales, Abordaje III, Abordajes Complejos, Práctica III</li><li><b>4° Año:</b>  ESI, Ética, Perspectiva del Adulto, dos materias de opción institucional, Residencia</li></ul>",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. El plan de estudios de Educación Especial consta de:<br><ul><li><b>1° Año:</b>  Pedagogía, Psicología, Alfabetización, Didáctica, Neuropsicobiología, Sujeto, Educación Temprana, Abordaje I, Práctica I</li><li><b>2° Año:</b>  Filosofía, Historia, Didáctica de Lengua y Matemática, Comunicación y Lenguaje, Trastornos en el desarrollo, Abordaje II, Práctica II</li><li><b>3° Año:</b>  TIC y Discapacidad, Sociología, Didáctica de Sociales/Naturales, Abordaje III, Abordajes Complejos, Práctica III</li><li><b>4° Año:</b>  ESI y Discapacidad, Docente, Perspectiva del Adulto con Discapacidad, dos Unidades Institucionales y Residencia Pedagógica. Agradecemos su comprensión</li></ul>"
        ]
        },
        campo_laboral: {
            formal: [
            "El Profesor de Educación Especial posee un campo profesional diversificado.<br><ul><li>En el ámbito educativo, se desempeña en escuelas de todos los niveles acompañando trayectorias, realizando co-enseñanza con docentes comunes y configurando apoyos.</li><li>En el ámbito de la salud, realiza acompañamiento pedagógico independiente o integra equipos interdisciplinarios en centros educativos y de rehabilitación.</li><li>En el ámbito socio-comunitario, interviene en clubes, centros vecinales y ONGs promoviendo la inclusión y eliminando barreras de accesibilidad.</li></ul>",
            "La inserción profesional faculta al egresado para el trabajo conjunto con psicólogos, fonoaudiólogos y trabajadores sociales; el abordaje institucional y eliminación de barreras en el sistema escolar obligatorio; y la articulación con centros terapéuticos privados y actividades socio-comunitarias de integración.",
            "Le recordamos que el Profesor de Educación Especial posee un campo profesional diversificado.<br><ul><li>En el ámbito educativo, se desempeña en escuelas de todos los niveles acompañando trayectorias, realizando co-enseñanza con docentes comunes y configurando apoyos.</li><li>En el ámbito de la salud, realiza acompañamiento pedagógico independiente o integra equipos interdisciplinarios en centros educativos y de rehabilitación.</li><li>En el ámbito socio-comunitario, interviene en clubes, centros vecinales y ONGs promoviendo la inclusión y eliminando barreras de accesibilidad.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Tenés salida en tres áreas principales.<br><ul><li>En el ámbito educativo podés trabajar en escuelas secundarias y primarias comunes acompañando trayectorias de alumnos e interactuando en co-enseñanza con otros profes.</li><li>En salud, podés hacer consultorio independiente o laburar en centros terapéuticos y de rehabilitación privados con psicólogos y fonoaudiólogos.</li><li>Y en lo socio-comunitario, podés intervenir en clubes, vecinales, ONGs y espacios recreativos ayudando a eliminar barreras para que las personas con discapacidad participen plenamente.</li></ul>",
            "¡El campo laboral es enorme!<br><ul><li>Podés dar apoyo a la inclusión escolar en colegios comunes de gestión pública o privada, trabajar en equipos interdisciplinarios de salud, o ejercer la profesión de forma independiente en acompañamiento pedagógico.</li><li>También hay lugar en centros recreativos, deportivos y ONGs que buscan integrar a personas con discapacidad intelectual.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Tenés salida en tres áreas principales.</li><li>En el ámbito educativo podés trabajar en escuelas secundarias y primarias comunes acompañando trayectorias de alumnos e interactuando en co-enseñanza con otros profes.</li><li>En salud, podés hacer consultorio independiente o laburar en centros terapéuticos y de rehabilitación privados con psicólogos y fonoaudiólogos.</li><li>Y en lo socio-comunitario, podés intervenir en clubes, vecinales, ONGs y espacios recreativos ayudando a eliminar barreras para que las personas con discapacidad participen plenamente.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>La salida laboral abarca: escuelas comunes de todos los niveles obligatorios (configurando apoyos y co-enseñanza); ejercicio profesional independiente en acompañamiento pedagógico; centros de rehabilitación terapéutica privados; y áreas comunitarias como ONGs, clubes y centros vecinales.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>El egresado está capacitado para incorporarse a escuelas públicas y privadas promoviendo la educación inclusiva, así como a centros asistenciales de salud e instituciones socio-comunitarias eliminando barreras de participación.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>La salida laboral abarca: escuelas comunes de todos los niveles obligatorios (configurando apoyos y co-enseñanza); ejercicio profesional independiente en acompañamiento pedagógico; centros de rehabilitación terapéutica privados; y áreas comunitarias como ONGs, clubes y centros vecinales.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
        },
        horario_atencion: {
            formal: [
            "El cursado presencial del Profesorado de Educación Especial con Orientación en Discapacidad Intelectual se desarrolla en los Turnos Mañana y Noche.",
            "Las clases del Profesorado de Educación Especial se dictan de lunes a viernes en los Turnos Mañana y Noche.",
            "Le recordamos que el cursado presencial del Profesorado de Educación Especial con Orientación en Discapacidad Intelectual se desarrolla en los Turnos Mañana y Noche. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Se cursa presencial a la mañana y a la noche.",
            "Los horarios de cursado de Educación Especial corresponden a los Turnos Mañana y Noche.",
            "¡Te paso este dato! Se cursa presencial a la mañana y a la noche. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. Le informamos que el cursado de Educación Especial se realiza en los Turnos Mañana y Noche.",
            "Pedimos disculpas por la tardanza. Confirmamos que la carrera de Educación Especial se dicta en los Turnos Mañana y Noche.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. Le informamos que el cursado de Educación Especial se realiza en los Turnos Mañana y Noche. Agradecemos su comprensión."
        ]
        },
        distribucion_aulas: {
            formal: [
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Mañana:</b> 1°(A13), 2°(A21), 3°(A20), 4°(A12)</li><li><b>Turno Noche:</b> 1°(A13), 2°(A25), 3°(A10), 4°(A35)</li></ul>"
        ]
        },
        coordinador: {
            formal: [
            "La coordinadora del Profesorado de Educación Especial es la Prof. Jimena Cabrera. Sus horarios de consulta presencial son los días Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.",
            "Para comunicarse con la coordinación de Educación Especial, puede contactar a la Prof. Jimena Cabrera los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.",
            "Le recordamos que la coordinadora del Profesorado de Educación Especial es la Prof. Jimena Cabrera. Sus horarios de consulta presencial son los días Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "La coordinadora de Educación Especial es la Prof. Jimena Cabrera. La podés encontrar para consultas los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.",
            "Si necesitás hablar con la coordinadora Jimena Cabrera, atiende consultas los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.",
            "¡Te paso este dato! La coordinadora de Educación Especial es la Prof. Jimena Cabrera. La podés encontrar para consultas los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La coordinadora de la carrera es la Prof. Jimena Cabrera, atendiendo consultas los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.",
            "Pedimos disculpas por los inconvenientes. Le recordamos que la Prof. Jimena Cabrera coordina la carrera y realiza consultas los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La coordinadora de la carrera es la Prof. Jimena Cabrera, atendiendo consultas los Lunes de 10:10 a 12:10 hs., Miércoles de 09:00 a 11:00 hs., y Jueves y Viernes de 18:00 a 20:00 hs. Agradecemos su comprensión."
        ]
        }
    },
    ciencias_sagradas: {
        descripcion_carrera: {
            formal: [
            "El Profesorado en Ciencias Sagradas es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia.",
            "Esta formación capacita para la práctica docente considerando los vínculos afectivos y formativos con estudiantes, familias e instituciones escolares, así como para diseñar y ejecutar proyectos de pastoral educativa interdisciplinarios.",
            "Le recordamos que el Profesorado en Ciencias Sagradas es una carrera de educación superior de 4 años, orientada a formar profesionales capacitados para planificar, desarrollar, guiar y evaluar procesos de enseñanza y aprendizaje en espacios curriculares pertenecientes al campo de la formación cristiana, la teología y la doctrina social de la Iglesia. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una carrera hermosa de 4 años que te forma para ser profesor en formación cristiana, teología y doctrina social de la Iglesia en colegios religiosos, y también para coordinar proyectos de pastoral educativa.",
            "Con este profesorado de 4 años vas a aprender a guiar el aprendizaje cristiano y teológico de tus alumnos, trabajar codo a codo con las familias e integrar equipos para proyectos de pastoral escolar.",
            "¡Te paso este dato! Es una carrera hermosa de 4 años que te forma para ser profesor en formación cristiana, teología y doctrina social de la Iglesia en colegios religiosos, y también para coordinar proyectos de pastoral educativa. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Este profesorado de 4 años capacita formalmente para la enseñanza en los campos de formación cristiana, teología dogmática y doctrina social de la Iglesia a nivel primario y secundario.",
            "Pedimos disculpas por los inconvenientes. La carrera prepara profesores con herramientas pedagógicas y teológicas para ejercer la docencia y participar activamente en proyectos de pastoral educativa institucional.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Este profesorado de 4 años capacita formalmente para la enseñanza en los campos de formación cristiana, teología dogmática y doctrina social de la Iglesia a nivel primario y secundario. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Profesor en Ciencias Sagradas posee una salida laboral orientada al ámbito escolar confesional.<br><ul><li>Podrá insertarse profesionalmente en instituciones educativas en los tres niveles obligatorios: inicial, primaria y secundaria, en roles como docente de formación cristiana, tutor, preceptor, coordinador de pastoral o referente de ESI.</li><li>Asimismo, podrá formar parte de programas socioeducativos ministeriales de la provincia y proyectos de pastoral socio-comunitaria.</li></ul>",
            "La inserción del graduado abarca colegios confesionales de gestión privada o social; roles de acompañamiento estudiantil e institucional (tutoría, preceptoría); coordinación del proyecto de pastoral educativa; y el desarrollo de iniciativas comunitarias de pastoral y formación ética.",
            "Le recordamos que el Profesor en Ciencias Sagradas posee una salida laboral orientada al ámbito escolar confesional.<br><ul><li>Podrá insertarse profesionalmente en instituciones educativas en los tres niveles obligatorios: inicial, primaria y secundaria, en roles como docente de formación cristiana, tutor, preceptor, coordinador de pastoral o referente de ESI.</li><li>Asimismo, podrá formar parte de programas socioeducativos ministeriales de la provincia y proyectos de pastoral socio-comunitaria.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder trabajar principalmente en colegios confesionales o religiosos de nivel inicial, primario y secundario, ya sea dando clases de religión/formación cristiana, o como preceptor, tutor, coordinador de pastoral escolar o referente de ESI.<br><ul><li>También podés entrar en proyectos socioeducativos provinciales del Ministerio o en actividades de pastoral comunitaria y barrial.</li></ul>",
            "¡El campo laboral fuerte son los colegios religiosos!<br><ul><li>Podés ser profe de formación ética e institucional, preceptor, tutor de grupo, o el encargado de planificar las actividades de pastoral y retiros del colegio.</li><li>También hay salida en el Ministerio de Educación de Jujuy a través de sus programas comunitarios.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder trabajar principalmente en colegios confesionales o religiosos de nivel inicial, primario y secundario, ya sea dando clases de religión/formación cristiana, o como preceptor, tutor, coordinador de pastoral escolar o referente de ESI.</li><li>También podés entrar en proyectos socioeducativos provinciales del Ministerio o en actividades de pastoral comunitaria y barrial.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>Los espacios de inserción laboral del Profesor en Ciencias Sagradas son: escuelas confesionales de nivel inicial, primario y secundario (docente, tutor, preceptor, coordinador de pastoral, referente ESI); programas socioeducativos del Ministerio de Educación de la Provincia; y pastoral comunitaria.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>El profesor califica de forma directa para el ejercicio docente en formación moral y religiosa dentro del sistema escolar privado confesional, además de roles pastorales y tutorías académicas.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>Los espacios de inserción laboral del Profesor en Ciencias Sagradas son: escuelas confesionales de nivel inicial, primario y secundario (docente, tutor, preceptor, coordinador de pastoral, referente ESI); programas socioeducativos del Ministerio de Educación de la Provincia; y pastoral comunitaria.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A22), 2°(A21), 3°(A20), 4°(A33)</li></ul>"
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
            formal: [
            "La Tecnicatura Superior en Gestión Ambiental es una carrera de educación superior técnica orientada a formar profesionales capacitados para participar en acciones ambientales clave como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales.",
            "Esta formación habilita para aplicar técnicas de monitoreo y muestreo respetando protocolos oficiales, supervisar el manejo de insumos y residuos, verificar la normativa ambiental vigente y realizar inspecciones o auditorías ambientales en el ámbito industrial y comunitario.",
            "Le recordamos que la Tecnicatura Superior en Gestión Ambiental es una carrera de educación superior técnica orientada a formar profesionales capacitados para participar en acciones ambientales clave como estudios de impacto ambiental, proyectos de ordenamiento territorial y diagnósticos ambientales. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una tecnicatura genial para aprender a resolver problemas del medio ambiente de manera sustentable, haciendo estudios de impacto ambiental, monitoreando la contaminación y gestionando auditorías en empresas y municipios.",
            "Básicamente, te forma para que apliques técnicas de monitoreo (como muestras de agua y suelo), verifiques que se cumplan las leyes ecológicas vigentes y planifiques campañas de educación ambiental y desarrollo sostenible.",
            "¡Te paso este dato! Es una tecnicatura genial para aprender a resolver problemas del medio ambiente de manera sustentable, haciendo estudios de impacto ambiental, monitoreando la contaminación y gestionando auditorías en empresas y municipios. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. La carrera de Gestión Ambiental capacita directamente en la elaboración de diagnósticos ambientales, ordenamiento territorial, inspecciones y auditorías, y la aplicación de métodos de monitoreo de contaminación de suelo, agua y gases.",
            "Pedimos disculpas por los inconvenientes. La tecnicatura forma técnicos aptos para supervisar los procedimientos de manejo de residuos y suministros ecológicos, gestionando la variable ambiental bajo normativas vigentes.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. La carrera de Gestión Ambiental capacita directamente en la elaboración de diagnósticos ambientales, ordenamiento territorial, inspecciones y auditorías, y la aplicación de métodos de monitoreo de contaminación de suelo, agua y gases. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Gestión Ambiental posee un amplio campo ocupacional.<br><ul><li>Puede desempeñarse en industrias, organismos públicos (como secretarías de medio ambiente o de ecología), empresas privadas, ONGs y en departamentos de medio ambiente e higiene industrial.</li><li>Asimismo, están facultados para actuar en departamentos de abastecimiento de insumos e instrumentos medioambientales.</li></ul>",
            "La inserción profesional abarca el planeamiento ambiental estatal, la coordinación del manejo de residuos materiales y energéticos, las consultorías independientes de impacto minero y la realización de auditorías de calidad ambiental certificada en empresas.",
            "Le recordamos que el Técnico Superior en Gestión Ambiental posee un amplio campo ocupacional.<br><ul><li>Puede desempeñarse en industrias, organismos públicos (como secretarías de medio ambiente o de ecología), empresas privadas, ONGs y en departamentos de medio ambiente e higiene industrial.</li><li>Asimismo, están facultados para actuar en departamentos de abastecimiento de insumos e instrumentos medioambientales.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder trabajar tanto en el sector público como en el privado.<br><ul><li>Tenés salida en secretarías de medio ambiente y ecología de municipios y provincias, en departamentos ambientales de industrias y fábricas, en consultoras de impacto ecológico y en ONGs que impulsan la sustentabilidad.</li><li>También podés trabajar en departamentos de compras y abastecimiento de insumos ecológicos y de control.</li></ul>",
            "¡El campo laboral es bastante amplio!<br><ul><li>Podés desempeñarte haciendo auditorías ambientales en empresas, en proyectos de ordenamiento territorial del Estado, o en el sector minero regulando el impacto.</li><li>Además, podés dar asesoría independiente sobre adquisición de suministros ecológicos o armar campañas de concientización.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder trabajar tanto en el sector público como en el privado.</li><li>Tenés salida en secretarías de medio ambiente y ecología de municipios y provincias, en departamentos ambientales de industrias y fábricas, en consultoras de impacto ecológico y en ONGs que impulsan la sustentabilidad.</li><li>También podés trabajar en departamentos de compras y abastecimiento de insumos ecológicos y de control.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>El campo laboral de la carrera abarca: secretarías públicas de medio ambiente y ecología; departamentos ambientales de industrias y empresas privadas; ONGs ambientales; y el área de abastecimiento e insumos de tecnología ecológica.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>Los técnicos se desempeñan en el planeamiento y la gestión de recursos naturales y residuos en industrias y el sector público, inspeccionando normas de calidad ambiental vigentes.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>El campo laboral de la carrera abarca: secretarías públicas de medio ambiente y ecología; departamentos ambientales de industrias y empresas privadas; ONGs ambientales; y el área de abastecimiento e insumos de tecnología ecológica.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A30), 2°(A31)</li></ul>"
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
            formal: [
            "La Tecnicatura Superior en Niñez, Adolescencia y Familia es una carrera de educación superior de 3 años de duración que forma profesionales capacitados para intervenir en distintos espacios públicos y organizaciones de la sociedad civil, con el objeto de promover y proteger integralmente los derechos de niños, niñas, adolescentes y sus familias en el marco de la Ley N° 26.061 y bajo una perspectiva de Derechos Humanos.",
            "Esta formación técnica brinda herramientas teóricas y metodológicas para la planificación e implementación de dispositivos socioeducativos y comunitarios orientados a acompañar a familias y jóvenes en situación de vulnerabilidad social, fomentando el espíritu crítico y el trabajo interdisciplinario.",
            "Le recordamos que la Tecnicatura Superior en Niñez, Adolescencia y Familia es una carrera de educación superior de 3 años de duración que forma profesionales capacitados para intervenir en distintos espacios públicos y organizaciones de la sociedad civil, con el objeto de promover y proteger integralmente los derechos de niños, niñas, adolescentes y sus familias en el marco de la Ley N° 26.061 y bajo una perspectiva de Derechos Humanos. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una tecnicatura de 3 años súper comprometida y con mucha salida social. Te prepara para trabajar en el Estado o en ONGs, acompañando a familias vulnerables y armando actividades educativas o recreativas para defender y promover los derechos de los chicos y adolescentes bajo la Ley 26.061.",
            "En esta carrera de 3 años vas a aprender a diseñar estrategias de contención social y articular el trabajo con psicólogos, trabajadores sociales y docentes para asegurar que los niños y adolescentes tengan acceso a la salud, educación y recreación.",
            "¡Te paso este dato! Es una tecnicatura de 3 años súper comprometida y con mucha salida social. Te prepara para trabajar en el Estado o en ONGs, acompañando a familias vulnerables y armando actividades educativas o recreativas para defender y promover los derechos de los chicos y adolescentes bajo la Ley 26.061. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Esta tecnicatura de 3 años de duración forma técnicos especializados en diseñar dispositivos de promoción y protección de los derechos de niños, niñas, adolescentes y familias bajo la Ley de Protección Integral N° 26.061.",
            "Pedimos disculpas por los inconvenientes. La carrera dura 3 años y brinda capacitación directa en intervención comunitaria, acompañamiento familiar e integración de equipos interdisciplinarios en el ámbito de los Derechos Humanos.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Esta tecnicatura de 3 años de duración forma técnicos especializados en diseñar dispositivos de promoción y protección de los derechos de niños, niñas, adolescentes y familias bajo la Ley de Protección Integral N° 26.061. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Niñez, Adolescencia y Familia cuenta con un campo ocupacional diverso.<br><ul><li>Está facultado para desempeñarse en organismos públicos de gestión estatal a nivel nacional, provincial y municipal (como Ministerios de Desarrollo Humano, de Salud, de Educación y de Seguridad), así como en organizaciones multilaterales y Organizaciones de la Sociedad Civil (ONGs, hogares, centros de día, fundaciones).</li><li>Puede ejercer su labor de forma independiente o en relación de dependencia en equipos disciplinares e interdisciplinares.</li></ul>",
            "La inserción profesional capacita al egresado para el diseño y asesoramiento técnico de dispositivos comunitarios de protección, la coordinación de grupos de recreación y educación no formal, el acompañamiento familiar en contextos de vulnerabilidad social y la articulación de acciones corresponsables dentro del Sistema de Protección Integral de derechos.",
            "Le recordamos que el Técnico Superior en Niñez, Adolescencia y Familia cuenta con un campo ocupacional diverso.<br><ul><li>Está facultado para desempeñarse en organismos públicos de gestión estatal a nivel nacional, provincial y municipal (como Ministerios de Desarrollo Humano, de Salud, de Educación y de Seguridad), así como en organizaciones multilaterales y Organizaciones de la Sociedad Civil (ONGs, hogares, centros de día, fundaciones).</li><li>Puede ejercer su labor de forma independiente o en relación de dependencia en equipos disciplinares e interdisciplinares.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder trabajar tanto en el sector público como en el privado y de forma independiente.<br><ul><li>Tenés salida en organismos del Estado (nacionales, provinciales o municipales como ministerios o secretarías de desarrollo social), ONGs, hogares de menores, centros de día o de recreación comunitaria.</li><li>También podés sumarte a equipos interdisciplinarios con psicólogos y trabajadores sociales, coordinar grupos recreativos o dar asesoría a entidades sociales.</li></ul>",
            "¡El campo laboral es bastante amplio en el ámbito social!<br><ul><li>Podés trabajar en dependencias del gobierno dedicadas a la infancia y la familia, en fundaciones y ONGs, en centros educativos no formales, y dando apoyo directo a familias en situaciones difíciles.</li><li>Podés trabajar contratado o de forma independiente brindando consultoría y acompañamiento.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder trabajar tanto en el sector público como en el privado y de forma independiente.</li><li>Tenés salida en organismos del Estado (nacionales, provinciales o municipales como ministerios o secretarías de desarrollo social), ONGs, hogares de menores, centros de día o de recreación comunitaria.</li><li>También podés sumarte a equipos interdisciplinarios con psicólogos y trabajadores sociales, coordinar grupos recreativos o dar asesoría a entidades sociales.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>Los espacios de empleo directo de la tecnicatura abarcan: organismos públicos estatales (nacionales, provinciales, municipales), organizaciones de la sociedad civil (ONGs, centros comunitarios), equipos de trabajo interdisciplinarios y consultorías independientes de acompañamiento familiar.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>El egresado se encuentra habilitado para desempeñarse en dependencias públicas de protección social, coordinar actividades de educación no formal para jóvenes, y asesorar a organizaciones sociales en el marco de la corresponsabilidad de la Ley 26.</li><li>061.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>Los espacios de empleo directo de la tecnicatura abarcan: organismos públicos estatales (nacionales, provinciales, municipales), organizaciones de la sociedad civil (ONGs, centros comunitarios), equipos de trabajo interdisciplinarios y consultorías independientes de acompañamiento familiar.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            formal: [
            "La Tecnicatura Superior en Laboratorio de Análisis Clínicos es una carrera de educación superior técnica de 3 años, orientada a formar profesionales capacitados para atender al paciente y obtener materiales biológicos de calidad para su análisis clínico, aportando activamente a la producción de información sanitaria de precisión a través de la ejecución de procedimientos analíticos complejos, todo ello bajo la supervisión directa de un Bioquímico o profesional a cargo del laboratorio.",
            "Esta carrera se enfoca en el desarrollo de competencias para la obtención de muestras biológicas (sangre venosa, capilar, etc.), la operación y calibración de instrumentación analítica manual y automatizada, la gestión de la higiene y seguridad intrahospitalaria, y la contribución a proyectos de investigación y mejora continua en el área de salud.",
            "Le recordamos que la Tecnicatura Superior en Laboratorio de Análisis Clínicos es una carrera de educación superior técnica de 3 años, orientada a formar profesionales capacitados para atender al paciente y obtener materiales biológicos de calidad para su análisis clínico, aportando activamente a la producción de información sanitaria de precisión a través de la ejecución de procedimientos analíticos complejos, todo ello bajo la supervisión directa de un Bioquímico o profesional a cargo del laboratorio. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una tecnicatura de 3 años clave para el sistema de salud. Vas a aprender a tomar muestras de sangre y otros materiales biológicos, a manejar aparatos y tecnologías de laboratorio (tanto manuales como automatizados) y a registrar los resultados de manera súper prolija para ayudar al bioquímico a cargo a hacer los diagnósticos médicos.",
            "En esta carrera de 3 años vas a aprender desde primeros auxilios y anatomía hasta microbiología y bioquímica clínica. Te prepara para gestionar tu área de laboratorio, controlar el stock de insumos y trabajar codo a codo en clínicas, hospitales y centros de salud.",
            "¡Te paso este dato! Es una tecnicatura de 3 años clave para el sistema de salud. Vas a aprender a tomar muestras de sangre y otros materiales biológicos, a manejar aparatos y tecnologías de laboratorio (tanto manuales como automatizados) y a registrar los resultados de manera súper prolija para ayudar al bioquímico a cargo a hacer los diagnósticos médicos. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. La carrera de Laboratorio de Análisis Clínicos dura 3 años y capacita a técnicos para la obtención de muestras biológicas y la realización de análisis clínicos bajo protocolos de calidad y bajo supervisión de bioquímicos.",
            "Pedimos disculpas por los inconvenientes. Esta tecnicatura de 3 años forma profesionales para operar instrumental de laboratorio clínico, gestionar registros de resultados y aplicar normas estrictas de bioseguridad en instituciones de salud.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. La carrera de Laboratorio de Análisis Clínicos dura 3 años y capacita a técnicos para la obtención de muestras biológicas y la realización de análisis clínicos bajo protocolos de calidad y bajo supervisión de bioquímicos. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Laboratorio de Análisis Clínicos posee un campo profesional delimitado principalmente dentro del Sector Salud, tanto en el ámbito público como en el privado y en organizaciones afines.<br><ul><li>Está facultado para desempeñarse en Hospitales de diferentes niveles de complejidad, clínicas médicas, sanatorios privados y laboratorios de análisis clínicos de diagnóstico.</li><li>Asimismo, cuenta con salida en Centros de Salud de atención primaria, Áreas Programáticas, empresas privadas de servicios biotecnológicos, instituciones educativas en rol de soporte técnico, y comités interdisciplinares de salud pública.</li></ul>",
            "La inserción laboral capacita al egresado para integrarse activamente a equipos de diagnóstico en salud humana, llevar el control administrativo y stock de reactivos e insumos, colaborar en proyectos de investigación científica regional y participar en auditorías de bioseguridad y aseguramiento de la calidad analítica.",
            "Le recordamos que el Técnico Superior en Laboratorio de Análisis Clínicos posee un campo profesional delimitado principalmente dentro del Sector Salud, tanto en el ámbito público como en el privado y en organizaciones afines.<br><ul><li>Está facultado para desempeñarse en Hospitales de diferentes niveles de complejidad, clínicas médicas, sanatorios privados y laboratorios de análisis clínicos de diagnóstico.</li><li>Asimismo, cuenta con salida en Centros de Salud de atención primaria, Áreas Programáticas, empresas privadas de servicios biotecnológicos, instituciones educativas en rol de soporte técnico, y comités interdisciplinares de salud pública.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder trabajar principalmente en el ámbito de la salud.<br><ul><li>Tenés salida en hospitales públicos, clínicas privadas, sanatorios, laboratorios de análisis clínicos comerciales y centros de salud de atención comunitaria.</li><li>También hay oportunidades en laboratorios de investigación, empresas que fabrican o distribuyen insumos médicos y escuelas u universidades como ayudante técnico.</li><li>Podés trabajar de forma dependiente o integrando equipos con médicos y bioquímicos.</li></ul>",
            "¡El campo laboral está súper centrado en salud y laboratorios!<br><ul><li>Podés desempeñarte en laboratorios de análisis clínicos públicos o privados, en áreas de primeros auxilios y vacunación, o administrando el stock e insumos de reactivos químicos en centros asistenciales.</li><li>Además, podés dar soporte técnico en empresas biotecnológicas o instituciones educativas de medicina/química.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder trabajar principalmente en el ámbito de la salud.</li><li>Tenés salida en hospitales públicos, clínicas privadas, sanatorios, laboratorios de análisis clínicos comerciales y centros de salud de atención comunitaria.</li><li>También hay oportunidades en laboratorios de investigación, empresas que fabrican o distribuyen insumos médicos y escuelas u universidades como ayudante técnico.</li><li>Podés trabajar de forma dependiente o integrando equipos con médicos y bioquímicos.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>Los sectores de empleo del Técnico en Laboratorio de Análisis Clínicos abarcan: hospitales públicos y provinciales, sanatorios y clínicas privadas, laboratorios de diagnóstico clínico, centros de atención primaria de la salud, y áreas técnicas de empresas biotecnológicas.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>El egresado está habilitado para incorporarse a laboratorios bioquímicos, centros de salud comunitarios, departamentos de higiene e instituciones educativas prestando servicios de soporte técnico analítico.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>Los sectores de empleo del Técnico en Laboratorio de Análisis Clínicos abarcan: hospitales públicos y provinciales, sanatorios y clínicas privadas, laboratorios de diagnóstico clínico, centros de atención primaria de la salud, y áreas técnicas de empresas biotecnológicas.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            formal: [
            "La Tecnicatura Superior en Hemoterapia es una carrera de educación superior técnica de 3 años, orientada a formar profesionales capacitados de manera integral para preparar y ejecutar procesos de hemodonación, fraccionamiento de sangre humana para obtener hemocomponentes y hemoderivados, calificar biológicamente los productos sanguíneos determinando la compatibilidad transfusional, y ejecutar el acto transfusional de forma segura bajo estándares de calidad y ética profesional.",
            "Esta formación habilita para realizar estudios inmunohematológicos pretransfusionales en pacientes generales, embarazadas, puérperas y recién nacidos, así como para liderar proyectos socio-comunitarios de promoción de la donación voluntaria y registros de células madre.",
            "Le recordamos que la Tecnicatura Superior en Hemoterapia es una carrera de educación superior técnica de 3 años, orientada a formar profesionales capacitados de manera integral para preparar y ejecutar procesos de hemodonación, fraccionamiento de sangre humana para obtener hemocomponentes y hemoderivados, calificar biológicamente los productos sanguíneos determinando la compatibilidad transfusional, y ejecutar el acto transfusional de forma segura bajo estándares de calidad y ética profesional. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una tecnicatura de 3 años súper importante en salud. Te prepara para recibir a los donantes de sangre, hacer todo el proceso de extracción (hemodonación), separar la sangre en sus distintos componentes (plaquetas, plasma, etc.), hacer pruebas de compatibilidad para evitar rechazos, y realizar la transfusión al paciente de manera segura.",
            "En esta carrera de 3 años vas a aprender desde anatomía e inmunología hasta cómo gestionar un banco de sangre con calidad y ética. También te forma para armar campañas solidarias de donación de sangre y registros de donantes de células madre.",
            "¡Te paso este dato! Es una tecnicatura de 3 años súper importante en salud. Te prepara para recibir a los donantes de sangre, hacer todo el proceso de extracción (hemodonación), separar la sangre en sus distintos componentes (plaquetas, plasma, etc.), hacer pruebas de compatibilidad para evitar rechazos, y realizar la transfusión al paciente de manera segura. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. La carrera de Hemoterapia dura 3 años y capacita a técnicos para gestionar procesos de hemodonación, calificar biológicamente productos sanguíneos y ejecutar transfusiones bajo normas estrictas de bioseguridad.",
            "Pedimos disculpas por los inconvenientes. Esta tecnicatura de 3 años forma profesionales para realizar fraccionamiento sanguíneo, estudios inmunohematológicos pretransfusionales y coordinar bancos de sangre y campañas de donación voluntaria.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. La carrera de Hemoterapia dura 3 años y capacita a técnicos para gestionar procesos de hemodonación, calificar biológicamente productos sanguíneos y ejecutar transfusiones bajo normas estrictas de bioseguridad. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Hemoterapia se desempeña primordialmente en el Sector Salud, en el ámbito público y privado.<br><ul><li>Está plenamente habilitado para ejercer su profesión en Hospitales, clínicas y sanatorios de distintos niveles de complejidad, laboratorios especializados, bancos de sangre intrahospitalarios y Centros Regionales de Hemoterapia.</li><li>Asimismo, puede integrarse a comités de ética profesional, comités de docencia e investigación, comités transfusionales hospitalarios, equipos de implementación de sistemas de calidad sanitaria, programas comunitarios de hemodonación, instituciones de educación y formación de recursos humanos de salud, y empresas del sector médico de la especialidad.</li></ul>",
            "La salida profesional capacita al egresado para realizar el fraccionamiento de unidades de sangre, procesar hemocomponentes, asegurar la trazabilidad y calidad de las muestras, calificar la compatibilidad inmunohematológica de los pacientes, intervenir en estudios pretransfusionales materno-fetales y coordinar campañas comunitarias de colecta externa de sangre.",
            "Le recordamos que el Técnico Superior en Hemoterapia se desempeña primordialmente en el Sector Salud, en el ámbito público y privado.<br><ul><li>Está plenamente habilitado para ejercer su profesión en Hospitales, clínicas y sanatorios de distintos niveles de complejidad, laboratorios especializados, bancos de sangre intrahospitalarios y Centros Regionales de Hemoterapia.</li><li>Asimismo, puede integrarse a comités de ética profesional, comités de docencia e investigación, comités transfusionales hospitalarios, equipos de implementación de sistemas de calidad sanitaria, programas comunitarios de hemodonación, instituciones de educación y formación de recursos humanos de salud, y empresas del sector médico de la especialidad.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder trabajar en el sector de la salud pública y privada.<br><ul><li>Tenés salida en hospitales, clínicas, sanatorios, laboratorios de análisis y bancos de sangre de todo el país.</li><li>También podés entrar en centros regionales de hemoterapia, comités de ética o de investigación, empresas que comercializan insumos médicos y reactivos de hematología, programas comunitarios para promover la donación voluntaria y escuelas u universidades como docente o ayudante técnico de laboratorio.</li></ul>",
            "¡El campo laboral es súper amplio en salud!<br><ul><li>Podés laburar en el área transfusional de hospitales, en el fraccionamiento de unidades de sangre en bancos de sangre, o controlando la calidad de los procesos en laboratorios clínicos.</li><li>También podés trabajar de forma independiente en campañas y programas del Ministerio de Salud o en comités de bioética hospitalarios.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder trabajar en el sector de la salud pública y privada.</li><li>Tenés salida en hospitales, clínicas, sanatorios, laboratorios de análisis y bancos de sangre de todo el país.</li><li>También podés entrar en centros regionales de hemoterapia, comités de ética o de investigación, empresas que comercializan insumos médicos y reactivos de hematología, programas comunitarios para promover la donación voluntaria y escuelas u universidades como docente o ayudante técnico de laboratorio.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>Los sectores de empleo del Técnico en Hemoterapia abarcan: bancos de sangre hospitalarios y privados, clínicas y sanatorios, centros regionales de hemoterapia, comités transfusionales intrahospitalarios, ONGs y programas de promoción de donación, y empresas del sector de equipamiento médico hematológico.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>El egresado califica para incorporarse a servicios transfusionales, laboratorios de inmunohematología, departamentos de gestión de calidad en salud, e instituciones de formación docente para recursos sanitarios.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>Los sectores de empleo del Técnico en Hemoterapia abarcan: bancos de sangre hospitalarios y privados, clínicas y sanatorios, centros regionales de hemoterapia, comités transfusionales intrahospitalarios, ONGs y programas de promoción de donación, y empresas del sector de equipamiento médico hematológico.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A23), 2°(A12), 3°(A10)</li></ul>"
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
            formal: [
            "La Tecnicatura Superior en Acompañamiento Terapéutico es una carrera técnica de 3 años orientada a formar profesionales capacitados para realizar un trabajo integral con el ser humano y su rehabilitación psicofísica, psiquiátrica y psicológica, brindando seguimiento, sostén y apoyo en tratamientos de diferentes patologías.",
            "Esta formación habilita para el acompañamiento y contención del paciente en su vida cotidiana, integrando equipos interdisciplinarios de salud mental y diseñando estrategias de abordaje familiar e institucional en todas las etapas vitales.",
            "Le recordamos que la Tecnicatura Superior en Acompañamiento Terapéutico es una carrera técnica de 3 años orientada a formar profesionales capacitados para realizar un trabajo integral con el ser humano y su rehabilitación psicofísica, psiquiátrica y psicológica, brindando seguimiento, sostén y apoyo en tratamientos de diferentes patologías. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una carrera de 3 años súper humana y con mucha salida. Te prepara para dar apoyo y contención en el día a día a pacientes que pasan por tratamientos psicológicos, psiquiátricos o físicos, ayudándolos a rehabilitarse y a mejorar su calidad de vida.",
            "En esta carrera vas a aprender a trabajar junto a médicos y psicólogos en equipos de salud. Vas a estar capacitado para hacer contención domiciliaria o institucional, y para intervenir en situaciones críticas de personas de todas las edades.",
            "¡Te paso este dato! Es una carrera de 3 años súper humana y con mucha salida. Te prepara para dar apoyo y contención en el día a día a pacientes que pasan por tratamientos psicológicos, psiquiátricos o físicos, ayudándolos a rehabilitarse y a mejorar su calidad de vida. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos sinceramente la demora. Esta carrera de 3 años forma técnicos capacitados para brindar contención, seguimiento y apoyo terapéutico a pacientes con padecimientos mentales y físicos en su vida diaria, trabajando en equipos de salud.",
            "Pedimos disculpas por la tardanza. La tecnicatura dura 3 años y brinda formación directa en rehabilitación psicofísica, estrategias de contención de pacientes, y diseño colaborativo de tratamientos de salud mental.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos sinceramente la demora. Esta carrera de 3 años forma técnicos capacitados para brindar contención, seguimiento y apoyo terapéutico a pacientes con padecimientos mentales y físicos en su vida diaria, trabajando en equipos de salud. Agradecemos su comprensión."
        ]
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
            formal: [
            "El egresado en Acompañamiento Terapéutico puede desempeñarse profesionalmente brindando acompañamiento a personas con padecimientos mentales y sus familias, y desarrollando actividades de prevención y promoción de la salud a través de un abordaje interdisciplinario.<br><ul><li>Su ámbito de trabajo incluye el ámbito judicial, educativo y el domicilio particular.</li><li>Asimismo, está habilitado para ejercer en Hospitales, centros educativos terapéuticos, clínicas, residencias, hogares, casas de medio camino, instituciones de rehabilitación y espacios públicos y comunitarios, trabajando con niños, adolescentes, adultos y adultos mayores.</li></ul>",
            "La salida laboral habilita para integrarse a instituciones de salud y rehabilitación mental, centros de día, residencias de adultos mayores y ámbitos escolares para apoyo de inclusión escolar, así como de forma independiente en el domicilio del paciente bajo la indicación de terapeutas de cabecera.",
            "Le recordamos que el egresado en Acompañamiento Terapéutico puede desempeñarse profesionalmente brindando acompañamiento a personas con padecimientos mentales y sus familias, y desarrollando actividades de prevención y promoción de la salud a través de un abordaje interdisciplinario.<br><ul><li>Su ámbito de trabajo incluye el ámbito judicial, educativo y el domicilio particular.</li><li>Asimismo, está habilitado para ejercer en Hospitales, centros educativos terapéuticos, clínicas, residencias, hogares, casas de medio camino, instituciones de rehabilitación y espacios públicos y comunitarios, trabajando con niños, adolescentes, adultos y adultos mayores.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "¡La salida laboral es gigante y muy variada!<br><ul><li>Podés trabajar en el ámbito judicial, en colegios apoyando la inclusión, o de forma independiente haciendo contención en el domicilio del paciente.</li><li>También podés entrar en hospitales públicos o privados, clínicas de rehabilitación, residencias de abuelos, hogares, centros de día y centros educativos terapéuticos, acompañando a personas de todas las edades (chicos, jóvenes o abuelos).</li></ul>",
            "Como técnico vas a poder laburar tanto en el sector de salud pública como de forma privada y en ONGs.<br><ul><li>Podés brindar acompañamiento terapéutico a domicilio, integrarte a clínicas psiquiátricas o de adicciones, residencias de adultos mayores y escuelas, ayudando a los pacientes y sus familias en su día a día.</li></ul>",
            "¡Te paso este dato!<br><ul><li>¡La salida laboral es gigante y muy variada!</li><li>Podés trabajar en el ámbito judicial, en colegios apoyando la inclusión, o de forma independiente haciendo contención en el domicilio del paciente.</li><li>También podés entrar en hospitales públicos o privados, clínicas de rehabilitación, residencias de abuelos, hogares, centros de día y centros educativos terapéuticos, acompañando a personas de todas las edades (chicos, jóvenes o abuelos).</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos sinceramente la demora.<br><ul><li>El campo laboral de Acompañamiento Terapéutico abarca: ámbito judicial, escolar, domicilios particulares, hospitales, clínicas, centros de día, hogares, residencias de adultos mayores, instituciones de rehabilitación y espacios comunitarios.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>Le informamos de forma directa que el egresado se inserta en equipos de salud mental en hospitales, clínicas de rehabilitación, escuelas integradoras, residencias y en acompañamiento domiciliario individual de pacientes de todas las etapas vitales.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos sinceramente la demora.</li><li>El campo laboral de Acompañamiento Terapéutico abarca: ámbito judicial, escolar, domicilios particulares, hospitales, clínicas, centros de día, hogares, residencias de adultos mayores, instituciones de rehabilitación y espacios comunitarios.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A25), 2°(A22), 3°(A33)</li></ul>"
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
            formal: [
            "La Tecnicatura Superior en Administración de Empresas es una carrera de educación superior técnica de 3 años, orientada a formar profesionales con capacidades analíticas y prácticas para planificar, organizar, dirigir y evaluar organizaciones, gestionando recursos humanos, materiales y financieros, y optimizando el uso de sistemas tecnológicos de información empresarial.",
            "Esta formación capacita para identificar oportunidades de negocios, diseñar y ejecutar proyectos de inversión y emprendimientos productivos, con especial énfasis en el desarrollo local y regional a través de PyMEs y empresas familiares.",
            "Le recordamos que la Tecnicatura Superior en Administración de Empresas es una carrera de educación superior técnica de 3 años, orientada a formar profesionales con capacidades analíticas y prácticas para planificar, organizar, dirigir y evaluar organizaciones, gestionando recursos humanos, materiales y financieros, y optimizando el uso de sistemas tecnológicos de información empresarial. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una tecnicatura de 3 años muy práctica y demandada. Te enseña a manejar todas las áreas de una empresa o negocio: desde la parte contable y financiera hasta los recursos humanos, el marketing y la logística, usando tecnologías modernas para que el negocio funcione de diez.",
            "Básicamente, te forma para que puedas planificar, gestionar y evaluar proyectos productivos o emprendimientos personales, y para asesorar a PyMEs y empresas familiares en la región.",
            "¡Te paso este dato! Es una tecnicatura de 3 años muy práctica y demandada. Te enseña a manejar todas las áreas de una empresa o negocio: desde la parte contable y financiera hasta los recursos humanos, el marketing y la logística, usando tecnologías modernas para que el negocio funcione de diez. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora y le informamos: esta carrera de 3 años forma profesionales capaces de planificar, gestionar y evaluar recursos humanos, financieros y materiales de organizaciones públicas y privadas, con foco en PyMEs y emprendimientos.",
            "Pedimos disculpas por los inconvenientes. La tecnicatura dura 3 años y brinda competencias directas en contabilidad de gestión, finanzas corporativas, marketing, liderazgo y administración general para la producción regional.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora y le informamos: esta carrera de 3 años forma profesionales capaces de planificar, gestionar y evaluar recursos humanos, financieros y materiales de organizaciones públicas y privadas, con foco en PyMEs y emprendimientos. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Administración de Empresas podrá desempeñarse profesionalmente en los ámbitos empresariales y del mundo de la producción local o regional.<br><ul><li>Su campo ocupacional abarca el desempeño en áreas administrativas, contables, financieras, de recursos humanos, marketing o logística de todo tipo de organizaciones (públicas y privadas).</li><li>Asimismo, está capacitado para diseñar y ejecutar proyectos de inversión, brindar consultoría de desarrollo organizativo y gestionar micro, pequeñas y medianas empresas (PyMEs) o emprendimientos familiares de forma independiente.</li></ul>",
            "La salida laboral se centra en el sector corporativo, comercial, industrial y estatal de la provincia de Jujuy, actuando como analista administrativo, gestor de proyectos, consultor de negocios locales, o liderando emprendimientos de inversión productiva.",
            "Le recordamos que el Técnico Superior en Administración de Empresas podrá desempeñarse profesionalmente en los ámbitos empresariales y del mundo de la producción local o regional.<br><ul><li>Su campo ocupacional abarca el desempeño en áreas administrativas, contables, financieras, de recursos humanos, marketing o logística de todo tipo de organizaciones (públicas y privadas).</li><li>Asimismo, está capacitado para diseñar y ejecutar proyectos de inversión, brindar consultoría de desarrollo organizativo y gestionar micro, pequeñas y medianas empresas (PyMEs) o emprendimientos familiares de forma independiente.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Como egresado podés laburar en cualquier área de una empresa: administración, finanzas, recursos humanos, marketing, ventas, compras o logística.<br><ul><li>Tenés salida en empresas privadas, bancos, consultoras, comercios e industrias de Jujuy, o en el sector público.</li><li>Además, estás re capacitado para armar y liderar tu propio emprendimiento o manejar PyMEs y empresas familiares.</li></ul>",
            "¡El campo de trabajo es re contra amplio!<br><ul><li>Podés desempeñarte en el área administrativa de cualquier PyME o empresa grande regional, trabajar en bancos, financieras, empresas industriales o en dependencias del Estado.</li><li>También podés dedicarte a asesorar emprendedores o a gestionar tu propio negocio de forma independiente.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Como egresado podés laburar en cualquier área de una empresa: administración, finanzas, recursos humanos, marketing, ventas, compras o logística.</li><li>Tenés salida en empresas privadas, bancos, consultoras, comercios e industrias de Jujuy, o en el sector público.</li><li>Además, estás re capacitado para armar y liderar tu propio emprendimiento o manejar PyMEs y empresas familiares.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos la demora.<br><ul><li>Los sectores de empleo directo de Administración de Empresas son: áreas administrativas, contables y financieras de empresas privadas y públicas, entidades bancarias y de seguros, gestión y asesoramiento de PyMEs y empresas familiares, y formulación de proyectos independientes.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>La salida laboral califica al egresado para desempeñarse como gestor administrativo de recursos organizativos, coordinador logístico de compras y distribución, consultor de mercadotecnia local o administrador en empresas del sector productivo.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos la demora.</li><li>Los sectores de empleo directo de Administración de Empresas son: áreas administrativas, contables y financieras de empresas privadas y públicas, entidades bancarias y de seguros, gestión y asesoramiento de PyMEs y empresas familiares, y formulación de proyectos independientes.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Tarde:</b> 1°(A34), 2°(A36), 3°(A30)</li><li><b>Turno Noche:</b> 1°(A34), 2°(A36), 3°(A37)</li></ul>"
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
            formal: [
            "La Tecnicatura Superior en Administración Pública es una carrera técnica de 3 años, orientada a formar profesionales éticos y capacitados técnicamente para diagnosticar, formular, ejecutar y evaluar políticas públicas en los distintos niveles de gobierno y poderes del Estado.",
            "Esta carrera capacita para gestionar la administración pública en sus diferentes áreas organizativas, posibilitando al graduado desempeñarse en el sector público, en partidos políticos, ONGs, sindicatos, centros de investigación u organismos multilaterales.",
            "Le recordamos que la Tecnicatura Superior en Administración Pública es una carrera técnica de 3 años, orientada a formar profesionales éticos y capacitados técnicamente para diagnosticar, formular, ejecutar y evaluar políticas públicas en los distintos niveles de gobierno y poderes del Estado. Quedamos a su disposición para cualquier aclaración."
        ],
            informal: [
            "Es una carrera de 3 años que te prepara para trabajar y gestionar dentro del sector público. Vas a aprender a diseñar, aplicar y evaluar políticas públicas para promover el desarrollo local y mejorar la organización del Estado en todos sus niveles.",
            "Te forma para ser un protagonista de la gestión pública. Vas a poder laburar en ministerios, municipalidades, ONGs, sindicatos o centros de investigación, ayudando a planificar y controlar que el Estado funcione de manera transparente y eficiente.",
            "¡Te paso este dato! Es una carrera de 3 años que te prepara para trabajar y gestionar dentro del sector público. Vas a aprender a diseñar, aplicar y evaluar políticas públicas para promover el desarrollo local y mejorar la organización del Estado en todos sus niveles. Escribime cualquier otra consulta que tengas."
        ],
            molesto: [
            "Lamentamos la demora. La carrera de Administración Pública dura 3 años y capacita a técnicos de forma directa en formulación de políticas públicas, gestión gubernamental y planificación del desarrollo local.",
            "Pedimos disculpas por los inconvenientes. Esta tecnicatura de 3 años forma profesionales preparados para la gestión, el control de gestión y la auditoría administrativa en organismos estatales, ONGs y entes de desarrollo regional.",
            "Lamentamos las dificultades iniciales. Le informamos de manera prioritaria: Lamentamos la demora. La carrera de Administración Pública dura 3 años y capacita a técnicos de forma directa en formulación de políticas públicas, gestión gubernamental y planificación del desarrollo local. Agradecemos su comprensión."
        ]
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
            formal: [
            "El Técnico Superior en Administración Pública posee un campo ocupacional diverso.<br><ul><li>Podrá desempeñarse profesionalmente en organizaciones gubernamentales y públicas de los poderes ejecutivo, legislativo y judicial; partidos políticos, sindicatos y Organizaciones de la Sociedad Civil (ONGs y fundaciones); empresas privadas que interactúan con el sector público; centros de investigación; y organismos internacionales y multilaterales.</li><li>Su labor se desarrolla en áreas administrativas, contables, sociales, de planeamiento, recursos humanos, presupuestarias, financieras, logística y control de gestión, bajo relación de dependencia o en forma autónoma en roles operativos, de supervisión, consultoría, dirección y asesoramiento.</li></ul>",
            "La salida laboral califica al egresado para la gestión pública, la formulación de planes de desarrollo local y el asesoramiento a comunas, municipios y dependencias provinciales o nacionales, así como la consultoría externa para entidades privadas y sociales.",
            "Le recordamos que el Técnico Superior en Administración Pública posee un campo ocupacional diverso.<br><ul><li>Podrá desempeñarse profesionalmente en organizaciones gubernamentales y públicas de los poderes ejecutivo, legislativo y judicial; partidos políticos, sindicatos y Organizaciones de la Sociedad Civil (ONGs y fundaciones); empresas privadas que interactúan con el sector público; centros de investigación; y organismos internacionales y multilaterales.</li><li>Su labor se desarrolla en áreas administrativas, contables, sociales, de planeamiento, recursos humanos, presupuestarias, financieras, logística y control de gestión, bajo relación de dependencia o en forma autónoma en roles operativos, de supervisión, consultoría, dirección y asesoramiento.</li><li>Quedamos a su disposición para cualquier aclaración.</li></ul>"
        ],
            informal: [
            "Vas a poder trabajar principalmente en el ámbito estatal (nacional, provincial o municipal) en los poderes ejecutivo, legislativo o judicial.<br><ul><li>También tenés salida en ONGs, fundaciones, partidos políticos y sindicatos, o en empresas privadas que contratan con el Estado.</li><li>Los puestos varían desde administrativo, planificador o recursos humanos hasta consultor y asesor de gestión de forma independiente o contratado.</li></ul>",
            "¡El campo laboral está muy ligado a la gestión pública y social!<br><ul><li>Podés trabajar en ministerios, municipios o comunas de Jujuy planificando proyectos de desarrollo local, administrando presupuestos o coordinando personal.</li><li>Además, podés dar servicios de consultoría o auditoría de gestión para organizaciones sociales y privadas.</li></ul>",
            "¡Te paso este dato!<br><ul><li>Vas a poder trabajar principalmente en el ámbito estatal (nacional, provincial o municipal) en los poderes ejecutivo, legislativo o judicial.</li><li>También tenés salida en ONGs, fundaciones, partidos políticos y sindicatos, o en empresas privadas que contratan con el Estado.</li><li>Los puestos varían desde administrativo, planificador o recursos humanos hasta consultor y asesor de gestión de forma independiente o contratado.</li><li>Escribime cualquier otra consulta que tengas.</li></ul>"
        ],
            molesto: [
            "Lamentamos la demora.<br><ul><li>El campo laboral del Técnico en Administración Pública abarca: organismos públicos del Estado, ONGs, partidos políticos, sindicatos, empresas que interactúan con el sector público, y consultorías autónomas de gestión y políticas públicas.</li></ul>",
            "Pedimos disculpas por los inconvenientes.<br><ul><li>La salida profesional directa se da en áreas administrativas, contables, de recursos humanos y presupuestarias del Estado en todos sus niveles, así como en tareas de dirección y asesoramiento técnico.</li></ul>",
            "Lamentamos las dificultades iniciales.<br><ul><li>Le informamos de manera prioritaria: Lamentamos la demora.</li><li>El campo laboral del Técnico en Administración Pública abarca: organismos públicos del Estado, ONGs, partidos políticos, sindicatos, empresas que interactúan con el sector público, y consultorías autónomas de gestión y políticas públicas.</li><li>Agradecemos su comprensión.</li></ul>"
        ]
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
            "La distribución de aulas para esta carrera es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>",
            "Le informamos que las clases presenciales de esta carrera se dictan en:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>",
            "Le recordamos que la distribución de aulas asignada es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul> Quedamos a su disposición."
        ],
            informal: [
            "¡Te paso las aulas! Buscá tu año:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>",
            "Mirá, acá tenés la distribución de aulas para esta carrera:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>",
            "¡Te paso este dato! Las clases de esta carrera se dictan en las siguientes aulas:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>"
        ],
            molesto: [
            "Le informamos la distribución de aulas asignada:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>",
            "Confirmamos que las aulas para esta carrera son:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>",
            "Le informamos de manera prioritaria que la distribución de aulas es la siguiente:<br><ul><li><b>Turno Noche:</b> 1°(A23), 2°(A24), 3°(A26)</li></ul>"
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
        const coincideDirecto = palabras.some(p => contieneKeyword(textoNormalizado, palabrasTexto, p));
        if (coincideDirecto) {
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
    return intencionesEncontradas;
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
        ['carreras', 'tecnicaturas', 'profesorados'].forEach(intencionGeneral => {
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
            opciones = RESPUESTAS_GENERALES[intencion][tono];
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
