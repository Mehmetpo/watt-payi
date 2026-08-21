# Watt Payı — İkon, Splash ve Release İmzalama Altyapısı

**Tarih:** 2026-08-21
**Durum:** Onaylandı

## Amaç

Uygulamanın kurulu Android build'i şu anda Capacitor'ın varsayılan demo ikonunu ve splash ekranını kullanıyor (`npx cap add android` ile otomatik gelen, projeye özel olmayan görseller), ve release imzalama hiç kurulmamış — sadece debug build var. Bu iş, üç şeyi tamamlar:

1. Watt Payı'na özel ikon + splash
2. Kalıcı bir signing keystore
3. İmzalı, gerçek cihazda doğrulanmış bir release build

Play Console'a fiilen yükleme, mağaza açıklaması, ekran görüntüleri ve gizlilik politikası bu işin kapsamı **dışında** — ayrı bir tur olarak ele alınacak.

## İkon konsepti (onaylandı)

"W" Şimşek: iki çakışan bolt şekli, `--hero-gradient` token'ıyla aynı gradient zemin üzerinde (135deg, `#6D5EF0` → `#8F7FF5` → `#FF5D5D`), beyaz/yarı-saydam bolt katmanları. İki bolt'un çakışması "Watt" kelimesinin W'sini andırıyor.

Referans SVG (ikon konsept ekranından, `A` seçeneği):

```svg
<svg viewBox="0 0 100 100">
  <path d="M10 30 L35 30 L20 55 L40 55 L15 90 L55 45 L35 45 L60 10 Z" fill="white" opacity="0.95"/>
  <path d="M50 30 L75 30 L60 55 L80 55 L55 90 L95 45 L75 45 L100 10 Z" fill="white" opacity="0.55" transform="translate(-8,0)"/>
</svg>
```

Zemin: `linear-gradient(135deg, #6D5EF0 0%, #8F7FF5 55%, #FF5D5D 130%)`, köşeler yuvarlatılmış (adaptive icon safe zone'a uyacak şekilde, bolt'lar merkeze çekilecek).

## Splash konsepti (onaylandı)

Aynı gradient tüm ekrana yayılıyor, ortada sadece ikondaki bolt kompozisyonu (isim yazısı yok — en sade, en "markalı" seçenek). Android 12+ zaten kendi sistem splash'ini gösterdiği için bu ekran yalnızca WebView yüklenirkenki kısa ara kare.

## Uygulama adımları

### 1. Master görsellerin üretimi
- 1024×1024 `icon.png` ve 2732×2732 `splash.png` (merkezde güvenli alan içinde ikon, kalan alan düz gradient) yukarıdaki SVG/gradient tanımından render edilecek.
- Kaynak dosyalar proje kökünde `resources/icon.png` ve `resources/splash.png` olarak saklanacak (Capacitor'ın beklediği konvansiyon).

### 2. Platform varlıklarının üretimi
- `@capacitor/assets` paketi eklenir (`npm install -D @capacitor/assets`).
- `npx capacitor-assets generate --android` çalıştırılır — bu, `android/app/src/main/res/` altındaki tüm mipmap yoğunluklarını (mdpi…xxxhdpi), adaptive icon foreground/background katmanlarını, `ic_launcher.xml`/`ic_launcher_round.xml` ve tüm `drawable-*/splash.png` varyantlarını otomatik yeniden üretir.
- Üretilen dosyalar gözle kontrol edilir (en azından xxxhdpi ikon + bir splash varyantı okunarak).

### 3. Signing keystore
- `keytool -genkeypair -v -keystore watt-payi-release.jks -alias watt-payi -keyalg RSA -keysize 2048 -validity 10000` ile `android/watt-payi-release.jks` konumunda yeni bir keystore üretilir (zaten gitignore'lu olan `android/` dizini içinde, ekstra bir gitignore kuralına gerek kalmadan).
- Şifreler ve alias `android/keystore.properties` dosyasına yazılır. `android/` zaten tamamen gitignore'lu olduğu için hem bu dosya hem `.jks` otomatik olarak git dışında kalır — yine de commit öncesi `git status` ile teyit edilecek.
- **Kritik uyarı kullanıcıya iletilecek:** bu keystore kaybolursa veya şifreler unutulursa, bu `applicationId` (`com.mehmetcebe.wattpayi`) altında Play Store'da bir daha güncelleme yayınlanamaz — yeni bir uygulama olarak baştan başlamak gerekir. Üretildikten hemen sonra dosyanın ve şifrelerin güvenli bir yere (parola yöneticisi, şifreli bulut yedek) kopyalanması istenecek.

### 4. Gradle signing config
- `android/app/build.gradle`'a `keystore.properties`'i okuyan bir blok + `signingConfigs.release` + `buildTypes.release.signingConfig` eklenir (standart Android/Capacitor pattern).

### 5. Release build ve doğrulama
- `./gradlew.bat bundleRelease` çalıştırılır — imzalı `.aab` üretilir, hatasız tamamlandığı doğrulanır.
- `./gradlew.bat assembleRelease` ile imzalı `.apk` de üretilir, `adb install -r` ile bağlı cihaza kurulur, uygulama açılıp yeni ikon + splash'in gerçekten göründüğü teyit edilir (ekran görüntüsüyle).

## Test / Doğrulama kriterleri

- `capacitor-assets generate` sonrası üretilen dosya sayısı ve isimleri beklenen Android yoğunluk setiyle eşleşiyor.
- `bundleRelease` ve `assembleRelease` sıfır hatayla tamamlanıyor.
- İmzalı APK cihaza kurulup açılıyor; launcher ikonu ve (varsa yakalanabilirse) splash yeni tasarımı gösteriyor.
- `git status` release sonrası keystore/properties dosyalarının **tracked olmadığını** doğruluyor.

## Kapsam dışı

- Play Console'a yükleme, sürüm notları, mağaza listesi (açıklama, ekran görüntüleri, kategori)
- Gizlilik politikası metni/sayfası
- iOS ikon/splash (proje şu an yalnızca Android hedefliyor)
