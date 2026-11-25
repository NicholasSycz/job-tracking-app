import React from "react";
import { Plus, Search, User as UserIcon } from "lucide-react";

import { ViewType } from "../../types";

interface Props {
  currentView: ViewType;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddApplication: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<Props> = ({
  currentView,
  searchQuery,
  onSearchChange,
  onAddApplication,
  onOpenSettings,
}) => (
  <header className="app-header sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 lg:py-4 flex flex-wrap justify-between items-center gap-3 transition-colors">
    <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
      <h1 className="truncate text-lg sm:text-xl font-black text-slate-800 dark:text-white capitalize tracking-tight">
        {currentView}
      </h1>
      <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tighter">
        Live
      </span>
    </div>
    <button
      onClick={onAddApplication}
      aria-label="Add application"
      className="lg:hidden flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700"
    >
      <Plus size={20} />
      <span>Add</span>
    </button>
    <div className="flex w-full min-w-0 items-center gap-3 lg:w-auto lg:gap-6">
      <div className="relative min-w-0 flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Search..."
          aria-label="Search applications"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4 py-2.5 lg:py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl lg:rounded-full text-base lg:text-sm outline-none transition-all w-full lg:w-64 text-slate-800 dark:text-slate-200"
        />
      </div>
      <button
        onClick={onOpenSettings}
        aria-label="Open settings"
        className="hidden lg:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors"
      >
        <UserIcon size={18} />
      </button>
    </div>
  </header>
);

export default Header;
