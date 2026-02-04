import React, { useMemo } from 'react';
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

interface Props {
  applications: JobApplication[];
}

const AnalyticsView: React.FC<Props> = ({ applications }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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
    </div>
  );
};

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
