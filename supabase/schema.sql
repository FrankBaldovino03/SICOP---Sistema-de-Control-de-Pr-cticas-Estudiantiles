-- ============================================================
-- SICOP - Sistema de Control de Prácticas
-- Esquema de base de datos para Supabase
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensión UUID (ya viene en Supabase)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. TABLA: empresas
-- Empresas que usan el sistema (registro e inicio con NIT/correo y contraseña).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social text NOT NULL,
    nit text NOT NULL UNIQUE,
    sector text,
    nombre_responsable text,
    correo text,
    password_hash text NOT NULL,
    direccion text,
    telefono text,
    plan text NOT NULL DEFAULT 'gratis' CHECK (plan IN ('gratis', 'plus', 'premium')),
    fecha_registro timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.empresas IS 'Empresas registradas en SICOP (login con NIT/correo y contraseña)';
COMMENT ON COLUMN public.empresas.plan IS 'gratis: 2 practicantes; plus/premium: según plan';

-- Índices empresas
CREATE INDEX IF NOT EXISTS idx_empresas_nit ON public.empresas (nit);
CREATE INDEX IF NOT EXISTS idx_empresas_correo ON public.empresas (lower(trim(correo))) WHERE correo IS NOT NULL AND correo <> '';

-- ------------------------------------------------------------
-- 2. TABLA: practicantes
-- Practicantes: pueden auto-registrarse (empresa_id NULL) o ser dados de alta por una empresa.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practicantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
    nombre text NOT NULL,
    cedula text NOT NULL,
    correo text NOT NULL,
    institucion text NOT NULL,
    programa text NOT NULL,
    semestre smallint CHECK (semestre >= 1 AND semestre <= 12),
    fecha_inicio date,
    fecha_fin date,
    jefe_inmediato text,
    password_hash text,
    fecha_registro timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (correo),
    UNIQUE (cedula)
);

COMMENT ON TABLE public.practicantes IS 'Practicantes: auto-registro (empresa_id NULL) o asignados a una empresa';
COMMENT ON COLUMN public.practicantes.empresa_id IS 'NULL si se registró desde la página de practicantes; no NULL si lo dio de alta la empresa';
COMMENT ON COLUMN public.practicantes.password_hash IS 'Obligatorio si puede iniciar sesión como practicante; opcional si solo lo gestiona la empresa';

-- Índices practicantes
CREATE INDEX IF NOT EXISTS idx_practicantes_empresa_id ON public.practicantes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_practicantes_correo ON public.practicantes (lower(trim(correo)));
CREATE INDEX IF NOT EXISTS idx_practicantes_cedula ON public.practicantes (cedula);

-- ------------------------------------------------------------
-- 3. TABLA: control_practicas
-- Registro diario de asistencia/horas (mañana y tarde) por practicante.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.control_practicas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    practicante_id uuid NOT NULL REFERENCES public.practicantes (id) ON DELETE CASCADE,
    fecha date NOT NULL,
    nombre text,
    cedula text,
    hora_entrada_manana time,
    hora_salida_manana time,
    hora_entrada_tarde time,
    hora_salida_tarde time,
    jefe_inmediato text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (practicante_id, fecha)
);

COMMENT ON TABLE public.control_practicas IS 'Una fila por día por practicante: horarios mañana/tarde y jefe inmediato';
COMMENT ON COLUMN public.control_practicas.nombre IS 'Denormalizado para export PDF/listado';
COMMENT ON COLUMN public.control_practicas.cedula IS 'Denormalizado para export PDF/listado';

-- Índices control_practicas
CREATE INDEX IF NOT EXISTS idx_control_practicas_practicante_id ON public.control_practicas (practicante_id);
CREATE INDEX IF NOT EXISTS idx_control_practicas_fecha ON public.control_practicas (fecha);

-- ------------------------------------------------------------
-- 4. Trigger: updated_at
-- Actualizar updated_at en cambios.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_practicantes_updated_at ON public.practicantes;
CREATE TRIGGER trg_practicantes_updated_at
    BEFORE UPDATE ON public.practicantes
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_control_practicas_updated_at ON public.control_practicas;
CREATE TRIGGER trg_control_practicas_updated_at
    BEFORE UPDATE ON public.control_practicas
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- Descomenta y ajusta cuando integres Supabase Auth.
-- Por ahora las políticas permiten todo para el rol anon/service_role.
-- ------------------------------------------------------------
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_practicas ENABLE ROW LEVEL SECURITY;

-- Políticas por defecto: permitir todo al service_role (backend/API)
-- En producción deberías restringir por auth.uid() o por empresa_id.

CREATE POLICY "Permitir todo a service_role"
    ON public.empresas FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir todo a service_role"
    ON public.practicantes FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir todo a service_role"
    ON public.control_practicas FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Necesario para la app en el navegador (usa la clave anon)
CREATE POLICY "Permitir anon empresas"
    ON public.empresas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir anon practicantes"
    ON public.practicantes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir anon control"
    ON public.control_practicas FOR ALL TO anon USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 6. Vista útil: practicantes con datos de empresa
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_practicantes_con_empresa AS
SELECT
    p.id,
    p.empresa_id,
    p.nombre,
    p.cedula,
    p.correo,
    p.institucion,
    p.programa,
    p.semestre,
    p.fecha_inicio,
    p.fecha_fin,
    p.jefe_inmediato,
    p.fecha_registro,
    e.razon_social AS empresa_razon_social,
    e.nit AS empresa_nit
FROM public.practicantes p
LEFT JOIN public.empresas e ON e.id = p.empresa_id;

-- ------------------------------------------------------------
-- 7. Función: total horas por día (control_practicas)
-- Útil para reportes.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.horas_por_dia(
    p_hora_entrada_manana time,
    p_hora_salida_manana time,
    p_hora_entrada_tarde time,
    p_hora_salida_tarde time
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    h_manana numeric := 0;
    h_tarde numeric := 0;
BEGIN
    IF p_hora_entrada_manana IS NOT NULL AND p_hora_salida_manana IS NOT NULL THEN
        h_manana := EXTRACT(EPOCH FROM (p_hora_salida_manana - p_hora_entrada_manana)) / 3600;
    END IF;
    IF p_hora_entrada_tarde IS NOT NULL AND p_hora_salida_tarde IS NOT NULL THEN
        h_tarde := EXTRACT(EPOCH FROM (p_hora_salida_tarde - p_hora_entrada_tarde)) / 3600;
    END IF;
    RETURN GREATEST(0, h_manana) + GREATEST(0, h_tarde);
END;
$$;

COMMENT ON FUNCTION public.horas_por_dia IS 'Calcula horas totales del día (mañana + tarde) para una fila de control_practicas';
