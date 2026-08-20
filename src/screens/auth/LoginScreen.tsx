import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
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
      <h1 className="display">Watt Payı</h1>
      <p className="login-sub">Faturanı cihaz cihaz takip et.</p>

      {sent ? (
        <p className="login-sub"><strong>{email}</strong> adresine bir giriş linki gönderdik. E-postandaki linke dokunarak giriş yap.</p>
      ) : (
        <form onSubmit={sendMagicLink} className="login-form">
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
          />
          <button type="submit" disabled={busy}>{busy ? 'Gönderiliyor...' : 'Giriş linki gönder'}</button>
        </form>
      )}

      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
