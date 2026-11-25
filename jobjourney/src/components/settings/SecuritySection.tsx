import React, { useState } from 'react';
import { Shield, Save } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/apiService';
import SettingsSection from './SettingsSection';

const SecuritySection: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setIsChanging(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      showSuccess('Password Updated', 'Your password has been changed.');
      resetForm();
      setIsFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to change password.';
      setError(message);
      showError('Change Failed', message);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <SettingsSection
      icon={<Shield className="text-amber-600 dark:text-amber-400" size={20} />}
      iconClass="bg-amber-100 dark:bg-amber-900/30"
      title="Security"
      description="Manage your account security"
    >
      <div className="space-y-4">
        <div className="py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Password</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isFormOpen ? 'Enter your current and new password' : 'Update the password used to sign in'}
              </p>
            </div>
            <button
              onClick={() => {
                if (isFormOpen) {
                  resetForm();
                  setIsFormOpen(false);
                } else {
                  setIsFormOpen(true);
                }
              }}
              className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {isFormOpen ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {isFormOpen && (
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

              {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
                >
                  {isChanging ? (
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
    </SettingsSection>
  );
};

export default React.memo(SecuritySection);
