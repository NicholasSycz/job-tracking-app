import React from "react";
import {
  Trash2,
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  Loader2,
  CheckSquare,
  Square,
  Bell,
} from "lucide-react";

import { JobApplication } from "../../types";
import { StatusBadge } from "../DashboardView";

interface Props {
  job: JobApplication;
  isDeleting: boolean;
  isSelected: boolean;
  /** False when the current user may neither edit nor delete this application. */
  mutable: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (job: JobApplication) => void;
  onDelete: (id: string) => void;
}

const ApplicationCard: React.FC<Props> = ({
  job,
  isDeleting,
  isSelected,
  mutable,
  onToggleSelect,
  onEdit,
  onDelete,
}) => {
  const mutateBlockedReason = mutable
    ? undefined
    : "Only the creator or an owner can modify this application";

  return (
    <div
      className={`bg-white dark:bg-slate-950 border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden ${isDeleting ? "opacity-50 pointer-events-none" : ""} ${isSelected ? "border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900/30" : "border-slate-200 dark:border-slate-800"}`}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(job.id);
            }}
            aria-label={isSelected ? "Deselect application" : "Select application"}
            className={`p-1 rounded-lg transition-all ${isSelected ? "text-emerald-600" : "text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100"}`}
          >
            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
        </div>
        <div className="flex gap-1 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
            disabled={isDeleting || !mutable}
            title={mutateBlockedReason}
            aria-label="Delete application"
            className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-300"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
          <StatusBadge status={job.status} />
        </div>
      </div>

      <div
        className={`flex-1 relative z-10 ${mutable ? "cursor-pointer" : "cursor-not-allowed"}`}
        onClick={() => mutable && onEdit(job)}
        title={mutateBlockedReason}
      >
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
          {job.reminderEnabled && job.followUpDate && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs">
              <Bell size={14} />
              <span>
                Follow-up{" "}
                {new Date(job.followUpDate) <= new Date()
                  ? "due"
                  : new Date(job.followUpDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="h-20 overflow-hidden relative">
          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed">
            {job.description || "No description provided."}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-slate-950 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ApplicationCard);
