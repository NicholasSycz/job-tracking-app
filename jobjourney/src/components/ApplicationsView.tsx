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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    }
  };

  const isAllSelected =
    sortedAndFiltered.length > 0 &&
    selectedIds.size === sortedAndFiltered.length;
  const hasSelection = selectedIds.size > 0;

  const selectedNotMutable = applications.filter(
    (a) => selectedIds.has(a.id) && !canMutate(currentUser, a),
  );
  const bulkBlockedReason =
    selectedNotMutable.length > 0
      ? `You can only modify applications you created. ${selectedNotMutable.length} of the selected ${selectedIds.size} were created by other members.`
      : undefined;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 -mt-3">
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
          sortedAndFiltered.map((job) => (
            <ApplicationCard
              key={job.id}
              job={job}
              isDeleting={deletingIds.has(job.id)}
              isSelected={selectedIds.has(job.id)}
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
