# Base de datos SICOP en Supabase

Esquema SQL para montar la base de datos del **Sistema de Control de Prácticas** en [Supabase](https://supabase.com). El proyecto ya está preparado para usar esta base: solo falta ejecutar el esquema y configurar las credenciales.

## Vincular el proyecto con Supabase

1. Crea un proyecto en [Supabase](https://app.supabase.com) y ejecuta el `schema.sql` (ver más abajo).
2. En el Dashboard, ve a **Project Settings** → **API** y copia:
   - **Project URL**
   - **anon public** (clave pública)
3. En la carpeta del proyecto, abre `js/config.js` y asigna esos valores:
   - `SUPABASE_URL`: la URL del proyecto
   - `SUPABASE_ANON_KEY`: la clave anon public

Si dejas `SUPABASE_URL` y `SUPABASE_ANON_KEY` vacíos, la app sigue funcionando solo con **localStorage** (sin base de datos).

## Cómo ejecutar el esquema

1. Entra en tu proyecto en [Supabase Dashboard](https://app.supabase.com).
2. Ve a **SQL Editor** → **New query**.
3. Copia y pega todo el contenido de `schema.sql`.
4. Ejecuta el script (Run).

Si ya tienes tablas con el mismo nombre, borra o renómbralas antes, o ajusta el script (por ejemplo quitando `IF NOT EXISTS` y usando migraciones).

## Tablas

| Tabla | Descripción |
|-------|-------------|
| **empresas** | Empresas que usan SICOP. Login con NIT o correo y contraseña. Campos: razón social, NIT, sector, responsable, correo, contraseña (hash), plan (gratis/plus/premium). |
| **practicantes** | Practicantes: pueden auto-registrarse (`empresa_id` NULL) o ser dados de alta por una empresa. Incluye datos académicos y de asignación (fechas, jefe inmediato). |
| **control_practicas** | Una fila por día por practicante: fecha, horarios mañana/tarde (entrada/salida), jefe inmediato. Se usa para el “Control de prácticas” y el PDF. |

## Relaciones

- `practicantes.empresa_id` → `empresas.id` (opcional).
- `control_practicas.practicante_id` → `practicantes.id`.
- Un mismo día por practicante: `UNIQUE (practicante_id, fecha)` en `control_practicas`.

## Contraseñas

En el esquema, `empresas` y `practicantes` tienen `password_hash`. Debes:

- **Nunca** guardar contraseñas en texto plano.
- Al registrar o cambiar contraseña: hashear en el cliente o en un Edge Function (por ejemplo con bcrypt) y guardar solo el hash en `password_hash`.

Recomendación a futuro: usar **Supabase Auth** (`auth.users`) y enlazar empresas/practicantes por `auth.uid()` para no manejar contraseñas tú mismo.

## Row Level Security (RLS)

- RLS está **activado** en las tres tablas.
- Por defecto solo el rol **service_role** tiene políticas que permiten todo.
- Cuando integres Supabase Auth, puedes añadir políticas por `auth.uid()` o por `empresa_id` para que cada empresa solo vea sus practicantes y su control.

## Vista y función auxiliar

- **`v_practicantes_con_empresa`**: practicantes con razón social y NIT de la empresa (si tiene `empresa_id`).
- **`horas_por_dia(entrada_manana, salida_manana, entrada_tarde, salida_tarde)`**: calcula las horas totales del día para una fila de control (útil para reportes).

## Mapeo con tu app actual

Para conectar el frontend que usa `localStorage` con Supabase:

| App (localStorage / JS) | Supabase |
|--------------------------|----------|
| `empresas`: nit, razonSocial, correo, password, plan, etc. | `empresas`: nit, razon_social, correo, password_hash, plan |
| `practicantes`: nombre, cedula, correo, institucion, programa, semestre, fechaInicio, fechaFin, jefeInmediato | `practicantes`: nombre, cedula, correo, institucion, programa, semestre, fecha_inicio, fecha_fin, jefe_inmediato |
| Filas del control (fecha, nombre, cedula, horaEntradaManana, …) | `control_practicas`: fecha, nombre, cedula, hora_entrada_manana, hora_salida_manana, hora_entrada_tarde, hora_salida_tarde, jefe_inmediato, practicante_id |

Usa el **Supabase JavaScript client** (`@supabase/supabase-js`) para hacer `select`, `insert`, `update`, `upsert` y `delete` sobre estas tablas desde tu código.
