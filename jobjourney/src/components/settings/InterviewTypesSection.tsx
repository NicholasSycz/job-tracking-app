import React, { useState, useEffect } from 'react';
import { Layers, Plus } from 'lucide-react';

import { UserSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/apiService';
import { DEFAULT_INTERVIEW_TYPES } from '../../constants';
import ListEditor from './ListEditor';
import { slugify } from './slugify';

interface Props {
  userSettings: UserSettings | null;
  onUpdateSettings: (settings: UserSettings) => void;
}

const InterviewTypesSection: React.FC<Props> = ({ userSettings, onUpdateSettings }) => {
  const { showSuccess, showError } = useToast();
  const [interviewTypes, setInterviewTypes] = useState<{ value: string; label: string }[]>(
    userSettings?.interviewTypes ?? DEFAULT_INTERVIEW_TYPES
  );
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setInterviewTypes(userSettings.interviewTypes ?? DEFAULT_INTERVIEW_TYPES);
    }
  }, [userSettings]);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const value = slugify(label);
    if (interviewTypes.find(t => t.value === value)) {
      showError('Duplicate', 'An interview type with that value already exists.');
      return;
    }
    setInterviewTypes(prev => [...prev, { value, label }]);
    setNewLabel('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.updateSettings({ interviewTypes });
      onUpdateSettings({ ...userSettings!, ...updated });
      showSuccess('Saved', 'Interview types updated.');
    } catch {
      showError('Save Failed', 'Unable to save interview types.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListEditor
      icon={<Layers className="text-blue-600 dark:text-blue-400" size={20} />}
      iconClass="bg-blue-100 dark:bg-blue-900/30"
      title="Interview Types"
      description="Customize the interview round types available in the application form"
      items={interviewTypes.map(t => ({ key: t.value, label: t.label, secondary: t.value }))}
      emptyMessage="No interview types yet. Add some below."
      onRemove={key => setInterviewTypes(prev => prev.filter(t => t.value !== key))}
      onReset={() => setInterviewTypes(DEFAULT_INTERVIEW_TYPES)}
      isSaving={isSaving}
      saveLabel="Save Types"
      onSave={handleSave}
    >
      <input
        type="text"
        placeholder="e.g. Technical, Culture Fit, System Design…"
        value={newLabel}
        onChange={e => setNewLabel(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-400 text-slate-800 dark:text-slate-200"
      />
      <button
        onClick={handleAdd}
        disabled={!newLabel.trim()}
        aria-label="Add interview type"
        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
      >
        <Plus size={16} />
      </button>
    </ListEditor>
  );
};

export default React.memo(InterviewTypesSection);
