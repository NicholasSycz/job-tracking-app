import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Send, Trash2, MessageSquare } from 'lucide-react';
import { AuthUser, Conversation, Message } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import NewConversationModal from './NewConversationModal';
import { API_BASE_URL } from '../config';

const POLL_INTERVAL_MS = 5000;

function participantAvatar(email: string, avatarUrl: string | null): string {
  if (avatarUrl) return `${API_BASE_URL}${avatarUrl}`;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  currentUser: AuthUser;
  onUnreadChange?: () => void;
}

const MessagesView: React.FC<Props> = ({ currentUser, onUnreadChange }) => {
  const { showError } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setIsLoadingList(true);
      try {
        const list = await apiService.fetchConversations();
        setConversations(list);
        return list;
      } catch (err) {
        console.error(err);
        if (!opts.silent) {
          showError('Load failed', 'Unable to load conversations.');
        }
        return [];
      } finally {
        if (!opts.silent) setIsLoadingList(false);
      }
    },
    [showError]
  );

  const loadMessages = useCallback(
    async (conversationId: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setIsLoadingMessages(true);
      try {
        const list = await apiService.fetchMessages(conversationId);
        setMessages(list);
        return list;
      } catch (err) {
        console.error(err);
        if (!opts.silent) {
          showError('Load failed', 'Unable to load messages.');
        }
        return [];
      } finally {
        if (!opts.silent) setIsLoadingMessages(false);
      }
    },
    [showError]
  );

  // Initial conversations load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // When selection changes, load messages + mark as read.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    (async () => {
      await loadMessages(selectedId);
      try {
        await apiService.markConversationRead(selectedId);
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
        );
        onUnreadChange?.();
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    })();
  }, [selectedId, loadMessages, onUnreadChange]);

  // Poll messages for the open conversation, only when tab is visible.
  useEffect(() => {
    if (!selectedId) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadMessages(selectedId, { silent: true });
      loadConversations({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [selectedId, loadMessages, loadConversations]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedId]);

  const handleStartConversation = async (recipientUserId: string) => {
    try {
      const conversation = await apiService.createConversation(recipientUserId);
      setShowNewModal(false);
      await loadConversations({ silent: true });
      setSelectedId(conversation.id);
    } catch (err) {
      showError(
        'Unable to start conversation',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !selectedId) return;
    setIsSending(true);
    try {
      const newMessage = await apiService.sendMessage(selectedId, body);
      setMessages((prev) => [...prev, newMessage]);
      setDraft('');
      // Refresh the conversation list for the updated preview/lastMessageAt
      loadConversations({ silent: true });
    } catch (err) {
      showError(
        'Send failed',
        err instanceof Error ? err.message : 'Unable to send message.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    setDeletingMessageId(messageId);
    try {
      await apiService.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, body: '', deletedAt: new Date().toISOString() } : m
        )
      );
      loadConversations({ silent: true });
    } catch (err) {
      showError(
        'Delete failed',
        err instanceof Error ? err.message : 'Unable to delete message.'
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherName = (c: Conversation) => {
    const other = c.otherParticipants[0];
    if (!other) return 'Unknown user';
    return other.name || other.email.split('@')[0];
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-180px)] min-h-[500px]">
          {/* Conversation list */}
          <aside className="border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Conversations
              </h2>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                <Plus size={14} />
                New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingList ? (
                <div className="py-10 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  <MessageSquare size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">No conversations yet</p>
                  <p className="text-xs">Click New to start one.</p>
                </div>
              ) : (
                <ul>
                  {conversations.map((c) => {
                    const other = c.otherParticipants[0];
                    const isActive = c.id === selectedId;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => setSelectedId(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-900 transition-colors text-left ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-900/10'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          {other ? (
                            <img
                              src={participantAvatar(other.email, other.avatarUrl)}
                              alt=""
                              className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                {otherName(c)}
                              </p>
                              {c.lastMessageAt && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                  {formatTimestamp(c.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {c.lastMessage
                                  ? c.lastMessage.deletedAt
                                    ? 'message deleted'
                                    : c.lastMessage.body
                                  : 'No messages yet'}
                              </p>
                              {c.unreadCount > 0 && (
                                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                                  {c.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Thread */}
          <section className="flex flex-col min-h-0">
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <MessageSquare size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">Select a conversation</p>
                  <p className="text-xs mt-1">Or start a new one using the button on the left.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  {selectedConversation.otherParticipants[0] && (
                    <img
                      src={participantAvatar(
                        selectedConversation.otherParticipants[0].email,
                        selectedConversation.otherParticipants[0].avatarUrl
                      )}
                      alt=""
                      className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {otherName(selectedConversation)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {selectedConversation.otherParticipants[0]?.email}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-3 bg-slate-50/40 dark:bg-slate-900/20">
                  {isLoadingMessages ? (
                    <div className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest py-10">
                      Loading...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-10">
                      No messages yet. Say hello.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.senderId === currentUser.id;
                      const isDeleted = !!m.deletedAt;
                      return (
                        <div
                          key={m.id}
                          className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                                isDeleted
                                  ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 italic'
                                  : isMine
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {isDeleted ? 'message deleted' : m.body}
                              <div
                                className={`text-[10px] mt-1 ${
                                  isMine && !isDeleted
                                    ? 'text-emerald-100/80'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {formatTimestamp(m.createdAt)}
                              </div>
                            </div>
                            {isMine && !isDeleted && (
                              <button
                                onClick={() => handleDelete(m.id)}
                                disabled={deletingMessageId === m.id}
                                title="Delete message"
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-40"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={threadEndRef} />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a message..."
                    rows={1}
                    className="flex-1 resize-none px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm max-h-40"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || draft.trim().length === 0}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Send
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <NewConversationModal
        isOpen={showNewModal}
        currentUser={currentUser}
        onClose={() => setShowNewModal(false)}
        onStart={handleStartConversation}
      />
    </div>
  );
};

export default MessagesView;
