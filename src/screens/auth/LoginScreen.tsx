import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { beginRecoveryRequest } from '../../lib/recoveryNonce';
import { Button } from '../../components/ui/button';
import { PrivacyLink } from '../../components/PrivacyLink';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../components/BrandMark';
import { CaptchaWidget, type CaptchaHandle } from '../../components/CaptchaWidget';
import { useI18n } from '../../i18n/I18nContext';
import './LoginScreen.css';

export function LoginScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loginFailed, setLoginFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  function resetCaptcha() {
    setCaptchaToken(null);
    captchaRef.current?.reset();
  }

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError(null);
    setLoginFailed(false);
    setConfirm('');
  }

  // Reached from the "hesabın yok mu?" nudge after a failed login: jump to the
  // signup form but keep the email + password the user already typed (and
  // pre-fill the confirm field with it) so they don't re-enter anything.
  function goToSignupKeepingCredentials() {
    setMode('signup');
    setError(null);
    setLoginFailed(false);
    setResetSent(false);
    setConfirm(password);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoginFailed(false);
    const trimmedEmail = email.trim();

    if (mode === 'signup' && password !== confirm) {
      setError(t('auth.errorMismatch'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
          options: { captchaToken: captchaToken ?? undefined },
        });
        if (signInError) {
          // Supabase returns the same error for a wrong password and a
          // non-existent account, so the copy covers both and the nudge below
          // offers the signup path.
          setError(t('auth.errorLogin'));
          setLoginFailed(true);
        }
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { captchaToken: captchaToken ?? undefined },
        });

        if (signUpError) {
          setError(t('auth.errorSignup'));
        } else if (!signUpData.session) {
          // "Confirm email" is off in the Supabase Auth dashboard, so a successful
          // signUp returns a session and logs the user straight in. If no session
          // comes back, something went wrong rather than an email being pending.
          setError(t('auth.errorSignupIncomplete'));
        }
      }
    } catch {
      setError(t('auth.errorGeneric'));
    } finally {
      setBusy(false);
      resetCaptcha();
    }
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('auth.errorEnterEmail'));
      return;
    }
    setError(null);
    setResetBusy(true);
    try {
      const nonce = await beginRecoveryRequest();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `com.mehmetcebe.wattpayi://login-callback?nonce=${nonce}`,
        captchaToken: captchaToken ?? undefined,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch {
      setError(t('auth.errorResetSend'));
    } finally {
      setResetBusy(false);
      resetCaptcha();
    }
  }

  return (
    <div className="login-shell">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-mark login-in" style={{ '--i': 0 } as CSSProperties}>
        <BrandMark size={26} />
      </div>
      <h1 className="display login-in" style={{ '--i': 1 } as CSSProperties}>Watt Payı</h1>
      <p className="login-sub login-in" style={{ '--i': 2 } as CSSProperties}>{t('auth.tagline')}</p>

      <form onSubmit={handleSubmit} className="login-form login-in" style={{ '--i': 3 } as CSSProperties}>
        <Label htmlFor="email">{t('auth.email')}</Label>
        <div className="login-input-wrap">
          <Mail size={17} strokeWidth={1.8} className="login-input-icon" />
          <Input
            id="email"
            type="email"
            required
            className="h-12 text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
          />
        </div>

        <Label htmlFor="password">{t('auth.password')}</Label>
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
            placeholder={t('auth.passwordPlaceholder')}
          />
        </div>

        {mode === 'signup' && (
          <>
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
          </>
        )}

        <div className="login-captcha">
          <CaptchaWidget
            ref={captchaRef}
            onSuccess={setCaptchaToken}
            onInvalidate={() => setCaptchaToken(null)}
          />
        </div>

        <Button type="submit" size="lg" className="h-12 text-base mt-2" disabled={busy || !captchaToken}>
          {busy
            ? mode === 'login' ? t('auth.loggingIn') : t('auth.signingUp')
            : mode === 'login' ? t('auth.login') : t('auth.signup')}
        </Button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {loginFailed && mode === 'login' && (
        <p className="login-nudge">
          {t('auth.nudgeQuestion')}{' '}
          <button type="button" className="login-nudge-link" onClick={goToSignupKeepingCredentials}>
            {t('auth.nudgeLink')}
          </button>
        </p>
      )}

      {mode === 'login' ? (
        resetSent ? (
          <p className="login-reset-sent">{t('auth.resetSent')}</p>
        ) : (
          <Button
            type="button"
            variant="link"
            className="login-forgot-link"
            onClick={handleForgotPassword}
            disabled={resetBusy || !captchaToken}
          >
            {resetBusy ? t('auth.sending') : t('auth.forgot')}
          </Button>
        )
      ) : null}

      {mode === 'login' ? (
        <div className="login-signup-cta">
          <span>{t('auth.noAccount')}</span>
          <button
            type="button"
            className="login-signup-cta-link"
            onClick={() => switchMode('signup')}
          >
            {t('auth.nudgeLink')}
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          className="login-forgot-link"
          onClick={() => switchMode('login')}
        >
          {t('auth.haveAccount')}
        </Button>
      )}
      <PrivacyLink />
    </div>
  );
}
