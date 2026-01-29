import React, { useState, useEffect } from 'react';
import { jobMessages } from '../../shared/messaging';
import { STATUS_COLORS } from '../../shared/constants';
import { ApplicationStatus } from '../../shared/types';
import type { JobApplication } from '../../shared/types';

const RecentJobsView: React.FC = () => {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await jobMessages.getRecent(10);
      if (response.success && response.data) {
        setJobs(response.data);
      } else {
        setError(response.error || 'Failed to load jobs');
      }
    } catch (err) {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: ApplicationStatus) => {
    setUpdatingId(jobId);

    try {
      const response = await jobMessages.updateStatus(jobId, newStatus);
      if (response.success && response.data) {
        setJobs((prev) =>
          prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={loadJobs}
            className="mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">No jobs saved yet</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Visit a job posting to save it
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {jobs.map((job) => {
        const colors = STATUS_COLORS[job.status] || STATUS_COLORS.INTERESTED;
        const isUpdating = updatingId === job.id;

        return (
          <div
            key={job.id}
            className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {job.role}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {job.company}
                </p>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {formatDate(job.dateApplied)}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(job.id, e.target.value as ApplicationStatus)}
                  disabled={isUpdating}
                  className={`w-full px-2 py-1 text-xs font-medium rounded-lg border-0 appearance-none cursor-pointer ${colors.bg} ${colors.text} ${isUpdating ? 'opacity-50' : ''}`}
                >
                  {Object.values(ApplicationStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {isUpdating && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                  </div>
                )}
              </div>

              {job.link && (
                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Open job posting"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </div>

            {job.location && (
              <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {job.location}
              </p>
            )}
          </div>
        );
      })}

      <a
        href="http://localhost:3000"
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-3 p-2 text-center text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
      >
        View all in dashboard →
      </a>
    </div>
  );
};

export default RecentJobsView;
