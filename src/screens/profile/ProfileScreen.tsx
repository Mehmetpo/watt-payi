import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { scheduleMonthlyReminder } from '../../lib/notifications';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
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
      <div className="profile-card">
        <div className="profile-field">
          <span>Hesap</span>
          <span className="mono">{email}</span>
        </div>
        <div className="profile-field">
          <span>Ayın kaçında hatırlat</span>
          <input
            type="number"
            min={1}
            max={28}
            value={reminderDay}
            onChange={(e) => saveReminderDay(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="profile-card">
        <h3>Varsayılan watt değerleri</h3>
        {DEVICE_CATALOG.map((device) => (
          <div className="profile-device-row" key={device.key}>
            <span>{device.name}</span>
            <input
              type="number"
              value={watts.get(device.key) ?? device.defaultWatt}
              onChange={(e) => saveWatt(device.key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <button className="profile-signout" onClick={signOut}>Çıkış yap</button>
    </div>
  );
}
