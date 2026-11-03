import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { RotateCcw, WifiOff, TriangleAlert, PlayCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useI18n } from '../../i18n/I18nContext';
import type { LanguagePreference } from '../../i18n/language';
import { scheduleMonthlyReminder } from '../../lib/notifications';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { ApplianceVisual } from '../../components/ApplianceVisual';
import { DayOfMonthPicker } from '../../components/DayOfMonthPicker';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { PrivacyLink } from '../../components/PrivacyLink';
import { HoldToConfirmButton } from '../../components/HoldToConfirmButton';
import './ProfileScreen.css';

const LANGUAGE_OPTIONS: LanguagePreference[] = ['auto', 'tr', 'en'];

export function ProfileScreen() {
  const { t, lang, preference, setPreference, deviceName } = useI18n();
  const [reminderDay, setReminderDay] = useState(5);
  const [budgetTl, setBudgetTl] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [watts, setWatts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAllDevices, setShowAllDevices] = useState(false);
  const onboarding = useOnboarding();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setEmail(userData.user?.email ?? '');
      if (!userData.user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('reminder_day, budget_tl')
        .eq('id', userData.user.id)
        .single();
      // PGRST116 = no profile row yet (brand-new user) — not a fetch failure,
      // just keep the default reminder day.
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (profile) {
        setReminderDay(profile.reminder_day);
        setBudgetTl(profile.budget_tl);
      }

      const { data: overrides, error: overridesError } = await supabase
        .from('user_devices')
        .select('device_key, watt')
        .eq('is_custom', false);
      if (overridesError) throw overridesError;

      const map = new Map<string, number>();
      for (const row of overrides ?? []) {
        if (row.device_key) map.set(row.device_key, row.watt);
      }
      setWatts(map);
    } catch (err) {
      console.error('ProfileScreen: profil verileri yüklenemedi', err);
      setError(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveReminderDay(day: number) {
    const previous = reminderDay;
    setReminderDay(day);
    setSaveError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: userData.user.id, reminder_day: day });
      if (upsertError) throw upsertError;
      await scheduleMonthlyReminder(day, lang);
    } catch (err) {
      console.error('ProfileScreen: hatırlatma günü kaydedilemedi', err);
      setReminderDay(previous);
      setSaveError(t('profile.saveError'));
    }
  }

  async function saveBudget(value: number | null) {
    const previous = budgetTl;
    setBudgetTl(value);
    setSaveError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: userData.user.id, budget_tl: value });
      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('ProfileScreen: bütçe hedefi kaydedilemedi', err);
      setBudgetTl(previous);
      setSaveError(t('profile.saveError'));
    }
  }

  async function saveWatt(deviceKey: string, watt: number) {
    const previous = watts.get(deviceKey);
    setWatts((prev) => new Map(prev).set(deviceKey, watt));
    setSaveError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error: upsertError } = await supabase
        .from('user_devices')
        .upsert(
          { user_id: userData.user.id, device_key: deviceKey, watt, is_custom: false },
          { onConflict: 'user_id,device_key' }
        );
      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('ProfileScreen: watt değeri kaydedilemedi', err);
      setWatts((prev) => {
        const next = new Map(prev);
        if (previous === undefined) next.delete(deviceKey);
        else next.set(deviceKey, previous);
        return next;
      });
      setSaveError(t('profile.saveError'));
    }
  }

  function changeLanguage(next: LanguagePreference) {
    setPreference(next);
    // Re-schedule an already-permitted reminder so its text follows the new language.
    const nextLang = next === 'auto' ? lang : next;
    void scheduleMonthlyReminder(reminderDay, nextLang, { requestPermission: false }).catch(() => {});
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });
      if (invokeError || data?.error) throw invokeError ?? new Error(data.error);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('ProfileScreen: hesap silinemedi', err);
      setDeleteError(t('profile.deleteError'));
      setDeleting(false);
    }
  }

  const DEVICES_COLLAPSED_COUNT = 4;
  const visibleDevices = showAllDevices
    ? DEVICE_CATALOG
    : DEVICE_CATALOG.filter(
        (device, i) =>
          i < DEVICES_COLLAPSED_COUNT ||
          (watts.get(device.key) ?? device.defaultWatt) !== device.defaultWatt
      );
  const hiddenDeviceCount = DEVICE_CATALOG.length - visibleDevices.length;

  return (
    <div className="profile-shell">
      <h1 className="display profile-in" style={{ '--i': 0 } as CSSProperties}>{t('profile.title')}</h1>

      {loading ? (
        <Card className="profile-card profile-in" style={{ '--i': 1 } as CSSProperties}>
          <CardContent>
            <div className="profile-field">
              <Skeleton className="profile-skeleton-label" />
              <Skeleton className="profile-skeleton-value" />
            </div>
            <div className="profile-field profile-field-stack">
              <Skeleton className="profile-skeleton-label" />
              <Skeleton className="profile-skeleton-picker" />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="profile-card profile-in" style={{ '--i': 1 } as CSSProperties}>
          <CardContent className="profile-error">
            <div className="empty-icon-badge profile-error-icon">
              <WifiOff size={22} strokeWidth={1.6} />
            </div>
            <p>{error}</p>
            <button type="button" className="profile-retry-btn" onClick={load}>
              {t('profile.retry')}
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="profile-card profile-in" style={{ '--i': 1 } as CSSProperties}>
          <CardContent>
            <div className="profile-field">
              <Label>{t('profile.account')}</Label>
              <span className="mono">{email}</span>
            </div>
            <div className="profile-field profile-field-stack">
              <Label id="reminderDayLabel">{t('profile.reminderDay')}</Label>
              <DayOfMonthPicker value={reminderDay} onChange={saveReminderDay} labelId="reminderDayLabel" />
            </div>
            <div className="profile-field">
              <Label htmlFor="budgetTl">{t('profile.budget')}</Label>
              <div className="profile-budget-input">
                <Input
                  id="budgetTl"
                  type="number"
                  min={1}
                  placeholder={t('profile.budgetPlaceholder')}
                  className="profile-num-input"
                  value={budgetTl ?? ''}
                  onChange={(e) => setBudgetTl(e.target.value === '' ? null : Number(e.target.value))}
                  onBlur={(e) => saveBudget(e.target.value === '' ? null : Number(e.target.value))}
                />
                <span className="unit">TL</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="profile-card profile-in" style={{ '--i': 2 } as CSSProperties}>
        <CardContent>
          <div className="profile-field profile-field-stack">
            <Label id="languageLabel">{t('profile.language')}</Label>
            <div className="profile-lang-group" role="radiogroup" aria-labelledby="languageLabel">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={preference === option}
                  className="profile-lang-option"
                  onClick={() => changeLanguage(option)}
                >
                  {option === 'auto' ? t('profile.languageAuto') : option === 'tr' ? 'Türkçe' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="profile-card profile-in" style={{ '--i': 3 } as CSSProperties}>
        <CardHeader>
          <CardTitle>{t('profile.wattTitle')}</CardTitle>
          <CardDescription>
            {t('profile.wattDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading
            ? [0, 1, 2, 3, 4].map((i) => (
                <div className="profile-device-row" key={i} aria-hidden="true">
                  <Skeleton className="profile-device-icon" />
                  <Skeleton className="profile-skeleton-name" />
                  <Skeleton className="profile-skeleton-input" />
                </div>
              ))
            : visibleDevices.map((device, i) => {
                const isOverridden = (watts.get(device.key) ?? device.defaultWatt) !== device.defaultWatt;
                return (
                  <div
                    className="profile-device-row profile-row-in"
                    key={device.key}
                    style={{ '--i': Math.min(i, 12) } as CSSProperties}
                  >
                    <div className="profile-device-icon">
                      <ApplianceVisual iconKey={device.iconKey} size={17} imageSize={25} />
                    </div>
                    <span>{deviceName(device.key, device.name)}</span>
                    {isOverridden && (
                      <button
                        type="button"
                        className="profile-watt-reset"
                        aria-label={t('profile.resetWatt')}
                        onClick={() => saveWatt(device.key, device.defaultWatt)}
                      >
                        <RotateCcw size={14} strokeWidth={2} />
                      </button>
                    )}
                    <Input
                      type="number"
                      aria-label={t('profile.wattAria', { name: deviceName(device.key, device.name) })}
                      className="profile-num-input profile-watt-input"
                      value={watts.get(device.key) ?? device.defaultWatt}
                      onChange={(e) => saveWatt(device.key, Number(e.target.value))}
                    />
                  </div>
                );
              })}
          {!loading && (hiddenDeviceCount > 0 || showAllDevices) && (
            <button
              type="button"
              className="profile-devices-toggle"
              onClick={() => setShowAllDevices((v) => !v)}
            >
              {showAllDevices ? t('profile.showLess') : t('profile.showAll', { count: hiddenDeviceCount })}
            </button>
          )}
        </CardContent>
      </Card>

      {saveError && (
        <div className="profile-save-error" role="alert">
          <WifiOff size={15} strokeWidth={1.8} />
          <span>{saveError}</span>
        </div>
      )}

      <Button
        variant="ghost"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 4 } as CSSProperties}
        onClick={onboarding.show}
      >
        <PlayCircle strokeWidth={1.8} />
        {t('profile.replayTour')}
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 5 } as CSSProperties}
        onClick={signOut}
      >
        {t('profile.signOut')}
      </Button>

      <PrivacyLink />

      <div className="profile-danger-zone profile-in" style={{ '--i': 6 } as CSSProperties}>
        {!confirmingDelete ? (
          <Button variant="link" className="profile-delete-link" onClick={() => setConfirmingDelete(true)}>
            {t('profile.deleteLink')}
          </Button>
        ) : (
          <div className="profile-delete-confirm">
            <TriangleAlert size={16} strokeWidth={1.8} />
            <p>{t('profile.deleteWarning')}</p>
            <div className="profile-delete-confirm-actions">
              <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                {t('profile.cancel')}
              </Button>
              <HoldToConfirmButton
                className="profile-hold-delete"
                onConfirm={deleteAccount}
                disabled={deleting}
                idleLabel={deleting ? t('profile.deleting') : t('profile.holdToDelete')}
                holdingLabel={t('profile.holdingDelete')}
              />
            </div>
          </div>
        )}
        {deleteError && (
          <div className="profile-save-error" role="alert">
            <WifiOff size={15} strokeWidth={1.8} />
            <span>{deleteError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
