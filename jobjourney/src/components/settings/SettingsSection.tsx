import React from 'react';

interface Props {
  icon: React.ReactNode;
  /** Background classes for the 10x10 icon tile. */
  iconClass: string;
  title: string;
  /** Overrides the default title color (the danger zone goes rose). */
  titleClass?: string;
  description: string;
  /** Optional top-right control, e.g. "Reset to defaults". */
  action?: React.ReactNode;
  /** Overrides the default section border (the danger zone goes rose). */
  borderClass?: string;
  children: React.ReactNode;
}

/** The shared card shell every settings section sits in. */
const SettingsSection: React.FC<Props> = ({
  icon,
  iconClass,
  title,
  titleClass = 'text-slate-800 dark:text-white',
  description,
  action,
  borderClass = 'border-slate-200 dark:border-slate-800',
  children,
}) => (
  <section className={`min-w-0 bg-white dark:bg-slate-950 rounded-2xl border ${borderClass} p-4 sm:p-6 shadow-sm transition-colors`}>
    <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
      <div className={`w-10 h-10 shrink-0 ${iconClass} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`text-lg font-bold ${titleClass}`}>{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default SettingsSection;
