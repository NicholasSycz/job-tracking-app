import React from "react";
import { Search, User as UserIcon, Menu } from "lucide-react";

import { ViewType } from "../../types";

interface Props {
  currentView: ViewType;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<Props> = ({
  currentView,
  searchQuery,
  onSearchChange,
  onOpenSidebar,
  onOpenSettings,
}) => (
  <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex justify-between items-center transition-colors">
    <div className="flex items-center gap-3">
      <button
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
      >
        <Menu size={22} />
      </button>
      <h1 className="text-xl font-black text-slate-800 dark:text-white capitalize tracking-tight">
        {currentView}
      </h1>
      <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tighter">
        Live
      </span>
    </div>
    <div className="flex items-center gap-3 sm:gap-6">
      <div className="relative">
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
          className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-full text-xs outline-none transition-all w-36 sm:w-64 text-slate-800 dark:text-slate-200"
        />
      </div>
      <button
        onClick={onOpenSettings}
        aria-label="Open settings"
        className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors"
      >
        <UserIcon size={18} />
      </button>
    </div>
  </header>
);

export default Header;
