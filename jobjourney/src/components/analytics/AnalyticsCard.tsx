import React from "react";

/** The shared panel shell every analytics card sits in. */
const AnalyticsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
    {children}
  </div>
);

export default AnalyticsCard;
