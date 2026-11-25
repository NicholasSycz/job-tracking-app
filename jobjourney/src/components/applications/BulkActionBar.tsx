import React, { useState } from "react";
import { Trash2, Loader2, ChevronDown, X } from "lucide-react";

import { ApplicationStatus } from "../../types";

interface Props {
  selectedCount: number;
  isBulkOperating: boolean;
  /** Set when the selection contains applications the user may not modify. */
  blockedReason?: string;
  onClear: () => void;
  onDelete: () => void;
  onStatusUpdate: (status: ApplicationStatus) => Promise<void>;
}

const BulkActionBar: React.FC<Props> = ({
  selectedCount,
  isBulkOperating,
  blockedReason,
  onClear,
  onDelete,
  onStatusUpdate,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Menu closes once the update settles, matching the previous inline behavior.
  const handleStatusUpdate = async (status: ApplicationStatus) => {
    try {
      await onStatusUpdate(status);
    } finally {
      setShowStatusMenu(false);
    }
  };

  return (
    <div aria-label="Selected application actions" className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-30 md:static bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 md:p-4 shadow-lg md:shadow-none flex flex-wrap items-center justify-between gap-2 md:gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          aria-label="Clear selection"
          className="flex h-11 w-11 items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
        >
          <X size={18} className="text-emerald-600 dark:text-emerald-400" />
        </button>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {selectedCount} application{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            disabled={isBulkOperating || !!blockedReason}
            title={blockedReason}
            className="flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Change Status
            <ChevronDown
              size={14}
              className={`transition-transform ${showStatusMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute left-0 bottom-full mb-2 md:left-auto md:right-0 md:bottom-auto md:mb-0 md:mt-2 w-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-150">
                {Object.values(ApplicationStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    className="min-h-11 w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onDelete}
          disabled={isBulkOperating || !!blockedReason}
          title={blockedReason}
          className="flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBulkOperating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          Delete
        </button>
      </div>
      {blockedReason && <p role="status" className="w-full text-xs text-emerald-800 dark:text-emerald-300">{blockedReason}</p>}
    </div>
  );
};

export default BulkActionBar;
