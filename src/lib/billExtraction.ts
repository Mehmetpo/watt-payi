import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from './supabaseClient';

export interface ExtractedBillFields {
  toplam_tutar: number | null;
  birim_fiyat: number | null;
  kwh: number | null;
  donem_baslangic: string | null;
  donem_bitis: string | null;
}

export async function captureBillPhoto(): Promise<{ base64: string; mediaType: string } | null> {
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
    quality: 80,
  });
  if (!photo.base64String) return null;
  const mediaType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
  return { base64: photo.base64String, mediaType };
}

export async function extractBillFromPhoto(base64: string, mediaType: string): Promise<ExtractedBillFields> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('not_authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-bill`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ imageBase64: base64, mediaType }),
  });

  if (!res.ok) throw new Error('extract_failed');
  return res.json();
}
