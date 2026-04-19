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
  Cell
} from 'recharts';
import { JobApplication, ApplicationStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, Calendar, TrendingUp, Clock, Target, Percent } from 'lucide-react';

interface Props {
  applications: JobApplication[];
}

const AnalyticsView: React.FC<Props> = ({ applications }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ApplicationStatus).forEach(s => counts[s] = 0);
    applications.forEach(app => counts[app.status]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  const timelineData = useMemo(() => {
    const sorted = [...applications].sort((a, b) => new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime());
    const groups: Record<string, number> = {};
    sorted.forEach(app => {
      const month = new Date(app.dateApplied).toLocaleString('default', { month: 'short' });
      groups[month] = (groups[month] || 0) + 1;
    });
    return Object.entries(groups).map(([name, count]) => ({ name, count }));
  }, [applications]);

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
    if (total === 0) return { total: 0, filtered, statusBreakdown: [], responseRate: 0, interviewRate: 0, offerRate: 0, ghostedRate: 0, avgDaysToInterview: null, topCompanies: [] };

    const statusBreakdown = Object.values(ApplicationStatus).map(status => ({
      status,
      count: filtered.filter(a => a.status === status).length,
    }));

    const relevantStatuses = [ApplicationStatus.INTERVIEWING, ApplicationStatus.REJECTED, ApplicationStatus.OFFER, ApplicationStatus.GHOSTED];
    const relevantApps = filtered.filter(a => relevantStatuses.includes(a.status));
    const responded = relevantApps.filter(a => a.status !== ApplicationStatus.GHOSTED);
    const interviews = filtered.filter(a => a.status === ApplicationStatus.INTERVIEWING || a.status === ApplicationStatus.OFFER);
    const offers = filtered.filter(a => a.status === ApplicationStatus.OFFER);
    const ghosted = filtered.filter(a => a.status === ApplicationStatus.GHOSTED);

    const responseRate = relevantApps.length > 0 ? (responded.length / relevantApps.length) * 100 : 0;
    const interviewRate = (interviews.length / total) * 100;
    const offerRate = (offers.length / total) * 100;
    const ghostedRate = (ghosted.length / total) * 100;

    // Average days from application to interview (for those with interview dates)
    const withInterview = filtered.filter(a => a.interviewDate);
    let avgDaysToInterview: number | null = null;
    if (withInterview.length > 0) {
      const totalDays = withInterview.reduce((sum, a) => {
        const applied = new Date(a.dateApplied).getTime();
        const interview = new Date(a.interviewDate!).getTime();
        return sum + Math.max(0, (interview - applied) / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToInterview = Math.round(totalDays / withInterview.length);
    }

    // Top companies by application count
    const companyCounts: Record<string, number> = {};
    filtered.forEach(a => { companyCounts[a.company] = (companyCounts[a.company] || 0) + 1; });
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));

    return { total, filtered, statusBreakdown, responseRate, interviewRate, offerRate, ghostedRate, avgDaysToInterview, topCompanies };
  }, [reportGenerated, reportStartDate, reportEndDate, applications]);

  const handleRunReport = () => {
    setReportGenerated(true);
  };

  const handleClearReport = () => {
    setReportGenerated(false);
    setReportStartDate('');
    setReportEndDate('');
  };

  const LIGHT_COLORS = ['#64748b', '#3b82f6', '#10b981', '#14b8a6', '#f43f5e', '#94a3b8'];
  const DARK_COLORS = ['#475569', '#2563eb', '#059669', '#0d9488', '#e11d48', '#334155'];
  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Application Success</h3>
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
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#1e293b'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                />
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

        {/* Application Volume */}
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Activity Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#1e293b'
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-8 text-center">Your Conversion Funnel</h3>
        <div className="max-w-xl mx-auto space-y-6">
           {funnelStep("Total Hunt", applications.length, 100, "bg-emerald-50 dark:bg-emerald-900/10", "bg-emerald-500")}

           {(() => {
             const interviewCount = applications.filter(a => [ApplicationStatus.INTERVIEWING, ApplicationStatus.OFFER].includes(a.status)).length;
             const interviewPerc = applications.length > 0 ? (interviewCount / applications.length) * 100 : 0;
             return funnelStep("Interviews Landed", interviewCount, interviewPerc, "bg-teal-50 dark:bg-teal-900/10", "bg-teal-500");
           })()}

           {(() => {
             const offerCount = applications.filter(a => a.status === ApplicationStatus.OFFER).length;
             const offerPerc = applications.length > 0 ? (offerCount / applications.length) * 100 : 0;
             return funnelStep("Job Offers", offerCount, offerPerc, "bg-cyan-50 dark:bg-cyan-900/10", "bg-cyan-500");
           })()}
        </div>
      </div>

      {/* Report Generator */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-emerald-600 dark:text-emerald-400" size={22} />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Run a Report</h3>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
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
            <button
              onClick={handleClearReport}
              className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold transition-colors"
            >
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
              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <ReportMetric icon={<Target size={16} />} label="Total" value={reportData.total.toString()} />
                <ReportMetric icon={<Percent size={16} />} label="Response Rate" value={`${reportData.responseRate.toFixed(0)}%`} />
                <ReportMetric icon={<TrendingUp size={16} />} label="Interview Rate" value={`${reportData.interviewRate.toFixed(0)}%`} />
                <ReportMetric icon={<TrendingUp size={16} />} label="Offer Rate" value={`${reportData.offerRate.toFixed(0)}%`} />
                <ReportMetric icon={<Clock size={16} />} label="Ghosted Rate" value={`${reportData.ghostedRate.toFixed(0)}%`} />
                <ReportMetric icon={<Calendar size={16} />} label="Avg Days to Interview" value={reportData.avgDaysToInterview !== null ? `${reportData.avgDaysToInterview}d` : 'N/A'} />
              </div>

              {/* Status Breakdown */}
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

                {reportData.topCompanies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Top Companies</h4>
                    <div className="space-y-2">
                      {reportData.topCompanies.map(({ company, count }) => (
                        <div key={company} className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate mr-2">{company}</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{count} app{count !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
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

const ReportMetric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
    <div className="flex items-center gap-1.5 mb-1 text-slate-400 dark:text-slate-500">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
  </div>
);

const funnelStep = (label: string, count: number, percentage: number, bgColor: string, barColor: string) => (
  <div className="relative group">
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
