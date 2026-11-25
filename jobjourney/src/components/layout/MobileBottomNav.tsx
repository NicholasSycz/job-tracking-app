import React, { useEffect, useRef, useState } from "react";
import { Ellipsis, LogOut, Moon, Sun, X } from "lucide-react";

import { ViewType } from "../../types";
import { MOBILE_MORE_NAV, MOBILE_NAV } from "./navItems";

interface Props {
  currentView: ViewType;
  unreadCount: number;
  darkMode: boolean;
  onNavigate: (view: ViewType) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

const MobileBottomNav: React.FC<Props> = ({
  currentView,
  unreadCount,
  darkMode,
  onNavigate,
  onToggleTheme,
  onSignOut,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const moreActive = MOBILE_MORE_NAV.some(item => item.view === currentView);

  useEffect(() => {
    if (moreOpen && !dialog.current?.open) dialog.current?.showModal();
    if (!moreOpen && dialog.current?.open) dialog.current.close();
  }, [moreOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMoreOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <>
      <nav aria-label="Mobile navigation" className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <div className="grid grid-cols-5 px-2 py-1.5">
          {MOBILE_NAV.map(({ view, icon: Icon, shortLabel, label, showsUnreadBadge }) => {
            const badge = showsUnreadBadge ? unreadCount : 0;
            const isActive = currentView === view;
            return (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors ${isActive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400"}`}
              >
                <Icon size={21} />
                <span className="text-xs font-semibold">{shortLabel}</span>
                {badge > 0 && (
                  <span className="absolute top-0.5 right-1 min-w-4 h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors ${moreActive || moreOpen
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400"}`}
          >
            <Ellipsis size={21} />
            <span className="text-xs font-semibold">More</span>
          </button>
        </div>
      </nav>

      <dialog
        ref={dialog}
        id="mobile-more-menu"
        aria-labelledby="mobile-more-title"
        onCancel={() => setMoreOpen(false)}
        onClose={() => setMoreOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) setMoreOpen(false); }}
        className="mobile-more-menu fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-white p-4 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 dark:bg-slate-950 dark:text-slate-100 lg:hidden"
      >
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="mobile-more-title" className="text-lg font-bold">More</h2>
            <button onClick={() => setMoreOpen(false)} aria-label="Close more menu" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900">
              <X size={22} />
            </button>
          </div>
          {MOBILE_MORE_NAV.map(({ view, icon: Icon, label }) => (
            <button key={view} onClick={() => { setMoreOpen(false); onNavigate(view); }} aria-current={currentView === view ? "page" : undefined}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-slate-100 dark:hover:bg-slate-900">
              <Icon size={21} /> {label}
            </button>
          ))}
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button onClick={onToggleTheme} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-slate-100 dark:hover:bg-slate-900">
              {darkMode ? <Sun size={21} /> : <Moon size={21} />}
              {darkMode ? "Light appearance" : "Dark appearance"}
            </button>
            <button onClick={() => { setMoreOpen(false); onSignOut(); }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20">
              <LogOut size={21} /> Sign Out
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default MobileBottomNav;
