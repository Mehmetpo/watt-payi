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
    const trimmedEmail = email.trim();

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (!signInError && signInData.session) {
      setBusy(false);
      return;
    }

    // Auto sign-up on failed sign-in. Relies on "confirm email" being disabled in the
    // Supabase project — otherwise a brand-new user would get a session-less signUp result
    // here and see the same "wrong email/password" error as an actual bad password.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
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
