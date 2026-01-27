import React, { useState, useEffect } from 'react';
import { API_BASE_URL, REMINDER_PRESETS } from '../../shared/constants';
import { ApplicationStatus } from '../../shared/types';
import type { AuthState, ScrapedJobData, CreateJobRequest } from '../../shared/types';

interface Props {
  scrapedJob: ScrapedJobData | null;
  authState: AuthState;
  onJobSaved: () => void;
}

const QuickAddForm: React.FC<Props> = ({ scrapedJob, authState, onJobSaved }) => {
  const [formData, setFormData] = useState<CreateJobRequest>({
    company: '',
    role: '',
    status: ApplicationStatus.INTERESTED,
    dateApplied: new Date().toISOString().split('T')[0],
    location: '',
    salary: '',
    link: '',
    notes: '',
    description: '',
    source: 'extension',
  });
  const [reminderDays, setReminderDays] = useState(7);
  const [enableReminder, setEnableReminder] = useState(false);
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Pre-fill form with scraped data
  useEffect(() => {
    if (scrapedJob) {
      setFormData((prev) => ({
        ...prev,
        company: scrapedJob.company || '',
        role: scrapedJob.role || '',
        location: scrapedJob.location || '',
        salary: scrapedJob.salary || '',
        link: scrapedJob.link || '',
        description: scrapedJob.description || '',
        source: scrapedJob.source,
        externalJobId: scrapedJob.externalJobId,
      }));

      // Check for duplicate
      checkDuplicate(scrapedJob.externalJobId, scrapedJob.link);
    }
  }, [scrapedJob]);

  const checkDuplicate = async (externalJobId?: string, link?: string) => {
    if (!externalJobId && !link) return;

    try {
      const params = new URLSearchParams();
      if (externalJobId) params.append('externalJobId', externalJobId);
      if (link) params.append('link', link);

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${authState.tenantId}/applications/check-duplicate?${params}`,
        {
          headers: { Authorization: `Bearer ${authState.token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsDuplicate(data.isDuplicate);
      }
    } catch (err) {
      console.error('Failed to check duplicate:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.role) return;

    setError(null);
    setSaving(true);

    try {
      // Calculate follow-up date if reminder is enabled
      let followUpDate: string | undefined;
      if (enableReminder && reminderDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() + reminderDays);
        followUpDate = date.toISOString();
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${authState.tenantId}/applications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authState.token}`,
          },
          body: JSON.stringify({
            ...formData,
            followUpDate,
            reminderEnabled: enableReminder,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save job');
      }

      setSuccess(true);
      onJobSaved();

      // Reset form after short delay
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          company: '',
          role: '',
          status: ApplicationStatus.INTERESTED,
          dateApplied: new Date().toISOString().split('T')[0],
          location: '',
          salary: '',
          link: '',
          notes: '',
          description: '',
          source: 'extension',
        });
        setEnableReminder(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Job Saved!</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Added to your JobJourney dashboard
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {isDuplicate && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
          This job may already be in your list
        </div>
      )}

      {/* Company & Role */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Company *</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
            placeholder="Acme Corp"
            required
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Role *</label>
          <input
            type="text"
            value={formData.role}
            onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
            placeholder="Software Engineer"
            required
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Status & Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as ApplicationStatus }))}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200"
          >
            {Object.values(ApplicationStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
          <input
            type="date"
            value={formData.dateApplied}
            onChange={(e) => setFormData((p) => ({ ...p, dateApplied: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Location & Salary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
            placeholder="Remote"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Salary</label>
          <input
            type="text"
            value={formData.salary}
            onChange={(e) => setFormData((p) => ({ ...p, salary: e.target.value }))}
            placeholder="$120k - $150k"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</label>
        <textarea
          rows={2}
          value={formData.notes}
          onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Quick notes..."
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Reminder */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableReminder}
            onChange={(e) => setEnableReminder(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Set follow-up reminder</span>
        </label>

        {enableReminder && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {REMINDER_PRESETS.filter((p) => p.value > 0).map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setReminderDays(preset.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  reminderDays === preset.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !formData.company || !formData.role}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-200/50 dark:shadow-none"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </span>
        ) : (
          'Save to JobJourney'
        )}
      </button>
    </form>
  );
};

export default QuickAddForm;
