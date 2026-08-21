import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { scheduleMonthlyReminder } from '../../lib/notifications';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { ApplianceIcon } from '../../components/ApplianceIcon';
import { DayOfMonthPicker } from '../../components/DayOfMonthPicker';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import './ProfileScreen.css';

export function ProfileScreen() {
  const [reminderDay, setReminderDay] = useState(5);
  const [email, setEmail] = useState('');
  const [watts, setWatts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? '');
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('reminder_day')
        .eq('id', userData.user.id)
        .single();
      if (profile) setReminderDay(profile.reminder_day);

      const { data: overrides } = await supabase
        .from('user_devices')
        .select('device_key, watt')
        .eq('is_custom', false);

      const map = new Map<string, number>();
      for (const row of overrides ?? []) {
        if (row.device_key) map.set(row.device_key, row.watt);
      }
      setWatts(map);
    }
    load();
  }, []);

  async function saveReminderDay(day: number) {
    setReminderDay(day);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').upsert({ id: userData.user.id, reminder_day: day });
    await scheduleMonthlyReminder(day);
  }

  async function saveWatt(deviceKey: string, watt: number) {
    setWatts((prev) => new Map(prev).set(deviceKey, watt));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase
      .from('user_devices')
      .upsert(
        { user_id: userData.user.id, device_key: deviceKey, watt, is_custom: false },
        { onConflict: 'user_id,device_key' }
      );
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="profile-shell">
      <h1 className="display">Profil</h1>

      <Card className="profile-card">
        <CardContent>
          <div className="profile-field">
            <Label>Hesap</Label>
            <span className="mono">{email}</span>
          </div>
          <div className="profile-field profile-field-stack">
            <Label id="reminderDayLabel">Ayın kaçında hatırlat</Label>
            <DayOfMonthPicker value={reminderDay} onChange={saveReminderDay} />
          </div>
        </CardContent>
      </Card>

      <Card className="profile-card">
        <CardHeader>
          <CardTitle>Varsayılan watt değerleri</CardTitle>
        </CardHeader>
        <CardContent>
          {DEVICE_CATALOG.map((device) => {
            const isOverridden = (watts.get(device.key) ?? device.defaultWatt) !== device.defaultWatt;
            return (
              <div className="profile-device-row" key={device.key}>
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
                    <RotateCcw size={13} strokeWidth={2} />
                  </button>
                )}
                <Input
                  type="number"
                  className="profile-num-input profile-watt-input"
                  value={watts.get(device.key) ?? device.defaultWatt}
                  onChange={(e) => saveWatt(device.key, Number(e.target.value))}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button variant="destructive" size="lg" className="w-full h-12 text-base" onClick={signOut}>
        Çıkış yap
      </Button>
    </div>
  );
}
