'use client';

import { useState, useEffect } from 'react';
import Select from '@/components/ui/Select';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [units, setUnits] = useState('metric');
  const [notifications, setNotifications] = useState(true);
  const [timezone, setTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      // Check if user has 'imperial' in preferences
      const hasImperial = user.profile.preferences?.includes('imperial');
      setUnits(hasImperial ? 'imperial' : 'metric');
      
      // Check if user has 'notifications' enabled
      const hasNotifications = user.profile.preferences?.includes('notifications');
      setNotifications(hasNotifications ?? true);
      
      setTimezone(user.profile.timezone || 'UTC');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const preferences = [];
      if (units === 'imperial') preferences.push('imperial');
      if (notifications) preferences.push('notifications');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preferences,
          timezone
        })
      });

      if (response.ok) {
        alert('Settings saved successfully!');
        await refreshUser();
      } else {
        const data = await response.json();
        alert(`Failed to save settings: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader title="Preferences" />
        <CardBody>
          <div className="space-y-6">
            <Select
              label="Units"
              value={units}
              onChange={(v) => setUnits(v)}
              options={[{ value: 'metric', label: 'Metric (kg, cm)' }, { value: 'imperial', label: 'Imperial (lb, in)' }]}
            />

            <Select
              label="Timezone"
              value={timezone}
              onChange={(v) => setTimezone(v)}
              options={[
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'Eastern Time (ET)' },
                { value: 'America/Chicago', label: 'Central Time (CT)' },
                { value: 'America/Denver', label: 'Mountain Time (MT)' },
                { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' }
              ]}
            />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-gray-500">Receive push notifications for workout reminders</p>
              </div>
              <label className="inline-flex relative items-center cursor-pointer">
                <input type="checkbox" checked={notifications} onChange={() => setNotifications((s) => !s)} className="sr-only peer" />
                <div className={`w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors`} />
              </label>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
