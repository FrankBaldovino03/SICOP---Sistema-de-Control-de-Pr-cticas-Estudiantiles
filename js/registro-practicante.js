/**
 * Registro e Inicio de Sesión de Practicante
 */
(function() {
    var loginBox = document.getElementById('login-box');
    var registerBox = document.getElementById('register-box');
    var dynamicTitle = document.getElementById('dynamic-title');

    function showRegister() {
        loginBox.classList.remove('active');
        setTimeout(function() {
            registerBox.classList.add('active');
            if (dynamicTitle) dynamicTitle.innerHTML = "Comienza tu <br>Práctica.";
        }, 300);
    }
    window.showRegister = showRegister;

    function showLogin() {
        registerBox.classList.remove('active');
        setTimeout(function() {
            loginBox.classList.add('active');
            if (dynamicTitle) dynamicTitle.innerHTML = "Gestiona el <br>Talento.";
        }, 300);
    }
    window.showLogin = showLogin;

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

    var STORAGE_KEY_PRACTICANTE = 'sicop_practicante_sesion';
    var formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            ocultarAviso();
            var cedulaOCorreo = (document.getElementById('cedula-login').value || '').trim();
            var password = (document.getElementById('password-login').value || '').trim();
            if (!cedulaOCorreo || !password) {
                mostrarAviso('Ingrese cédula o correo y contraseña.');
                return;
            }
            if (window.sicopSupabase && window.sicopSupabase.loginPracticante) {
                var btn = formLogin.querySelector('#btn-login');
                if (btn) { btn.disabled = true; btn.textContent = 'Conectando...'; }
                window.sicopSupabase.loginPracticante(cedulaOCorreo, password).then(function(p) {
                    if (p) {
                        try { localStorage.setItem(STORAGE_KEY_PRACTICANTE, JSON.stringify(p)); } catch (err) {}
                        window.location.replace('menu.html');
                    } else {
                        if (btn) { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
                        mostrarAviso('Cédula/correo o contraseña incorrectos. Verifique e intente de nuevo.');
                    }
                }).catch(function() {
                    if (btn) { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
                    mostrarAviso('Error de conexión. Intente de nuevo.');
                });
                return;
            }
            if (typeof iniciarSesionPracticante === 'function' && iniciarSesionPracticante(cedulaOCorreo, password)) {
                window.location.replace('menu.html');
            } else {
                mostrarAviso('Cédula/correo o contraseña incorrectos. Verifique e intente de nuevo.');
            }
        });
    }

    var formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', function(e) {
            e.preventDefault();
            ocultarAviso();
            var nombre = (document.getElementById('nombre-completo').value || '').trim();
            var cedula = (document.getElementById('cedula-registro').value || '').trim();
            var correo = (document.getElementById('correo-registro').value || '').trim();
            var institucion = (document.getElementById('institucion').value || '').trim();
            var programa = (document.getElementById('programa').value || '').trim();
            var semestre = (document.getElementById('semestre').value || '').trim();
            var password = (document.getElementById('password-registro').value || '').trim();
            var passwordConfirm = (document.getElementById('password-confirm').value || '').trim();

            if (!nombre) { mostrarAviso('Ingrese su nombre completo.'); return; }
            if (!cedula) { mostrarAviso('Ingrese su cédula o documento.'); return; }
            if (!correo) { mostrarAviso('Ingrese su correo institucional.'); return; }
            if (!institucion) { mostrarAviso('Ingrese la institución universitaria.'); return; }
            if (!programa) { mostrarAviso('Ingrese el programa académico.'); return; }
            if (!semestre) { mostrarAviso('Seleccione el semestre actual.'); return; }
            if (!password || password.length < 6) { mostrarAviso('La contraseña debe tener al menos 6 caracteres.'); return; }
            if (password !== passwordConfirm) { mostrarAviso('Las contraseñas no coinciden.'); return; }

            if (!window.sicopSupabase && typeof getPracticantesRegistro === 'function') {
                var list = getPracticantesRegistro();
                for (var i = 0; i < list.length; i++) {
                    var p = list[i];
                    if ((p.cedula || p.documento || '').toString().trim() === cedula) {
                        mostrarAviso('Ya existe un practicante con esa cédula. Use Iniciar sesión.');
                        return;
                    }
                    if ((p.correo || '').trim().toLowerCase() === correo.toLowerCase()) {
                        mostrarAviso('Ya existe un practicante con ese correo. Use Iniciar sesión.');
                        return;
                    }
                }
            }

            var datos = {
                nombre: nombre,
                cedula: cedula,
                documento: cedula,
                correo: correo,
                institucion: institucion,
                programa: programa,
                semestre: semestre,
                password: password
            };

            if (window.sicopSupabase && window.sicopSupabase.registerPracticante) {
                var submitBtn = formRegister.querySelector('button[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registrando...'; }
                window.sicopSupabase.registerPracticante(datos).then(function(p) {
                    // Guardar sesión actual de practicante
                    try { localStorage.setItem(STORAGE_KEY_PRACTICANTE, JSON.stringify(p)); } catch (err) {}

                    // También sincronizar con la lista local que usa el panel de practicantes
                    try {
                        if (typeof getPracticantesRegistro === 'function' && typeof setPracticantesRegistro === 'function') {
                            var lista = getPracticantesRegistro() || [];
                            var docNuevo = (p.cedula || p.documento || '').toString().trim();
                            var yaExiste = lista.some(function(item) {
                                var docItem = (item.cedula || item.documento || '').toString().trim();
                                return (p.id && item.id && p.id === item.id) || (docItem && docItem === docNuevo);
                            });
                            if (!yaExiste) {
                                lista.push(p);
                                setPracticantesRegistro(lista);
                            }
                        }
                    } catch (e) {}

                    var overlay = document.getElementById('registro-exito-overlay');
                    if (overlay) overlay.classList.add('visible');
                    setTimeout(function() { window.location.replace('menu.html'); }, 2500);
                }).catch(function(err) {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Registrarme'; }
                    mostrarAviso(err && err.message ? err.message : 'Ya existe un practicante con esa cédula o correo. Use Iniciar sesión.');
                });
                return;
            }

            if (typeof addPracticanteRegistro === 'function' && addPracticanteRegistro(datos, true)) {
                var overlay = document.getElementById('registro-exito-overlay');
                if (overlay) overlay.classList.add('visible');
                setTimeout(function() {
                    window.location.replace('menu.html');
                }, 2500);
            } else {
                mostrarAviso('No se pudo guardar. Intente de nuevo.');
            }
        });
    }
})();
