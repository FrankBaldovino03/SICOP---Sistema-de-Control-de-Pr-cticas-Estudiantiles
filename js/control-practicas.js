(function() {
    var practicante = typeof getPracticanteActual === 'function' ? getPracticanteActual() : null;
    var esVistaPracticante = !!practicante;
    if (!esVistaPracticante && typeof requerirEmpresa === 'function' && !requerirEmpresa()) return;
    var companyId = esVistaPracticante ? ('practicante_' + (practicante.id || 'sesion')) : (typeof getCompanyId === 'function' ? getCompanyId() : '');
    var STORAGE_KEY = 'sicop_practicantes_' + companyId;
    var CONTROL_KEY = 'sicop_control_filas_' + companyId;
    var select = document.getElementById('select-practicante');
    var labelPracticante = document.getElementById('label-practicante');
    var tbody = document.getElementById('tbody-practicantes');
    var _filasCache = [];
    var _practicantesCache = [];

    function mesDeFecha(fechaStr) {
        var s = (fechaStr || '').trim();
        if (s.length >= 7 && s.charAt(4) === '-') return s.substring(0, 7);
        var parts = s.split(/[\/\-]/);
        if (parts.length >= 3) {
            var a = parts[0], b = parts[1], c = parts[2];
            if (a.length === 4) return a + '-' + String(parseInt(b, 10)).padStart(2, '0');
            if (c.length === 4) return c + '-' + String(parseInt(b, 10)).padStart(2, '0');
        }
        return '';
    }

    function mesActual() {
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        return y + '-' + m;
    }

    function getFilas() {
        return _filasCache;
    }

    function setFilas(filas) {
        _filasCache = filas;
        try { localStorage.setItem(CONTROL_KEY, JSON.stringify(filas)); } catch (e) {}
    }

    function guardarEnServidor() {
        var filas = getFilas();
        if (filas.length === 0) {
            mostrarAviso('No hay datos para guardar. Agregue al menos una fila.', 'warning');
            return;
        }
        if (typeof SICOP_API === 'undefined' || !SICOP_API.saveControlFilas) {
            mostrarAviso('Datos guardados en este dispositivo.', 'info');
            return;
        }
        var pid = (filas[0]) ? (filas[0].practicante_id || filas[0].practicanteId) : null;
        if (!pid && esVistaPracticante && practicante && practicante.id) {
            pid = practicante.id;
            if (filas[0]) filas[0].practicante_id = pid;
        }
        if (!pid) {
            mostrarAviso('No se puede guardar: no hay practicante seleccionado.', 'warning');
            return;
        }
        var btnGuardar = document.getElementById('btn-guardar');
        if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = 'Guardando...'; }
        SICOP_API.saveControlFilas(filas, function(err) {
            if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = 'Guardar'; }
            if (err) mostrarAviso('Error al guardar. Intente de nuevo.', 'warning');
            else mostrarAviso('Datos guardados correctamente.');
        });
    }

    function limpiarTabla() {
        var filas = getFilas();
        if (filas.length === 0) {
            mostrarAviso('La tabla ya está vacía.', 'info');
            return;
        }
        var primera = filas[0];
        var pid = (primera) ? (primera.practicante_id || primera.practicanteId) : null;
        if (!pid && esVistaPracticante && practicante && practicante.id) pid = practicante.id;
        var unaFilaVacia = {
            fecha: '',
            nombre: primera ? (primera.nombre || '') : '',
            cedula: primera ? (primera.cedula || '') : '',
            horaEntradaManana: '',
            horaSalidaManana: '',
            horaEntradaTarde: '',
            horaSalidaTarde: '',
            horasPorDia: '',
            jefeInmediato: ''
        };
        if (pid) unaFilaVacia.practicante_id = pid;
        setFilas([unaFilaVacia]);
        renderTabla();
        if (pid && typeof SICOP_API !== 'undefined' && SICOP_API.saveControlFilas) {
            SICOP_API.saveControlFilas([{ practicante_id: pid }], function(err) {
                if (err) mostrarAviso('Tabla limpiada aquí, pero no se pudo actualizar en la nube.', 'warning');
                else mostrarAviso('Tabla limpiada. Queda una fila para seguir agregando.');
            });
        } else {
            mostrarAviso('Tabla limpiada. Queda una fila para seguir agregando.');
        }
    }

    function horasEntre(entrada, salida) {
        if (!entrada || !salida) return 0;
        var pe = String(entrada).trim().split(':');
        var ps = String(salida).trim().split(':');
        var he = Number(pe[0]) || 0;
        var me = Number(pe[1]) || 0;
        var hs = Number(ps[0]) || 0;
        var ms = Number(ps[1]) || 0;
        return (hs - he) + (ms - me) / 60;
    }

    function totalHorasDecimal(row) {
        var manana = horasEntre(row.horaEntradaManana, row.horaSalidaManana);
        var tarde = horasEntre(row.horaEntradaTarde, row.horaSalidaTarde);
        return manana + tarde;
    }

    function formatearHorasMinutos(totalDecimal) {
        if (totalDecimal <= 0) return '0 h 00 min';
        var horas = Math.floor(totalDecimal);
        var minutos = Math.round((totalDecimal - horas) * 60);
        if (minutos === 60) { horas += 1; minutos = 0; }
        var minStr = String(minutos).padStart(2, '0');
        return horas + ' h ' + minStr + ' min';
    }

    function calcularHorasPorDia(row) {
        var total = totalHorasDecimal(row);
        if (total <= 0) return '';
        return formatearHorasMinutos(total);
    }

    function formatearFechaParaExport(fecha) {
        if (!fecha) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            var parts = fecha.split('-');
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return fecha;
    }

    function mostrarAviso(mensaje, tipo) {
        tipo = tipo || 'info';
        var container = document.getElementById('toast-container');
        if (!container) return;
        container.innerHTML = '';
        var overlay = document.createElement('div');
        overlay.className = 'toast-overlay';
        var toast = document.createElement('div');
        toast.className = 'toast' + (tipo === 'warning' ? ' toast-warning' : '');
        toast.innerHTML = '<span class="toast-icon">!</span><span>' + mensaje + '</span>';
        function cerrar() {
            overlay.style.opacity = '0';
            toast.style.opacity = '0';
            toast.style.transform = 'scale(0.95)';
            setTimeout(function() {
                overlay.remove();
                toast.remove();
            }, 200);
        }
        overlay.addEventListener('click', cerrar);
        container.appendChild(overlay);
        container.appendChild(toast);
        toast.addEventListener('click', function(e) { e.stopPropagation(); });
        setTimeout(cerrar, 4500);
    }

    function exportarPDF() {
        var filas = getFilas();
        if (filas.length === 0) {
            mostrarAviso('No hay datos para exportar. Seleccione un practicante primero.', 'warning');
            return;
        }
        var jsPDF = window.jspdf.jsPDF;
        var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setDrawColor(0, 0, 0);
        var pageW = doc.internal.pageSize.getWidth();
        var margin = 10;
        var tableWidth = pageW - margin * 2;
        var colW = tableWidth / 9;
        var rowH = 5;
        var y = 10;

        function dibujarBorde(x, y0, w, h) {
            doc.rect(x, y0, w, h);
        }

        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        dibujarBorde(margin, y, tableWidth, rowH);
        doc.text('CONTROL DE PRACTICAS', margin + tableWidth / 2, y + rowH / 2 + 1, { align: 'center' });
        y += rowH;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        dibujarBorde(margin, y, colW * 3, rowH);
        dibujarBorde(margin + colW * 3, y, colW * 2, rowH);
        doc.text('MAÑANA', margin + colW * 3 + colW, y + rowH / 2 + 0.8, { align: 'center' });
        dibujarBorde(margin + colW * 5, y, colW * 2, rowH);
        doc.text('TARDE', margin + colW * 5 + colW, y + rowH / 2 + 0.8, { align: 'center' });
        dibujarBorde(margin + colW * 7, y, colW * 2, rowH);
        y += rowH;

        var headers = ['FECHA', 'NOMBRE', 'CEDULA', 'HORA ENTRADA', 'HORA SALIDA', 'HORA ENTRADA', 'HORA SALIDA', 'HORAS POR DIA', 'JEFE INMEDIATO'];
        doc.setFont(undefined, 'bold');
        doc.setFontSize(7);
        for (var c = 0; c < 9; c++) {
            dibujarBorde(margin + c * colW, y, colW, rowH);
            doc.text(headers[c], margin + c * colW + colW / 2, y + rowH / 2 + 0.8, { align: 'center' });
        }
        y += rowH;

        var filasConDatos = filas.filter(function(row) {
            return (row.fecha || '').trim() !== '';
        });
        if (filasConDatos.length === 0) {
            mostrarAviso('No hay datos para exportar. Complete al menos una fila con fecha.', 'warning');
            return;
        }
        var body = filasConDatos.map(function(row) {
            var totalDecimal = totalHorasDecimal(row);
            var h = formatearHorasMinutos(totalDecimal);
            return [
                formatearFechaParaExport(row.fecha),
                row.nombre || '',
                row.cedula || '',
                row.horaEntradaManana || '',
                row.horaSalidaManana || '',
                row.horaEntradaTarde || '',
                row.horaSalidaTarde || '',
                String(h || '0 h 00 min'),
                row.jefeInmediato || ''
            ];
        });
        var sumaTotalPdf = filasConDatos.reduce(function(acum, row) { return acum + totalHorasDecimal(row); }, 0);
        body.push(['Total acumulado', '', '', '', '', '', '', String(formatearHorasMinutos(sumaTotalPdf) || '0 h 00 min'), '']);
        doc.autoTable({
            startY: y,
            body: body,
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1, lineColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: colW }, 1: { cellWidth: colW }, 2: { cellWidth: colW },
                3: { cellWidth: colW }, 4: { cellWidth: colW }, 5: { cellWidth: colW },
                6: { cellWidth: colW }, 7: { cellWidth: colW }, 8: { cellWidth: colW }
            },
            margin: { left: margin },
            tableWidth: tableWidth,
            rowPageBreak: 'avoid',
            didDrawPage: function() {}
        });

        doc.save('control_practicas_' + new Date().toISOString().slice(0, 10) + '.pdf');
    }

    var DOCS_EXCLUIDOS = ['12345678-9', '98765432-1', '11223344-5'];

    function filtrarListaPracticantes(lista) {
        if (!lista || !lista.length) return lista;
        return lista.filter(function(p) {
            var doc = (p.documento || '').toString().trim();
            var nombre = (p.nombre || '').toString().trim();
            if (DOCS_EXCLUIDOS.indexOf(doc) !== -1) return false;
            if (!nombre) return false;
            return true;
        });
    }

    function init() {
        var empEl = document.getElementById('header-empresa');
        if (empEl) {
            if (esVistaPracticante && practicante) {
                empEl.textContent = practicante.nombre || 'Practicante';
                empEl.setAttribute('title', 'Conectado como practicante');
            } else if (typeof getEmpresa === 'function') {
                var emp = getEmpresa();
                if (emp) empEl.textContent = emp.razonSocial || '';
            }
        }
        function loadPracticantes(cb) {
            if (esVistaPracticante && practicante) {
                var doc = practicante.cedula || practicante.documento || '';
                var p = {
                    id: practicante.id,
                    nombre: practicante.nombre || '',
                    documento: doc,
                    cedula: doc,
                    institucion: practicante.institucion || ''
                };
                _practicantesCache = [p];
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(_practicantesCache));
                } catch (e) {}
                cb();
                return;
            }
            if (typeof SICOP_API !== 'undefined' && SICOP_API.getPracticantes) {
                SICOP_API.getPracticantes(function(err, data) {
                    _practicantesCache = filtrarListaPracticantes(data || []) || [];
                    cb();
                });
            } else {
                var json = localStorage.getItem(STORAGE_KEY) || '[]';
                _practicantesCache = json ? JSON.parse(json) : [];
                if (_practicantesCache.length === 0 && STORAGE_KEY !== 'sicop_practicantes') {
                    var legacy = localStorage.getItem('sicop_practicantes');
                    if (legacy) {
                        try {
                            _practicantesCache = JSON.parse(legacy);
                            localStorage.setItem(STORAGE_KEY, legacy);
                        } catch (e) {}
                    }
                }
                _practicantesCache = filtrarListaPracticantes(_practicantesCache) || [];
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(_practicantesCache));
                } catch (e) {}
                cb();
            }
        }
        if (esVistaPracticante && labelPracticante) {
            select.style.display = 'none';
            labelPracticante.textContent = practicante.nombre || 'Practicante';
            labelPracticante.style.display = 'inline';
        } else {
            if (labelPracticante) labelPracticante.style.display = 'none';
            select.innerHTML = '<option value="">Seleccione practicante para agregar línea...</option>';
        }
        loadPracticantes(function() {
            if (!esVistaPracticante) {
                _practicantesCache.forEach(function(p, i) {
                    var opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = p.nombre || '';
                    select.appendChild(opt);
                });
                var params = new URLSearchParams(window.location.search);
                var pidUrl = params.get('practicante_id');
                if (pidUrl && _practicantesCache.length > 0) {
                    for (var idx = 0; idx < _practicantesCache.length; idx++) {
                        if (String(_practicantesCache[idx].id) === String(pidUrl)) {
                            select.value = String(idx);
                            select.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            } else if (_practicantesCache.length > 0) {
                var p = _practicantesCache[0];
                var primeraFila = {
                    fecha: '',
                    nombre: p.nombre || '',
                    cedula: p.documento || p.cedula || '',
                    horaEntradaManana: '',
                    horaSalidaManana: '',
                    horaEntradaTarde: '',
                    horaSalidaTarde: '',
                    horasPorDia: '',
                    jefeInmediato: ''
                };
                if (p.id) primeraFila.practicante_id = p.id;
                if (typeof SICOP_API !== 'undefined' && SICOP_API.getControlFilas && p.id) {
                    SICOP_API.getControlFilas(p.id, function(err, list) {
                        var mesFiltro = (new URLSearchParams(window.location.search)).get('mes') || mesActual();
                        var listToSet = list;
                        if (list && list.length > 0) {
                            listToSet = list.filter(function(f) { return mesDeFecha(f.fecha) === mesFiltro; });
                        }
                        if (listToSet && listToSet.length > 0) setFilas(listToSet);
                        else setFilas([primeraFila]);
                        var btnAgregar = document.getElementById('btn-agregar');
                        if (btnAgregar) btnAgregar.disabled = false;
                        renderTabla();
                    });
                } else {
                    setFilas([primeraFila]);
                    var btnAgregar = document.getElementById('btn-agregar');
                    if (btnAgregar) btnAgregar.disabled = false;
                    renderTabla();
                }
                return;
            }
            renderTabla();
        });
    }

    function renderTabla() {
        var filas = getFilas();
        tbody.innerHTML = '';
        var btnAgregar = document.getElementById('btn-agregar');
        var btnGuardar = document.getElementById('btn-guardar');
        var btnLimpiar = document.getElementById('btn-limpiar-tabla');
        if (btnAgregar) btnAgregar.disabled = filas.length === 0;
        if (btnGuardar) btnGuardar.disabled = filas.length === 0;
        if (btnLimpiar) btnLimpiar.disabled = filas.length === 0;

        if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#94a3b8">Seleccione un practicante para agregar la primera línea. Fecha y nombre se completan automáticamente.</td></tr>';
            return;
        }

        function fechaParaInput(fecha) {
            if (!fecha) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
            var m = fecha.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
            return '';
        }

        filas.forEach(function(row, index) {
            var tr = document.createElement('tr');
            var horasPorDia = calcularHorasPorDia(row);
            var fechaVal = fechaParaInput(row.fecha || '');
            tr.innerHTML = [
                '<td><input type="date" data-index="', index, '" data-field="fecha" value="', fechaVal, '" /></td>',
                '<td>', (row.nombre || '—'), '</td>',
                '<td>', (row.cedula || '—'), '</td>',
                '<td><input type="time" data-index="', index, '" data-field="horaEntradaManana" value="', (row.horaEntradaManana || ''), '" /></td>',
                '<td><input type="time" data-index="', index, '" data-field="horaSalidaManana" value="', (row.horaSalidaManana || ''), '" /></td>',
                '<td><input type="time" data-index="', index, '" data-field="horaEntradaTarde" value="', (row.horaEntradaTarde || ''), '" /></td>',
                '<td><input type="time" data-index="', index, '" data-field="horaSalidaTarde" value="', (row.horaSalidaTarde || ''), '" /></td>',
                '<td class="horas-calc">', (horasPorDia || '—'), '</td>',
                '<td><input type="text" data-index="', index, '" data-field="jefeInmediato" value="', (row.jefeInmediato || ''), '" placeholder="" class="input-jefe" /></td>'
            ].join('');
            tbody.appendChild(tr);
        });

        var sumaTotal = filas.reduce(function(acum, row) { return acum + totalHorasDecimal(row); }, 0);
        var trTotal = document.createElement('tr');
        trTotal.className = 'fila-total';
        trTotal.innerHTML = '<td colspan="7" class="total-acumulado-label">Total acumulado</td><td class="horas-calc total-acumulado-valor">' + (formatearHorasMinutos(sumaTotal) || '—') + '</td><td></td>';
        tbody.appendChild(trTotal);

        function guardarCampo(input) {
            var index = parseInt(input.dataset.index, 10);
            var field = input.dataset.field;
            var filasArr = getFilas();
            if (filasArr[index]) {
                filasArr[index][field] = input.value.trim();
                setFilas(filasArr);
                if (field.indexOf('hora') === 0) renderTabla();
            }
        }

        [].forEach.call(tbody.querySelectorAll('input[type="time"]'), function(input) {
            input.addEventListener('change', function() { guardarCampo(this); });
        });
        [].forEach.call(tbody.querySelectorAll('input[type="date"]'), function(input) {
            input.addEventListener('change', function() { guardarCampo(this); });
        });
        [].forEach.call(tbody.querySelectorAll('input.input-jefe'), function(input) {
            input.addEventListener('change', function() { guardarCampo(this); });
            input.addEventListener('blur', function() { guardarCampo(this); });
        });
    }

    function agregarFila(practicante) {
        var prim = getFilas().length ? getFilas()[0] : null;
        var p = practicante || (prim ? { nombre: prim.nombre, documento: prim.cedula } : null);
        if (!p) return false;
        var nueva = {
            fecha: '',
            nombre: p.nombre || '',
            cedula: p.documento || prim ? prim.cedula : '',
            horaEntradaManana: '',
            horaSalidaManana: '',
            horaEntradaTarde: '',
            horaSalidaTarde: '',
            horasPorDia: '',
            jefeInmediato: ''
        };
        if (prim && (prim.practicante_id || prim.practicanteId)) nueva.practicante_id = prim.practicante_id || prim.practicanteId;
        var nuevas = getFilas().slice();
        nuevas.push(nueva);
        setFilas(nuevas);
        renderTabla();
        return true;
    }

    select.addEventListener('change', function() {
        var valor = this.value;
        if (valor === '') return;
        var p = _practicantesCache[parseInt(valor, 10)];
        if (!p) return;

        var primeraFila = {
            fecha: '',
            nombre: p.nombre || '',
            cedula: p.documento || p.cedula || '',
            horaEntradaManana: '',
            horaSalidaManana: '',
            horaEntradaTarde: '',
            horaSalidaTarde: '',
            horasPorDia: '',
            jefeInmediato: ''
        };
        if (p.id) primeraFila.practicante_id = p.id;

        if (typeof SICOP_API !== 'undefined' && SICOP_API.getControlFilas && p.id) {
            SICOP_API.getControlFilas(p.id, function(err, list) {
                var mesFiltro = (new URLSearchParams(window.location.search)).get('mes') || mesActual();
                var listToSet = list;
                if (list && list.length > 0) {
                    listToSet = list.filter(function(f) { return mesDeFecha(f.fecha) === mesFiltro; });
                }
                if (listToSet && listToSet.length > 0) setFilas(listToSet);
                else setFilas([primeraFila]);
                renderTabla();
                document.getElementById('btn-agregar').disabled = false;
            });
        } else {
            setFilas([primeraFila]);
            renderTabla();
            document.getElementById('btn-agregar').disabled = false;
        }
        this.value = '';
    });

    document.getElementById('btn-agregar').addEventListener('click', function() {
        if (getFilas().length === 0) {
            mostrarAviso('Seleccione primero un practicante.', 'warning');
            return;
        }
        agregarFila(null);
    });

    document.getElementById('btn-export-pdf').addEventListener('click', exportarPDF);
    var btnGuardar = document.getElementById('btn-guardar');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarEnServidor);
    var btnLimpiar = document.getElementById('btn-limpiar-tabla');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarTabla);

    init();
})();
