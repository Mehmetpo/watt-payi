# Watt Payı — İkon, Splash ve Release İmzalama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Capacitor's default demo icon/splash with a custom "W" bolt design, start tracking the Android native project in git properly, generate a permanent release-signing keystore, wire it into the Gradle build, and produce a verified signed release build installed on a physical device.

**Architecture:** Master brand images are rendered from SVG (via `sharp`) into `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732), then `@capacitor/assets` derives every Android density/format variant into `android/app/src/main/res/`. A one-time `.gitignore` fix un-blocks Capacitor's own nested `android/.gitignore` so the native project (including the Gradle signing config) is tracked in git, while build outputs and the keystore stay excluded. A standard Gradle `signingConfigs` block reads credentials from a gitignored `keystore.properties` file.

**Tech Stack:** Capacitor 6 (Android), Gradle (`gradlew.bat`), `@capacitor/assets`, `sharp` (SVG→PNG rendering), JDK `keytool`, `adb`.

**Project root:** `D:\Projects\watt-payi(mobile app)` — Windows machine. Commands below are written for the **Bash tool** (git-bash syntax: `$VAR`, heredocs, forward slashes). If a step must run in PowerShell instead, adapt env-var/heredoc syntax accordingly, but keep the same literal command arguments.

**Design source (already approved, from `docs/superpowers/specs/2026-08-21-release-prep-design.md`):** a two-layer white "W"-shaped bolt (two overlapping lightning-bolt paths, one at `opacity="0.95"`, one at `opacity="0.55"`) on the app's hero gradient `linear-gradient(135deg, #6D5EF0 0%, #8F7FF5 55%, #FF5D5D 130%)`. Splash uses the same gradient full-bleed with the bolt centered, no wordmark.

---

### Task 1: Track the Android native project in git

**Context:** `git ls-files android` currently returns nothing — the whole `android/` folder is blanket-ignored by a single `android/` line in the root `.gitignore` (confirmed by reading `.gitignore` directly). This means any hand-edit to `android/app/build.gradle` (which Task 6 will require, to wire release signing) would never be committed and would silently vanish if the folder were ever regenerated. Capacitor already ships a correct, fine-grained `android/.gitignore` (at `android/.gitignore`) that properly excludes `build/`, `.gradle/`, `local.properties`, copied web assets, etc. — it's just been shadowed by the root ignore rule. It also has a **commented-out** keystore exclusion that needs activating before any keystore file is created.

**Files:**
- Modify: `.gitignore` (repo root)
- Modify: `android/.gitignore`

- [ ] **Step 1: Remove the blanket `android/` ignore from the root `.gitignore`**

Current root `.gitignore` content (verified by reading the file):
```
node_modules/
dist/
build/
ios/
android/
.env
.env.local
.superpowers/
.DS_Store
*.log
*.tsbuildinfo
vite.config.d.ts
vite.config.js
```

Edit it to remove the `android/` line only (leave `ios/` — iOS is explicitly out of scope):
```
node_modules/
dist/
build/
ios/
.env
.env.local
.superpowers/
.DS_Store
*.log
*.tsbuildinfo
vite.config.d.ts
vite.config.js
```

- [ ] **Step 2: Activate the keystore exclusion in `android/.gitignore`**

Current `android/.gitignore` lines 55-58 (verified by reading the file):
```
# Keystore files
# Uncomment the following lines if you do not want to check your keystore files in.
#*.jks
#*.keystore
```

Replace with (also add `keystore.properties`, which the Capacitor template doesn't cover since it's specific to this plan's signing setup):
```
# Keystore files — release signing secrets, never commit
*.jks
*.keystore
keystore.properties
```

- [ ] **Step 3: Verify the ignore rules behave correctly before anything sensitive exists**

Run:
```bash
cd "D:/Projects/watt-payi(mobile app)"
git status --short android/ | head -20
git check-ignore -v android/app/build android/.gradle android/capacitor-cordova-android-plugins
```

Expected:
- The `git status --short` line lists real source files as untracked (`??`) — e.g. `android/app/build.gradle`, `android/app/src/...`, `android/settings.gradle`, `android/gradlew` — but does **NOT** list `android/app/build/`, `android/.gradle/`, or `android/capacitor-cordova-android-plugins/`.
- The `git check-ignore -v` command prints a matching rule (from `android/.gitignore`) for all three paths, confirming they stay excluded.

If any build-output or cache path shows up as untracked instead of ignored, stop and re-check Step 1/2 before proceeding — do not `git add` yet.

- [ ] **Step 4: Commit the gitignore fix**

```bash
git add .gitignore android/.gitignore
git commit -m "chore: track android/ native project, activate keystore gitignore rule"
```

---

### Task 2: Commit the current Android native project baseline

**Context:** Before changing any icons, commit the native project exactly as it stands today (still using Capacitor's default demo icon/splash). This gives a clean historical baseline so Task 4's icon regeneration produces a small, reviewable diff instead of being buried inside one giant "add android folder" commit.

**Files:**
- Create (as git-tracked): the entire `android/` tree, minus what `android/.gitignore` / `android/app/.gitignore` exclude.

- [ ] **Step 1: Review what will be staged**

```bash
cd "D:/Projects/watt-payi(mobile app)"
git status --short android/ | wc -l
du -sh android --exclude=android/app/build --exclude=android/.gradle --exclude=android/capacitor-cordova-android-plugins 2>/dev/null || du -sh android
```

Sanity-check the file count looks like a normal Capacitor Android project (gradle files, `AndroidManifest.xml`, `res/` resources, `MainActivity.java`, gradle wrapper) and the size is a few MB at most (not hundreds of MB — that would indicate a build-output folder slipped through the ignore rules).

- [ ] **Step 2: Stage and commit**

```bash
git add android/
git status --short | grep -v '^A' | head -5
```

Expected: the `grep -v '^A'` line prints nothing (every staged entry is a plain addition `A`, nothing modified/deleted elsewhere).

```bash
git commit -m "chore: commit android native project baseline (pre-custom-icon)"
```

- [ ] **Step 3: Confirm secrets did not leak**

```bash
git show --stat HEAD | grep -iE "keystore|\.jks|local\.properties" || echo "clean"
```

Expected: `clean` (no keystore/local.properties file appears in the commit — none exist yet at this point, so this should always pass, but it's a cheap guardrail).

---

### Task 3: Generate master icon and splash source images

**Context:** No `resources/` folder exists yet in the project (`Glob resources/**` returned no files). This task creates it and renders the two master brand images the approved design calls for: a 1024×1024 icon and a 2732×2732 splash, both built from the same SVG bolt-on-gradient artwork. `sharp` rasterizes SVG to PNG deterministically (no manual/visual tooling needed for this step — visual verification happens in Task 4 after the assets propagate to actual Android files).

**Files:**
- Create: `resources/generate-master-icons.mjs`
- Create: `resources/icon.png` (1024×1024)
- Create: `resources/splash.png` (2732×2732)
- Modify: `package.json`, `package-lock.json` (adds `sharp` devDependency)

- [ ] **Step 1: Install sharp**

```bash
cd "D:/Projects/watt-payi(mobile app)"
npm install -D sharp
```

Expected: exits 0, `package.json` devDependencies now includes `"sharp"`.

- [ ] **Step 2: Write the generator script**

Create `resources/generate-master-icons.mjs`:

```javascript
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Bolt paths and gradient match the approved design in
// docs/superpowers/specs/2026-08-21-release-prep-design.md.
// Gradient stops are re-expressed at 0%/50%/100% (SVG stop-offset
// cannot exceed 100%, unlike the CSS token's 0%/55%/130%) — this
// preserves the same visual left-to-right color progression.
const BOLT_PATHS = `
    <path d="M10 30 L35 30 L20 55 L40 55 L15 90 L55 45 L35 45 L60 10 Z" fill="white" opacity="0.95"/>
    <path d="M50 30 L75 30 L60 55 L80 55 L55 90 L95 45 L75 45 L100 10 Z" fill="white" opacity="0.55" transform="translate(-8,0)"/>
`;

const GRADIENT_DEFS = `
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6D5EF0"/>
      <stop offset="50%" stop-color="#8F7FF5"/>
      <stop offset="100%" stop-color="#FF5D5D"/>
    </linearGradient>
  </defs>
`;

// Icon: bolt group scaled to occupy ~59% of the canvas width/height,
// centered — leaves a safe margin so Android's adaptive-icon circular/
// squircle mask doesn't clip the artwork.
const ICON_SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${GRADIENT_DEFS}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(212,212) scale(6)">
    ${BOLT_PATHS}
  </g>
</svg>`;

// Splash: bolt scaled much smaller (~30% of width) and centered, since
// splash source gets cropped differently across phone aspect ratios.
const SPLASH_SVG = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  ${GRADIENT_DEFS}
  <rect width="2732" height="2732" fill="url(#bg)"/>
  <g transform="translate(956,956) scale(8.2)">
    ${BOLT_PATHS}
  </g>
</svg>`;

mkdirSync('resources', { recursive: true });

await sharp(Buffer.from(ICON_SVG)).png().toFile('resources/icon.png');
await sharp(Buffer.from(SPLASH_SVG)).png().toFile('resources/splash.png');

console.log('Wrote resources/icon.png and resources/splash.png');
```

- [ ] **Step 3: Run it**

```bash
node resources/generate-master-icons.mjs
```

Expected output: `Wrote resources/icon.png and resources/splash.png`

- [ ] **Step 4: Verify dimensions**

```bash
node -e "import('sharp').then(({default:sharp})=>Promise.all([sharp('resources/icon.png').metadata(),sharp('resources/splash.png').metadata()]).then(([i,s])=>console.log('icon:',i.width+'x'+i.height,'splash:',s.width+'x'+s.height)))"
```

Expected: `icon: 1024x1024 splash: 2732x2732`

- [ ] **Step 5: Visual sanity check**

Use the Read tool on `resources/icon.png` and `resources/splash.png` to view them. Confirm: purple-to-coral diagonal gradient background, white two-layer bolt shape roughly centered, no visible artifacts/transparency holes. If the bolt looks off-center or clipped at the edges, adjust the `translate(...)` values in the script (re-center: `translate = (canvas_size - scaled_content_size) / 2`) and re-run Steps 3-5.

- [ ] **Step 6: Commit**

```bash
git add resources/generate-master-icons.mjs resources/icon.png resources/splash.png package.json package-lock.json
git commit -m "feat: generate master icon and splash source images"
```

---

### Task 4: Generate Android platform assets via @capacitor/assets

**Context:** `@capacitor/assets` reads `resources/icon.png` and `resources/splash.png` (created in Task 3) and writes every Android density/format variant Capacitor and Android need — legacy launcher icons, adaptive icon layers, and splash drawables — directly into `android/app/src/main/res/`. Because Task 2 already committed the native project baseline with the *old* default Capacitor icon, this task's `git diff` will show exactly which res files the icon change touched.

**Files:**
- Modify: `package.json`, `package-lock.json` (adds `@capacitor/assets` devDependency)
- Modify: various files under `android/app/src/main/res/` (exact set determined by the tool — verified in Step 3below, not hardcoded here since it depends on the installed `@capacitor/assets` version)

- [ ] **Step 1: Install the tool**

```bash
cd "D:/Projects/watt-payi(mobile app)"
npm install -D @capacitor/assets
```

Expected: exits 0.

- [ ] **Step 2: Generate**

```bash
npx capacitor-assets generate --android
```

Expected: exits 0 with no error output. If it errors, read the error message directly — common causes are a missing/corrupt `resources/icon.png` (re-run Task 3) or a missing Android platform (shouldn't apply here, `android/` already exists).

- [ ] **Step 3: See exactly what changed**

```bash
git status --short android/app/src/main/res/ | head -60
```

This is the authoritative list of what the tool touched (don't guess filenames — different `@capacitor/assets` versions generate slightly different file sets). Expect to see multiple modified/added entries under `mipmap-*` and `drawable*` directories.

- [ ] **Step 4: Visual spot-check (matches the spec's explicit verification criterion)**

Use the Read tool to open at least:
- One `mipmap-xxxhdpi/ic_launcher*.png` file from the list in Step 3
- One splash-related PNG from the list in Step 3 (look for `splash` in the filename, likely under `drawable*` folders)

Confirm both show the new purple-to-coral gradient with the white bolt — **not** the old blue/white "X" Capacitor default logo. If either still shows the old default, re-run Step 2 and confirm Task 3 actually wrote non-empty `resources/icon.png` / `resources/splash.png` first.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json android/app/src/main/res/
git commit -m "feat: generate custom Android launcher icon and splash assets"
```

---

### Task 5: Generate the release signing keystore

**Context:** No signing keystore exists yet — `android/app/build.gradle` currently has no `signingConfigs` block at all (confirmed by reading the file), meaning only unsigned/debug builds are possible today. This task creates a permanent `.jks` keystore file and a `keystore.properties` file holding its credentials. Both are protected by the `android/.gitignore` rule activated in Task 1 Step 2 (`*.jks`, `*.keystore`, `keystore.properties`).

**⚠️ This keystore is irreplaceable.** Once this app is ever published to the Play Store under `applicationId "com.mehmetcebe.wattpayi"`, every future update must be signed with this exact keystore file and password. If it's lost, or the password is forgotten, no future update can ever be published under this app identity again — a new app listing would be required from scratch. **The password must be backed up to a password manager or encrypted cloud storage immediately after this task runs, before doing anything else.**

**Files:**
- Create: `android/watt-payi-release.jks` (gitignored — never committed)
- Create: `android/keystore.properties` (gitignored — never committed)

- [ ] **Step 1: Confirm `keytool` is available**

```bash
keytool -help >/dev/null 2>&1 && echo "keytool OK" || echo "keytool NOT on PATH"
```

If it prints "NOT on PATH", `keytool` ships with any JDK, including the one bundled with Android Studio. Try:
```bash
"/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe" -help >/dev/null 2>&1 && echo "found in Android Studio JBR"
```
If found there, prefix all `keytool` invocations below with that full path instead of the bare `keytool` command.

- [ ] **Step 2: Generate the keystore, credentials file, and display the password — in ONE combined command**

Run this as a single Bash tool call (the shell variable `$STORE_PASS` must survive from generation through the credentials-file write; the Bash tool does **not** persist shell state between separate calls):

```bash
cd "D:/Projects/watt-payi(mobile app)/android"

STORE_PASS=$(node -e "console.log(require('crypto').randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g,'').slice(0,24))")

keytool -genkeypair -v \
  -keystore watt-payi-release.jks \
  -alias watt-payi \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
  -dname "CN=Mehmet Cebe, OU=Watt Payi, O=Watt Payi, L=Bodrum, ST=Mugla, C=TR" \
  -noprompt

cat > keystore.properties <<EOF
storePassword=$STORE_PASS
keyPassword=$STORE_PASS
keyAlias=watt-payi
storeFile=watt-payi-release.jks
EOF

echo "=========================================================="
echo "KEYSTORE PASSWORD — COPY THIS TO A PASSWORD MANAGER NOW:"
echo "$STORE_PASS"
echo "Also back up the file: android/watt-payi-release.jks"
echo "=========================================================="

cd ..
```

Expected: `keytool` prints `[Storing watt-payi-release.jks]` (or similar success message), no errors. The final echoed block shows the password in plain text in the terminal — this is expected and necessary so it can be captured for backup; it is not written anywhere except the local gitignored `keystore.properties`.

- [ ] **Step 3: Tell the user to back up the keystore now**

Relay this exact message to the user before continuing to any other task:

> "Release keystore oluşturuldu: `android/watt-payi-release.jks`. Şifreyi ve dosyayı ŞİMDİ bir parola yöneticisine veya şifreli bir buluta yedekle — bu keystore kaybolursa veya şifre unutulursa, `com.mehmetcebe.wattpayi` altında Play Store'da bir daha güncelleme yayınlanamaz."

- [ ] **Step 4: Verify the secrets are excluded from git**

```bash
cd "D:/Projects/watt-payi(mobile app)"
git status --short android/watt-payi-release.jks android/keystore.properties
git check-ignore -v android/watt-payi-release.jks android/keystore.properties
```

Expected: the `git status --short` line prints **nothing** (both files are ignored, not untracked). The `git check-ignore -v` line prints both files matched against the `android/.gitignore` keystore rule added in Task 1.

No commit in this task — these two files must never be committed.

---

### Task 6: Wire release signing into Gradle

**Context:** `android/app/build.gradle` currently has no signing configuration (verified by reading the full file). This task adds a standard Gradle pattern that loads credentials from `keystore.properties` (created in Task 5) and attaches them to the `release` build type.

**Files:**
- Modify: `android/app/build.gradle`

- [ ] **Step 1: Apply the edit**

Current full file content (verified by reading `android/app/build.gradle`):

```groovy
apply plugin: 'com.android.application'

android {
    namespace "com.mehmetcebe.wattpayi"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.mehmetcebe.wattpayi"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
```

Replace the top of the file through the end of the `android { ... }` block (everything from `apply plugin: 'com.android.application'` through the closing `}` of the `android` block) with:

```groovy
apply plugin: 'com.android.application'

def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    namespace "com.mehmetcebe.wattpayi"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.mehmetcebe.wattpayi"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile rootProject.file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

Leave everything after the `android { ... }` block (`repositories { ... }`, `dependencies { ... }`, `apply from: 'capacitor.build.gradle'`, the `google-services.json` try/catch) exactly as-is, unchanged.

- [ ] **Step 2: Verify the signing config is wired correctly**

```bash
cd "D:/Projects/watt-payi(mobile app)/android"
./gradlew.bat signingReport
cd ..
```

(If git-bash fails to execute the `.bat` directly, run `cmd /c gradlew.bat signingReport` instead.)

Expected: the output includes a `Variant: release` block whose `Store:` field points to `.../android/watt-payi-release.jks` (not a debug keystore path). This confirms Gradle is correctly reading `keystore.properties` and applying it to the release variant — without needing a full build yet.

- [ ] **Step 3: Commit**

```bash
git add android/app/build.gradle
git commit -m "feat: wire release signing config into Gradle build"
```

---

### Task 7: Build, install, and verify the signed release

**Context:** This is the final task — it produces the actual signed release artifacts and confirms, on a real device, that the new icon/splash and working signature all come together. Requires a physical Android device connected via USB with USB debugging enabled (per the approved spec, this is verified on-device, not via emulator).

**Files:** none (build/verification only — no source changes)

- [ ] **Step 1: Build the signed App Bundle**

```bash
cd "D:/Projects/watt-payi(mobile app)/android"
./gradlew.bat bundleRelease
```
(Fallback if needed: `cmd /c gradlew.bat bundleRelease`)

Expected: `BUILD SUCCESSFUL`, output at `android/app/build/outputs/bundle/release/app-release.aab`.

- [ ] **Step 2: Build the signed APK**

```bash
./gradlew.bat assembleRelease
```
(Fallback: `cmd /c gradlew.bat assembleRelease`)

Expected: `BUILD SUCCESSFUL`, output at `android/app/build/outputs/apk/release/app-release.apk`.

- [ ] **Step 3: Confirm a device is connected**

```bash
adb devices
```

Expected: at least one line with state `device` (not `unauthorized` or `offline`). If none, stop and ask the user to connect a physical Android device via USB with USB debugging enabled — do not proceed to Step 4 without one.

- [ ] **Step 4: Install the signed APK**

```bash
cd "D:/Projects/watt-payi(mobile app)"
adb install -r "android/app/build/outputs/apk/release/app-release.apk"
```

Expected: `Success`.

- [ ] **Step 5: Launch the app and capture a screenshot**

```bash
adb shell monkey -p com.mehmetcebe.wattpayi -c android.intent.category.LAUNCHER 1
adb shell screencap -p /sdcard/watt-payi-verify.png
adb pull /sdcard/watt-payi-verify.png "docs/superpowers/plans/watt-payi-verify.png"
adb shell rm /sdcard/watt-payi-verify.png
```

Use the Read tool on `docs/superpowers/plans/watt-payi-verify.png` to view it. Confirm the app launched and (if caught in time) the splash or home screen reflects the new branding. Also check the device's home screen / app drawer launcher icon directly (visually, on the device) to confirm it shows the new gradient bolt icon, not the old default. Delete the screenshot file afterward — it's a one-off verification artifact, not something to commit:

```bash
rm "docs/superpowers/plans/watt-payi-verify.png"
```

- [ ] **Step 6: Final safety check — confirm no secrets are tracked**

```bash
cd "D:/Projects/watt-payi(mobile app)"
git status --short
git log --all --oneline -- android/watt-payi-release.jks android/keystore.properties
```

Expected: `git status --short` shows a clean tree (everything from this plan already committed in earlier tasks); the `git log` line prints **nothing** — confirming the keystore and its credentials have never appeared in any commit, at any point.

- [ ] **Step 7: Report completion**

Summarize for the user: signed `.aab` and `.apk` locations, confirmation the new icon/splash appeared on-device, and a reminder (if not already acknowledged in Task 5) that the keystore password must be backed up before this app is ever published.

---

## Kapsam dışı (per approved spec — do not do these as part of this plan)

- Uploading anything to Play Console
- Writing store listing copy, screenshots, or release notes
- Writing a privacy policy
- iOS icon/splash work
