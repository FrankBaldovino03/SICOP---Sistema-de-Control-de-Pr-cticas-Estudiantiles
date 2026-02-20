/**
 * Menú Principal - Acepta sesión de empresa o de practicante
 */
(function() {
    var emp = typeof getEmpresa === 'function' ? getEmpresa() : null;
    var practicante = typeof getPracticanteActual === 'function' ? getPracticanteActual() : null;

    if (!emp && !practicante) {
        window.location.replace('index.html');
        return;
    }

    var bar = document.getElementById('index-empresa-bar');
    var nombreEl = document.getElementById('index-empresa-nombre');
    var btnCerrar = document.getElementById('btn-cerrar-sesion');

    if (bar && nombreEl) {
        bar.style.display = 'flex';
        if (practicante) {
            nombreEl.textContent = practicante.nombre || 'Practicante';
        } else {
            nombreEl.textContent = emp.razonSocial || 'Empresa';
        }
    }
    if (btnCerrar) {
        if (practicante && typeof cerrarSesionPracticante === 'function') {
            btnCerrar.addEventListener('click', cerrarSesionPracticante);
            btnCerrar.setAttribute('title', 'Cerrar sesión');
        } else if (typeof cerrarSesionEmpresa === 'function') {
            btnCerrar.addEventListener('click', cerrarSesionEmpresa);
        }
    }
})();
