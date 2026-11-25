import React, { useEffect, useState } from "react";
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
  Ellipsis,
  Pencil,
} from "lucide-react";

import { JobApplication } from "../../types";
import { StatusBadge } from "../DashboardView";

interface Props {
  job: JobApplication;
  isDeleting: boolean;
  isSelected: boolean;
  selectionMode?: boolean;
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
  selectionMode = false,
  mutable,
  onToggleSelect,
  onEdit,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [actionsAbove, setActionsAbove] = useState(false);
  useEffect(() => { if (selectionMode) setShowActions(false); }, [selectionMode]);
  const mutateBlockedReason = mutable
    ? undefined
    : "Only the creator or an owner can modify this application";

  const appliedDate = new Date(`${job.dateApplied.slice(0, 10)}T00:00:00`);
  let postingUrl: string | undefined;
  try {
    const url = new URL(job.link || "");
    if (url.protocol === "https:" || url.protocol === "http:") postingUrl = url.href;
  } catch { /* Applications without a valid posting link remain editable. */ }

  return (
    <article
      aria-label={`${job.role} at ${job.company}`}
      aria-busy={isDeleting}
      className={`application-card min-w-0 bg-white dark:bg-slate-950 border rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-colors group flex flex-col relative ${isDeleting ? "opacity-50 pointer-events-none" : ""} ${isSelected ? "border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900/30" : "border-slate-200 dark:border-slate-800"}`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => selectionMode ? onToggleSelect(job.id) : onEdit(job)}
          disabled={isDeleting || (!mutable && !selectionMode)}
          aria-label={selectionMode ? `${isSelected ? "Deselect" : "Select"} ${job.role} at ${job.company}` : `Edit ${job.role} at ${job.company}`}
          title={selectionMode ? undefined : mutateBlockedReason}
          className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-default"
        >
          <h3 className="break-words text-base md:text-lg font-bold text-slate-800 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {job.role}
          </h3>
          <p className="mt-1 break-words text-sm font-medium text-slate-500 dark:text-slate-400">{job.company}</p>
        </button>
        <div className="relative -mr-2 -mt-2 flex shrink-0 items-center" onKeyDown={event => { if (event.key === "Escape") setShowActions(false); }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(job.id);
            }}
            aria-label={isSelected ? "Deselect application" : "Select application"}
            aria-pressed={isSelected}
            className={`${selectionMode ? "flex" : "hidden md:flex"} h-11 w-11 items-center justify-center rounded-xl transition-colors ${isSelected ? "text-emerald-600" : "text-slate-400 dark:text-slate-500 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100"}`}
          >
            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
            disabled={isDeleting || !mutable}
            title={mutateBlockedReason}
            aria-label="Delete application"
            className="hidden md:flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
          {!selectionMode && <button
            onClick={event => {
              setActionsAbove(window.innerHeight - event.currentTarget.getBoundingClientRect().bottom < 280);
              setShowActions(previous => !previous);
            }}
            aria-label="Application actions"
            aria-expanded={showActions}
            aria-haspopup="menu"
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <Ellipsis size={22} />
          </button>}
          {showActions && (
            <>
              <button aria-label="Close application actions" onClick={() => setShowActions(false)} className="fixed inset-0 z-20 cursor-default md:hidden" tabIndex={-1} />
              <div role="menu" aria-label="Application actions" onKeyDown={event => { if (event.key === "Escape") setShowActions(false); }}
                className={`absolute right-0 ${actionsAbove ? "bottom-full mb-1" : "top-full mt-1"} z-30 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950 md:hidden`}>
                <button role="menuitem" disabled={!mutable} title={mutateBlockedReason} onClick={() => { setShowActions(false); onEdit(job); }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-900">
                  <Pencil size={17} /> Edit application
                </button>
                {postingUrl && <a role="menuitem" href={postingUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowActions(false)}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                  <ExternalLink size={17} /> View job posting
                </a>}
                <button role="menuitem" disabled={isDeleting || !mutable} title={mutateBlockedReason} onClick={() => { setShowActions(false); onDelete(job.id); }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-900/20">
                  <Trash2 size={17} /> Delete application
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <StatusBadge status={job.status} />
        {!mutable && <span className="text-xs text-slate-500 dark:text-slate-400">Shared by a teammate</span>}
        {job.reminderEnabled && job.followUpDate && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Bell size={12} className="shrink-0" />
            Follow-up {new Date(job.followUpDate) <= new Date() ? "due" : new Date(job.followUpDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 md:mb-4 text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {job.location && <div className="flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            <span className="break-words [overflow-wrap:anywhere]">{job.location}</span>
          </div>}
          {job.salary && (
            <div className="flex min-w-0 items-center gap-1.5">
              <DollarSign size={14} className="shrink-0 text-slate-400" />
              <span className="break-words [overflow-wrap:anywhere]">{job.salary}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="shrink-0 text-slate-400" />
            <span>Applied <time dateTime={job.dateApplied}>{appliedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span>
          </div>
        </div>

        <div className="hidden md:block mt-auto h-20 overflow-hidden relative">
          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed">
            {job.description || "No description provided."}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-slate-950 to-transparent"></div>
        </div>
    </article>
  );
};

export default React.memo(ApplicationCard);
