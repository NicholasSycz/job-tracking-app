import React from 'react';

import { JobApplication } from '../types';
import StatusDistributionCard from './analytics/StatusDistributionCard';
import ActivityTimelineCard from './analytics/ActivityTimelineCard';
import SourceAttributionCard from './analytics/SourceAttributionCard';
import RecruitingServicesCard from './analytics/RecruitingServicesCard';
import ConversionFunnelCard from './analytics/ConversionFunnelCard';
import ReportGeneratorCard from './analytics/ReportGeneratorCard';

interface Props {
  applications: JobApplication[];
}

// Each card owns its own derived data; this is just the page layout.
const AnalyticsView: React.FC<Props> = ({ applications }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <StatusDistributionCard applications={applications} />
      <ActivityTimelineCard applications={applications} />
    </div>

    <SourceAttributionCard applications={applications} />
    <RecruitingServicesCard applications={applications} />
    <ConversionFunnelCard applications={applications} />
    <ReportGeneratorCard applications={applications} />
  </div>
);

export default React.memo(AnalyticsView);
