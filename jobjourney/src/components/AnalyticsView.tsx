import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { JobApplication, ApplicationStatus, InterviewOutcome } from '../types';
import { DEFAULT_JOB_SOURCES } from '../constants';
import { hasInterview, earliestInterviewDate, latestOutcome } from '../utils/interview';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, Calendar, TrendingUp, Target, Percent, Ghost, CheckCircle2, XCircle, Layers } from 'lucide-react';

interface Props {
  applications: JobApplication[];
}

const AnalyticsView: React.FC<Props> = ({ applications }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);

  // --- Quick preset helpers ---
  const applyPreset = (days: number | null) => {
    if (days === null) {
      setReportStartDate('');
      setReportEndDate('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setReportStartDate(start.toISOString().split('T')[0]);
      setReportEndDate(end.toISOString().split('T')[0]);
    }
    setReportGenerated(true);
  };

  const applyQuarterPreset = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    setReportStartDate(start.toISOString().split('T')[0]);
    setReportEndDate(end.toISOString().split('T')[0]);
    setReportGenerated(true);
  };

  // --- Status distribution pie ---
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ApplicationStatus).forEach(s => counts[s] = 0);
    applications.forEach(app => counts[app.status]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  // --- Activity timeline (keyed by YYYY-MM so cross-year months don't collapse) ---
  const timelineData = useMemo(() => {
    const sorted = [...applications].sort((a, b) => new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime());
    const groups: Record<string, { count: number; label: string }> = {};
    sorted.forEach(app => {
      const d = new Date(app.dateApplied);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2);
      if (!groups[key]) groups[key] = { count: 0, label };
      groups[key].count++;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { label, count }]) => ({ name: label, count }));
  }, [applications]);

  const SOURCE_LABELS: Record<string, string> = {
    ...Object.fromEntries(DEFAULT_JOB_SOURCES.map(s => [s.value, s.label])),
    extension: 'Extension',
    // legacy values
    manual: 'Manual',
    glassdoor: 'Glassdoor',
  };

  // --- Source attribution ---
  const sourceData = useMemo(() => {
    const sources: Record<string, { apps: number; interviews: number; offers: number }> = {};
    applications.forEach(app => {
      const src = app.source || 'other';
      if (!sources[src]) sources[src] = { apps: 0, interviews: 0, offers: 0 };
      sources[src].apps++;
      if (hasInterview(app)) sources[src].interviews++;
      if (app.status === ApplicationStatus.OFFER) sources[src].offers++;
    });
    return Object.entries(sources)
      .map(([key, v]) => ({
        name: SOURCE_LABELS[key] ?? key,
        Applications: v.apps,
        Interviews: v.interviews,
        Offers: v.offers,
      }))
      .sort((a, b) => b.Applications - a.Applications);
  }, [applications]);

  // --- Recruiting service breakdown ---
  const recruitingServiceData = useMemo(() => {
    const services: Record<string, { apps: number; interviews: number; offers: number }> = {};
    applications.forEach(app => {
      if (!app.recruitingService) return;
      const svc = app.recruitingService.trim();
      if (!svc) return;
      if (!services[svc]) services[svc] = { apps: 0, interviews: 0, offers: 0 };
      services[svc].apps++;
      if (hasInterview(app)) services[svc].interviews++;
      if (app.status === ApplicationStatus.OFFER) services[svc].offers++;
    });
    return Object.entries(services)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.apps - a.apps);
  }, [applications]);

  // --- Report data ---
  const reportData = useMemo(() => {
    if (!reportGenerated) return null;

    const start = reportStartDate ? new Date(reportStartDate) : null;
    const end = reportEndDate ? new Date(reportEndDate) : null;
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
  }, [reportGenerated, reportStartDate, reportEndDate, applications]);

  const handleRunReport = () => setReportGenerated(true);
  const handleClearReport = () => {
    setReportGenerated(false);
    setReportStartDate('');
    setReportEndDate('');
  };

  const LIGHT_COLORS = ['#64748b', '#3b82f6', '#10b981', '#14b8a6', '#f43f5e', '#94a3b8'];
  const DARK_COLORS = ['#475569', '#2563eb', '#059669', '#0d9488', '#e11d48', '#334155'];
  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // Funnel data derived from all applications
  const funnelStats = useMemo(() => {
    const total = applications.length;
    const interviewsLanded = applications.filter(hasInterview).length;
    const interviewsPassed = applications.filter(a => latestOutcome(a) === InterviewOutcome.PASSED).length;
    const interviewsFailed = applications.filter(a => latestOutcome(a) === InterviewOutcome.FAILED).length;
    const jobOffers = applications.filter(a => a.status === ApplicationStatus.OFFER).length;
    return { total, interviewsLanded, interviewsPassed, interviewsFailed, jobOffers };
  }, [applications]);

  const chartAxisStyle = { fill: isDarkMode ? '#64748b' : '#94a3b8' };
  const chartGridColor = isDarkMode ? '#1e293b' : '#f1f5f9';
  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    color: isDarkMode ? '#f8fafc' : '#1e293b',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status distribution */}
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Application Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {statusData.map((s, idx) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Activity Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={chartAxisStyle} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} tick={chartAxisStyle} />
                <Tooltip cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Source Attribution */}
      {sourceData.length > 0 && (
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="text-violet-600 dark:text-violet-400" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Source Performance</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Which job board converts best?</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={chartAxisStyle} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} tick={chartAxisStyle} allowDecimals={false} />
                <Tooltip cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Applications" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Interviews" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Offers" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recruiting Services Breakdown */}
      {recruitingServiceData.length > 0 && (
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recruiting Services</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Which agencies are getting you interviews?</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3">Service</th>
                  <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Apps</th>
                  <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Interviews</th>
                  <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Offers</th>
                  <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Interview Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recruitingServiceData.map(row => (
                  <tr key={row.name}>
                    <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">{row.name}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.apps}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.interviews}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.offers}</td>
                    <td className="py-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                      {row.apps > 0 ? `${((row.interviews / row.apps) * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conversion Funnel — extended with interview outcomes */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-8 text-center">Your Conversion Funnel</h3>
        <div className="max-w-xl mx-auto space-y-4">
          {funnelStep("Total Applications", funnelStats.total, 100, "bg-emerald-50 dark:bg-emerald-900/10", "bg-emerald-500")}
          {funnelStep(
            "Interviews Landed",
            funnelStats.interviewsLanded,
            funnelStats.total > 0 ? (funnelStats.interviewsLanded / funnelStats.total) * 100 : 0,
            "bg-teal-50 dark:bg-teal-900/10",
            "bg-teal-500"
          )}
          {/* Only show outcome breakdown if any outcomes have been recorded */}
          {(funnelStats.interviewsPassed > 0 || funnelStats.interviewsFailed > 0) && (
            <div className="ml-6 space-y-3 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                {funnelStep(
                  "Passed",
                  funnelStats.interviewsPassed,
                  funnelStats.interviewsLanded > 0 ? (funnelStats.interviewsPassed / funnelStats.interviewsLanded) * 100 : 0,
                  "bg-emerald-50/60 dark:bg-emerald-900/5",
                  "bg-emerald-400"
                )}
              </div>
              <div className="flex items-center gap-3">
                <XCircle size={14} className="text-rose-500 shrink-0" />
                {funnelStep(
                  "Failed",
                  funnelStats.interviewsFailed,
                  funnelStats.interviewsLanded > 0 ? (funnelStats.interviewsFailed / funnelStats.interviewsLanded) * 100 : 0,
                  "bg-rose-50/60 dark:bg-rose-900/5",
                  "bg-rose-400"
                )}
              </div>
            </div>
          )}
          {funnelStep(
            "Job Offers",
            funnelStats.jobOffers,
            funnelStats.total > 0 ? (funnelStats.jobOffers / funnelStats.total) * 100 : 0,
            "bg-cyan-50 dark:bg-cyan-900/10",
            "bg-cyan-500"
          )}
        </div>
        {funnelStats.interviewsPassed === 0 && funnelStats.interviewsFailed === 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
            Record interview outcomes on your applications to see the full funnel breakdown.
          </p>
        )}
      </div>

      {/* Report Generator */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-emerald-600 dark:text-emerald-400" size={22} />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Run a Report</h3>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'Last 30d', action: () => applyPreset(30) },
            { label: 'Last 90d', action: () => applyPreset(90) },
            { label: 'This Quarter', action: applyQuarterPreset },
            { label: 'All Time', action: () => applyPreset(null) },
          ].map(p => (
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
              value={reportStartDate}
              onChange={e => { setReportStartDate(e.target.value); setReportGenerated(false); }}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={e => { setReportEndDate(e.target.value); setReportGenerated(false); }}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700"
            />
          </div>
          <button
            onClick={handleRunReport}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            Run Report
          </button>
          {reportGenerated && (
            <button onClick={handleClearReport} className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold transition-colors">
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Leave dates empty to report on all applications.</p>

        {reportGenerated && reportData && (
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
      </div>
    </div>
  );
};

const ReportMetric = ({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: string; subtitle?: string }) => (
  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
    <div className="flex items-center gap-1.5 mb-1 text-slate-400 dark:text-slate-500">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
    {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">{subtitle}</p>}
  </div>
);

const funnelStep = (label: string, count: number, percentage: number, bgColor: string, barColor: string) => (
  <div className="relative group flex-1">
    <div className="flex justify-between items-end mb-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <span className="text-xs text-slate-500 dark:text-slate-500 font-bold">{count} ({percentage.toFixed(0)}%)</span>
    </div>
    <div className={`w-full h-10 ${bgColor} rounded-xl overflow-hidden flex items-center px-4 relative transition-transform group-hover:scale-[1.01]`}>
      <div className={`h-full absolute left-0 top-0 ${barColor} opacity-10`} style={{ width: `${percentage}%` }} />
      <div className="relative z-10 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  </div>
);

export default AnalyticsView;
