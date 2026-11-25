import React, { useState, useRef } from 'react';
import { User, Mail, Save, Check, Camera } from 'lucide-react';

import { AuthUser } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { API_BASE_URL } from '../../config';
import { getAvatarUrl } from '../../utils/avatar';
import SettingsSection from './SettingsSection';

interface Props {
  user: AuthUser;
  onUpdateUser: (updates: Partial<AuthUser>) => void;
}

const ProfileSection: React.FC<Props> = ({ user, onUpdateUser }) => {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <SettingsSection
      icon={<User className="text-emerald-600 dark:text-emerald-400" size={20} />}
      iconClass="bg-emerald-100 dark:bg-emerald-900/30"
      title="Profile"
      description="Manage your personal information"
    >
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
              aria-label="Upload profile photo"
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
    </SettingsSection>
  );
};

export default React.memo(ProfileSection);
