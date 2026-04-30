import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Copy, Check, Trash2 } from 'lucide-react';
import { TenantMember, TenantInvite } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from '../config';

function memberAvatar(member: { email: string; avatarUrl: string | null }): string {
  if (member.avatarUrl) return `${API_BASE_URL}${member.avatarUrl}`;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.email)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const MembersSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invites, setInvites] = useState<TenantInvite[]>([]);
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [membersList, invitesList] = await Promise.all([
        apiService.fetchTenantMembers(),
        apiService.fetchInvites(),
      ]);
      setMembers(membersList);
      setInvites(invitesList);
    } catch (err) {
      console.error(err);
      showError('Load failed', 'Unable to load tenant members.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setIsInviting(true);
    try {
      const invite = await apiService.createInvite(trimmed);
      setEmail('');
      setInvites((prev) => {
        const without = prev.filter((i) => i.id !== invite.id);
        return [invite, ...without];
      });
      showSuccess('Invite ready', `Copy the link and share it with ${trimmed}.`);
    } catch (err) {
      showError(
        'Invite failed',
        err instanceof Error ? err.message : 'Unable to create invite.'
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopy = async (invite: TenantInvite) => {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopiedId(invite.id);
      window.setTimeout(() => setCopiedId((curr) => (curr === invite.id ? null : curr)), 1500);
    } catch {
      showError('Copy failed', 'Could not copy to clipboard.');
    }
  };

  const handleRevoke = async (invite: TenantInvite) => {
    try {
      await apiService.revokeInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      showSuccess('Invite revoked', `${invite.email} can no longer use that link.`);
    } catch (err) {
      showError(
        'Revoke failed',
        err instanceof Error ? err.message : 'Unable to revoke invite.'
      );
    }
  };

  return (
    <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
          <Users className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Members</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Invite teammates and manage who's in your tenant
          </p>
        </div>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
        />
        <button
          type="submit"
          disabled={isInviting || !email.trim()}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:cursor-not-allowed"
        >
          {isInviting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          Invite
        </button>
      </form>

      {/* Current members */}
      <div className="mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">
          Current members
        </h3>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={memberAvatar(m)}
                  alt=""
                  className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {m.name || m.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.email}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">
            Pending invites
          </h3>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {invite.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Expires {formatDate(invite.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(invite)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    {copiedId === invite.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === invite.id ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    onClick={() => handleRevoke(invite)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    title="Revoke invite"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default MembersSettings;
