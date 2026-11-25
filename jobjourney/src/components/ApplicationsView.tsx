import React, { useState, useEffect, useMemo } from "react";
import { JobApplication, ApplicationStatus, AuthUser } from "../types";
import {
  Filter,
  Briefcase,
  ArrowUpDown,
  ChevronDown,
  Download,
  Upload,
  CheckSquare,
  Square,
  Ellipsis,
} from "lucide-react";
import { exportToCSV, exportToJSON } from "../utils/export";
import ApplicationCard from "./applications/ApplicationCard";
import BulkActionBar from "./applications/BulkActionBar";

type SortOption =
  | "date-desc"
  | "date-asc"
  | "company-asc"
  | "company-desc"
  | "status";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "company-asc", label: "Company (A-Z)" },
  { value: "company-desc", label: "Company (Z-A)" },
  { value: "status", label: "Status" },
];

const STATUS_ORDER: ApplicationStatus[] = [
  ApplicationStatus.OFFER,
  ApplicationStatus.INTERVIEWING,
  ApplicationStatus.APPLIED,
  ApplicationStatus.INTERESTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.GHOSTED,
];

interface Props {
  applications: JobApplication[];
  currentUser: AuthUser;
  onEdit: (job: JobApplication) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkStatusUpdate?: (
    ids: string[],
    status: ApplicationStatus,
  ) => Promise<void>;
  onImport?: () => void;
  deletingIds?: Set<string>;
  isLoading?: boolean;
}

function canMutate(user: AuthUser, app: { createdByUserId: string }): boolean {
  return user.role === "owner" || app.createdByUserId === user.id;
}

// Skeleton card for loading state
const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="w-20 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
    </div>
    <div className="space-y-3">
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
      <div className="space-y-2 mt-4">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/5" />
      </div>
      <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded mt-4" />
    </div>
  </div>
);

const ApplicationsView: React.FC<Props> = ({
  applications,
  currentUser,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkStatusUpdate,
  onImport,
  deletingIds = new Set(),
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<ApplicationStatus | "All">("All");
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("applications_sort");
    return (saved as SortOption) || "date-desc";
  });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeMobileControls = () => {
      if (!desktop.matches) return;
      setSelectionMode(false);
      setShowMobileActions(false);
      setShowSortMenu(false);
    };
    desktop.addEventListener("change", closeMobileControls);
    return () => desktop.removeEventListener("change", closeMobileControls);
  }, []);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem("applications_sort", sortBy);
  }, [sortBy]);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  // Search and deletions must not leave hidden applications selected for a bulk action.
  useEffect(() => {
    const visible = new Set(applications.map(application => application.id));
    setSelectedIds(previous => {
      const next = new Set([...previous].filter(id => visible.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [applications]);

  const statusCounts = useMemo(() => applications.reduce<Partial<Record<ApplicationStatus, number>>>((counts, application) => {
    counts[application.status] = (counts[application.status] || 0) + 1;
    return counts;
  }, {}), [applications]);

  // Filter and sort applications
  const sortedAndFiltered = useMemo(() => {
    let result = applications.filter((app) =>
      filter === "All" ? true : app.status === filter,
    );

    switch (sortBy) {
      case "date-desc":
        result.sort(
          (a, b) =>
            new Date(b.dateApplied).getTime() -
            new Date(a.dateApplied).getTime(),
        );
        break;
      case "date-asc":
        result.sort(
          (a, b) =>
            new Date(a.dateApplied).getTime() -
            new Date(b.dateApplied).getTime(),
        );
        break;
      case "company-asc":
        result.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case "company-desc":
        result.sort((a, b) => b.company.localeCompare(a.company));
        break;
      case "status":
        result.sort(
          (a, b) =>
            STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
        );
        break;
    }

    return result;
  }, [applications, filter, sortBy]);

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Sort";

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (sortedAndFiltered.every(application => selectedIds.has(application.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedAndFiltered.map((app) => app.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkStatusUpdate = async (status: ApplicationStatus) => {
    if (!onBulkStatusUpdate || selectedIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      await onBulkStatusUpdate(Array.from(selectedIds), status);
      setSelectedIds(new Set());
    } finally {
      setIsBulkOperating(false);
    }
  };

  const isAllSelected =
    sortedAndFiltered.length > 0 &&
    sortedAndFiltered.every(application => selectedIds.has(application.id));
  const hasSelection = selectedIds.size > 0;

  const selectedNotMutable = applications.filter(
    (a) => selectedIds.has(a.id) && !canMutate(currentUser, a),
  );
  const bulkBlockedReason =
    selectedNotMutable.length > 0
      ? `You can only modify applications you created. ${selectedNotMutable.length} of the selected ${selectedIds.size} were created by other members.`
      : undefined;

  return (
    <div className={`space-y-3 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${hasSelection ? "pb-36 md:pb-0" : ""}`}>
      {hasSelection && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          isBulkOperating={isBulkOperating}
          blockedReason={bulkBlockedReason}
          onClear={clearSelection}
          onDelete={handleBulkDelete}
          onStatusUpdate={handleBulkStatusUpdate}
        />
      )}
      <div className="md:hidden space-y-3" aria-label="Mobile application controls">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Filter applications by status">
          {(["All", ...Object.values(ApplicationStatus)] as const).map(status => {
            const count = status === "All" ? applications.length : statusCounts[status] || 0;
            const active = filter === status;
            return <button key={status} aria-label={status} aria-pressed={active} onClick={() => setFilter(status)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors ${active
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"}`}>
              {status === "All" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
              <span aria-hidden="true" className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>{count}</span>
            </button>;
          })}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p role="status" className="min-w-0 text-sm font-medium text-slate-500 dark:text-slate-400">
            {sortedAndFiltered.length} application{sortedAndFiltered.length === 1 ? "" : "s"}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <div className="relative" onKeyDown={event => { if (event.key === "Escape") setShowSortMenu(false); }}>
              <button onClick={() => { setShowSortMenu(previous => !previous); setShowMobileActions(false); }} aria-label="Sort applications" aria-expanded={showSortMenu} aria-haspopup="menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800">
                <ArrowUpDown size={19} />
              </button>
              {showSortMenu && <>
                <button aria-label="Close sort options" tabIndex={-1} onClick={() => setShowSortMenu(false)} className="fixed inset-0 z-20 cursor-default" />
                <div role="menu" aria-label="Sort applications" className="absolute right-0 top-full z-30 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                  {SORT_OPTIONS.map(option => <button key={option.value} role="menuitemradio" aria-checked={sortBy === option.value} onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                    className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm ${sortBy === option.value ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
                    {option.label}
                  </button>)}
                </div>
              </>}
            </div>
            <button disabled={!sortedAndFiltered.length && !selectionMode} aria-label={selectionMode ? "Finish selecting" : "Select applications"} aria-pressed={selectionMode}
              onClick={() => { setSelectionMode(previous => !previous); clearSelection(); }}
              className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold disabled:opacity-40 ${selectionMode ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>
              <CheckSquare size={18} /> {selectionMode ? "Done" : "Select"}
            </button>
            <div className="relative" onKeyDown={event => { if (event.key === "Escape") setShowMobileActions(false); }}>
              <button onClick={() => { setShowMobileActions(previous => !previous); setShowSortMenu(false); }} aria-label="Application list actions" aria-expanded={showMobileActions} aria-haspopup="menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800">
                <Ellipsis size={21} />
              </button>
              {showMobileActions && <>
                <button aria-label="Close list actions" tabIndex={-1} onClick={() => setShowMobileActions(false)} className="fixed inset-0 z-20 cursor-default" />
                <div role="menu" aria-label="Application list actions" className="absolute right-0 top-full z-30 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                  {onImport && <button role="menuitem" onClick={() => { setShowMobileActions(false); onImport(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"><Upload size={17} /> Import applications</button>}
                  <button role="menuitem" onClick={() => { setShowMobileActions(false); exportToCSV(sortedAndFiltered); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"><Download size={17} /> Export as CSV</button>
                  <button role="menuitem" onClick={() => { setShowMobileActions(false); exportToJSON(sortedAndFiltered); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"><Download size={17} /> Export as JSON</button>
                </div>
              </>}
            </div>
          </div>
        </div>
        {selectionMode && <button onClick={toggleSelectAll} aria-pressed={isAllSelected} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {isAllSelected ? <CheckSquare size={19} /> : <Square size={19} />}
          {isAllSelected ? "Deselect all" : "Select all"}
        </button>}
      </div>
      <div className="hidden md:flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 py-3 -mt-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {/* Select All Checkbox */}
          {sortedAndFiltered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors mr-1"
              title={isAllSelected ? "Deselect all" : "Select all"}
            >
              {isAllSelected ? (
                <CheckSquare size={18} className="text-emerald-600" />
              ) : (
                <Square size={18} className="text-slate-400" />
              )}
            </button>
          )}
          <button
            onClick={() => setFilter("All")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === "All" ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700"}`}
          >
            All
          </button>
          {Object.values(ApplicationStatus).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === s ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort - Inline Display */}
          <div className="relative flex items-center gap-2">
            <ArrowUpDown size={14} className="text-slate-400" />
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              {currentSortLabel}
              <ChevronDown
                size={12}
                className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-44 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-150">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        sortBy === option.value
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
            <Filter size={14} />
            <span>{sortedAndFiltered.length}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Import Button */}
          {onImport && (
            <button
              onClick={onImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              <Upload size={14} />
              <span>Import</span>
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      exportToCSV(sortedAndFiltered);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => {
                      exportToJSON(sortedAndFiltered);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Export as JSON
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6" aria-label="Applications">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : sortedAndFiltered.length === 0 ? (
          <div className="col-span-full px-4 py-12 md:py-20 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 transition-colors">
            <Briefcase size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">
              No applications found in this category.
            </p>
            <p className="text-sm opacity-70">
              Try changing your filter or add a new job.
            </p>
          </div>
        ) : (
          sortedAndFiltered.map((job) => (
            <ApplicationCard
              key={job.id}
              job={job}
              isDeleting={deletingIds.has(job.id)}
              isSelected={selectedIds.has(job.id)}
              selectionMode={selectionMode}
              mutable={canMutate(currentUser, job)}
              onToggleSelect={toggleSelection}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(ApplicationsView);
