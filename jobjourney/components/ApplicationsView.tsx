import React, { useState, useEffect, useMemo } from "react";
import { JobApplication, ApplicationStatus } from "../types";
import {
  Filter,
  Trash2,
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  Briefcase,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  Download,
  Upload,
  CheckSquare,
  Square,
  X,
  Bell,
} from "lucide-react";
import { StatusBadge } from "./DashboardView";
import { exportToCSV, exportToJSON } from "../utils/export";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem("applications_sort", sortBy);
  }, [sortBy]);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

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
    if (selectedIds.size === sortedAndFiltered.length) {
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
      setShowBulkStatusMenu(false);
    }
  };

  const isAllSelected =
    sortedAndFiltered.length > 0 &&
    selectedIds.size === sortedAndFiltered.length;
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              <X size={18} className="text-emerald-600 dark:text-emerald-400" />
            </button>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {selectedIds.size} application{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Status Change */}
            <div className="relative">
              <button
                onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                disabled={isBulkOperating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
              >
                Change Status
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showBulkStatusMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showBulkStatusMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowBulkStatusMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-150">
                    {Object.values(ApplicationStatus).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleBulkStatusUpdate(status)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isBulkOperating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="flex items-center gap-3">
          {/* Sort - Inline Display */}
          <div className="relative flex items-center gap-2">
            <ArrowUpDown size={14} className="text-slate-400" />
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
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
                <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-150">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : sortedAndFiltered.length === 0 ? (
          <div className="col-span-full py-20 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 transition-colors">
            <Briefcase size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">
              No applications found in this category.
            </p>
            <p className="text-sm opacity-70">
              Try changing your filter or add a new job.
            </p>
          </div>
        ) : (
          sortedAndFiltered.map((job) => {
            const isDeleting = deletingIds.has(job.id);
            const isSelected = selectedIds.has(job.id);
            return (
              <div
                key={job.id}
                className={`bg-white dark:bg-slate-950 border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden ${isDeleting ? "opacity-50 pointer-events-none" : ""} ${isSelected ? "border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900/30" : "border-slate-200 dark:border-slate-800"}`}
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(job.id);
                      }}
                      className={`p-1 rounded-lg transition-all ${isSelected ? "text-emerald-600" : "text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100"}`}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-xl text-slate-400 dark:text-slate-600 transition-colors group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {job.company.charAt(0)}
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(job.id);
                      }}
                      disabled={isDeleting}
                      aria-label="Delete application"
                      className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
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
                  className="flex-1 cursor-pointer relative z-10"
                  onClick={() => onEdit(job)}
                >
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                    {job.role}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-4 flex items-center gap-1.5 text-sm">
                    {job.company}
                    {job.link && (
                      <ExternalLink size={12} className="opacity-40" />
                    )}
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
                      <span>
                        Applied {new Date(job.dateApplied).toLocaleDateString()}
                      </span>
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
          })
        )}
      </div>
    </div>
  );
};

export default ApplicationsView;
