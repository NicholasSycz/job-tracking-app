import React, { useState, useEffect } from 'react';
import { Layers, Plus } from 'lucide-react';

import { UserSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/apiService';
import { DEFAULT_JOB_SOURCES } from '../../constants';
import ListEditor from './ListEditor';
import { slugify } from './slugify';

interface Props {
  userSettings: UserSettings | null;
  onUpdateSettings: (settings: UserSettings) => void;
}

const JobSourcesSection: React.FC<Props> = ({ userSettings, onUpdateSettings }) => {
  const { showSuccess, showError } = useToast();
  const [jobSources, setJobSources] = useState<{ value: string; label: string }[]>(
    userSettings?.jobSources ?? DEFAULT_JOB_SOURCES
  );
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setJobSources(userSettings.jobSources ?? DEFAULT_JOB_SOURCES);
    }
  }, [userSettings]);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const value = newValue.trim() || slugify(label);
    if (jobSources.find(s => s.value === value)) {
      showError('Duplicate', 'A source with that value already exists.');
      return;
    }
    setJobSources(prev => [...prev, { value, label }]);
    setNewLabel('');
    setNewValue('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.updateSettings({ jobSources });
      onUpdateSettings({ ...userSettings!, ...updated });
      showSuccess('Saved', 'Job sources updated.');
    } catch {
      showError('Save Failed', 'Unable to save job sources.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListEditor
      icon={<Layers className="text-violet-600 dark:text-violet-400" size={20} />}
      iconClass="bg-violet-100 dark:bg-violet-900/30"
      title="Job Sources"
      description="Customize the job board options shown in the application form"
      items={jobSources.map(s => ({ key: s.value, label: s.label, secondary: s.value }))}
      onRemove={key => setJobSources(prev => prev.filter(s => s.value !== key))}
      onReset={() => setJobSources(DEFAULT_JOB_SOURCES)}
      isSaving={isSaving}
      saveLabel="Save Sources"
      onSave={handleSave}
    >
      <input
        type="text"
        placeholder="Label (e.g. Wantedly)"
        value={newLabel}
        onChange={e => {
          setNewLabel(e.target.value);
          setNewValue(slugify(e.target.value));
        }}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-400 text-slate-800 dark:text-slate-200"
      />
      <input
        type="text"
        placeholder="Value (auto)"
        value={newValue}
        onChange={e => setNewValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="w-32 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-400 text-slate-800 dark:text-slate-200 font-mono"
      />
      <button
        onClick={handleAdd}
        disabled={!newLabel.trim()}
        aria-label="Add job source"
        className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl transition-colors"
      >
        <Plus size={16} />
      </button>
    </ListEditor>
  );
};

export default React.memo(JobSourcesSection);
