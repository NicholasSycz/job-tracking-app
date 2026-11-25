import React from 'react';

import { AuthUser, MonthlyGoal, UserSettings } from '../types';
import MembersSettings from './MembersSettings';
import ProfileSection from './settings/ProfileSection';
import GoalsSection from './settings/GoalsSection';
import JobSourcesSection from './settings/JobSourcesSection';
import RecruitingServicesSection from './settings/RecruitingServicesSection';
import InterviewTypesSection from './settings/InterviewTypesSection';
import NotificationsSection from './settings/NotificationsSection';
import SecuritySection from './settings/SecuritySection';
import DangerZoneSection from './settings/DangerZoneSection';

interface Props {
  user: AuthUser;
  onUpdateUser: (updates: Partial<AuthUser>) => void;
  currentGoal: MonthlyGoal | null;
  goalHistory: MonthlyGoal[];
  onUpdateGoal: (target: number) => void;
  onUpdateGoalMet: (goalId: string, met: boolean) => void;
  userSettings: UserSettings | null;
  onUpdateSettings: (settings: UserSettings) => void;
}

// Each section owns its own state; this is just the page layout.
const SettingsView: React.FC<Props> = ({
  user,
  onUpdateUser,
  currentGoal,
  goalHistory,
  onUpdateGoal,
  onUpdateGoalMet,
  userSettings,
  onUpdateSettings,
}) => (
  <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
    <ProfileSection user={user} onUpdateUser={onUpdateUser} />

    <GoalsSection
      currentGoal={currentGoal}
      goalHistory={goalHistory}
      onUpdateGoal={onUpdateGoal}
      onUpdateGoalMet={onUpdateGoalMet}
    />

    <MembersSettings currentUser={user} />

    <JobSourcesSection userSettings={userSettings} onUpdateSettings={onUpdateSettings} />
    <RecruitingServicesSection userSettings={userSettings} onUpdateSettings={onUpdateSettings} />
    <InterviewTypesSection userSettings={userSettings} onUpdateSettings={onUpdateSettings} />

    <NotificationsSection />
    <SecuritySection />
    <DangerZoneSection />
  </div>
);

export default React.memo(SettingsView);
