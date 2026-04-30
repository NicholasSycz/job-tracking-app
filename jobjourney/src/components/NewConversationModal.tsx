import React, { useEffect, useState } from 'react';
import { X, Search, MessageSquarePlus } from 'lucide-react';
import { AuthUser, TenantMember } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from '../config';

function getAvatarUrl(member: { email: string; avatarUrl: string | null }): string {
  if (member.avatarUrl) {
    return `${API_BASE_URL}${member.avatarUrl}`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.email)}`;
}

interface Props {
  isOpen: boolean;
  currentUser: AuthUser;
  onClose: () => void;
  onStart: (recipientUserId: string) => Promise<void>;
}

const NewConversationModal: React.FC<Props> = ({ isOpen, currentUser, onClose, onStart }) => {
  const { showError } = useToast();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setIsLoading(true);
    apiService
      .fetchTenantMembers()
      .then(setMembers)
      .catch((err) => {
        console.error(err);
        showError('Load failed', 'Unable to load tenant members.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, showError]);

  if (!isOpen) return null;

  const q = search.trim().toLowerCase();
  const filtered = members
    .filter((m) => m.id !== currentUser.id && m.isActive)
    .filter((m) => {
      if (!q) return true;
      return (
        (m.name ?? '').toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    });

  const handleStart = async (memberId: string) => {
    setStartingId(memberId);
    try {
      await onStart(memberId);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
            <MessageSquarePlus size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              Start a conversation
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pick someone from your tenant to message.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"
            size={16}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto -mx-2 px-2">
          {isLoading ? (
            <div className="py-10 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {members.length <= 1
                ? 'No other members yet. Invite someone from Settings → Members.'
                : 'No members match your search.'}
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => handleStart(m.id)}
                    disabled={startingId !== null}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left disabled:opacity-50"
                  >
                    <img
                      src={getAvatarUrl(m)}
                      alt=""
                      className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {m.name || m.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {m.email}
                      </p>
                    </div>
                    {startingId === m.id && (
                      <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
