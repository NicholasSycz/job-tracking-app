import React from "react";
import { Plus } from "lucide-react";

import { ViewType } from "../../types";
import { MOBILE_NAV } from "./navItems";

interface Props {
  currentView: ViewType;
  unreadCount: number;
  onNavigate: (view: ViewType) => void;
  onAddApplication: () => void;
}

const MobileBottomNav: React.FC<Props> = ({
  currentView,
  unreadCount,
  onNavigate,
  onAddApplication,
}) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 lg:hidden">
    <div className="flex items-center justify-around py-2">
      {MOBILE_NAV.map(({ view, icon: Icon, shortLabel, showsUnreadBadge }) => {
        const badge = showsUnreadBadge ? unreadCount : 0;
        const isActive = currentView === view;
        return (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-bold">{shortLabel}</span>
            {badge > 0 && (
              <span className="absolute -top-1 right-0 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onAddApplication}
        aria-label="Add application"
        className="flex flex-col items-center gap-0.5 px-3 py-1.5"
      >
        <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 dark:shadow-none -mt-4">
          <Plus size={20} />
        </div>
      </button>
    </div>
  </nav>
);

export default MobileBottomNav;
