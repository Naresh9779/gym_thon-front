'use client';

import { useState } from 'react';
import Select from '@/components/ui/Select';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export default function SettingsPage() {
  const [units, setUnits] = useState('metric');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader title="Preferences" />
        <CardBody>
          <div className="space-y-4">
            <Select
              label="Units"
              value={units}
              onChange={(v) => setUnits(v)}
              options={[{ value: 'metric', label: 'Metric (kg, cm)' }, { value: 'imperial', label: 'Imperial (lb, in)' }]}
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
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
