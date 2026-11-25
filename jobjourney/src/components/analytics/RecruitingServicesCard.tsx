import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';

import { JobApplication, ApplicationStatus } from '../../types';
import { hasInterview } from '../../utils/interview';
import AnalyticsCard from './AnalyticsCard';

const RecruitingServicesCard: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const recruitingServiceData = useMemo(() => {
    const services: Record<string, { apps: number; interviews: number; offers: number }> = {};
    applications.forEach(app => {
      if (!app.recruitingService) return;
      const svc = app.recruitingService.trim();
      if (!svc) return;
      if (!services[svc]) services[svc] = { apps: 0, interviews: 0, offers: 0 };
      services[svc].apps++;
      if (hasInterview(app)) services[svc].interviews++;
      if (app.status === ApplicationStatus.OFFER) services[svc].offers++;
    });
    return Object.entries(services)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.apps - a.apps);
  }, [applications]);

  if (recruitingServiceData.length === 0) return null;

  return (
    <AnalyticsCard>
      <div className="flex items-center gap-3 mb-6">
        <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recruiting Services</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Which agencies are getting you interviews?</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3">Service</th>
              <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Apps</th>
              <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Interviews</th>
              <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Offers</th>
              <th className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 text-right">Interview Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {recruitingServiceData.map(row => (
              <tr key={row.name}>
                <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">{row.name}</td>
                <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.apps}</td>
                <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.interviews}</td>
                <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.offers}</td>
                <td className="py-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                  {row.apps > 0 ? `${((row.interviews / row.apps) * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalyticsCard>
  );
};

export default React.memo(RecruitingServicesCard);
