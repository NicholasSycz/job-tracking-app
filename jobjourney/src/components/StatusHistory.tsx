import React, { useState, useEffect } from 'react';
import { ChevronDown, Clock, Loader2 } from 'lucide-react';
import { ApplicationStatus } from '../types';
import { StatusBadge } from './DashboardView';
import { API_BASE_URL } from '../config';

interface HistoryEntry {
  id: string;
  status: ApplicationStatus;
  notes: string | null;
  changedAt: string;
  changedBy: string;
}

interface Props {
  applicationId: string;
  isOpen: boolean;
}

const StatusHistory: React.FC<Props> = ({ applicationId, isOpen }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && applicationId && isExpanded) {
      fetchHistory();
    }
  }, [isOpen, applicationId, isExpanded]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const tenantId = localStorage.getItem('tenant_id');

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${tenantId}/applications/${applicationId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching status history:', err);
      setError('Unable to load status history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!applicationId) return null;

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Status History
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
              No status changes recorded yet.
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-800" />

              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4 pl-7">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-0 w-5 h-5 rounded-full border-2 ${
                        index === 0
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                      }`}
                    />

                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge status={entry.status} />
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDate(entry.changedAt)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {entry.notes}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        by {entry.changedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusHistory;
