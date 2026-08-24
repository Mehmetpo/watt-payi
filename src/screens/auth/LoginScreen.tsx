import { useState, type CSSProperties, type FormEvent } from 'react';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../components/BrandMark';
import './LoginScreen.css';

export function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError(null);
    setInfo(null);
    setConfirm('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();

    if (mode === 'signup' && password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError('E-posta veya şifre hatalı.');
        }
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (signUpError) {
          setError('Kayıt oluşturulamadı, tekrar dene.');
        } else if (!signUpData.session) {
          // No session back means Supabase is waiting on email confirmation.
          setInfo('Hesabını onaylamak için e-postana gelen bağlantıya tıkla.');
        }
        // NOTE: whether signUp returns a session instantly depends on the "Confirm email"
        // toggle in the Supabase Auth dashboard (Authentication > Providers > Email). That
        // toggle is currently off, so a successful signUp logs the user in immediately
        // without verifying they actually own the address. This client code can't enforce
        // email verification on its own — enabling "Confirm email" in the dashboard is a
        // manual follow-up outside this codebase, and until it's done this is a known,
        // accepted gap.
      }
    } catch {
      setError('Bir şeyler ters gitti, tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Önce e-posta adresini gir.');
      return;
    }
    setError(null);
    setResetBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'com.mehmetcebe.wattpayi://login-callback',
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch {
      setError('Sıfırlama bağlantısı gönderilemedi, tekrar dene.');
    } finally {
      setResetBusy(false);
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
            minLength={8}
            className="h-12 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
          />
        </div>

        {mode === 'signup' && (
          <>
            <Label htmlFor="confirmPassword">Şifre (tekrar)</Label>
            <div className="login-input-wrap">
              <Lock size={17} strokeWidth={1.8} className="login-input-icon" />
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                className="h-12 text-base"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Tekrar gir"
              />
            </div>
          </>
        )}

        <Button type="submit" size="lg" className="h-12 text-base mt-2" disabled={busy}>
          {busy
            ? mode === 'login' ? 'Giriş yapılıyor...' : 'Hesap oluşturuluyor...'
            : mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}
        </Button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {info && <p className="login-reset-sent">{info}</p>}

      {mode === 'login' ? (
        resetSent ? (
          <p className="login-reset-sent">Şifre sıfırlama bağlantısı e-postana gönderildi.</p>
        ) : (
          <Button
            type="button"
            variant="link"
            className="login-forgot-link"
            onClick={handleForgotPassword}
            disabled={resetBusy}
          >
            {resetBusy ? 'Gönderiliyor...' : 'Şifremi unuttum'}
          </Button>
        )
      ) : null}

      <Button
        type="button"
        variant="link"
        className="login-forgot-link"
        onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
      </Button>
    </div>
  );
}
