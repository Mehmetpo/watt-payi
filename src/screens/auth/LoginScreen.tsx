import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './LoginScreen.css';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (sendError) {
      setError('Kod gönderilemedi, e-posta adresini kontrol et.');
      return;
    }
    setStage('otp');
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setBusy(false);
    if (verifyError) {
      setError('Kod hatalı ya da süresi doldu, tekrar dene.');
    }
  }

  return (
    <div className="login-shell">
      <h1 className="display">Watt Payı</h1>
      <p className="login-sub">Faturanı cihaz cihaz takip et.</p>

      {stage === 'email' ? (
        <form onSubmit={sendOtp} className="login-form">
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
          />
          <button type="submit" disabled={busy}>{busy ? 'Gönderiliyor...' : 'Giriş kodu gönder'}</button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="login-form">
          <label htmlFor="otp">E-postana gelen 6 haneli kod</label>
          <input
            id="otp"
            inputMode="numeric"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
          />
          <button type="submit" disabled={busy}>{busy ? 'Doğrulanıyor...' : 'Giriş yap'}</button>
        </form>
      )}

      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
