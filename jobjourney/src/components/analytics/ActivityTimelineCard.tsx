import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { JobApplication } from '../../types';
import { useChartTheme } from './chartTheme';
import AnalyticsCard from './AnalyticsCard';

const ActivityTimelineCard: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const { axisStyle, gridColor, tooltipStyle, tooltipCursorFill } = useChartTheme();

  // Keyed by YYYY-MM so cross-year months don't collapse into one bar.
  const timelineData = useMemo(() => {
    const sorted = [...applications].sort((a, b) => new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime());
    const groups: Record<string, { count: number; label: string }> = {};
    sorted.forEach(app => {
      const d = new Date(app.dateApplied);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2);
      if (!groups[key]) groups[key] = { count: 0, label };
      groups[key].count++;
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { label, count }]) => ({ name: label, count }));
  }, [applications]);

  return (
    <AnalyticsCard>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Activity Timeline</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={axisStyle} />
            <YAxis axisLine={false} tickLine={false} fontSize={11} tick={axisStyle} />
            <Tooltip cursor={{ fill: tooltipCursorFill }} contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
};

export default React.memo(ActivityTimelineCard);
