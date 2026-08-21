import { useState, type CSSProperties, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../components/BrandMark';
import './LoginScreen.css';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'com.mehmetcebe.wattpayi://login-callback' },
    });
    setBusy(false);
    if (sendError) {
      setError('Giriş linki gönderilemedi, e-posta adresini kontrol et.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="login-shell">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-mark login-in" style={{ '--i': 0 } as CSSProperties}>
        <BrandMark size={26} />
      </div>
      <h1 className="display login-in" style={{ '--i': 1 } as CSSProperties}>Watt Payı</h1>
      <p className="login-sub login-in" style={{ '--i': 2 } as CSSProperties}>Faturanı cihaz cihaz takip et.</p>

      {sent ? (
        <div className="login-sent login-in" style={{ '--i': 3 } as CSSProperties}>
          <Mail size={20} strokeWidth={1.7} />
          <p className="login-sub">
            <strong>{email}</strong> adresine bir giriş linki gönderdik. E-postandaki linke dokunarak giriş yap.
          </p>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="login-form login-in" style={{ '--i': 3 } as CSSProperties}>
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
          <Button type="submit" size="lg" className="h-12 text-base mt-2" disabled={busy}>
            {busy ? 'Gönderiliyor...' : 'Giriş linki gönder'}
          </Button>
        </form>
      )}

      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
