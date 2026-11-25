import React from 'react';
import { Video, Plus, Trash2, Calendar, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { InterviewOutcome, InterviewRound } from '../../types';

// Converts an ISO string to the datetime-local input format (YYYY-MM-DDTHH:mm).
const toDatetimeLocalValue = (isoString: string | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Format as local datetime for the input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const OUTCOME_OPTIONS: { value: InterviewOutcome; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
  { value: InterviewOutcome.PENDING,  label: 'Pending',  icon: <MinusCircle size={14} />,  active: 'bg-slate-600 text-white',   inactive: 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' },
  { value: InterviewOutcome.PASSED,   label: 'Passed',   icon: <CheckCircle2 size={14} />, active: 'bg-emerald-600 text-white', inactive: 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' },
  { value: InterviewOutcome.FAILED,   label: 'Failed',   icon: <XCircle size={14} />,      active: 'bg-rose-600 text-white',    inactive: 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' },
  { value: InterviewOutcome.DECLINED, label: 'Declined', icon: <MinusCircle size={14} />,  active: 'bg-amber-600 text-white',   inactive: 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' },
];

interface Props {
  interviews: InterviewRound[];
  interviewTypes: { value: string; label: string }[];
  reminderEnabled: boolean;
  reminderSentAt?: string | null;
  onAddRound: () => void;
  onUpdateRound: (id: string, patch: Partial<InterviewRound>) => void;
  onRemoveRound: (id: string) => void;
  onReminderChange: (enabled: boolean) => void;
}

const InterviewRoundsEditor: React.FC<Props> = ({
  interviews,
  interviewTypes,
  reminderEnabled,
  reminderSentAt,
  onAddRound,
  onUpdateRound,
  onRemoveRound,
  onReminderChange,
}) => {
  const hasScheduledRound = interviews.some(r => r.scheduledAt);

  return (
    <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Video className="text-blue-600 dark:text-blue-500" size={18} />
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-500 uppercase tracking-[0.2em]">Interview Rounds</span>
        </div>
        <button
          type="button"
          onClick={onAddRound}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={14} /> Add round
        </button>
      </div>

      {interviews.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-600 italic">No interview rounds yet. Add one when an interview is scheduled.</p>
      )}

      {interviews.map((round, idx) => (
        <div key={round.id} className="space-y-3 p-3 bg-white dark:bg-slate-900/40 border border-blue-100 dark:border-blue-900/40 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Round {idx + 1}</span>
            <button
              type="button"
              onClick={() => onRemoveRound(round.id)}
              aria-label={`Remove round ${idx + 1}`}
              className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <Calendar className="shrink-0 text-slate-400" size={16} />
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(round.scheduledAt)}
                onChange={e => onUpdateRound(round.id, { scheduledAt: e.target.value || '' })}
                className="min-w-0 w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300"
              />
            </div>
            <select
              value={round.type ?? ''}
              onChange={e => onUpdateRound(round.id, { type: e.target.value })}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="">Type…</option>
              {interviewTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
              {round.type && !interviewTypes.find(t => t.value === round.type) && (
                <option value={round.type}>{round.type}</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Outcome:</span>
            <div className="flex gap-2 flex-wrap">
              {OUTCOME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateRound(round.id, { outcome: round.outcome === opt.value ? undefined : opt.value })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${round.outcome === opt.value ? opt.active : opt.inactive}`}
                >
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Notes:</span>
            <textarea
              rows={2}
              value={round.notes ?? ''}
              onChange={e => onUpdateRound(round.id, { notes: e.target.value })}
              placeholder="Questions asked, topics covered, things to follow up on..."
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl outline-none transition-all resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
            />
          </div>
        </div>
      ))}

      {hasScheduledRound && (
        <label className="flex items-center gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={e => onReminderChange(e.target.checked)}
            className="w-5 h-5 rounded border-blue-300 dark:border-blue-700 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Remind me before the next interview</span>
        </label>
      )}

      {reminderSentAt && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reminder sent: {new Date(reminderSentAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default InterviewRoundsEditor;
