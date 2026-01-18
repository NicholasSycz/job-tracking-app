
import React, { useState } from 'react';
import { JobApplication, ApplicationStatus } from '../types';
import { Filter, Trash2, ExternalLink, MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react';
import { StatusBadge } from './DashboardView';

interface Props {
  applications: JobApplication[];
  onEdit: (job: JobApplication) => void;
  onDelete: (id: string) => void;
}

const ApplicationsView: React.FC<Props> = ({ applications, onEdit, onDelete }) => {
  const [filter, setFilter] = useState<ApplicationStatus | 'All'>('All');

  const filtered = applications.filter(app => filter === 'All' ? true : app.status === filter);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <button 
            onClick={() => setFilter('All')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === 'All' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700'}`}
          >
            All
          </button>
          {Object.values(ApplicationStatus).map(s => (
            <button 
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === s ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
          <Filter size={16} />
          <span>Showing {filtered.length} applications</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 transition-colors">
             <Briefcase size={48} className="mb-4 opacity-20" />
             <p className="text-lg font-medium">No applications found in this category.</p>
             <p className="text-sm opacity-70">Try changing your filter or add a new job.</p>
          </div>
        ) : (
          filtered.map((job) => (
            <div 
              key={job.id} 
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-xl text-slate-400 dark:text-slate-600 transition-colors group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {job.company.charAt(0)}
                </div>
                <div className="flex gap-1 items-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
                    className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                  <StatusBadge status={job.status} />
                </div>
              </div>

              <div className="flex-1 cursor-pointer relative z-10" onClick={() => onEdit(job)}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                  {job.role}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-4 flex items-center gap-1.5 text-sm">
                  {job.company}
                  {job.link && <ExternalLink size={12} className="opacity-40" />}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{job.location}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <DollarSign size={14} className="text-slate-400" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Applied {new Date(job.dateApplied).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="h-20 overflow-hidden relative">
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed">
                    {job.description || "No description provided."}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-slate-950 to-transparent"></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApplicationsView;
