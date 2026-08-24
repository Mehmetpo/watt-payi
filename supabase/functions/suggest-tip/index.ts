import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, checkIpRateLimit, getClientIp } from '../_shared/rateLimit.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Normal usage is roughly one bill (and its device tips) per month; 20/day
// per user leaves generous headroom for retries while still capping the
// Anthropic spend a stolen/abused token could run up.
const DAILY_LIMIT = 20;
// Coarser per-IP cap so one IP can't multiply past DAILY_LIMIT by creating
// many accounts. Sized to tolerate a handful of real users behind one NAT.
const IP_DAILY_LIMIT = 100;
// Real device names are short; this also bounds how much user-controlled
// text gets interpolated into the Anthropic prompt.
const MAX_DEVICE_NAME_LENGTH = 60;

interface TipRequest {
  deviceName: string;
  watt: number;
  hoursPerWeek: number;
  calibratedTl: number;
  pctShare: number;
}

serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing_auth' }), { status: 401, headers: CORS_HEADERS });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: CORS_HEADERS });
  }

  const allowed = await checkRateLimit(supabase, userData.user.id, 'suggest-tip', DAILY_LIMIT);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const ipAllowed = await checkIpRateLimit(supabase, getClientIp(req), 'suggest-tip', IP_DAILY_LIMIT);
  if (!ipAllowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const body: TipRequest = await req.json();
  const { deviceName, watt, hoursPerWeek, calibratedTl, pctShare } = body;
  if (!deviceName || typeof watt !== 'number' || typeof hoursPerWeek !== 'number') {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: CORS_HEADERS });
  }
  if (typeof deviceName !== 'string' || deviceName.length > MAX_DEVICE_NAME_LENGTH) {
    return new Response(JSON.stringify({ error: 'invalid_device_name' }), { status: 400, headers: CORS_HEADERS });
  }
  // Strip newlines/control chars so the value can't break out of its
  // sentence in the prompt and inject instructions of its own.
  const sanitizedDeviceName = deviceName.replace(/[\r\n\t]+/g, ' ').trim();

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content:
            `Bir Türk hane, bu ayki elektrik faturasının en büyük payını "${sanitizedDeviceName}" cihazından harcamış: ` +
            `${watt}W, haftada ${hoursPerWeek.toFixed(1)} saat kullanılmış, faturanın %${pctShare.toFixed(0)}'i (${calibratedTl.toFixed(0)} TL) bu cihaza ait. ` +
            'Kullanıcıya bu cihaz için 1-2 cümlelik, samimi, somut ve pratik uygulanabilir bir tasarruf önerisi yaz. ' +
            'Türkçe yaz. Kesin/uydurma TL veya % rakamı verme (gerçek veriyi bilmiyorsun), ama "yaklaşık" gibi kalifiye ifadelerle kabaca bir fayda belirtebilirsin. ' +
            'Sadece öneri metnini döndür, başka açıklama, tırnak işareti veya başlık ekleme.',
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'tip_request_failed', detail }), { status: 502, headers: CORS_HEADERS });
  }

  const anthropicJson = await anthropicRes.json();
  const tip: string = (anthropicJson.content?.[0]?.text ?? '').trim();

  if (!tip) {
    return new Response(JSON.stringify({ error: 'empty_tip' }), { status: 502, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ tip }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
});
