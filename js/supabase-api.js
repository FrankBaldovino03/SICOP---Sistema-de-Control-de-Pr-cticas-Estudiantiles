/**
 * SICOP - Integración con Supabase.
 * Proporciona SICOP_API (getPracticantes, savePracticante, saveControlFilas, getControlFilas)
 * y sicopSupabase (login/register empresa y practicante) cuando config está definido.
 */
(function() {
    if (typeof SICOP_CONFIG === 'undefined' || !SICOP_CONFIG.useSupabase) return;

    var supabase = null;
    try {
        supabase = window.supabase.createClient(SICOP_CONFIG.SUPABASE_URL, SICOP_CONFIG.SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn('SICOP: No se pudo crear el cliente Supabase.', e);
        return;
    }

    function hashPassword(plain) {
        return new Promise(function(resolve, reject) {
            try {
                var enc = new TextEncoder();
                crypto.subtle.digest('SHA-256', enc.encode(plain)).then(function(buf) {
                    var arr = new Uint8Array(buf);
                    var hex = '';
                    for (var i = 0; i < arr.length; i++) hex += ('0' + arr[i].toString(16)).slice(-2);
                    resolve(hex);
                }).catch(reject);
            } catch (err) { reject(err); }
        });
    }

    function rowToEmpresa(row) {
        if (!row) return null;
        return {
            id: row.id,
            razonSocial: row.razon_social,
            nit: row.nit,
            sector: row.sector || '',
            nombreResponsable: row.nombre_responsable || '',
            correo: row.correo || '',
            password: '', // no exponer
            direccion: row.direccion || '',
            telefono: row.telefono || '',
            plan: row.plan || 'gratis',
            fechaRegistro: row.fecha_registro
        };
    }

    function rowToPracticante(row) {
        if (!row) return null;
        return {
            id: row.id,
            empresa_id: row.empresa_id,
            nombre: row.nombre,
            cedula: row.cedula,
            documento: row.cedula,
            correo: row.correo,
            institucion: row.institucion,
            programa: row.programa,
            carrera: row.programa,
            semestre: row.semestre,
            fecha_inicio: row.fecha_inicio,
            fecha_fin: row.fecha_fin,
            fechaInicio: row.fecha_inicio,
            fechaFin: row.fecha_fin,
            jefe_inmediato: row.jefe_inmediato || '',
            jefeInmediato: row.jefe_inmediato || '',
            fechaRegistro: row.fecha_registro
        };
    }

    function controlRowToFila(row) {
        if (!row) return null;
        return {
            id: row.id,
            practicante_id: row.practicante_id,
            fecha: row.fecha,
            nombre: row.nombre || '',
            cedula: row.cedula || '',
            horaEntradaManana: row.hora_entrada_manana ? (String(row.hora_entrada_manana).slice(0, 5)) : '',
            horaSalidaManana: row.hora_salida_manana ? (String(row.hora_salida_manana).slice(0, 5)) : '',
            horaEntradaTarde: row.hora_entrada_tarde ? (String(row.hora_entrada_tarde).slice(0, 5)) : '',
            horaSalidaTarde: row.hora_salida_tarde ? (String(row.hora_salida_tarde).slice(0, 5)) : '',
            jefeInmediato: row.jefe_inmediato || ''
        };
    }

    window.sicopSupabase = {
        hashPassword: hashPassword,

        loginEmpresa: function(nit, password) {
            nit = (nit || '').trim();
            return hashPassword(password || '').then(function(hash) {
                return supabase.from('empresas').select('*').eq('nit', nit).then(function(res) {
                    if (res.error) return { data: [] };
                    if (res.data && res.data.length > 0) return res;
                    return supabase.from('empresas').select('*').ilike('correo', nit);
                }).then(function(res) {
                    if (!res.data || res.data.length === 0) return null;
                    var list = res.data;
                    for (var i = 0; i < list.length; i++) {
                        if ((list[i].password_hash || '') === hash) return rowToEmpresa(list[i]);
                    }
                    return null;
                });
            });
        },

        registerEmpresa: function(datos) {
            return hashPassword(datos.password || '').then(function(password_hash) {
                var row = {
                    razon_social: (datos.razonSocial || datos.nombreEmpresa || '').trim(),
                    nit: (datos.nit || '').trim(),
                    sector: (datos.sector || '').trim() || null,
                    nombre_responsable: (datos.nombreResponsable || '').trim() || null,
                    correo: (datos.correo || '').trim() || null,
                    password_hash: password_hash,
                    direccion: (datos.direccion || '').trim() || null,
                    telefono: (datos.telefono || '').trim() || null,
                    plan: (datos.plan || 'gratis').toLowerCase()
                };
                return supabase.from('empresas').insert(row).select('*').single();
            }).then(function(res) {
                if (res.error) throw new Error(res.error.message || 'Error al registrar empresa');
                return rowToEmpresa(res.data);
            });
        },

        loginPracticante: function(cedulaOCorreo, password) {
            var cedula = (cedulaOCorreo || '').trim();
            var key = cedula.toLowerCase();
            return hashPassword(password || '').then(function(hash) {
                return supabase.from('practicantes').select('*').eq('cedula', cedula).then(function(res) {
                    if (res.error) return { data: [] };
                    if (res.data && res.data.length > 0) return res;
                    return supabase.from('practicantes').select('*').ilike('correo', key);
                }).then(function(res) {
                    if (!res.data || res.data.length === 0) return null;
                    var list = res.data;
                    for (var i = 0; i < list.length; i++) {
                        if ((list[i].password_hash || '') === hash) return rowToPracticante(list[i]);
                    }
                    return null;
                });
            });
        },

        registerPracticante: function(datos) {
            return hashPassword(datos.password || '').then(function(password_hash) {
                var row = {
                    empresa_id: null,
                    nombre: (datos.nombre || '').trim(),
                    cedula: (datos.cedula || datos.documento || '').trim(),
                    correo: (datos.correo || '').trim(),
                    institucion: (datos.institucion || '').trim(),
                    programa: (datos.programa || '').trim(),
                    semestre: datos.semestre ? parseInt(datos.semestre, 10) : null,
                    fecha_inicio: null,
                    fecha_fin: null,
                    jefe_inmediato: null,
                    password_hash: password_hash
                };
                return supabase.from('practicantes').insert(row).select('*').single();
            }).then(function(res) {
                if (res.error) throw new Error(res.error.message || 'Error al registrar practicante');
                return rowToPracticante(res.data);
            });
        },

        getPracticantesByEmpresa: function(empresaId) {
            if (!empresaId) return Promise.resolve([]);
            return supabase.from('practicantes').select('*').eq('empresa_id', empresaId).order('nombre').then(function(res) {
                if (res.error) return [];
                return (res.data || []).map(rowToPracticante);
            });
        },

        updatePracticanteAsignacion: function(practicanteId, datos) {
            var row = {
                fecha_inicio: (datos.fecha_inicio || datos.fechaInicio || '').trim() || null,
                fecha_fin: (datos.fecha_fin || datos.fechaFin || '').trim() || null,
                jefe_inmediato: (datos.jefe_inmediato || datos.jefeInmediato || '').trim() || null
            };
            return supabase.from('practicantes').update(row).eq('id', practicanteId).select('*').single().then(function(res) {
                if (res.error) throw new Error(res.error.message || 'Error al actualizar');
                return rowToPracticante(res.data);
            });
        },

        addPracticanteByEmpresa: function(empresaId, p) {
            var row = {
                empresa_id: empresaId,
                nombre: (p.nombre || '').trim(),
                cedula: (p.documento || p.cedula || '').trim(),
                correo: (p.email || p.correo || '').trim(),
                institucion: (p.institucion || '').trim(),
                programa: (p.carrera || p.programa || '').trim(),
                semestre: p.semestre ? parseInt(p.semestre, 10) : null,
                fecha_inicio: (p.fecha_inicio || p.fechaInicio || '') || null,
                fecha_fin: (p.fecha_fin || p.fechaFin || '') || null,
                jefe_inmediato: (p.jefe_inmediato || p.jefeInmediato || '').trim() || null,
                password_hash: ''
            };
            return supabase.from('practicantes').insert(row).select('*').single().then(function(res) {
                if (res.error) throw new Error(res.error.message || 'Error al guardar practicante');
                return rowToPracticante(res.data);
            });
        },

        getControlFilas: function(practicanteId) {
            if (!practicanteId) return Promise.resolve([]);
            return supabase.from('control_practicas').select('*').eq('practicante_id', practicanteId).order('fecha').then(function(res) {
                if (res.error) return [];
                return (res.data || []).map(controlRowToFila);
            });
        },

        fechaDMAaYYYYMMDD: function(fechaStr) {
            var s = (fechaStr || '').trim().replace(/\//g, '-');
            var part = s.split('-');
            if (part.length !== 3) return fechaStr;
            if (part[0].length === 4) return part[0] + '-' + (part[1].length === 1 ? '0' + part[1] : part[1]) + '-' + (part[2].length === 1 ? '0' + part[2] : part[2].split('T')[0]);
            return part[2] + '-' + (part[1].length === 1 ? '0' + part[1] : part[1]) + '-' + (part[0].length === 1 ? '0' + part[0] : part[0]);
        },
        saveControlFilas: function(practicanteId, filas, callback) {
            callback = callback || function() {};
            if (!practicanteId) { callback(null); return; }
            var self = this;
            var rows = (filas || []).filter(function(f) { return (f.fecha || '').trim() !== ''; }).map(function(f) {
                return {
                    practicante_id: practicanteId,
                    fecha: self.fechaDMAaYYYYMMDD(f.fecha),
                    nombre: (f.nombre || '').trim() || null,
                    cedula: (f.cedula || '').trim() || null,
                    hora_entrada_manana: (f.horaEntradaManana || '').trim() || null,
                    hora_salida_manana: (f.horaSalidaManana || '').trim() || null,
                    hora_entrada_tarde: (f.horaEntradaTarde || '').trim() || null,
                    hora_salida_tarde: (f.horaSalidaTarde || '').trim() || null,
                    jefe_inmediato: (f.jefeInmediato || '').trim() || null
                };
            });
            if (rows.length === 0) {
                supabase.from('control_practicas').delete().eq('practicante_id', practicanteId).then(function(res) { callback(res.error || null); });
                return;
            }
            supabase.from('control_practicas').upsert(rows, { onConflict: 'practicante_id,fecha' }).then(function(res) {
                callback(res.error || null);
            });
        }
    };

    var STORAGE_KEY_PRACTICANTES = 'sicop_practicantes_';
    var STORAGE_KEY_EMPRESA = 'sicop_empresa';

    window.SICOP_API = {
        getPracticantes: function(callback) {
            callback = callback || function() {};
            var empresa = typeof getEmpresa === 'function' ? getEmpresa() : null;
            var practicante = typeof getPracticanteActual === 'function' ? getPracticanteActual() : null;
            if (practicante) {
                callback(null, [rowToPracticante({ id: practicante.id, nombre: practicante.nombre, cedula: practicante.cedula || practicante.documento, correo: practicante.correo, institucion: practicante.institucion, programa: practicante.programa, semestre: practicante.semestre, fecha_inicio: practicante.fecha_inicio, fecha_fin: practicante.fecha_fin, jefe_inmediato: practicante.jefe_inmediato })]);
                return;
            }
            if (!empresa || !empresa.id) {
                callback(null, []);
                return;
            }
            sicopSupabase.getPracticantesByEmpresa(empresa.id).then(function(lista) {
                try { localStorage.setItem(STORAGE_KEY_PRACTICANTES + empresa.id, JSON.stringify(lista)); } catch (e) {}
                callback(null, lista);
            }).catch(function(err) { callback(err || new Error('Error al cargar practicantes'), []); });
        },

        savePracticante: function(p, callback) {
            callback = callback || function() {};
            var empresa = typeof getEmpresa === 'function' ? getEmpresa() : null;
            if (!empresa || !empresa.id) { callback(new Error('No hay empresa en sesión')); return; }
            sicopSupabase.addPracticanteByEmpresa(empresa.id, p).then(function(saved) {
                var lista = [];
                try {
                    var json = localStorage.getItem(STORAGE_KEY_PRACTICANTES + empresa.id);
                    if (json) lista = JSON.parse(json);
                } catch (e) {}
                lista.push(saved);
                try { localStorage.setItem(STORAGE_KEY_PRACTICANTES + empresa.id, JSON.stringify(lista)); } catch (e) {}
                callback(null);
            }).catch(function(err) { callback(err || new Error('Error al guardar practicante')); });
        },

        getControlFilas: function(practicanteId, callback) {
            callback = callback || function() {};
            if (!practicanteId) { callback(null, []); return; }
            sicopSupabase.getControlFilas(practicanteId).then(function(filas) {
                callback(null, filas);
            }).catch(function(err) { callback(err, []); });
        },

        saveControlFilas: function(filas, callback) {
            callback = callback || function() {};
            var practicanteId = (filas && filas[0]) ? (filas[0].practicante_id || filas[0].practicanteId) : null;
            if (!practicanteId) { callback(null); return; }
            sicopSupabase.saveControlFilas(practicanteId, filas, callback);
        },

        updatePracticanteAsignacion: function(practicanteId, datos, callback) {
            callback = callback || function() {};
            if (!practicanteId) { callback(new Error('Sin practicante')); return; }
            sicopSupabase.updatePracticanteAsignacion(practicanteId, datos).then(function(updated) {
                callback(null, updated);
            }).catch(function(err) { callback(err || new Error('Error al actualizar')); });
        }
    };
})();
