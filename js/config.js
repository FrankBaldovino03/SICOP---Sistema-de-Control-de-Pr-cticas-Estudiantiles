/**
 * SICOP - Configuración (Supabase y opciones).
 * Clave anon: Project Settings → API → anon public (cópiala y pégala abajo).
 */
var SICOP_CONFIG = {
    SUPABASE_URL: 'https://rkgqvsgclduacdoazhja.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_iK5_9NawcldNHRSUnOlKnQ_DLk11iD8',

    // Si está vacío, la app usará solo localStorage (sin base de datos).
    get useSupabase() {
        var url = (this.SUPABASE_URL || '').trim();
        var key = (this.SUPABASE_ANON_KEY || '').trim();
        return url.length > 0 && key.length > 0;
    }
};
