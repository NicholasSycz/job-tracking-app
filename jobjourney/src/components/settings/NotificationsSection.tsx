import React, { useState } from 'react';
import { Bell } from 'lucide-react';

import SettingsSection from './SettingsSection';

const ToggleOption: React.FC<{
  label: string;
  description: string;
  defaultChecked: boolean;
}> = ({ label, description, defaultChecked }) => {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

const NotificationsSection: React.FC = () => (
  <SettingsSection
    icon={<Bell className="text-blue-600 dark:text-blue-400" size={20} />}
    iconClass="bg-blue-100 dark:bg-blue-900/30"
    title="Notifications"
    description="Configure how you receive updates"
  >
    <div className="space-y-4">
      <ToggleOption
        label="Email reminders"
        description="Receive weekly summaries of your job search progress"
        defaultChecked={false}
      />
      <ToggleOption
        label="Application follow-ups"
        description="Get reminded to follow up on applications after 7 days"
        defaultChecked={true}
      />
      <ToggleOption
        label="Interview preparation"
        description="Receive tips and reminders before scheduled interviews"
        defaultChecked={true}
      />
    </div>
  </SettingsSection>
);

export default React.memo(NotificationsSection);
