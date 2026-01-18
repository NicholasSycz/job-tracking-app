
import React from 'react';
import { JobApplication, ApplicationStatus } from '../types';
import { Briefcase, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface Props {
  applications: JobApplication[];
  onEdit: (job: JobApplication) => void;
}

const DashboardView: React.FC<Props> = ({ applications, onEdit }) => {
  const stats = {
    total: applications.length,
    active: applications.filter(a => a.status === ApplicationStatus.APPLIED || a.status === ApplicationStatus.INTERVIEWING).length,
    interviews: applications.filter(a => a.status === ApplicationStatus.INTERVIEWING).length,
    offers: applications.filter(a => a.status === ApplicationStatus.OFFER).length,
  };

  const recent = [...applications].sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime()).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Applied" value={stats.total} icon={<Briefcase className="text-blue-600 dark:text-blue-400" />} color="blue" />
        <StatCard title="Active Stage" value={stats.active} icon={<Clock className="text-amber-600 dark:text-amber-400" />} color="amber" />
        <StatCard title="Interviews" value={stats.interviews} icon={<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />} color="emerald" />
        <StatCard title="Offers" value={stats.offers} icon={<XCircle className="text-rose-600 dark:text-rose-400 rotate-180" />} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recent Milestone</h2>
            <button className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">Explore all</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-600 italic">Your journey is waiting for its first step.</div>
            ) : (
              recent.map((job) => (
                <div key={job.id} onClick={() => onEdit(job)} className="group py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer -mx-6 px-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      {job.company.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{job.role}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(job.dateApplied).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" size={18} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Motivational Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white flex flex-col justify-between shadow-lg shadow-emerald-200 dark:shadow-none">
          <div>
            <h3 className="text-2xl font-bold mb-2">Your Journey!</h3>
            <p className="text-emerald-100 mb-6 opacity-90">Every application is a step toward your next chapter. JobJourney helps you stay on course.</p>
          </div>
          <div className="space-y-4">
             <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-xs uppercase tracking-wider font-bold opacity-70 mb-1">Career Goal Sync</p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">{stats.total} / 25</span>
                  <span className="text-xs opacity-70 font-semibold">{Math.min(100, (stats.total / 25) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.total / 25) * 100)}%` }}></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => {
  const lightColors: Record<string, string> = {
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    rose: 'bg-rose-50'
  };
  const darkColors: Record<string, string> = {
    blue: 'dark:bg-blue-900/20',
    amber: 'dark:bg-amber-900/20',
    emerald: 'dark:bg-emerald-900/20',
    rose: 'dark:bg-rose-900/20'
  };
  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className={`w-12 h-12 ${lightColors[color]} ${darkColors[color]} rounded-xl flex items-center justify-center mb-4 transition-colors`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
};

export const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const styles: Record<ApplicationStatus, string> = {
    [ApplicationStatus.INTERESTED]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    [ApplicationStatus.APPLIED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    [ApplicationStatus.INTERVIEWING]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    [ApplicationStatus.OFFER]: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    [ApplicationStatus.REJECTED]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    [ApplicationStatus.GHOSTED]: 'bg-slate-500/10 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${styles[status]}`}>
      {status}
    </span>
  );
};

export default DashboardView;
