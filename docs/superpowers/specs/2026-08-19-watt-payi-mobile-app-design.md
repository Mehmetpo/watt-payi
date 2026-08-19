# Watt Payı — Mobil Uygulama Tasarımı

**Tarih:** 2026-08-19
**Durum:** Onaylandı, uygulama planına geçiliyor

## 1. Genel Bakış

Watt Payı, kullanıcının aylık elektrik faturasını cihaz cihaz kırılıma ayıran ve bu kırılımı zaman içinde takip eden bir mobil uygulamadır. Kullanıcı hesap açar, her ay faturasını girer (elle ya da fotoğraf çekerek), evindeki cihazları seçip haklı kullanım süresini belirtir; uygulama faturayı cihaz payına göre orantılayarak dağıtır ve geçmişe kaydeder. Zamanla "klima 3 aydır artıyor" gibi cihaz bazlı trend içgörüleri sunar.

Bu tasarım, önceden onaylanmış bir web prototipinin (Watt Payı — cihaz seçimi, kullanım girişi, kalibre edilmiş kırılım hesaplaması) mobil, hesap tabanlı ve zaman içinde takip eden bir uygulamaya dönüştürülmesini kapsar.

## 2. Mimari

### 2.1 Genel akış

```
📱 Capacitor Mobil Uygulama (Android → iOS)
   React arayüzü + hesaplama motoru (istemci tarafında, offline çalışır)
   Capacitor eklentileri: Camera, Local Notifications, Preferences
        │  Supabase JS SDK (auth + veri okuma/yazma)
        ▼
   ┌─────────────────────┬─────────────────────────┐
   │ 🔐 Supabase Auth     │ 🗄️ Supabase Postgres      │
   │ e-posta/OTP girişi   │ bills, bill_items,        │
   │                      │ user_devices (RLS ile)    │
   └─────────────────────┴─────────────────────────┘
        │
        ▼
   📊 Hesaplama motoru (istemci tarafı, sunucusuz)
   Watt × saat/hafta → kWh → faturaya orantılama
```

### 2.2 Teknoloji seçimleri

- **React + Capacitor**: web teknolojileriyle yazılıp Android/iOS'a sarılır. Aynı kod tabanı ileride web sürümüne de açık (v1 kapsamı dışı, bkz. §7).
- **Supabase**: Auth + Postgres + Storage. Kullanıcının mevcut CVAnalyze ve Flört Asistanı projelerinde kullandığı, tanıdık altyapı.
- **Platform sırası**: Android önce (Google Play süreci daha basit, hızlı test döngüsü), iOS sonra eklenir. Capacitor ikisini de aynı kod tabanından destekler.

### 2.3 Fatura fotoğrafı → otomatik doldurma

- Kullanıcı **Capacitor Camera** ile fotoğraf çeker veya galeriden seçer.
- Fotoğraf bir **Supabase Edge Function**'a yüklenir; bu fonksiyon **Claude Vision API**'yi çağırıp fatura görselinden yapılandırılmış JSON çıkarır: `{ toplam_tutar, birim_fiyat, kwh, donem_baslangic, donem_bitis }`.
- Claude Vision seçildi çünkü Türkiye'deki farklı dağıtım şirketlerinin (BEDAŞ, TEDAŞ, AYEDAŞ vb.) birbirinden çok farklı fatura formatlarına, sabit regex/OCR kuralları yazmadan uyum sağlıyor.
- Çıkan alanlar "Fatura" adımındaki form alanlarını otomatik doldurur; kullanıcı onaylar ya da düzeltir — **hiçbir alan kullanıcı onayı olmadan sessizce kaydedilmez**.
- API anahtarı yalnızca Edge Function'da tutulur, mobil istemciye hiçbir şekilde gömülmez.
- **Hata durumu**: Claude Vision tutarı güvenle okuyamazsa (bulanık fotoğraf, tanınmayan format), alanlar boş bırakılır ve kullanıcıya "Tutarı okuyamadık, elle girebilir misin?" mesajı gösterilir — akış asla kilitlenmez, manuel girişe her zaman geri dönülebilir.

## 3. Ekranlar & Akış

Gezinme: alt sekmeli dashboard yapısı.

| Sekme | İçerik |
|---|---|
| **Ana Sayfa** | Bu ayın toplamı + donut grafik, geçen aya göre % değişim, son 6 ay trend çizgisi |
| **Ekle** (+) | 4 adımlı akış: Fatura (foto çek/elle gir) → Cihazlar → Kullanım → Sonuç (kaydet) |
| **Geçmiş** | Aylık liste; satıra dokununca o ayın kırılımı; cihaz bazlı trend görünümü |
| **Profil** | Hesap/çıkış, hatırlatma günü ayarı, varsayılan cihaz/watt listesini düzenleme |

"Ekle" akışının ilk 3 adımı (Fatura, Cihazlar, Kullanım) doğrudan onaylanmış web prototipinin akışına dayanır; fark, adım 1'e fotoğraf çekme seçeneğinin eklenmesi ve sonucun artık `bills`/`bill_items` tablolarına kaydedilmesidir.

## 4. Veri Modeli (Supabase)

| Tablo | Amaç |
|---|---|
| `profiles` | Kullanıcı ayarları (hatırlatma günü vb.), `auth.users`'a 1:1 bağlı |
| `devices_catalog` | Genel cihaz kataloğu (buzdolabı, klima, tost makinesi...) — varsayılan watt/ikon, herkese açık okuma |
| `user_devices` | Kullanıcının kendi cihaz listesi + düzenlediği watt değerleri, özel cihaz ekleme desteği |
| `bills` | Ay başına bir kayıt — `total_tl`, `rate_tl_per_kwh`, `photo_url` (Storage), `period_month` |
| `bill_items` | Her faturanın cihaz kırılımı — `watt`, `hours_per_week`, `monthly_kwh_raw`, `calibrated_tl`, `pct_share` |

- **Row Level Security**: `devices_catalog` hariç tüm tablolar `auth.uid() = user_id` ile kilitli.
- **Storage**: `bill-photos` bucket'ında kullanıcı bazlı klasörleme (`{user_id}/{bill_id}.jpg`); fotoğraf hem kanıt hem de gerektiğinde tekrar bakmak için saklanır.

## 5. Hesaplama Motoru

Web prototipindeki mantık aynen taşınır, saf bir fonksiyon olarak (framework/UI'dan bağımsız, birim test edilebilir):

1. Her cihaz için `aylık_kWh = (watt / 1000) × saat_hafta × 4.345`
2. Tüm seçili cihazların `aylık_kWh` toplamı → `hesaplanan_toplam_kWh`
3. Faturadan gelen `ima_edilen_kWh = fatura_tl / birim_fiyat`
4. Her cihazın nihai TL payı, faturanın tam tutarına orantılanarak bulunur: `cihaz_tl = (cihaz_kWh / hesaplanan_toplam_kWh) × fatura_tl`
5. `hesaplanan_toplam_kWh` ile `ima_edilen_kWh` oranı, kullanıcıya "girdiğin süreler faturanın %X'i kadar" içgörüsünü üretmek için kullanılır (bkz. prototipteki uyarı mantığı).

Bu fonksiyon Supabase'den bağımsızdır — hem `bill_items` kaydı oluşturulmadan önce anlık önizleme için, hem de offline modda çalışır.

## 6. Görsel Tasarım Sistemi — "Enerji Canlı"

- **Renkler**: açık zemin `#FAFAFC`, beyaz kart yüzeyi, ana metin `#191A23`; **indigo `#6D5EF0`** birincil vurgu (CTA/seçili durum), **mercan `#FF5D5D`** yüksek tüketim uyarısı, **yeşil `#2BC5A0`** tasarruf/düşüş — semantik renkler vurgu renginden ayrı tutulur.
- **Tipografi**: başlıklarda **Manrope** (700-800), gövde metinde **Plus Jakarta Sans**, TL/kWh gibi rakamlarda **IBM Plex Mono** (tablo hizalı, sayaç okuması hissi).
- **Şekil dili**: yuvarlak köşeli kartlar, yumuşak gölgeler, büyük dokunmatik hedefler.
- Sistem temasına (açık/koyu) otomatik uyum sağlanır; ekstra bir "koyu tema" anahtarı v1'de yok.

## 7. Bildirimler

Capacitor **Local Notifications** ile, kullanıcının Profil'de seçtiği günde ("her ayın 5'i" gibi) yerel bildirim planlanır — sunucu/cron altyapısı gerekmez, cihazın kendi bildirim sistemi kullanılır. Bildirime dokununca doğrudan "Ekle" akışı açılır.

## 8. Test Yaklaşımı

- **Hesaplama motoru**: framework'ten bağımsız saf fonksiyon olduğu için birim testlerle kapsanır (bilinen watt/saat girişleri → beklenen TL/kWh çıktıları, kalibrasyon oranı sınır durumları: 0 cihaz seçili, hesaplanan tüketim faturadan çok düşük/yüksek).
- **Fatura fotoğrafı akışı**: Edge Function için örnek fatura görselleriyle entegrasyon testi (farklı dağıtım şirketi formatları); okuma başarısız olduğunda manuel girişe düşen yol elle test edilir.
- **Ekranlar**: Android cihaz/emülatörde uçtan uca manuel test — kullanıcının Gıda Tycoon projesinde tercih ettiği gibi gerçek cihazda (adb) test öncelikli, editör içi önizleme ikincil.

## 9. MVP Kapsam Dışı (v1'de bilinçli olarak alınmayanlar)

- Ev arkadaşları arası fatura bölüştürme
- PDF/CSV dışa aktarma, raporlama
- Akıllı priz / pano seviyesi cihaz entegrasyonu (gerçek ölçüm — ayrı, gelecekteki bir yol)
- Web uygulaması sürümü (React kod tabanı buna açık ama v1 mobil odaklı)
- Türkiye dışı fatura formatları
- Çoklu ev/konut desteği
