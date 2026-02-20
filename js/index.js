var STORAGE_KEY = (function() {
    try {
        if (typeof getCompanyId === 'function') return 'sicop_practicantes_' + (getCompanyId() || '');
    } catch (e) {}
    return 'sicop_practicantes_';
})();
var DOCS_EXCLUIDOS = ['12345678-9', '98765432-1', '11223344-5'];
var _listadoCache = [];

/** true si la sesión actual es de un practicante (solo ve sus propios datos) */
function esVistaPracticante() {
    try {
        return typeof getPracticanteActual === 'function' && getPracticanteActual() !== null;
    } catch (e) {
        return false;
    }
}

function avisoDetalle(mensaje) {
    var aviso = document.getElementById('listado-aviso');
    var texto = document.getElementById('listado-aviso-texto');
    if (aviso && texto) {
        texto.textContent = mensaje;
        aviso.classList.remove('is-hidden');
        setTimeout(function() { aviso.classList.add('is-hidden'); }, 4000);
    } else if (typeof mostrarAviso === 'function') mostrarAviso(mensaje);
}

function mostrarAvisoSoloPropios() {
    var listadoAviso = document.getElementById('listado-aviso');
    var listadoAvisoTexto = document.getElementById('listado-aviso-texto');
    if (listadoAviso && listadoAvisoTexto) {
        listadoAvisoTexto.textContent = 'Solo puedes ver los datos de tu propio perfil.';
        listadoAviso.classList.remove('is-hidden');
        setTimeout(function() { listadoAviso.classList.add('is-hidden'); }, 4000);
    }
}

/** Convierte datos del practicante de registro al formato del detalle (nombre, documento, email, etc.) */
function practicanteRegistroADetalle(p) {
    if (!p) return null;
    return {
        id: p.id || null,
        nombre: p.nombre || p.nombreCompleto || '—',
        documento: p.cedula || p.documento || '—',
        email: p.correo || p.email || '—',
        institucion: p.institucion || '—',
        carrera: p.programa || p.carrera || '—',
        semestre: p.semestre || '',
        fecha_inicio: p.fecha_inicio || p.fechaInicio || '',
        fecha_fin: p.fecha_fin || p.fechaFin || '',
        jefe_inmediato: p.jefe_inmediato || p.jefeInmediato || '—'
    };
}

var currentStep = 1;
var totalSteps = 3;

function filtrarPracticantes(lista) {
    if (!lista || !lista.length) return [];
    return lista.filter(function(p) {
        var doc = (p.documento || '').toString().trim();
        var nombre = (p.nombre || '').toString().trim();
        if (DOCS_EXCLUIDOS.indexOf(doc) !== -1) return false;
        if (!nombre) return false;
        return true;
    });
}

function cargarListadoPracticantes(cb) {
    cb = cb || function() {};
    if (typeof SICOP_API !== 'undefined' && SICOP_API.getPracticantes) {
        SICOP_API.getPracticantes(function(err, data) {
            var lista = filtrarPracticantes(data || []);
            cb(lista);
        });
    } else {
        var json = localStorage.getItem(STORAGE_KEY) || '[]';
        var lista = json ? JSON.parse(json) : [];
        if (lista.length === 0 && STORAGE_KEY !== 'sicop_practicantes') {
            var legacy = localStorage.getItem('sicop_practicantes');
            if (legacy) {
                try {
                    lista = JSON.parse(legacy);
                    localStorage.setItem(STORAGE_KEY, legacy);
                } catch (e) {}
            }
        }
        cb(filtrarPracticantes(lista));
    }
}

function formatearSemestre(val) {
    if (!val) return '—';
    var n = parseInt(val, 10);
    var ord = ['', '1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo', '11ro', '12do'];
    return (ord[n] || val) + ' Semestre';
}

function formatearFecha(f) {
    if (!f) return '—';
    if (/^\d{4}-\d{2}-\d{2}/.test(f)) {
        var parts = f.split('-');
        var anio = parts[0];
        var mes = parts[1] || '';
        var dia = (parts[2] || '').split('T')[0];
        return dia + '/' + mes + '/' + anio;
    }
    return f;
}

function fechaParaInputValor(f) {
    if (!f || !(f = (f + '').trim())) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(f)) return f.split('T')[0].substring(0, 10);
    var m = (f + '').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    return '';
}

function horasDecimalesDeFila(row) {
    if (!row) return 0;
    function aDecimal(entrada, salida) {
        if (!entrada || !salida) return 0;
        var he = Number(String(entrada).split(':')[0]);
        var me = Number(String(entrada).split(':')[1]) || 0;
        var hs = Number(String(salida).split(':')[0]);
        var ms = Number(String(salida).split(':')[1]) || 0;
        return (hs - he) + (ms - me) / 60;
    }
    var manana = aDecimal(row.horaEntradaManana, row.horaSalidaManana);
    var tarde = aDecimal(row.horaEntradaTarde, row.horaSalidaTarde);
    return manana + tarde;
}

function formatearHorasParaDetalle(totalDecimal) {
    if (totalDecimal <= 0) return '0 h 00 min';
    var h = Math.floor(totalDecimal);
    var m = Math.round((totalDecimal - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    var minStr = String(m).padStart(2, '0');
    return h + ' h ' + minStr + ' min';
}

var MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function mostrarDetalleEnCuadros(p) {
    var zona = document.getElementById('listado-detalle');
    var listadoCuadros = document.getElementById('listado-cuadros');
    var titulo = document.getElementById('listado-detalle-titulo');
    var cuadroId = document.getElementById('cuadro-identificacion');
    var cuadroAc = document.getElementById('cuadro-academico');
    var cuadroAsig = document.getElementById('cuadro-asignacion');
    var cuadroHoras = document.getElementById('cuadro-horas-mes');
    if (!zona || !cuadroId || !cuadroAc || !cuadroAsig) return;
    var nombre = (p.nombre || '').trim();
    if (titulo) titulo.textContent = nombre || 'Detalle del practicante';
    cuadroId.innerHTML = '<span class="detalle-cuadro-titulo">Identificación</span>' +
        '<span class="detalle-cuadro-nombre">' + (p.nombre || '—') + '</span>' +
        '<span class="detalle-cuadro-cedula">' + (p.documento || '—') + '</span>' +
        '<span class="detalle-cuadro-linea"><span class="detalle-cuadro-label">Correo</span> ' + (p.email || '—') + '</span>';
    cuadroAc.innerHTML = '<span class="detalle-cuadro-titulo">Datos académicos</span>' +
        '<span class="detalle-cuadro-linea"><span class="detalle-cuadro-label">Institución</span> ' + (p.institucion || '—') + '</span>' +
        '<span class="detalle-cuadro-linea"><span class="detalle-cuadro-label">Programa</span> ' + (p.carrera || '—') + '</span>' +
        '<span class="detalle-cuadro-linea"><span class="detalle-cuadro-label">Semestre</span> ' + formatearSemestre(p.semestre) + '</span>';
    cuadroAsig.innerHTML = '<span class="detalle-cuadro-titulo">Asignación</span>' +
        '<label class="detalle-cuadro-linea detalle-asig-linea"><span class="detalle-cuadro-label">Fecha inicio</span><input type="date" id="detalle-fecha-inicio" value="' + fechaParaInputValor(p.fecha_inicio || p.fechaInicio) + '" class="detalle-asig-input" /></label>' +
        '<label class="detalle-cuadro-linea detalle-asig-linea"><span class="detalle-cuadro-label">Fecha fin</span><input type="date" id="detalle-fecha-fin" value="' + fechaParaInputValor(p.fecha_fin || p.fechaFin) + '" class="detalle-asig-input" /></label>' +
        '<label class="detalle-cuadro-linea detalle-asig-linea"><span class="detalle-cuadro-label">Jefe inmediato</span><input type="text" id="detalle-jefe-inmediato" value="' + (p.jefe_inmediato || p.jefeInmediato || '').replace(/"/g, '&quot;') + '" placeholder="Nombre del jefe" class="detalle-asig-input" /></label>' +
        '<button type="button" class="btn-detalle-guardar-asig" id="btn-guardar-asignacion">Guardar asignación</button>';
    (function(practicante) {
        var btn = document.getElementById('btn-guardar-asignacion');
        if (!btn) return;
        btn.addEventListener('click', function() {
            var fechaInicio = (document.getElementById('detalle-fecha-inicio') && document.getElementById('detalle-fecha-inicio').value) || '';
            var fechaFin = (document.getElementById('detalle-fecha-fin') && document.getElementById('detalle-fecha-fin').value) || '';
            var jefe = (document.getElementById('detalle-jefe-inmediato') && document.getElementById('detalle-jefe-inmediato').value) || '';
            if (!practicante.id) {
                avisoDetalle('No se puede guardar: use el panel con base de datos.');
                return;
            }
            if (typeof SICOP_API !== 'undefined' && SICOP_API.updatePracticanteAsignacion) {
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                SICOP_API.updatePracticanteAsignacion(practicante.id, { fecha_inicio: fechaInicio, fecha_fin: fechaFin, jefe_inmediato: jefe }, function(err) {
                    btn.disabled = false;
                    btn.textContent = 'Guardar asignación';
                    if (err) avisoDetalle('Error al guardar. Intente de nuevo.');
                    else {
                        avisoDetalle('Asignación guardada.');
                        practicante.fecha_inicio = fechaInicio;
                        practicante.fecha_fin = fechaFin;
                        practicante.jefe_inmediato = jefe;
                    }
                });
            } else {
                avisoDetalle('Guardado solo en este dispositivo.');
            }
        });
    })(p);
    if (cuadroHoras) {
        cuadroHoras.innerHTML = '<span class="detalle-cuadro-titulo">Horas por mes</span><span class="detalle-cuadro-linea detalle-horas-cargando">Cargando…</span>';
        function extraerAnioMes(fechaStr) {
            var s = (fechaStr || '').trim().replace(/\//g, '-');
            var part = s.split('-');
            if (part.length !== 3) return null;
            var mes = part[1];
            var anio = (part[0].length === 4) ? part[0] : part[2];
            if (!anio || !mes) return null;
            mes = String(parseInt(mes, 10) || 0).padStart(2, '0');
            return { anio: anio, mes: mes };
        }
        function mergearResumenLocal(porMes, practicanteId) {
            try {
                var raw = localStorage.getItem('sicop_horas_por_mes');
                var global = raw ? JSON.parse(raw) : {};
                var porPracticante = global[String(practicanteId)] || {};
                Object.keys(porPracticante).forEach(function(key) {
                    var o = porPracticante[key];
                    if (!porMes[key]) porMes[key] = { anio: o.anio, mes: o.mes, total: 0 };
                    porMes[key].total += o.total;
                });
            } catch (e) {}
        }
        function esFranklinBaldovino(perfil) {
            if (!perfil || !perfil.nombre) return false;
            var n = (perfil.nombre + '').toLowerCase();
            return n.indexOf('franklin') !== -1;
        }
        function generarHorasEneroFranklinBaldovino(practicanteId, nombre, cedula) {
            var filas = [];
            var anio = 2026, mes = 1;
            for (var dia = 8; dia <= 31; dia++) {
                var d = new Date(anio, mes - 1, dia);
                var diaSemana = d.getDay();
                if (diaSemana === 0) continue;
                var fechaStr = anio + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
                var row = {
                    fecha: fechaStr,
                    nombre: nombre || '',
                    cedula: cedula || '',
                    horaEntradaManana: '',
                    horaSalidaManana: '',
                    horaEntradaTarde: '',
                    horaSalidaTarde: '',
                    horasPorDia: '',
                    jefeInmediato: ''
                };
                if (practicanteId) row.practicante_id = practicanteId;
                if (diaSemana >= 1 && diaSemana <= 5) {
                    row.horaEntradaManana = '08:00';
                    row.horaSalidaManana = '12:00';
                    row.horaEntradaTarde = '14:00';
                    row.horaSalidaTarde = '17:00';
                } else if (diaSemana === 6) {
                    row.horaEntradaManana = '07:00';
                    row.horaSalidaManana = '12:30';
                }
                filas.push(row);
            }
            return filas;
        }
        function pintarHorasPorMes(porMes, practicanteId) {
            var html = '<span class="detalle-cuadro-titulo">Horas por mes</span>';
            html += '<p class="detalle-horas-ayuda">Haz clic en un mes para ir a Control de prácticas y ver o editar los días registrados.</p>';
            var keys = Object.keys(porMes).sort();
            if (keys.length > 0) {
                html += '<ul class="lista-meses-registrados">';
                keys.forEach(function(key) {
                    var o = porMes[key];
                    var nombreMes = MESES_ES[parseInt(o.mes, 10) - 1] || o.mes;
                    html += '<li class="lista-mes-item lista-mes-item--clickable" role="button" tabindex="0" data-mes-key="' + key + '"><span class="lista-mes-nombre">' + nombreMes + ' ' + o.anio + '</span><span class="lista-mes-horas">' + formatearHorasParaDetalle(o.total) + '</span></li>';
                });
                html += '</ul>';
            } else {
                html += '<span class="detalle-cuadro-linea">— Aún no hay meses registrados. Cierra meses desde Control de prácticas (Guardar y luego Limpiar tabla).</span>';
            }
            cuadroHoras.innerHTML = html;
            if (keys.length > 0 && practicanteId) {
                var urlBase = 'control-practicas.html';
                cuadroHoras.querySelectorAll('.lista-mes-item--clickable').forEach(function(li) {
                    var key = li.getAttribute('data-mes-key');
                    var url = urlBase + '?practicante_id=' + encodeURIComponent(String(practicanteId)) + '&mes=' + encodeURIComponent(key || '');
                    function irAControl() {
                        window.location.href = url;
                    }
                    li.addEventListener('click', irAControl);
                    li.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irAControl(); } });
                });
            }
        }
        if (p.id && typeof SICOP_API !== 'undefined' && SICOP_API.getControlFilas) {
            function pintarConFilas(filas) {
                var porMes = {};
                mergearResumenLocal(porMes, p.id);
                if (filas && filas.length > 0) {
                    filas.forEach(function(f) {
                        var fecha = (f.fecha || '').trim();
                        if (!fecha) return;
                        var am = extraerAnioMes(fecha);
                        if (!am) return;
                        var key = am.anio + '-' + am.mes;
                        if (!porMes[key]) porMes[key] = { anio: am.anio, mes: am.mes, total: 0 };
                        porMes[key].total += horasDecimalesDeFila(f);
                    });
                }
                pintarHorasPorMes(porMes, p.id);
            }
            SICOP_API.getControlFilas(p.id, function(err, filas) {
                if (err) {
                    pintarConFilas([]);
                    return;
                }
                var porMesAux = {};
                if (filas && filas.length > 0) {
                    filas.forEach(function(f) {
                        var fecha = (f.fecha || '').trim();
                        if (!fecha) return;
                        var am = extraerAnioMes(fecha);
                        if (!am) return;
                        var key = am.anio + '-' + am.mes;
                        if (!porMesAux[key]) porMesAux[key] = { anio: am.anio, mes: am.mes, total: 0 };
                        porMesAux[key].total += horasDecimalesDeFila(f);
                    });
                }
                if (esFranklinBaldovino(p) && !porMesAux['2026-01'] && typeof SICOP_API.saveControlFilas === 'function') {
                    var nombre = (p.nombre || '').trim();
                    var cedula = (p.cedula || p.documento || '').trim();
                    var filasEnero = generarHorasEneroFranklinBaldovino(p.id, nombre, cedula);
                    var resto = (filas || []).filter(function(f) { return (f.fecha || '').trim().indexOf('2026-01') !== 0; });
                    var todas = resto.concat(filasEnero).sort(function(a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });
                    SICOP_API.saveControlFilas(todas.length ? todas : filasEnero, function(saveErr) {
                        if (!saveErr && typeof SICOP_API.getControlFilas === 'function') {
                            SICOP_API.getControlFilas(p.id, function(_, filasActualizadas) {
                                pintarConFilas(filasActualizadas || []);
                            });
                        } else {
                            pintarConFilas(todas.length ? todas : filasEnero);
                        }
                    });
                } else {
                    pintarConFilas(filas || []);
                }
            });
        } else {
            var porMes = {};
            if (p.id) mergearResumenLocal(porMes, p.id);
            pintarHorasPorMes(porMes, p.id);
        }
    }
    zona.classList.remove('is-hidden');
    if (listadoCuadros) listadoCuadros.classList.add('is-hidden');
}

function cerrarDetalle() {
    var zona = document.getElementById('listado-detalle');
    var listadoCuadros = document.getElementById('listado-cuadros');
    if (zona) zona.classList.add('is-hidden');
    if (listadoCuadros) listadoCuadros.classList.remove('is-hidden');
}

function renderListado() {
    var contenedor = document.getElementById('listado-cuadros');
    var vacio = document.getElementById('listado-vacio');
    var btnAlta = document.getElementById('btn-ir-alta');
    var listadoTitulo = document.querySelector('.listado-titulo');
    if (!contenedor) return;

    if (esVistaPracticante()) {
        var actual = getPracticanteActual();
        if (btnAlta) btnAlta.style.display = 'none';
        if (listadoTitulo) listadoTitulo.textContent = 'Practicantes registrados';
        if (!actual) {
            contenedor.innerHTML = '';
            if (vacio) {
                vacio.textContent = 'No hay sesión de practicante. Inicie sesión en la página principal.';
                vacio.classList.remove('is-hidden');
            }
            return;
        }
        var listaRegistro = typeof getPracticantesRegistro === 'function' ? getPracticantesRegistro() : [];
        if (listaRegistro.length === 0 && actual) {
            listaRegistro = [actual];
        }
        var coloresCuadros = ['practicante-cuadro--c0', 'practicante-cuadro--c1', 'practicante-cuadro--c2', 'practicante-cuadro--c3', 'practicante-cuadro--c4', 'practicante-cuadro--c5'];
        contenedor.innerHTML = '';
        if (listaRegistro.length === 0) {
            if (vacio) {
                vacio.textContent = 'Aún no hay practicantes registrados.';
                vacio.classList.remove('is-hidden');
            }
            return;
        }
        if (vacio) vacio.classList.add('is-hidden');
        _listadoCache = listaRegistro.map(function(p) { return practicanteRegistroADetalle(p); });
        listaRegistro.forEach(function(p, i) {
            var pDetalle = practicanteRegistroADetalle(p);
            var esYo = (p.id && actual.id && p.id === actual.id) || (String(p.cedula || p.documento || '').trim() === String(actual.cedula || actual.documento || '').trim());
            var cuadro = document.createElement('div');
            cuadro.className = 'practicante-cuadro ' + (coloresCuadros[i % coloresCuadros.length]) + (esYo ? '' : ' practicante-cuadro--solo-lectura');
            cuadro.setAttribute('role', 'button');
            cuadro.setAttribute('tabindex', '0');
            cuadro.setAttribute('aria-label', esYo ? 'Ver mi perfil' : 'Solo puedes ver tu propia información');
            cuadro.innerHTML = '<span class="practicante-nombre">' + (pDetalle.nombre || '—') + '</span><span class="practicante-universidad">' + (pDetalle.institucion || '—') + '</span>';
            if (esYo) {
                cuadro.addEventListener('click', function() { mostrarDetalleEnCuadros(pDetalle); });
                cuadro.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrarDetalleEnCuadros(pDetalle); } });
            } else {
                cuadro.addEventListener('click', function() { mostrarAvisoSoloPropios(); });
                cuadro.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrarAvisoSoloPropios(); } });
            }
            contenedor.appendChild(cuadro);
        });
        return;
    }

    if (btnAlta) btnAlta.style.display = '';
    if (listadoTitulo) listadoTitulo.textContent = 'Practicantes registrados';
    contenedor.innerHTML = '';
    cargarListadoPracticantes(function(lista) {
        _listadoCache = lista;
        if (lista.length === 0) {
            if (vacio) {
                vacio.textContent = 'Aún no hay practicantes registrados. Use el botón superior para dar de alta uno.';
                vacio.classList.remove('is-hidden');
            }
            return;
        }
        if (vacio) vacio.classList.add('is-hidden');
        var coloresCuadros = ['practicante-cuadro--c0', 'practicante-cuadro--c1', 'practicante-cuadro--c2', 'practicante-cuadro--c3', 'practicante-cuadro--c4', 'practicante-cuadro--c5'];
        lista.forEach(function(p, i) {
            var cuadro = document.createElement('div');
            cuadro.className = 'practicante-cuadro ' + (coloresCuadros[i % coloresCuadros.length]);
            cuadro.setAttribute('role', 'button');
            cuadro.setAttribute('tabindex', '0');
            cuadro.innerHTML = '<span class="practicante-nombre">' + (p.nombre || '—') + '</span><span class="practicante-universidad">' + (p.institucion || '—') + '</span>';
            cuadro.addEventListener('click', function() { mostrarDetalleEnCuadros(lista[i]); });
            cuadro.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrarDetalleEnCuadros(lista[i]); } });
            contenedor.appendChild(cuadro);
        });
    });
}

function mostrarListado() {
    var listado = document.getElementById('vista-listado');
    var formulario = document.getElementById('vista-formulario');
    var titulo = document.getElementById('sidebar-title');
    var steps = document.querySelector('.step-list');
    if (listado) listado.classList.remove('is-hidden');
    if (formulario) formulario.classList.add('is-hidden');
    if (titulo) titulo.textContent = 'Practicantes';
    if (steps) steps.classList.add('is-hidden');
    renderListado();
}

function mostrarFormulario() {
    var listado = document.getElementById('vista-listado');
    var formulario = document.getElementById('vista-formulario');
    var titulo = document.getElementById('sidebar-title');
    var steps = document.querySelector('.step-list');
    if (listado) listado.classList.add('is-hidden');
    if (formulario) formulario.classList.remove('is-hidden');
    if (titulo) titulo.textContent = 'Alta de Practicantes';
    if (steps) steps.classList.remove('is-hidden');
    currentStep = 1;
    updateUI();
}

window.mostrarFormularioDesdeBoton = function() {
    var listadoAviso = document.getElementById('listado-aviso');
    var listadoAvisoTexto = document.getElementById('listado-aviso-texto');
    if (listadoAviso && listadoAvisoTexto) {
        listadoAviso.classList.add('is-hidden');
    }
    if (limitePracticantesSegunPlan()) {
        if (listadoAviso && listadoAvisoTexto) {
            listadoAvisoTexto.textContent = 'Su plan Gratis permite solo 2 practicantes. Actualice a Plus o Premium para registrar más.';
            listadoAviso.classList.remove('is-hidden');
        } else {
            mostrarAviso('Su plan Gratis permite solo 2 practicantes. Actualice a Plus o Premium para registrar más.');
        }
        return;
    }
    mostrarFormulario();
};

function initVistas() {
    var btnAlta = document.getElementById('btn-ir-alta');
    var btnDescartar = document.getElementById('btn-descartar');
    if (btnAlta) btnAlta.addEventListener('click', window.mostrarFormularioDesdeBoton);
    if (btnDescartar) btnDescartar.addEventListener('click', mostrarListado);
}

function updateUI() {
    var panes = document.querySelectorAll('.step-pane');
    panes.forEach(function(p) { p.classList.remove('active'); });
    var pane = document.getElementById('pane-' + currentStep);
    if (pane) pane.classList.add('active');

    var items = document.querySelectorAll('.step-item');
    items.forEach(function(item, i) {
        item.classList.toggle('active', i + 1 === currentStep);
        item.classList.toggle('completed', i + 1 < currentStep);
    });

    var btnPrev = document.getElementById('btn-prev');
    if (btnPrev) btnPrev.classList.toggle('is-hidden', currentStep <= 1);
    var nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
        nextBtn.innerText = currentStep === totalSteps ? 'Finalizar Registro' : 'Siguiente';
        nextBtn.classList.toggle('btn-next--final', currentStep === totalSteps);
    }
    var stepTag = document.getElementById('step-tag');
    if (stepTag) stepTag.innerText = 'PASO ' + currentStep + ' DE ' + totalSteps;
}

function mostrarAviso(mensaje) {
    var aviso = document.getElementById('form-aviso');
    var texto = document.getElementById('form-aviso-texto');
    if (aviso && texto) {
        texto.textContent = mensaje;
        aviso.classList.remove('is-hidden');
    }
}

function ocultarAviso() {
    var aviso = document.getElementById('form-aviso');
    if (aviso) aviso.classList.add('is-hidden');
}

function validarPaso(paso) {
    ocultarAviso();
    var pane = document.getElementById('pane-' + paso);
    if (!pane) return true;
    var inputs = pane.querySelectorAll('input, select');
    for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var val = (el.value || '').toString().trim();
        if (!val) {
            el.focus();
            mostrarAviso('Complete todos los campos obligatorios antes de continuar.');
            return false;
        }
    }
    return true;
}

function nextStep() {
    if (!validarPaso(currentStep)) return;
    if (currentStep < totalSteps) {
        currentStep++;
        updateUI();
    } else {
        showSuccess();
    }
}

function prevStep() {
    ocultarAviso();
    if (currentStep > 1) {
        currentStep--;
        updateUI();
    }
}

window.nextStep = nextStep;
window.prevStep = prevStep;

function limitePracticantesSegunPlan() {
    var emp = typeof getEmpresa === 'function' ? getEmpresa() : null;
    if (!emp || (emp.plan || '').toLowerCase() !== 'gratis') return false;
    var lista = _listadoCache && _listadoCache.length ? _listadoCache : [];
    try {
        var json = localStorage.getItem(STORAGE_KEY);
        if (json) lista = JSON.parse(json);
    } catch (e) {}
    return lista.length >= 2;
}

function guardarPracticante(callback) {
    callback = callback || function () {};
    if (limitePracticantesSegunPlan()) {
        mostrarAviso('Su plan Gratis permite solo 2 practicantes. Actualice a Plus o Premium para registrar más.');
        return;
    }
    var pane1 = document.querySelectorAll('#pane-1 input');
    var pane2 = document.querySelectorAll('#pane-2 input, #pane-2 select');
    var pane3 = document.querySelectorAll('#pane-3 input');
    var p = {
        nombre: pane1[0] ? pane1[0].value.trim() : '',
        documento: pane1[1] ? pane1[1].value.trim() : '',
        email: pane1[2] ? pane1[2].value.trim() : '',
        institucion: pane2[0] ? pane2[0].value.trim() : '',
        carrera: pane2[1] ? pane2[1].value.trim() : '',
        semestre: pane2[2] ? pane2[2].value : '',
        fecha_inicio: pane3[0] ? pane3[0].value : '',
        fecha_fin: pane3[1] ? pane3[1].value : '',
        jefe_inmediato: pane3[2] ? pane3[2].value.trim() : ''
    };
    if (typeof SICOP_API !== 'undefined' && SICOP_API.savePracticante) {
        SICOP_API.savePracticante(p, callback);
    } else {
        var lista = [];
        try {
            var json = localStorage.getItem(STORAGE_KEY);
            if (json) lista = JSON.parse(json);
        } catch (e) {}
        lista.push(p);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
        callback(null);
    }
}

function showSuccess() {
    guardarPracticante(function (err) {
        if (err) {
            mostrarAviso('Error al guardar. Revisa la URL de Google Sheets en js/config.js');
            return;
        }
        var mainPanel = document.getElementById('main-panel');
        if (!mainPanel) return;
        mainPanel.innerHTML = [
            '<div class="success-container">',
            '  <div class="success-icon">',
            '    <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">',
            '      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>',
            '    </svg>',
            '  </div>',
            '  <h2 class="success-title">¡Registro Completado!</h2>',
            '  <p class="success-text">El practicante ha sido incorporado al sistema SICOP con éxito.</p>',
            '  <div class="success-btns">',
            '    <button type="button" class="btn btn-next" data-success-link="panel_practicantes.html">Ver listado de practicantes</button>',
            '    <button type="button" class="btn btn-prev" data-success-link="menu.html">Menú Principal</button>',
            '  </div>',
            '</div>'
        ].join('');
        var successPanel = mainPanel.querySelector('.success-container');
        if (successPanel) {
            successPanel.querySelectorAll('[data-success-link]').forEach(function(btn) {
                btn.addEventListener('click', function() { window.location.href = btn.getAttribute('data-success-link'); });
            });
        }
    });
}
window.guardarYMostrarExito = showSuccess;

/**
 * Sincroniza la lista local de practicantes (vista practicante)
 * con lo que haya en Supabase, para que se vean entre sí.
 */
function syncPracticantesLocalesDesdeSupabase() {
    try {
        if (!esVistaPracticante()) return;
        if (typeof window.supabase === 'undefined') return;
        if (typeof SICOP_CONFIG === 'undefined' || !SICOP_CONFIG.useSupabase) return;
        if (typeof setPracticantesRegistro !== 'function') return;

        var client = window._sicopClient || window.supabase.createClient(SICOP_CONFIG.SUPABASE_URL, SICOP_CONFIG.SUPABASE_ANON_KEY);
        window._sicopClient = client;

        client.from('practicantes').select('*').then(function(res) {
            if (res.error) {
                return;
            }
            var lista = res.data || [];
            setPracticantesRegistro(lista);
            renderListado();
        });
    } catch (e) {
        // Silencioso: si falla, la app sigue usando solo localStorage
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (esVistaPracticante()) {
        var empEl = document.getElementById('sidebar-empresa');
        var actual = getPracticanteActual();
        if (empEl && actual) empEl.textContent = 'Conectado: ' + (actual.nombre || 'Practicante');
    } else {
        try {
            if (typeof requerirEmpresa === 'function' && !requerirEmpresa()) return;
        } catch (e) {}
        var empEl = document.getElementById('sidebar-empresa');
        if (empEl && typeof getEmpresa === 'function') {
            var emp = getEmpresa();
            if (emp) empEl.textContent = emp.razonSocial || 'Empresa';
        }
    }
    // Si estamos en modo practicante y hay Supabase, sincronizar la lista local con la BD.
    syncPracticantesLocalesDesdeSupabase();

    initVistas();
    renderListado();
    var steps = document.querySelector('.step-list');
    if (steps) steps.classList.add('is-hidden');
    var form = document.getElementById('multi-step-form');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); });
    var btnCerrarDetalle = document.getElementById('listado-detalle-cerrar');
    if (btnCerrarDetalle) btnCerrarDetalle.addEventListener('click', cerrarDetalle);
    var btnNext = document.getElementById('btn-next');
    var btnPrev = document.getElementById('btn-prev');
    if (btnNext) btnNext.addEventListener('click', nextStep);
    if (btnPrev) btnPrev.addEventListener('click', prevStep);
});
