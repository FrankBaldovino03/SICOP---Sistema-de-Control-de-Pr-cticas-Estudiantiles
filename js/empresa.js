/**
 * SICOP - Módulo de empresa.
 * Registro e inicio de sesión son distintos: las empresas se registran una vez
 * y luego inician sesión con correo y contraseña.
 */
var STORAGE_KEY_EMPRESA = 'sicop_empresa';
var STORAGE_KEY_EMPRESAS = 'sicop_empresas';

function getEmpresa() {
    try {
        var json = localStorage.getItem(STORAGE_KEY_EMPRESA);
        if (!json || json.length === 0) return null;
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

/** Lista de todas las empresas registradas (para login y para guardar nuevas). */
function getEmpresas() {
    try {
        var json = localStorage.getItem(STORAGE_KEY_EMPRESAS);
        if (!json || json.length === 0) return [];
        return JSON.parse(json);
    } catch (e) {
        return [];
    }
}

function setEmpresas(lista) {
    try {
        localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(lista));
        return true;
    } catch (e) {
        return false;
    }
}

/** Añade una empresa al listado y opcionalmente la deja como sesión actual. */
function addEmpresa(datos, iniciarSesionAhora) {
    var lista = getEmpresas();
    datos.id = datos.id || Date.now().toString(36) + Math.random().toString(36).slice(2);
    datos.fechaRegistro = datos.fechaRegistro || new Date().toISOString();
    lista.push(datos);
    if (!setEmpresas(lista)) return false;
    if (iniciarSesionAhora) {
        try { localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(datos)); } catch (e) {}
    }
    return true;
}

/** Inicia sesión con NIT y contraseña. Devuelve true si ok. */
function iniciarSesion(nit, password) {
    nit = (nit || '').trim();
    password = (password || '').trim();
    if (!nit || !password) return false;
    var lista = getEmpresas();
    for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        var nitMatch = (e.nit || '').trim() === nit;
        var correoMatch = (e.correo || '').trim().toLowerCase() === nit.toLowerCase();
        if ((nitMatch || correoMatch) && (e.password || '') === password) {
            try {
                localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(e));
                return true;
            } catch (err) {}
            return false;
        }
    }
    return false;
}

function getCompanyId() {
    var e = getEmpresa();
    if (!e) return '';
    if (e.id) return e.id;
    e.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    try { localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(e)); } catch (err) {}
    return e.id;
}

/** Redirige a registro/login (página principal) si no hay sesión activa. Devuelve false si redirigió. */
function requerirEmpresa() {
    if (!getEmpresa()) {
        window.location.replace('index.html');
        return false;
    }
    return true;
}

/** Cierra la sesión y lleva a la página de registro (login + registro), no a la página de inicio de sesión. */
function cerrarSesionEmpresa() {
    try {
        localStorage.removeItem(STORAGE_KEY_EMPRESA);
    } catch (e) {}
    window.location.replace('index.html');
}
