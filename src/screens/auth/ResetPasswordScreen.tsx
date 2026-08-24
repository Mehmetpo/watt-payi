import { useState, type CSSProperties, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../components/BrandMark';
import './LoginScreen.css';

export function ResetPasswordScreen() {
  const { clearRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      clearRecovery();
    } catch {
      setError('Şifre güncellenemedi, tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-mark login-in" style={{ '--i': 0 } as CSSProperties}>
        <BrandMark size={26} />
      </div>
      <h1 className="display login-in" style={{ '--i': 1 } as CSSProperties}>Yeni şifre</h1>
      <p className="login-sub login-in" style={{ '--i': 2 } as CSSProperties}>Hesabın için yeni bir şifre belirle.</p>

      <form onSubmit={handleSubmit} className="login-form login-in" style={{ '--i': 3 } as CSSProperties}>
        <Label htmlFor="newPassword">Yeni şifre</Label>
        <div className="login-input-wrap">
          <Lock size={17} strokeWidth={1.8} className="login-input-icon" />
          <Input
            id="newPassword"
            type="password"
            required
            minLength={8}
            className="h-12 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
          />
        </div>

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

        <Button type="submit" size="lg" className="h-12 text-base mt-2" disabled={busy}>
          {busy ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
        </Button>
      </form>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
