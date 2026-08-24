// This is a Capacitor mobile app — its WebView requests originate from
// capacitor://localhost (Android/iOS) or http(s)://localhost, never a
// browser origin, and native fetch calls typically omit Origin entirely.
// Reflect the Origin only when it's one of these known app origins instead
// of allowing "*".
const ALLOWED_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost'];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? req.headers.get('origin');
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
