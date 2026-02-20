/**
 * Registro e Inicio de Sesión de Empresa - Next-Gen Experience
 */
(function() {
    var loginBox = document.getElementById('login-box');
    var registerBox = document.getElementById('register-box');
    var dynamicTitle = document.getElementById('dynamic-title');

    function showRegister() {
        loginBox.classList.remove('active');
        setTimeout(function() {
            registerBox.classList.add('active');
            dynamicTitle.innerHTML = "Escala tu <br>Empresa.";
        }, 300);
    }
    window.showRegister = showRegister;

    function showLogin() {
        registerBox.classList.remove('active');
        setTimeout(function() {
            loginBox.classList.add('active');
            dynamicTitle.innerHTML = "Gestiona el <br>Talento.";
        }, 300);
    }
    window.showLogin = showLogin;

    function seleccionarPlan(planValue) {
        var list = document.getElementById('plan-list');
        var input = document.getElementById('plan-select');
        if (!list || !input) return;
        input.value = planValue;
        list.querySelectorAll('.plan-card').forEach(function(card) {
            card.classList.toggle('selected', card.getAttribute('data-plan') === planValue);
        });
    }

    var avisoTimeout;
    function mostrarAviso(mensaje) {
        var toast = document.getElementById('aviso-toast');
        var texto = document.getElementById('aviso-toast-texto');
        if (!toast || !texto) return;
        if (avisoTimeout) clearTimeout(avisoTimeout);
        texto.textContent = mensaje;
        toast.classList.add('visible');
        avisoTimeout = setTimeout(function() { toast.classList.remove('visible'); }, 5500);
    }

    function ocultarAviso() {
        var toast = document.getElementById('aviso-toast');
        if (toast) toast.classList.remove('visible');
        if (avisoTimeout) clearTimeout(avisoTimeout);
    }

    var planList = document.getElementById('plan-list');
    if (planList) {
        planList.addEventListener('click', function(e) {
            var card = e.target.closest('.plan-card');
            if (card) seleccionarPlan(card.getAttribute('data-plan'));
        });
        planList.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var card = e.target.closest('.plan-card');
            if (card) { e.preventDefault(); seleccionarPlan(card.getAttribute('data-plan')); }
        });
    }

    var btnCerrar = document.getElementById('aviso-toast-cerrar');
    if (btnCerrar) btnCerrar.addEventListener('click', ocultarAviso);

    document.querySelectorAll('.toggle-password').forEach(function(eye) {
        eye.addEventListener('click', function() {
            var id = this.getAttribute('data-target');
            var input = document.getElementById(id);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
                this.setAttribute('title', 'Ocultar contraseña');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
                this.setAttribute('title', 'Mostrar contraseña');
            }
        });
    });

    var STORAGE_KEY_EMPRESA = 'sicop_empresa';
    var formLogin = document.getElementById('form-login');
    var nitLoginEl = document.getElementById('nit-login');
    if (formLogin && nitLoginEl) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            ocultarAviso();
            var nit = (nitLoginEl.value || '').trim();
            var password = (document.getElementById('password-login').value || '').trim();
            if (!nit || !password) {
                mostrarAviso('Ingrese NIT y contraseña.');
                return;
            }
            if (window.sicopSupabase && window.sicopSupabase.loginEmpresa) {
                var btn = formLogin.querySelector('button[type="submit"]');
                if (btn) { btn.disabled = true; btn.textContent = 'Conectando...'; }
                window.sicopSupabase.loginEmpresa(nit, password).then(function(empresa) {
                    if (empresa) {
                        try { localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(empresa)); } catch (err) {}
                        window.location.replace('menu.html');
                    } else {
                        if (btn) { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
                        mostrarAviso('NIT o contraseña incorrectos. Verifique e intente de nuevo.');
                    }
                }).catch(function() {
                    if (btn) { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
                    mostrarAviso('Error de conexión. Intente de nuevo.');
                });
                return;
            }
            if (typeof iniciarSesion === 'function' && iniciarSesion(nit, password)) {
                window.location.replace('menu.html');
            } else {
                mostrarAviso('NIT o contraseña incorrectos. Verifique e intente de nuevo.');
            }
        });
    }

    var datosPendientes = null;
    var NUMERO_NEQUI = '3145678437';
    var MONTOS_PLAN = { plus: '$ 10.000', premium: '$ 25.000' };

    function mostrarPagoNequi(plan, datos) {
        datosPendientes = datos;
        var overlay = document.getElementById('pago-nequi-overlay');
        var montoEl = document.getElementById('pago-nequi-monto');
        var paso1 = document.getElementById('pago-paso-1');
        var paso2 = document.getElementById('pago-paso-2');
        var inputComprobante = document.getElementById('input-comprobante');
        if (overlay) overlay.classList.add('visible');
        if (montoEl) montoEl.textContent = MONTOS_PLAN[plan] || '$ 10.000';
        if (paso1) paso1.classList.remove('is-hidden');
        if (paso2) paso2.classList.add('is-hidden');
        if (inputComprobante) inputComprobante.value = '';
        var compNombre = document.getElementById('comprobante-nombre');
        if (compNombre) compNombre.textContent = 'Seleccionar archivo (imagen o PDF)';
    }

    function ocultarPagoNequi() {
        datosPendientes = null;
        var overlay = document.getElementById('pago-nequi-overlay');
        if (overlay) overlay.classList.remove('visible');
    }

    function mostrarPasoComprobante() {
        var paso1 = document.getElementById('pago-paso-1');
        var paso2 = document.getElementById('pago-paso-2');
        if (paso1) paso1.classList.add('is-hidden');
        if (paso2) paso2.classList.remove('is-hidden');
    }

    function volverPasoPago() {
        var paso1 = document.getElementById('pago-paso-1');
        var paso2 = document.getElementById('pago-paso-2');
        if (paso1) paso1.classList.remove('is-hidden');
        if (paso2) paso2.classList.add('is-hidden');
    }

    function completarRegistroConPago() {
        if (!datosPendientes) return;
        var inputComprobante = document.getElementById('input-comprobante');
        if (!inputComprobante || !inputComprobante.files || inputComprobante.files.length === 0) {
            mostrarAviso('Debe subir el comprobante de pago para continuar.');
            return;
        }
        var file = inputComprobante.files[0];
        var reader = new FileReader();
        reader.onload = function() {
            var datos = datosPendientes;
            datos.comprobanteBase64 = reader.result;
            datosPendientes = null;
            ocultarPagoNequi();
            if (typeof addEmpresa === 'function' && addEmpresa(datos, false)) {
                var overlay = document.getElementById('registro-exito-overlay');
                if (overlay) overlay.classList.add('visible');
                setTimeout(function() {
                    window.location.replace('index.html');
                }, 2500);
            } else {
                mostrarAviso('No se pudo guardar. Intente de nuevo.');
            }
        };
        reader.onerror = function() {
            mostrarAviso('Error al leer el archivo. Intente con otra imagen.');
        };
        reader.readAsDataURL(file);
    }

    var btnCopiarNequi = document.getElementById('btn-copiar-nequi');
    if (btnCopiarNequi) {
        btnCopiarNequi.addEventListener('click', function() {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(NUMERO_NEQUI).then(function() {
                    btnCopiarNequi.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
                    setTimeout(function() {
                        btnCopiarNequi.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
                    }, 2000);
                });
            }
        });
    }

    var btnYaPague = document.getElementById('btn-ya-pague');
    if (btnYaPague) btnYaPague.addEventListener('click', mostrarPasoComprobante);

    var btnEnviarComprobante = document.getElementById('btn-enviar-comprobante');
    if (btnEnviarComprobante) btnEnviarComprobante.addEventListener('click', completarRegistroConPago);

    var btnVolverPago = document.getElementById('btn-volver-pago');
    if (btnVolverPago) btnVolverPago.addEventListener('click', volverPasoPago);

    var btnCancelarPago = document.getElementById('btn-cancelar-pago');
    if (btnCancelarPago) btnCancelarPago.addEventListener('click', ocultarPagoNequi);

    var inputComprobante = document.getElementById('input-comprobante');
    if (inputComprobante) {
        inputComprobante.addEventListener('change', function() {
            var compNombre = document.getElementById('comprobante-nombre');
            if (compNombre && this.files && this.files[0]) {
                compNombre.textContent = this.files[0].name;
            }
        });
    }

    var formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', function(e) {
            e.preventDefault();
            ocultarAviso();
            var nombreEmpresa = (document.getElementById('nombre-empresa').value || '').trim();
            var nit = (document.getElementById('nit').value || '').trim();
            var sector = (document.getElementById('sector').value || '').trim();
            var nombreResponsable = (document.getElementById('nombre-responsable').value || '').trim();
            var password = (document.getElementById('password-registro').value || '').trim();
            var passwordConfirm = (document.getElementById('password-confirm').value || '').trim();
            var planSelect = document.getElementById('plan-select');
            var plan = (planSelect ? planSelect.value : 'gratis').toLowerCase();
            if (!nombreEmpresa) { mostrarAviso('Ingrese el nombre de la empresa.'); return; }
            if (!nit) { mostrarAviso('Ingrese el NIT.'); return; }
            if (!nombreResponsable) { mostrarAviso('Ingrese el nombre del responsable.'); return; }
            if (!password || password.length < 6) { mostrarAviso('La contraseña debe tener al menos 6 caracteres.'); return; }
            if (password !== passwordConfirm) { mostrarAviso('Las contraseñas no coinciden. Revise Confirmar contraseña.'); return; }
            if (!window.sicopSupabase && typeof getEmpresas === 'function') {
                var list = getEmpresas();
                for (var i = 0; i < list.length; i++) {
                    if ((list[i].nit || '').trim() === nit) {
                        mostrarAviso('Ya existe una empresa con ese NIT. Use Iniciar sesión.');
                        return;
                    }
                }
            }
            var datos = { razonSocial: nombreEmpresa, nit: nit, sector: sector, nombreResponsable: nombreResponsable, correo: '', password: password, direccion: '', telefono: '', plan: plan };
            if (plan === 'plus' || plan === 'premium') {
                mostrarPagoNequi(plan, datos);
                return;
            }
            if (window.sicopSupabase && window.sicopSupabase.registerEmpresa) {
                var submitBtn = formRegister.querySelector('button[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registrando...'; }
                window.sicopSupabase.registerEmpresa(datos).then(function(empresa) {
                    try { localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(empresa)); } catch (err) {}
                    var overlay = document.getElementById('registro-exito-overlay');
                    if (overlay) overlay.classList.add('visible');
                    setTimeout(function() { window.location.replace('menu.html'); }, 2500);
                }).catch(function(err) {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Registrarme'; }
                    mostrarAviso(err && err.message ? err.message : 'Ya existe una empresa con ese NIT. Use Iniciar sesión.');
                });
                return;
            }
            if (typeof addEmpresa === 'function' && addEmpresa(datos, false)) {
                var overlay = document.getElementById('registro-exito-overlay');
                if (overlay) overlay.classList.add('visible');
                setTimeout(function() {
                    window.location.replace('index.html');
                }, 2500);
            } else {
                mostrarAviso('No se pudo guardar. Intente de nuevo.');
            }
        });
    }
})();
