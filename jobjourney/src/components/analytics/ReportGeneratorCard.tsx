import React, { useMemo, useState } from 'react';
import { FileText, Calendar, TrendingUp, Target, Percent, Ghost, CheckCircle2, XCircle } from 'lucide-react';

import { JobApplication, ApplicationStatus, InterviewOutcome } from '../../types';
import { hasInterview, earliestInterviewDate, latestOutcome } from '../../utils/interview';
import AnalyticsCard from './AnalyticsCard';

const ReportMetric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}> = ({ icon, label, value, subtitle }) => (
  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
    <div className="flex items-center gap-1.5 mb-1 text-slate-400 dark:text-slate-500">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
    {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">{subtitle}</p>}
  </div>
);

const ReportGeneratorCard: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generated, setGenerated] = useState(false);

  const applyPreset = (days: number | null) => {
    if (days === null) {
      setStartDate('');
      setEndDate('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
    setGenerated(true);
  };

  const applyQuarterPreset = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setGenerated(true);
  };

  const clearReport = () => {
    setGenerated(false);
    setStartDate('');
    setEndDate('');
  };

  const reportData = useMemo(() => {
    if (!generated) return null;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const filtered = applications.filter(app => {
      const d = new Date(app.dateApplied);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });

    const total = filtered.length;
    if (total === 0) return { total: 0, filtered, statusBreakdown: [], responseRate: 0, interviewRate: 0, offerRate: 0, ghostedRate: 0, avgDaysToInterview: null, topRecruitingServices: [], interviewPassRate: null, interviewFailRate: null, interviewsWithOutcome: 0 };

    const statusBreakdown = Object.values(ApplicationStatus).map(status => ({
      status,
      count: filtered.filter(a => a.status === status).length,
    }));

    const relevantStatuses = [ApplicationStatus.INTERVIEWING, ApplicationStatus.REJECTED, ApplicationStatus.OFFER, ApplicationStatus.GHOSTED];
    const relevantApps = filtered.filter(a => relevantStatuses.includes(a.status));
    const responded = relevantApps.filter(a => a.status !== ApplicationStatus.GHOSTED);
    const interviews = filtered.filter(hasInterview);
    const offers = filtered.filter(a => a.status === ApplicationStatus.OFFER);
    const ghosted = filtered.filter(a => a.status === ApplicationStatus.GHOSTED);

    const responseRate = relevantApps.length > 0 ? (responded.length / relevantApps.length) * 100 : 0;
    const interviewRate = (interviews.length / total) * 100;
    const offerRate = (offers.length / total) * 100;
    const ghostedRate = (ghosted.length / total) * 100;

    // Days to the first interview round
    const withInterview = filtered
      .map(a => ({ applied: a.dateApplied, interview: earliestInterviewDate(a) }))
      .filter((x): x is { applied: string; interview: string } => x.interview !== null);
    let avgDaysToInterview: number | null = null;
    if (withInterview.length > 0) {
      const totalDays = withInterview.reduce((sum, x) => {
        const applied = new Date(x.applied).getTime();
        const interview = new Date(x.interview).getTime();
        return sum + Math.max(0, (interview - applied) / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToInterview = Math.round(totalDays / withInterview.length);
    }

    // Interview outcome rates (representative outcome = latest round's outcome)
    const withOutcome = filtered.filter(a => { const o = latestOutcome(a); return o && o !== InterviewOutcome.PENDING; });
    const passed = withOutcome.filter(a => latestOutcome(a) === InterviewOutcome.PASSED);
    const failed = withOutcome.filter(a => latestOutcome(a) === InterviewOutcome.FAILED);
    const interviewPassRate = withOutcome.length > 0 ? (passed.length / withOutcome.length) * 100 : null;
    const interviewFailRate = withOutcome.length > 0 ? (failed.length / withOutcome.length) * 100 : null;

    const svcMap: Record<string, { apps: number; interviews: number; offers: number }> = {};
    filtered.forEach(a => {
      if (!a.recruitingService) return;
      const svc = a.recruitingService.trim();
      if (!svc) return;
      if (!svcMap[svc]) svcMap[svc] = { apps: 0, interviews: 0, offers: 0 };
      svcMap[svc].apps++;
      if (hasInterview(a)) svcMap[svc].interviews++;
      if (a.status === ApplicationStatus.OFFER) svcMap[svc].offers++;
    });
    const topRecruitingServices = Object.entries(svcMap)
      .sort((a, b) => b[1].apps - a[1].apps)
      .slice(0, 5)
      .map(([name, v]) => ({ name, ...v, interviewRate: v.apps > 0 ? (v.interviews / v.apps) * 100 : 0 }));

    return { total, filtered, statusBreakdown, responseRate, interviewRate, offerRate, ghostedRate, avgDaysToInterview, topRecruitingServices, interviewPassRate, interviewFailRate, interviewsWithOutcome: withOutcome.length };
  }, [generated, startDate, endDate, applications]);

  const presets = [
    { label: 'Last 30d', action: () => applyPreset(30) },
    { label: 'Last 90d', action: () => applyPreset(90) },
    { label: 'This Quarter', action: applyQuarterPreset },
    { label: 'All Time', action: () => applyPreset(null) },
  ];

  return (
    <AnalyticsCard>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-emerald-600 dark:text-emerald-400" size={22} />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Run a Report</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={p.action}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setGenerated(false); }}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setGenerated(false); }}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700"
          />
        </div>
        <button
          onClick={() => setGenerated(true)}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          Run Report
        </button>
        {generated && (
          <button onClick={clearReport} className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold transition-colors">
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Leave dates empty to report on all applications.</p>

      {generated && reportData && (
        reportData.total === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 italic">No applications found in the selected date range.</div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <ReportMetric icon={<Target size={16} />} label="Total" value={reportData.total.toString()} />
              <ReportMetric icon={<Percent size={16} />} label="Response Rate" value={`${reportData.responseRate.toFixed(0)}%`} />
              <ReportMetric icon={<TrendingUp size={16} />} label="Interview Rate" value={`${reportData.interviewRate.toFixed(0)}%`} />
              <ReportMetric icon={<TrendingUp size={16} />} label="Offer Rate" value={`${reportData.offerRate.toFixed(0)}%`} />
              <ReportMetric icon={<Ghost size={16} />} label="Ghosted Rate" value={`${reportData.ghostedRate.toFixed(0)}%`} />
              <ReportMetric icon={<Calendar size={16} />} label="Avg Days to Interview" value={reportData.avgDaysToInterview !== null ? `${reportData.avgDaysToInterview}d` : 'N/A'} />
              <ReportMetric
                icon={<CheckCircle2 size={16} />}
                label="Interview Pass Rate"
                value={reportData.interviewPassRate !== null ? `${reportData.interviewPassRate.toFixed(0)}%` : 'N/A'}
                subtitle={reportData.interviewsWithOutcome > 0 ? `${reportData.interviewsWithOutcome} recorded` : undefined}
              />
              <ReportMetric
                icon={<XCircle size={16} />}
                label="Interview Fail Rate"
                value={reportData.interviewFailRate !== null ? `${reportData.interviewFailRate.toFixed(0)}%` : 'N/A'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Status Breakdown</h4>
                <div className="space-y-2">
                  {reportData.statusBreakdown.map(({ status, count }) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{status}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / reportData.total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {reportData.topRecruitingServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Top Recruiting Services</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left">
                          <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2">Service</th>
                          <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2 text-right">Apps</th>
                          <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2 text-right">Interviews</th>
                          <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2 text-right">Offers</th>
                          <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {reportData.topRecruitingServices.map(row => (
                          <tr key={row.name}>
                            <td className="py-2 font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{row.name}</td>
                            <td className="py-2 text-right text-slate-600 dark:text-slate-400">{row.apps}</td>
                            <td className="py-2 text-right text-slate-600 dark:text-slate-400">{row.interviews}</td>
                            <td className="py-2 text-right text-slate-600 dark:text-slate-400">{row.offers}</td>
                            <td className="py-2 text-right font-bold text-slate-700 dark:text-slate-300">{row.interviewRate.toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </AnalyticsCard>
  );
};

export default React.memo(ReportGeneratorCard);
