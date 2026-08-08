export default {
  async fetch(request, env) {
    // Read SUPABASE_URL from worker env or fallback to placeholder
    const SUPABASE_URL = env?.SUPABASE_URL || (typeof globalThis !== 'undefined' && globalThis.SUPABASE_URL) || 'https://lhmrvpvbhymtqqkyystr.supabase.co';
    return new Response(JSON.stringify({ ok: true, supabase: SUPABASE_URL }), {
      headers: { 'content-type': 'application/json' },
    });
  }
};
