/**
 * Inicio de sesión - Solo para empresas ya registradas.
 * Registro de empresa es un formulario aparte.
 */
function mostrarAviso(mensaje) {
    var aviso = document.getElementById('form-aviso');
    var texto = document.getElementById('form-aviso-texto');
    if (aviso && texto) {
        texto.textContent = mensaje;
        aviso.style.display = 'flex';
    }
}

function ocultarAviso() {
    var aviso = document.getElementById('form-aviso');
    if (aviso) aviso.style.display = 'none';
}

function enviarFormulario(e) {
    e.preventDefault();
    ocultarAviso();

    var nit = (document.getElementById('nit-login') && document.getElementById('nit-login').value || '').trim();
    var password = (document.getElementById('password-login') && document.getElementById('password-login').value || '').trim();

    if (!nit || !password) {
        mostrarAviso('Ingrese NIT y contraseña.');
        return;
    }

    if (typeof iniciarSesion === 'function' && iniciarSesion(nit, password)) {
        window.location.replace('menu.html');
    } else {
        mostrarAviso('NIT o contraseña incorrectos. Verifique e intente de nuevo.');
        document.getElementById('password-login').focus();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof getEmpresa === 'function' && getEmpresa()) {
        window.location.replace('menu.html');
        return;
    }
    if (typeof getEmpresas === 'function' && typeof getEmpresa === 'function' && typeof setEmpresas === 'function') {
        var list = getEmpresas();
        var cur = getEmpresa();
        if (list.length === 0 && cur) {
            cur.password = cur.password || '';
            list.push(cur);
            setEmpresas(list);
        }
    }
    var form = document.getElementById('form-login');
    if (form) form.addEventListener('submit', enviarFormulario);
});
