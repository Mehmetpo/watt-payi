import { useState, type CSSProperties, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../components/BrandMark';
import { useI18n } from '../../i18n/I18nContext';
import './LoginScreen.css';

export function ResetPasswordScreen() {
  const { clearRecovery } = useAuth();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t('auth.errorMismatch'));
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      clearRecovery();
    } catch {
      setError(t('reset.error'));
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
      <h1 className="display login-in" style={{ '--i': 1 } as CSSProperties}>{t('reset.title')}</h1>
      <p className="login-sub login-in" style={{ '--i': 2 } as CSSProperties}>{t('reset.sub')}</p>

      <form onSubmit={handleSubmit} className="login-form login-in" style={{ '--i': 3 } as CSSProperties}>
        <Label htmlFor="newPassword">{t('reset.newPassword')}</Label>
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
            placeholder={t('auth.passwordPlaceholder')}
          />
        </div>

        <Label htmlFor="confirmPassword">{t('auth.confirm')}</Label>
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
            placeholder={t('auth.confirmPlaceholder')}
          />
        </div>

        <Button type="submit" size="lg" className="h-12 text-base mt-2" disabled={busy}>
          {busy ? t('reset.saving') : t('reset.submit')}
        </Button>
      </form>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
