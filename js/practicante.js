/**
 * SICOP - Módulo de practicante (login y registro).
 * Los practicantes se registran y luego inician sesión con cédula/correo y contraseña.
 */
var STORAGE_KEY_PRACTICANTE = 'sicop_practicante_sesion';
var STORAGE_KEY_PRACTICANTES = 'sicop_practicantes_registro';

function getPracticanteActual() {
    try {
        var json = localStorage.getItem(STORAGE_KEY_PRACTICANTE);
        if (!json || json.length === 0) return null;
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function getPracticantesRegistro() {
    try {
        var json = localStorage.getItem(STORAGE_KEY_PRACTICANTES);
        if (!json || json.length === 0) return [];
        return JSON.parse(json);
    } catch (e) {
        return [];
    }
}

function setPracticantesRegistro(lista) {
    try {
        localStorage.setItem(STORAGE_KEY_PRACTICANTES, JSON.stringify(lista));
        return true;
    } catch (e) {
        return false;
    }
}

function addPracticanteRegistro(datos, iniciarSesionAhora) {
    var lista = getPracticantesRegistro();
    datos.id = datos.id || Date.now().toString(36) + Math.random().toString(36).slice(2);
    datos.fechaRegistro = datos.fechaRegistro || new Date().toISOString();
    lista.push(datos);
    if (!setPracticantesRegistro(lista)) return false;
    if (iniciarSesionAhora) {
        try {
            localStorage.setItem(STORAGE_KEY_PRACTICANTE, JSON.stringify(datos));
        } catch (e) {}
    }
    return true;
}

/** Inicia sesión con cédula o correo y contraseña. Devuelve true si ok. */
function iniciarSesionPracticante(cedulaOCorreo, password) {
    cedulaOCorreo = (cedulaOCorreo || '').trim();
    password = (password || '').trim();
    if (!cedulaOCorreo || !password) return false;
    var lista = getPracticantesRegistro();
    var key = cedulaOCorreo.toLowerCase();
    for (var i = 0; i < lista.length; i++) {
        var p = lista[i];
        var cedulaMatch = (p.cedula || p.documento || '').toString().trim() === cedulaOCorreo;
        var correoMatch = (p.correo || '').trim().toLowerCase() === key;
        if ((cedulaMatch || correoMatch) && (p.password || '') === password) {
            try {
                localStorage.setItem(STORAGE_KEY_PRACTICANTE, JSON.stringify(p));
                return true;
            } catch (err) {}
            return false;
        }
    }
    return false;
}

function cerrarSesionPracticante() {
    try {
        localStorage.removeItem(STORAGE_KEY_PRACTICANTE);
    } catch (e) {}
    window.location.replace('index.html');
}
