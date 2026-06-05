import React, { useState, useEffect } from 'react';
import { X, Save, Link2, MapPin, DollarSign, Calendar, Briefcase, Loader2, Bell, Clock, Video, CheckCircle2, XCircle, MinusCircle, Plus, Trash2 } from 'lucide-react';
import { JobApplication, JobApplicationCreateInput, ApplicationStatus, InterviewOutcome, InterviewRound, JobSource } from '../types';
import { DEFAULT_JOB_SOURCES, DEFAULT_RECRUITING_SERVICES, DEFAULT_INTERVIEW_TYPES } from '../constants';
import { getInterviews } from '../utils/interview';
import StatusHistory from './StatusHistory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: JobApplication | JobApplicationCreateInput) => Promise<void>;
  editingJob?: JobApplication;
  isSaving?: boolean;
  jobSources?: { value: string; label: string }[] | null;
  recruitingServices?: string[] | null;
  interviewTypes?: { value: string; label: string }[] | null;
}

// Helper to convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
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

const JobModal: React.FC<Props> = ({ isOpen, onClose, onSave, editingJob, isSaving = false, jobSources, recruitingServices, interviewTypes }) => {
  const resolvedSources = jobSources ?? DEFAULT_JOB_SOURCES;
  const resolvedServices = recruitingServices ?? DEFAULT_RECRUITING_SERVICES;
  const resolvedInterviewTypes = interviewTypes ?? DEFAULT_INTERVIEW_TYPES;
  const [formData, setFormData] = useState<Partial<JobApplication>>({
    company: '',
    role: '',
    status: ApplicationStatus.INTERESTED,
    dateApplied: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
    description: '',
    location: '',
    salary: '',
    link: '',
    notes: '',
    followUpDate: '',
    reminderEnabled: false,
    interviewReminderEnabled: false,
    interviews: [],
    recruitingService: '',
  });

  useEffect(() => {
    if (editingJob) {
      setFormData({
        company: editingJob.company,
        role: editingJob.role,
        status: editingJob.status,
        dateApplied: editingJob.dateApplied,
        description: editingJob.description ?? '',
        location: editingJob.location ?? '',
        salary: editingJob.salary ?? '',
        link: editingJob.link ?? '',
        notes: editingJob.notes ?? '',
        source: editingJob.source,
        externalJobId: editingJob.externalJobId,
        followUpDate: editingJob.followUpDate ?? '',
        reminderEnabled: editingJob.reminderEnabled ?? false,
        reminderSentAt: editingJob.reminderSentAt,
        interviewReminderEnabled: editingJob.interviewReminderEnabled ?? false,
        interviewReminderSentAt: editingJob.interviewReminderSentAt,
        // Seed rounds from the stored array, falling back to the legacy single-interview fields.
        interviews: getInterviews(editingJob).map(r => ({ ...r })),
        recruitingService: editingJob.recruitingService ?? '',
      });
    } else {
      setFormData({
        company: '',
        role: '',
        status: ApplicationStatus.INTERESTED,
        dateApplied: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
        description: '',
        location: '',
        salary: '',
        link: '',
        notes: '',
        followUpDate: '',
        reminderEnabled: false,
        interviewReminderEnabled: false,
        interviews: [],
        recruitingService: '',
      });
    }
  }, [editingJob, isOpen]);

  const interviews = formData.interviews ?? [];
  const updateRound = (id: string, patch: Partial<InterviewRound>) =>
    setFormData(p => ({ ...p, interviews: (p.interviews ?? []).map(r => r.id === id ? { ...r, ...patch } : r) }));
  const removeRound = (id: string) =>
    setFormData(p => ({ ...p, interviews: (p.interviews ?? []).filter(r => r.id !== id) }));
  const addRound = () =>
    setFormData(p => ({ ...p, interviews: [...(p.interviews ?? []), { id: crypto.randomUUID(), type: '', scheduledAt: '', outcome: undefined, notes: '' }] }));
  const hasScheduledRound = interviews.some(r => r.scheduledAt);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.company || !formData.role) return;

    // Drop empty rounds (no date), normalize dates to ISO, ensure each has an id.
    const cleanInterviews: InterviewRound[] = (formData.interviews ?? [])
      .filter(r => r.scheduledAt)
      .map(r => ({
        id: r.id || crypto.randomUUID(),
        type: r.type ?? '',
        scheduledAt: new Date(r.scheduledAt).toISOString(),
        outcome: r.outcome,
        notes: r.notes ?? '',
      }));

    try {
      if (editingJob) {
        // Editing existing job - include the id. The backend derives the legacy
        // single-interview fields from `interviews`, so we don't send them.
        await onSave({
          ...formData,
          id: editingJob.id,
          interviews: cleanInterviews,
        } as JobApplication);
      } else {
        // Creating new job - let server generate id
        await onSave({
          company: formData.company!,
          role: formData.role!,
          status: formData.status || ApplicationStatus.INTERESTED,
          dateApplied: formData.dateApplied || new Date().toISOString().split('T')[0],
          description: formData.description || '',
          location: formData.location || '',
          salary: formData.salary,
          link: formData.link,
          notes: formData.notes,
          followUpDate: formData.followUpDate || undefined,
          reminderEnabled: formData.reminderEnabled,
          interviewReminderEnabled: formData.interviewReminderEnabled,
          interviews: cleanInterviews,
          recruitingService: formData.recruitingService,
        });
      }
      // Only close if save was successful
      onClose();
    } catch {
      // Error is already handled by parent - don't close modal on error
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto border-l dark:border-slate-800"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-center z-10 transition-colors">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {editingJob ? 'Refine Application' : 'Track New Opportunity'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          {/* Main Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Company</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input 
                  type="text" 
                  value={formData.company}
                  onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                  placeholder="Acme Corp" 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Role</label>
              <input 
                type="text" 
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                placeholder="Senior Engineer" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value as ApplicationStatus }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none appearance-none text-slate-800 dark:text-slate-200 text-sm cursor-pointer"
                >
                  {Object.values(ApplicationStatus).map(s => (
                    <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {s}
                    </option>
                  ))}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Source</label>
                <input
                  type="text"
                  list="job-sources-datalist"
                  value={resolvedSources.find(s => s.value === formData.source)?.label ?? formData.source ?? ''}
                  onChange={e => {
                    const typed = e.target.value;
                    const match = resolvedSources.find(s => s.label === typed);
                    setFormData(p => ({ ...p, source: (match?.value ?? typed) as JobSource }));
                  }}
                  placeholder="Select or type a source…"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                />
                <datalist id="job-sources-datalist">
                  {resolvedSources.map(({ value, label }) => (
                    <option key={value} value={label} />
                  ))}
                  {formData.source === 'extension' && !resolvedSources.find(s => s.value === 'extension') && (
                    <option value="Extension" />
                  )}
                </datalist>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Application Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                  <input
                    type="date"
                    value={formData.dateApplied}
                    onChange={e => setFormData(p => ({ ...p, dateApplied: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                    placeholder="Remote / Hybrid" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Compensation</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                  <input 
                    type="text" 
                    value={formData.salary}
                    onChange={e => setFormData(p => ({ ...p, salary: e.target.value }))}
                    placeholder="$140k - $180k" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
                  />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Recruiting Service</label>
            <input
              type="text"
              list="recruiting-services-datalist"
              value={formData.recruitingService ?? ''}
              onChange={e => setFormData(p => ({ ...p, recruitingService: e.target.value }))}
              placeholder="Select or type a service…"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
            />
            <datalist id="recruiting-services-datalist">
              {resolvedServices.map(svc => (
                <option key={svc} value={svc} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Application Link</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
              <input 
                type="url" 
                value={formData.link}
                onChange={e => setFormData(p => ({ ...p, link: e.target.value }))}
                placeholder="URL to posting..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Job Description</label>
            <textarea 
              rows={5}
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Paste job description here..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Application Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Contacts, referral info, timeline details..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
            />
          </div>

          {/* Follow-up Reminder */}
          <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Bell className="text-amber-600 dark:text-amber-500" size={18} />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-[0.2em]">Follow-up Reminder</span>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.reminderEnabled || false}
                onChange={e => setFormData(p => ({ ...p, reminderEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-amber-300 dark:border-amber-700 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Enable follow-up reminder</span>
            </label>

            {formData.reminderEnabled && (
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '3 days', days: 3 },
                    { label: '1 week', days: 7 },
                    { label: '2 weeks', days: 14 },
                  ].map(preset => {
                    const presetDate = new Date();
                    presetDate.setDate(presetDate.getDate() + preset.days);
                    const presetDateStr = presetDate.toISOString().split('T')[0];
                    const isSelected = formData.followUpDate?.split('T')[0] === presetDateStr;

                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, followUpDate: presetDate.toISOString() }))}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-amber-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="text-slate-400" size={16} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Or pick a date:</span>
                  <input
                    type="date"
                    value={formData.followUpDate?.split('T')[0] || ''}
                    onChange={e => setFormData(p => ({ ...p, followUpDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg focus:border-amber-500 outline-none text-slate-700 dark:text-slate-300"
                  />
                </div>

                {formData.followUpDate && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                    <Bell size={12} />
                    Reminder set for {new Date(formData.followUpDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {editingJob?.reminderSentAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last reminder sent: {new Date(editingJob.reminderSentAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Interview Rounds */}
          <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className="text-blue-600 dark:text-blue-500" size={18} />
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-500 uppercase tracking-[0.2em]">Interview Rounds</span>
              </div>
              <button
                type="button"
                onClick={addRound}
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
                    onClick={() => removeRound(round.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-slate-400" size={16} />
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(round.scheduledAt)}
                      onChange={e => updateRound(round.id, { scheduledAt: e.target.value || '' })}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <select
                    value={round.type ?? ''}
                    onChange={e => updateRound(round.id, { type: e.target.value })}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="">Type…</option>
                    {resolvedInterviewTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                    {round.type && !resolvedInterviewTypes.find(t => t.value === round.type) && (
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
                        onClick={() => updateRound(round.id, { outcome: round.outcome === opt.value ? undefined : opt.value })}
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
                    onChange={e => updateRound(round.id, { notes: e.target.value })}
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
                  checked={formData.interviewReminderEnabled || false}
                  onChange={e => setFormData(p => ({ ...p, interviewReminderEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded border-blue-300 dark:border-blue-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Remind me before the next interview</span>
              </label>
            )}

            {editingJob?.interviewReminderSentAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reminder sent: {new Date(editingJob.interviewReminderSentAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Status History - only show when editing */}
          {editingJob && (
            <StatusHistory applicationId={editingJob.id} isOpen={isOpen} />
          )}

          <div className="pb-12" />
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-6 flex gap-4 transition-colors">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.company || !formData.role || isSaving}
            className="flex-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobModal;
