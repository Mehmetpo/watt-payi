import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { RotateCcw, WifiOff, TriangleAlert } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { scheduleMonthlyReminder } from '../../lib/notifications';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { ApplianceIcon } from '../../components/ApplianceIcon';
import { DayOfMonthPicker } from '../../components/DayOfMonthPicker';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import './ProfileScreen.css';

export function ProfileScreen() {
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
      setError('Profil yüklenemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      await scheduleMonthlyReminder(day);
    } catch (err) {
      console.error('ProfileScreen: hatırlatma günü kaydedilemedi', err);
      setReminderDay(previous);
      setSaveError('Değişiklik kaydedilemedi. Tekrar dene.');
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
      setSaveError('Değişiklik kaydedilemedi. Tekrar dene.');
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
      setSaveError('Değişiklik kaydedilemedi. Tekrar dene.');
    }
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
      setDeleteError('Hesap silinemedi. Bağlantını kontrol edip tekrar dene.');
      setDeleting(false);
    }
  }

  return (
    <div className="profile-shell">
      <h1 className="display profile-in" style={{ '--i': 0 } as CSSProperties}>Profil</h1>

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
              Tekrar dene
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="profile-card profile-in" style={{ '--i': 1 } as CSSProperties}>
          <CardContent>
            <div className="profile-field">
              <Label>Hesap</Label>
              <span className="mono">{email}</span>
            </div>
            <div className="profile-field profile-field-stack">
              <Label id="reminderDayLabel">Ayın kaçında hatırlat</Label>
              <DayOfMonthPicker value={reminderDay} onChange={saveReminderDay} labelId="reminderDayLabel" />
            </div>
            <div className="profile-field">
              <Label htmlFor="budgetTl">Aylık bütçe hedefi</Label>
              <div className="profile-budget-input">
                <Input
                  id="budgetTl"
                  type="number"
                  min={1}
                  placeholder="Belirlenmedi"
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
        <CardHeader>
          <CardTitle>Varsayılan watt değerleri</CardTitle>
          <CardDescription>
            Her cihazın ortalama güç tüketimi (watt). Hesaplamalarda bu değerler kullanılır —
            kendi cihazın farklıysa üzerine dokunup düzenleyebilirsin.
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
            : DEVICE_CATALOG.map((device, i) => {
                const isOverridden = (watts.get(device.key) ?? device.defaultWatt) !== device.defaultWatt;
                return (
                  <div
                    className="profile-device-row profile-row-in"
                    key={device.key}
                    style={{ '--i': Math.min(i, 12) } as CSSProperties}
                  >
                    <div className="profile-device-icon">
                      <ApplianceIcon iconKey={device.iconKey} size={17} />
                    </div>
                    <span>{device.name}</span>
                    {isOverridden && (
                      <button
                        type="button"
                        className="profile-watt-reset"
                        aria-label="Varsayılana dön"
                        onClick={() => saveWatt(device.key, device.defaultWatt)}
                      >
                        <RotateCcw size={14} strokeWidth={2} />
                      </button>
                    )}
                    <Input
                      type="number"
                      aria-label={`${device.name} watt değeri`}
                      className="profile-num-input profile-watt-input"
                      value={watts.get(device.key) ?? device.defaultWatt}
                      onChange={(e) => saveWatt(device.key, Number(e.target.value))}
                    />
                  </div>
                );
              })}
        </CardContent>
      </Card>

      {saveError && (
        <div className="profile-save-error" role="alert">
          <WifiOff size={15} strokeWidth={1.8} />
          <span>{saveError}</span>
        </div>
      )}

      <Button
        variant="destructive"
        size="lg"
        className="w-full h-12 text-base profile-in"
        style={{ '--i': 3 } as CSSProperties}
        onClick={signOut}
      >
        Çıkış yap
      </Button>

      <div className="profile-danger-zone profile-in" style={{ '--i': 4 } as CSSProperties}>
        {!confirmingDelete ? (
          <Button variant="link" className="profile-delete-link" onClick={() => setConfirmingDelete(true)}>
            Hesabımı kalıcı olarak sil
          </Button>
        ) : (
          <div className="profile-delete-confirm">
            <TriangleAlert size={16} strokeWidth={1.8} />
            <p>Bu işlem geri alınamaz. Tüm faturaların ve cihaz verilerin kalıcı olarak silinir.</p>
            <div className="profile-delete-confirm-actions">
              <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Vazgeç
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteAccount} disabled={deleting}>
                {deleting ? 'Siliniyor...' : 'Evet, hesabımı sil'}
              </Button>
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
