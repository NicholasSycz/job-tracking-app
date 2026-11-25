import React, { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { JobApplication, ApplicationStatus, InterviewOutcome } from '../../types';
import { hasInterview, latestOutcome } from '../../utils/interview';
import AnalyticsCard from './AnalyticsCard';

const FunnelStep: React.FC<{
  label: string;
  count: number;
  percentage: number;
  bgColor: string;
  barColor: string;
}> = ({ label, count, percentage, bgColor, barColor }) => (
  <div className="relative group flex-1">
    <div className="flex justify-between items-end mb-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <span className="text-xs text-slate-500 dark:text-slate-500 font-bold">{count} ({percentage.toFixed(0)}%)</span>
    </div>
    <div className={`w-full h-10 ${bgColor} rounded-xl overflow-hidden flex items-center px-4 relative transition-transform group-hover:scale-[1.01]`}>
      <div className={`h-full absolute left-0 top-0 ${barColor} opacity-10`} style={{ width: `${percentage}%` }} />
      <div className="relative z-10 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  </div>
);

const percent = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

const ConversionFunnelCard: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const funnelStats = useMemo(() => {
    const total = applications.length;
    const interviewsLanded = applications.filter(hasInterview).length;
    const interviewsPassed = applications.filter(a => latestOutcome(a) === InterviewOutcome.PASSED).length;
    const interviewsFailed = applications.filter(a => latestOutcome(a) === InterviewOutcome.FAILED).length;
    const jobOffers = applications.filter(a => a.status === ApplicationStatus.OFFER).length;
    return { total, interviewsLanded, interviewsPassed, interviewsFailed, jobOffers };
  }, [applications]);

  const hasOutcomes = funnelStats.interviewsPassed > 0 || funnelStats.interviewsFailed > 0;

  return (
    <AnalyticsCard>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-8 text-center">Your Conversion Funnel</h3>
      <div className="max-w-xl mx-auto space-y-4">
        <FunnelStep
          label="Total Applications"
          count={funnelStats.total}
          percentage={100}
          bgColor="bg-emerald-50 dark:bg-emerald-900/10"
          barColor="bg-emerald-500"
        />
        <FunnelStep
          label="Interviews Landed"
          count={funnelStats.interviewsLanded}
          percentage={percent(funnelStats.interviewsLanded, funnelStats.total)}
          bgColor="bg-teal-50 dark:bg-teal-900/10"
          barColor="bg-teal-500"
        />

        {/* Only show the outcome breakdown once outcomes have been recorded */}
        {hasOutcomes && (
          <div className="ml-6 space-y-3 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <FunnelStep
                label="Passed"
                count={funnelStats.interviewsPassed}
                percentage={percent(funnelStats.interviewsPassed, funnelStats.interviewsLanded)}
                bgColor="bg-emerald-50/60 dark:bg-emerald-900/5"
                barColor="bg-emerald-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <XCircle size={14} className="text-rose-500 shrink-0" />
              <FunnelStep
                label="Failed"
                count={funnelStats.interviewsFailed}
                percentage={percent(funnelStats.interviewsFailed, funnelStats.interviewsLanded)}
                bgColor="bg-rose-50/60 dark:bg-rose-900/5"
                barColor="bg-rose-400"
              />
            </div>
          </div>
        )}

        <FunnelStep
          label="Job Offers"
          count={funnelStats.jobOffers}
          percentage={percent(funnelStats.jobOffers, funnelStats.total)}
          bgColor="bg-cyan-50 dark:bg-cyan-900/10"
          barColor="bg-cyan-500"
        />
      </div>
      {!hasOutcomes && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
          Record interview outcomes on your applications to see the full funnel breakdown.
        </p>
      )}
    </AnalyticsCard>
  );
};

export default React.memo(ConversionFunnelCard);
