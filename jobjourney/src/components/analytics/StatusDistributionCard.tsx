import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import { JobApplication, ApplicationStatus } from '../../types';
import { useChartTheme } from './chartTheme';
import AnalyticsCard from './AnalyticsCard';

const StatusDistributionCard: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const { colors, tooltipStyle, tooltipItemStyle } = useChartTheme();

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ApplicationStatus).forEach(s => counts[s] = 0);
    applications.forEach(app => counts[app.status]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  return (
    <AnalyticsCard>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Application Status</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {statusData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {statusData.map((s, idx) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.name}: {s.value}</span>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  );
};

export default React.memo(StatusDistributionCard);
