-- ============================================================
-- SICOP - Habilitar acceso para el rol anon (navegador)
-- Ejecuta este script en Supabase → SQL Editor si ves
-- "new row violates row-level security policy"
-- ============================================================

-- Empresas: permitir a anon leer (login) e insertar (registro)
DROP POLICY IF EXISTS "Permitir anon empresas" ON public.empresas;
CREATE POLICY "Permitir anon empresas"
    ON public.empresas FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Practicantes: permitir a anon leer (login) e insertar (registro y alta desde panel)
DROP POLICY IF EXISTS "Permitir anon practicantes" ON public.practicantes;
CREATE POLICY "Permitir anon practicantes"
    ON public.practicantes FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Control de prácticas: permitir a anon leer y escribir
DROP POLICY IF EXISTS "Permitir anon control" ON public.control_practicas;
CREATE POLICY "Permitir anon control"
    ON public.control_practicas FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
