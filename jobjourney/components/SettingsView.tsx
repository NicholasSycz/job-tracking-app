import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, Shield, Trash2, Save, Check, Target } from 'lucide-react';
import { AuthUser } from '../types';
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from '../config';

interface Props {
  user: AuthUser;
  onUpdateUser: (updates: Partial<AuthUser>) => void;
  onLogout: () => void;
  applicationGoal?: number;
  onUpdateGoal?: (goal: number) => void;
}

const SettingsView: React.FC<Props> = ({ user, onUpdateUser, onLogout, applicationGoal = 25, onUpdateGoal }) => {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState(user.name);
  const [goalValue, setGoalValue] = useState(applicationGoal);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update goalValue when applicationGoal prop changes
  useEffect(() => {
    setGoalValue(applicationGoal);
  }, [applicationGoal]);

  const handleSaveGoal = () => {
    if (onUpdateGoal && goalValue !== applicationGoal) {
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
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`}
              className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40"
              alt="Avatar"
            />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your avatar is generated from your email</p>
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

      {/* Goals Section */}
      <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Target className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Application Goal</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Set your target number of applications</p>
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
              disabled={goalValue === applicationGoal}
              className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold transition-all disabled:cursor-not-allowed"
            >
              Update Goal
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            This goal will be displayed on your dashboard to help track your progress.
          </p>
        </div>
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
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Password</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Last changed: Never</p>
            </div>
            <button className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
              Change Password
            </button>
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
