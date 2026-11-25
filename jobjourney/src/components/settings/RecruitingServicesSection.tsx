import React, { useState, useEffect } from 'react';
import { User, Plus } from 'lucide-react';

import { UserSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/apiService';
import { DEFAULT_RECRUITING_SERVICES } from '../../constants';
import ListEditor from './ListEditor';

interface Props {
  userSettings: UserSettings | null;
  onUpdateSettings: (settings: UserSettings) => void;
}

const RecruitingServicesSection: React.FC<Props> = ({ userSettings, onUpdateSettings }) => {
  const { showSuccess, showError } = useToast();
  const [recruitingServices, setRecruitingServices] = useState<string[]>(
    userSettings?.recruitingServices ?? DEFAULT_RECRUITING_SERVICES
  );
  const [newService, setNewService] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setRecruitingServices(userSettings.recruitingServices ?? DEFAULT_RECRUITING_SERVICES);
    }
  }, [userSettings]);

  const handleAdd = () => {
    const svc = newService.trim();
    if (!svc || recruitingServices.includes(svc)) return;
    setRecruitingServices(prev => [...prev, svc]);
    setNewService('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.updateSettings({ recruitingServices });
      onUpdateSettings({ ...userSettings!, ...updated });
      showSuccess('Saved', 'Recruiting services updated.');
    } catch {
      showError('Save Failed', 'Unable to save recruiting services.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ListEditor
      icon={<User className="text-indigo-600 dark:text-indigo-400" size={20} />}
      iconClass="bg-indigo-100 dark:bg-indigo-900/30"
      title="Recruiting Services"
      description="Build your list of recruiting agencies for quick selection in the application form"
      items={recruitingServices.map(svc => ({ key: svc, label: svc }))}
      emptyMessage="No services added yet. Add agencies below."
      onRemove={key => setRecruitingServices(prev => prev.filter(s => s !== key))}
      isSaving={isSaving}
      saveLabel="Save Services"
      onSave={handleSave}
    >
      <input
        type="text"
        placeholder="e.g. Hays, Robert Half, Michael Page…"
        value={newService}
        onChange={e => setNewService(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200"
      />
      <button
        onClick={handleAdd}
        disabled={!newService.trim()}
        aria-label="Add recruiting service"
        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors"
      >
        <Plus size={16} />
      </button>
    </ListEditor>
  );
};

export default React.memo(RecruitingServicesSection);
