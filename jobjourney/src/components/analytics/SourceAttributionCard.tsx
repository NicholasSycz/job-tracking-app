import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Layers } from 'lucide-react';

import { JobApplication, ApplicationStatus } from '../../types';
import { DEFAULT_JOB_SOURCES } from '../../constants';
import { hasInterview } from '../../utils/interview';
import { useChartTheme } from './chartTheme';
import AnalyticsCard from './AnalyticsCard';

const SOURCE_LABELS: Record<string, string> = {
  ...Object.fromEntries(DEFAULT_JOB_SOURCES.map(s => [s.value, s.label])),
  extension: 'Extension',
  // legacy values
  manual: 'Manual',
  glassdoor: 'Glassdoor',
};

const SourceAttributionCard: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const { axisStyle, gridColor, tooltipStyle, tooltipCursorFill } = useChartTheme();

  const sourceData = useMemo(() => {
    const sources: Record<string, { apps: number; interviews: number; offers: number }> = {};
    applications.forEach(app => {
      const src = app.source || 'other';
      if (!sources[src]) sources[src] = { apps: 0, interviews: 0, offers: 0 };
      sources[src].apps++;
      if (hasInterview(app)) sources[src].interviews++;
      if (app.status === ApplicationStatus.OFFER) sources[src].offers++;
    });
    return Object.entries(sources)
      .map(([key, v]) => ({
        name: SOURCE_LABELS[key] ?? key,
        Applications: v.apps,
        Interviews: v.interviews,
        Offers: v.offers,
      }))
      .sort((a, b) => b.Applications - a.Applications);
  }, [applications]);

  if (sourceData.length === 0) return null;

  return (
    <AnalyticsCard>
      <div className="flex items-center gap-3 mb-6">
        <Layers className="text-violet-600 dark:text-violet-400" size={20} />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Source Performance</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Which job board converts best?</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sourceData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={axisStyle} />
            <YAxis axisLine={false} tickLine={false} fontSize={11} tick={axisStyle} allowDecimals={false} />
            <Tooltip cursor={{ fill: tooltipCursorFill }} contentStyle={tooltipStyle} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="Applications" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="Interviews" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="Offers" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
};

export default React.memo(SourceAttributionCard);
