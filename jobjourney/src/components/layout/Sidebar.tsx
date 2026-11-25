import React from "react";
import { Plus, Sun, Moon, LogOut } from "lucide-react";

import { AuthUser, ViewType } from "../../types";
import { getAvatarUrl } from "../../utils/avatar";
import { SIDEBAR_NAV } from "./navItems";

interface Props {
  user: AuthUser;
  currentView: ViewType;
  unreadCount: number;
  darkMode: boolean;
  onNavigate: (view: ViewType) => void;
  onToggleTheme: () => void;
  onAddApplication: () => void;
  onSignOut: () => void;
}

const Sidebar: React.FC<Props> = ({
  user,
  currentView,
  unreadCount,
  darkMode,
  onNavigate,
  onToggleTheme,
  onAddApplication,
  onSignOut,
}) => (
    <aside
      className="hidden lg:flex min-h-0 w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-col"
    >
      <div className="min-h-0 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200/50 dark:shadow-none">
              J
            </div>
            <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
              JobJourney
            </span>
          </div>
        </div>

        <nav aria-label="Desktop navigation" className="space-y-1.5">
          {SIDEBAR_NAV.map(({ view, icon: Icon, label, showsUnreadBadge }) => {
            const badge = showsUnreadBadge ? unreadCount : 0;
            const isActive = currentView === view;
            return (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? "text-emerald-600 dark:text-emerald-400" : ""}
                />
                <span className="text-sm flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto shrink-0 p-4 space-y-2">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800">
          <img
            src={getAvatarUrl(user)}
            className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
            alt="Avatar"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {user.name}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate uppercase tracking-wider">
              Explorer
            </p>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
          className="w-full flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span className="font-bold text-xs uppercase tracking-widest">
            {darkMode ? "Light" : "Dark"}
          </span>
        </button>

        <button
          onClick={onAddApplication}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          <span className="text-sm">New Opportunity</span>
        </button>

        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
);

export default Sidebar;
