# Basit E-posta + Şifre ile Giriş Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Magic-link + deep-link tabanlı giriş akışını, tek ekranda e-posta + şifre ile hemen tamamlanan, deep-link'e hiç ihtiyaç duymayan bir akışla değiştirmek.

**Architecture:** `LoginScreen` tek bir submit handler'da önce `signInWithPassword` dener, başarısız olursa otomatik `signUp` dener (hesap yoksa oluşturur, e-posta doğrulama kapalı olduğu için session hemen döner). `AuthContext`'teki Capacitor `appUrlOpen` deep-link dinleyicisi tamamen kaldırılır çünkü artık hiçbir akış e-posta linkine bağlı değil.

**Tech Stack:** React + TypeScript, `@supabase/supabase-js` (`signInWithPassword`, `signUp`), Vite dev server ile manuel doğrulama.

**Test yaklaşımı hakkında not:** Bu projede Vitest `environment: 'node'` ile sadece `src/**/*.test.ts` (saf mantık, örn. `calc.test.ts`) çalıştırıyor; React Testing Library veya jsdom kurulu değil, `LoginScreen`/`AuthContext` gibi UI/side-effect dosyaları için hiç test yok. Bu plan yeni bir component-test altyapısı kurmuyor (kapsam dışı, YAGNI) — bunun yerine her adımda `npx tsc -b` ile tip kontrolü ve son task'ta Vite dev server üzerinden manuel doğrulama kullanılıyor.

---

### Task 1: `AuthContext`'ten deep-link dinleyicisini kaldır

**Files:**
- Modify: `src/contexts/AuthContext.tsx` (tamamı)

- [ ] **Step 1: Dosyanın tamamını aşağıdaki içerikle değiştir**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

Bu değişiklik `@capacitor/app` importunu, `appUrlOpen` dinleyicisini ve onun cleanup'ını
kaldırır — artık hiçbir e-posta linki işlenmediği için gereksizler.

- [ ] **Step 2: Tip kontrolü çalıştır**

Run: `npx tsc -b`
Expected: Hatasız biter (çıktı yok, exit code 0). `@capacitor/app` importu kaldırıldığı
için `noUnusedLocals` hatası çıkmamalı.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "refactor: remove deep-link auth listener from AuthContext"
```

---

### Task 2: `LoginScreen`'i e-posta + şifre akışına çevir

**Files:**
- Modify: `src/screens/auth/LoginScreen.tsx` (tamamı)

- [ ] **Step 1: Dosyanın tamamını aşağıdaki içerikle değiştir**

```tsx
import { useState, type CSSProperties, type FormEvent } from 'react';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../components/BrandMark';
import './LoginScreen.css';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData.session) {
      setBusy(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setBusy(false);

    if (signUpError || !signUpData.session) {
      setError('E-posta veya şifre hatalı.');
    }
  }

  return (
    <div className="login-shell">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-mark login-in" style={{ '--i': 0 } as CSSProperties}>
        <BrandMark size={26} />
      </div>
      <h1 className="display login-in" style={{ '--i': 1 } as CSSProperties}>Watt Payı</h1>
      <p className="login-sub login-in" style={{ '--i': 2 } as CSSProperties}>Faturanı cihaz cihaz takip et.</p>

      <form onSubmit={handleSubmit} className="login-form login-in" style={{ '--i': 3 } as CSSProperties}>
        <Label htmlFor="email">E-posta</Label>
        <div className="login-input-wrap">
          <Mail size={17} strokeWidth={1.8} className="login-input-icon" />
          <Input
            id="email"
            type="email"
            required
            className="h-12 text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
          />
        </div>

        <Label htmlFor="password">Şifre</Label>
        <div className="login-input-wrap">
          <Lock size={17} strokeWidth={1.8} className="login-input-icon" />
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            className="h-12 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 6 karakter"
          />
        </div>

        <Button type="submit" size="lg" className="h-12 text-base mt-2" disabled={busy}>
          {busy ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </Button>
      </form>

      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
```

Bu değişiklik `sendMagicLink`'i kaldırıp yerine `signInWithPassword` → fallback `signUp`
mantığını içeren `handleSubmit`'i koyar, şifre alanını ekler ve `sent` state'iyle
"e-postana link gönderdik" bloğunu tamamen kaldırır.

- [ ] **Step 2: Tip kontrolü çalıştır**

Run: `npx tsc -b`
Expected: Hatasız biter.

- [ ] **Step 3: Commit**

```bash
git add src/screens/auth/LoginScreen.tsx
git commit -m "feat: switch sign-in to email+password with auto sign-up fallback"
```

---

### Task 3: Kullanılmayan "link gönderildi" stillerini temizle

**Files:**
- Modify: `src/screens/auth/LoginScreen.css` (tamamı)

**Context:** Task 2'de `.login-sent` bloğunu kullanan UI kaldırıldı; bu CSS artık hiçbir
yerden referans edilmiyor.

- [ ] **Step 1: Dosyanın tamamını aşağıdaki içerikle değiştir**

```css
.login-shell { position: relative; max-width: 360px; margin: 0 auto; padding: 4.5rem 1.5rem 3rem; display: flex; flex-direction: column; gap: .5rem; overflow: hidden; }
.login-glow {
  position: absolute; top: -120px; left: 50%; width: 340px; height: 340px; margin-left: -170px;
  background: var(--hero-gradient); filter: blur(60px); opacity: .28; border-radius: 50%; z-index: -1;
  animation: login-glow-in 900ms var(--ease-out) backwards;
}
@keyframes login-glow-in { from { opacity: 0; transform: scale(.7); } to { opacity: .28; transform: scale(1); } }
.login-mark {
  width: 60px; height: 60px; border-radius: 20px; background: var(--hero-gradient); color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;
  box-shadow: 0 12px 28px -8px color-mix(in srgb, var(--accent) 60%, transparent);
}
.login-sub { color: var(--ink-muted); margin: 0 0 1.5rem; }
.login-form { display: flex; flex-direction: column; gap: .5rem; }
.login-form label { font-size: .8rem; font-weight: 600; color: var(--ink-muted); }
.login-input-wrap { position: relative; display: flex; align-items: center; }
.login-input-icon { position: absolute; left: .85rem; color: var(--ink-faint); pointer-events: none; }
.login-input-wrap input { padding-left: 2.6rem; }
.login-error { color: var(--coral); font-size: .85rem; margin-top: .75rem; }

.login-in { animation: login-in var(--dur-slow) var(--ease-out) backwards; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes login-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .login-glow, .login-in { animation: none; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/auth/LoginScreen.css
git commit -m "chore: remove unused magic-link-sent styles"
```

---

### Task 4: Uçtan uca manuel doğrulama

**Files:** Yok (sadece doğrulama, kod değişikliği yok).

**Context:** Bu proje UI/auth kodu için otomatik test altyapısına sahip değil (bkz. plan
başındaki not), bu yüzden son doğrulama Vite dev server üzerinden manuel yapılır.

- [ ] **Step 1: Dev server'ı başlat**

Run: `npm run dev`
Expected: Terminalde `Local: http://localhost:5173/` (veya benzeri) URL'i görünür.

- [ ] **Step 2: Yeni hesapla giriş akışını doğrula**

Tarayıcıda dev server URL'ini aç. Login ekranında daha önce hiç kullanılmamış bir e-posta
ve en az 6 karakterli bir şifre gir, "Giriş yap"a bas.
Expected: Hiçbir hata gösterilmeden ana ekrana (uygulama içeriğine) geçilir — yeni hesap
otomatik oluşturulup giriş yapılmış olur.

- [ ] **Step 3: Aynı hesapla doğru şifreyle tekrar giriş yapıldığını doğrula**

Profil ekranından çıkış yap (mevcut "Çıkış yap" butonu), aynı e-posta + doğru şifreyle
tekrar giriş yap.
Expected: Hatasız şekilde ana ekrana geçilir.

- [ ] **Step 4: Yanlış şifre hatasını doğrula**

Tekrar çıkış yap, aynı e-posta ile ama yanlış bir şifre gir, "Giriş yap"a bas.
Expected: "E-posta veya şifre hatalı." mesajı görünür, ana ekrana geçilmez.

- [ ] **Step 5: Dev server'ı durdur**

Terminalde `Ctrl+C` ile durdur (veya arka planda çalıştırıldıysa ilgili process'i sonlandır).
