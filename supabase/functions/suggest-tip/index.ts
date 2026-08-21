import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TipRequest {
  deviceName: string;
  watt: number;
  hoursPerWeek: number;
  calibratedTl: number;
  pctShare: number;
}

serve(async (req) => {
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

  const body: TipRequest = await req.json();
  const { deviceName, watt, hoursPerWeek, calibratedTl, pctShare } = body;
  if (!deviceName || typeof watt !== 'number' || typeof hoursPerWeek !== 'number') {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: CORS_HEADERS });
  }

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
            `Bir Türk hane, bu ayki elektrik faturasının en büyük payını "${deviceName}" cihazından harcamış: ` +
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
