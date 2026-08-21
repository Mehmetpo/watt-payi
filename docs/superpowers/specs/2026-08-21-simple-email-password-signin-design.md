# Basit E-posta + Şifre ile Giriş — Tasarım

**Tarih:** 2026-08-21
**Durum:** Onaylandı

## Bağlam

Mevcut giriş akışı Supabase magic link kullanıyordu: kullanıcı e-postasını girer, gelen linke
tıklayınca `com.mehmetcebe.wattpayi://login-callback` custom scheme'iyle uygulama açılır,
`AuthContext` içindeki bir `appUrlOpen` dinleyicisi bu URL'den access/refresh token'ları
çıkarıp session kurar.

Bu akış mobilde kırılgan: bazı e-posta istemcileri linki önizleme için "prefetch" ediyor
(linki tüketiyor), bazı cihazlarda custom scheme routing tutarsız çalışıyor, kullanıcı linke
tıklayınca bazen tarayıcıya düşüyor. Release-prep'in (signing/keystore) yeni tamamlanmış
olması ve gerçek cihazda test ihtiyacı bu sorunu öne çıkardı.

Hedef: giriş akışını, deep-link'e hiç ihtiyaç duymayan, tek ekranda hemen tamamlanabilen bir
e-posta + şifre akışına indirmek.

## Kapsam

- Tek form: e-posta + şifre, tek "Giriş yap" butonu.
- Ayrı bir "kayıt ol" ekranı/sekmesi yok. Hesap yoksa otomatik oluşturulur.
- Şifremi unuttum / şifre sıfırlama **yok** (kullanıcı kararı — deep-link'i tamamen dışarıda
  tutmak için bilinçli olarak kapsam dışı bırakıldı).
- E-posta doğrulama (confirm email) akışı **yok** — Supabase projesinde bu ayar zaten kapalı,
  yani `signUp` çağrısı doğrudan aktif bir session döner.

## Giriş/kayıt mantığı

Tek submit handler, kullanıcıya "giriş mi kayıt mı" sorulmadan:

1. `supabase.auth.signInWithPassword({ email, password })` denenir.
2. Başarılıysa: session `onAuthStateChange` üzerinden zaten yakalanıyor, ekstra bir şey
   yapmaya gerek yok.
3. Başarısızsa (yanlış şifre ve "hesap yok" durumu Supabase'de aynı hatayı döndürüyor):
   otomatik olarak `supabase.auth.signUp({ email, password })` denenir.
   - Hesap yeni ise: e-posta doğrulama kapalı olduğu için `signUp` doğrudan bir `session`
     döner → kullanıcı otomatik giriş yapmış olur.
   - Hesap zaten varsa (yani kullanıcı yanlış şifre girmiş): `signUp` session döndürmez
     (Supabase bu durumu enumeration'ı önlemek için sessizce no-op yapar ya da hata döner —
     ikisi de session'sız sonuçlanır) → "E-posta veya şifre hatalı." hatası gösterilir.

Bu mantık, Supabase'in tam olarak "zaten kayıtlı" durumunu hatayla mı yoksa sessiz no-op ile
mi bildirdiğine bakılmaksızın çalışır: her iki durumda da `session` yoksa hata gösterilir.

## Değişecek dosyalar

### `src/screens/auth/LoginScreen.tsx`
- Magic-link `sendMagicLink` handler'ı yukarıdaki iki adımlı `signInWithPassword` →
  fallback `signUp` mantığıyla değiştirilir.
- `sent` state'i ve "e-postana link gönderdik" UI bloğu tamamen kaldırılır (artık hiçbir
  akış e-posta beklemiyor).
- E-posta input'unun altına aynı stilde (`login-input-wrap`, ikonlu) bir şifre input'u
  eklenir — Mail ikonu yerine `lucide-react`'ten `Lock` ikonu, `type="password"`.
- Buton metni "Giriş yap" / busy durumunda "Giriş yapılıyor...".

### `src/screens/auth/LoginScreen.css`
- `.login-sent` ve `login-mail-pulse` keyframe'i kaldırılır (kullanılmayan CSS).

### `src/contexts/AuthContext.tsx`
- `import { App as CapacitorApp } from '@capacitor/app'` kaldırılır.
- `appUrlOpen` dinleyicisi ve `listenerHandle` cleanup'ı tamamen kaldırılır.
- `useEffect` sadece `getSession()` + `onAuthStateChange` aboneliğini içerecek şekilde
  sadeleşir.

## Hata durumları

- Boş/geçersiz e-posta: mevcut HTML5 `required`/`type="email"` validasyonu yeterli.
- Kısa şifre (Supabase varsayılan min. 6 karakter): Supabase'den dönen hata genel
  "E-posta veya şifre hatalı." mesajıyla gösterilir (kullanıcıya Supabase'in ham hata
  metnini göstermiyoruz, mevcut davranışla tutarlı).
- Ağ hatası: aynı genel hata mesajı.

## Test planı

- `npm run dev` ile web önizlemesinde: (a) yeni bir e-posta ile giriş → otomatik hesap
  oluşturup içeri alması, (b) doğru şifreyle tekrar giriş, (c) yanlış şifreyle hata mesajı
  görünmesi.
- Gerçek Android cihazda deep-link'e hiç ihtiyaç duyulmadığının doğrulanması (opsiyonel,
  önceki release-prep sürecinde zaten kurulu).
