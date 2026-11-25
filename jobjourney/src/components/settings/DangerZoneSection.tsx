import React from 'react';
import { Trash2 } from 'lucide-react';

import SettingsSection from './SettingsSection';

const DangerZoneSection: React.FC = () => (
  <SettingsSection
    icon={<Trash2 className="text-rose-600 dark:text-rose-400" size={20} />}
    iconClass="bg-rose-100 dark:bg-rose-900/30"
    title="Danger Zone"
    titleClass="text-rose-600 dark:text-rose-400"
    description="Irreversible account actions"
    borderClass="border-rose-200 dark:border-rose-900/50"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-200">Delete Account</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Permanently delete your account and all data</p>
      </div>
      <button className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
        <Trash2 size={16} />
        Delete Account
      </button>
    </div>
  </SettingsSection>
);

export default React.memo(DangerZoneSection);
