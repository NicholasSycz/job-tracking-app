import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Trash2, Calendar, Clock, FileText, Briefcase } from 'lucide-react';
import { CalendarEvent, EventType, JobApplication } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description?: string; startAt: string; endAt?: string; type: EventType; jobId?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingEvent?: CalendarEvent;
  defaultDate?: string; // ISO date string to pre-fill the date
  applications: JobApplication[];
  isSaving?: boolean;
}

const toDatetimeLocal = (iso: string | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; activeColor: string }> = {
  [EventType.INTERVIEW]:     { label: 'Interview',      color: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400', activeColor: 'bg-blue-600 text-white border-blue-600' },
  [EventType.RECRUITER_CALL]:{ label: 'Recruiter Call', color: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400', activeColor: 'bg-violet-600 text-white border-violet-600' },
  [EventType.NETWORKING]:    { label: 'Networking',     color: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400', activeColor: 'bg-teal-600 text-white border-teal-600' },
  [EventType.OTHER]:         { label: 'Other',          color: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400', activeColor: 'bg-slate-600 text-white border-slate-600' },
};

const EventModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, editingEvent, defaultDate, applications, isSaving = false }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>(EventType.OTHER);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [description, setDescription] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingEvent) {
      setTitle(editingEvent.title);
      setType(editingEvent.type);
      setStartAt(toDatetimeLocal(editingEvent.startAt));
      setEndAt(toDatetimeLocal(editingEvent.endAt));
      setDescription(editingEvent.description ?? '');
      setJobId(editingEvent.jobId ?? '');
      const linked = applications.find(a => a.id === editingEvent.jobId);
      setJobSearch(linked ? `${linked.company} — ${linked.role}` : '');
    } else {
      setTitle('');
      setType(EventType.OTHER);
      setStartAt(defaultDate ? `${defaultDate}T09:00` : '');
      setEndAt('');
      setDescription('');
      setJobId('');
      setJobSearch('');
    }
  }, [isOpen, editingEvent, defaultDate]);

  if (!isOpen) return null;

  const filteredApps = jobSearch.trim()
    ? applications.filter(a =>
        `${a.company} ${a.role}`.toLowerCase().includes(jobSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSave = async () => {
    if (!title.trim() || !startAt) return;
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        type,
        jobId: jobId || undefined,
      });
      onClose();
    } catch {
      // Error is already shown via toast in App.tsx — just keep the modal open
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto border-l dark:border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 flex-1">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Call with Hays recruiter"
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Type</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value as EventType)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    type === value ? cfg.activeColor : `bg-white dark:bg-slate-900 ${cfg.color} hover:bg-slate-50 dark:hover:bg-slate-800`
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Start</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={15} />
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl outline-none text-slate-800 dark:text-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">End (optional)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={15} />
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  min={startAt}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl outline-none text-slate-800 dark:text-slate-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Notes</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400 dark:text-slate-600" size={15} />
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Agenda, contact info, prep notes..."
                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-2xl outline-none resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Link to job application */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Link to Application (optional)</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={15} />
              <input
                type="text"
                value={jobSearch}
                onChange={e => { setJobSearch(e.target.value); if (!e.target.value) setJobId(''); }}
                placeholder="Search company or role..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl outline-none text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
            {filteredApps.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                {filteredApps.map(app => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => { setJobId(app.id); setJobSearch(`${app.company} — ${app.role}`); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{app.company}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-1.5">— {app.role}</span>
                  </button>
                ))}
              </div>
            )}
            {jobId && (
              <button
                type="button"
                onClick={() => { setJobId(''); setJobSearch(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                × Clear link
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-6 flex gap-3">
          {editingEvent && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !startAt || isSaving || isDeleting}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
