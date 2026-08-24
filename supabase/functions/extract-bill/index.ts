import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedBill {
  toplam_tutar: number | null;
  birim_fiyat: number | null;
  kwh: number | null;
  donem_baslangic: string | null;
  donem_bitis: string | null;
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

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64 || !mediaType) {
    return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers: CORS_HEADERS });
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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            {
              type: 'text',
              text:
                'Bu bir Türkiye elektrik faturası fotoğrafı. Şu alanları JSON olarak çıkar: ' +
                '{"toplam_tutar": number|null, "birim_fiyat": number|null, "kwh": number|null, ' +
                '"donem_baslangic": "YYYY-MM-DD"|null, "donem_bitis": "YYYY-MM-DD"|null}. ' +
                'Emin olmadığın alanı null bırak. Sadece JSON döndür, başka metin ekleme.',
            },
          ],
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'vision_request_failed', detail }), { status: 502, headers: CORS_HEADERS });
  }

  const anthropicJson = await anthropicRes.json();
  const rawText: string = anthropicJson.content?.[0]?.text ?? '{}';

  let extracted: ExtractedBill;
  try {
    extracted = JSON.parse(rawText);
  } catch {
    return new Response(JSON.stringify({ error: 'parse_failed', raw: rawText }), { status: 502, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify(extracted), {
    status: 200,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
});
