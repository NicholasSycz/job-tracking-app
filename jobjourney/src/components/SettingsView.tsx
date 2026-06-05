import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Bell, Shield, Trash2, Save, Check, Target, CheckCircle2, XCircle, Calendar, Camera, Layers, Plus, X, RotateCcw } from 'lucide-react';
import { AuthUser, MonthlyGoal, UserSettings } from '../types';
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from '../config';
import { apiService } from '../services/apiService';
import MembersSettings from './MembersSettings';
import { DEFAULT_JOB_SOURCES, DEFAULT_RECRUITING_SERVICES, DEFAULT_INTERVIEW_TYPES } from '../constants';

function getAvatarUrl(user: AuthUser): string {
  if (user.avatarUrl) {
    return `${API_BASE_URL}${user.avatarUrl}`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`;
}

interface Props {
  user: AuthUser;
  onUpdateUser: (updates: Partial<AuthUser>) => void;
  onLogout: () => void;
  currentGoal: MonthlyGoal | null;
  goalHistory: MonthlyGoal[];
  onUpdateGoal: (target: number) => void;
  onUpdateGoalMet: (goalId: string, met: boolean) => void;
  userSettings: UserSettings | null;
  onUpdateSettings: (settings: UserSettings) => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SettingsView: React.FC<Props> = ({ user, onUpdateUser, onLogout, currentGoal, goalHistory, onUpdateGoal, onUpdateGoalMet, userSettings, onUpdateSettings }) => {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState(user.name);
  const [goalValue, setGoalValue] = useState(currentGoal?.target ?? 25);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job Sources state
  const [jobSources, setJobSources] = useState<{ value: string; label: string }[]>(
    userSettings?.jobSources ?? DEFAULT_JOB_SOURCES
  );
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [newSourceValue, setNewSourceValue] = useState('');
  const [isSavingSources, setIsSavingSources] = useState(false);

  // Recruiting Services state
  const [recruitingServices, setRecruitingServices] = useState<string[]>(
    userSettings?.recruitingServices ?? DEFAULT_RECRUITING_SERVICES
  );
  const [newService, setNewService] = useState('');
  const [isSavingServices, setIsSavingServices] = useState(false);

  // Interview Types state
  const [interviewTypes, setInterviewTypes] = useState<{ value: string; label: string }[]>(
    userSettings?.interviewTypes ?? DEFAULT_INTERVIEW_TYPES
  );
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [isSavingTypes, setIsSavingTypes] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setJobSources(userSettings.jobSources ?? DEFAULT_JOB_SOURCES);
      setRecruitingServices(userSettings.recruitingServices ?? DEFAULT_RECRUITING_SERVICES);
      setInterviewTypes(userSettings.interviewTypes ?? DEFAULT_INTERVIEW_TYPES);
    }
  }, [userSettings]);

  const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const handleAddSource = () => {
    const label = newSourceLabel.trim();
    if (!label) return;
    const value = newSourceValue.trim() || slugify(label);
    if (jobSources.find(s => s.value === value)) {
      showError('Duplicate', 'A source with that value already exists.');
      return;
    }
    setJobSources(prev => [...prev, { value, label }]);
    setNewSourceLabel('');
    setNewSourceValue('');
  };

  const handleSaveSources = async () => {
    setIsSavingSources(true);
    try {
      const updated = await apiService.updateSettings({ jobSources });
      onUpdateSettings({ ...userSettings!, ...updated });
      showSuccess('Saved', 'Job sources updated.');
    } catch {
      showError('Save Failed', 'Unable to save job sources.');
    } finally {
      setIsSavingSources(false);
    }
  };

  const handleResetSources = () => setJobSources(DEFAULT_JOB_SOURCES);

  const handleAddService = () => {
    const svc = newService.trim();
    if (!svc || recruitingServices.includes(svc)) return;
    setRecruitingServices(prev => [...prev, svc]);
    setNewService('');
  };

  const handleSaveServices = async () => {
    setIsSavingServices(true);
    try {
      const updated = await apiService.updateSettings({ recruitingServices });
      onUpdateSettings({ ...userSettings!, ...updated });
      showSuccess('Saved', 'Recruiting services updated.');
    } catch {
      showError('Save Failed', 'Unable to save recruiting services.');
    } finally {
      setIsSavingServices(false);
    }
  };

  const handleAddType = () => {
    const label = newTypeLabel.trim();
    if (!label) return;
    const value = slugify(label);
    if (interviewTypes.find(t => t.value === value)) {
      showError('Duplicate', 'An interview type with that value already exists.');
      return;
    }
    setInterviewTypes(prev => [...prev, { value, label }]);
    setNewTypeLabel('');
  };

  const handleSaveTypes = async () => {
    setIsSavingTypes(true);
    try {
      const updated = await apiService.updateSettings({ interviewTypes });
      onUpdateSettings({ ...userSettings!, ...updated });
      showSuccess('Saved', 'Interview types updated.');
    } catch {
      showError('Save Failed', 'Unable to save interview types.');
    } finally {
      setIsSavingTypes(false);
    }
  };

  const handleResetTypes = () => setInterviewTypes(DEFAULT_INTERVIEW_TYPES);

  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      showSuccess('Password Updated', 'Your password has been changed.');
      resetPasswordForm();
      setIsPasswordFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to change password.';
      setPasswordError(message);
      showError('Change Failed', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (currentGoal) {
      setGoalValue(currentGoal.target);
    }
  }, [currentGoal]);

  const handleSaveGoal = () => {
    if (goalValue !== currentGoal?.target) {
      onUpdateGoal(goalValue);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const data = await response.json();
      onUpdateUser({ name: data.user.name });
      setSaveSuccess(true);
      showSuccess('Profile Updated', 'Your profile has been saved.');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      showError('Update Failed', err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      onUpdateUser({ avatarUrl: `${data.user.avatarUrl}?t=${Date.now()}` });
      showSuccess('Avatar Updated', 'Your profile photo has been updated.');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      showError('Upload Failed', err instanceof Error ? err.message : 'Unable to upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Past goals (exclude current month)
  const pastGoals = goalHistory.filter(g => !(g.month === currentMonth && g.year === currentYear));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      {/* Profile Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <User className="text-emerald-600 dark:text-emerald-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profile</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your personal information</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img
                src={getAvatarUrl(user)}
                className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
                alt="Avatar"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-full bg-slate-900/0 group-hover:bg-slate-900/50 flex items-center justify-center transition-all cursor-pointer"
              >
                {isUploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Click your avatar to upload a photo
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG, or WebP. Max 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || name === user.name}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saveSuccess ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* Monthly Goal Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Target className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Monthly Goal</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Set your application target for {MONTH_NAMES[(currentMonth - 1)]} {currentYear}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Target Applications
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={goalValue}
                onChange={(e) => setGoalValue(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={goalValue === currentGoal?.target}
              className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold transition-all disabled:cursor-not-allowed"
            >
              Update Goal
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            This sets your target for the current month. Past months are tracked below.
          </p>
        </div>
      </section>

      {/* Goal History */}
      {pastGoals.length > 0 && (
        <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Goal History</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track your monthly goal performance</p>
            </div>
          </div>

          <div className="space-y-3">
            {pastGoals.map((goal) => (
              <div
                key={goal.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  goal.met
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    goal.met
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {goal.met ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {MONTH_NAMES[goal.month - 1]} {goal.year}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Target: {goal.target} applications
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onUpdateGoalMet(goal.id, !goal.met)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    goal.met
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {goal.met ? 'Met' : 'Not Met'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members Section */}
      <MembersSettings currentUser={user} />

      {/* Job Sources Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
            <Layers className="text-violet-600 dark:text-violet-400" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Job Sources</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Customize the job board options shown in the application form</p>
          </div>
          <button
            onClick={handleResetSources}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <RotateCcw size={13} /> Reset to defaults
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {jobSources.map(src => (
            <div key={src.value} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{src.label}</span>
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-600 font-mono">{src.value}</span>
              </div>
              <button
                onClick={() => setJobSources(prev => prev.filter(s => s.value !== src.value))}
                className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Label (e.g. Wantedly)"
            value={newSourceLabel}
            onChange={e => {
              setNewSourceLabel(e.target.value);
              setNewSourceValue(slugify(e.target.value));
            }}
            onKeyDown={e => e.key === 'Enter' && handleAddSource()}
            className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-400 text-slate-800 dark:text-slate-200"
          />
          <input
            type="text"
            placeholder="Value (auto)"
            value={newSourceValue}
            onChange={e => setNewSourceValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddSource()}
            className="w-32 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-400 text-slate-800 dark:text-slate-200 font-mono"
          />
          <button
            onClick={handleAddSource}
            disabled={!newSourceLabel.trim()}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={handleSaveSources}
          disabled={isSavingSources}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {isSavingSources ? 'Saving…' : 'Save Sources'}
        </button>
      </section>

      {/* Recruiting Services Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <User className="text-indigo-600 dark:text-indigo-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recruiting Services</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Build your list of recruiting agencies for quick selection in the application form</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {recruitingServices.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-600 italic">No services added yet. Add agencies below.</p>
          )}
          {recruitingServices.map(svc => (
            <div key={svc} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{svc}</span>
              <button
                onClick={() => setRecruitingServices(prev => prev.filter(s => s !== svc))}
                className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="e.g. Hays, Robert Half, Michael Page…"
            value={newService}
            onChange={e => setNewService(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddService()}
            className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleAddService}
            disabled={!newService.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={handleSaveServices}
          disabled={isSavingServices}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {isSavingServices ? 'Saving…' : 'Save Services'}
        </button>
      </section>

      {/* Interview Types Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Layers className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Interview Types</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Customize the interview round types available in the application form</p>
          </div>
          <button
            onClick={handleResetTypes}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <RotateCcw size={13} /> Reset to defaults
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {interviewTypes.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-600 italic">No interview types yet. Add some below.</p>
          )}
          {interviewTypes.map(t => (
            <div key={t.value} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.label}</span>
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-600 font-mono">{t.value}</span>
              </div>
              <button
                onClick={() => setInterviewTypes(prev => prev.filter(x => x.value !== t.value))}
                className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="e.g. Technical, Culture Fit, System Design…"
            value={newTypeLabel}
            onChange={e => setNewTypeLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddType()}
            className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-400 text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleAddType}
            disabled={!newTypeLabel.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={handleSaveTypes}
          disabled={isSavingTypes}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {isSavingTypes ? 'Saving…' : 'Save Types'}
        </button>
      </section>

      {/* Notifications Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Bell className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure how you receive updates</p>
          </div>
        </div>

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
      </section>

      {/* Security Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <Shield className="text-amber-600 dark:text-amber-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Security</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account security</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">Password</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isPasswordFormOpen ? 'Enter your current and new password' : 'Update the password used to sign in'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (isPasswordFormOpen) {
                    resetPasswordForm();
                    setIsPasswordFormOpen(false);
                  } else {
                    setIsPasswordFormOpen(true);
                  }
                }}
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                {isPasswordFormOpen ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {isPasswordFormOpen && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    Current Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                      New Password
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                    />
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-rose-600 dark:text-rose-400">{passwordError}</p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Active Sessions</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">1 active session on this device</p>
            </div>
            <button className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              View All
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
            <Trash2 className="text-rose-600 dark:text-rose-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400">Danger Zone</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Irreversible account actions</p>
          </div>
        </div>

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
      </section>
    </div>
  );
};

const ToggleOption = ({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) => {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
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

export default SettingsView;
