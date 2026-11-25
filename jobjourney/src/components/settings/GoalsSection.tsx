import React, { useState, useEffect } from 'react';
import { Target, Calendar, CheckCircle2, XCircle } from 'lucide-react';

import { MonthlyGoal } from '../../types';
import SettingsSection from './SettingsSection';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  currentGoal: MonthlyGoal | null;
  goalHistory: MonthlyGoal[];
  onUpdateGoal: (target: number) => void;
  onUpdateGoalMet: (goalId: string, met: boolean) => void;
}

const GoalsSection: React.FC<Props> = ({ currentGoal, goalHistory, onUpdateGoal, onUpdateGoalMet }) => {
  const [goalValue, setGoalValue] = useState(currentGoal?.target ?? 25);

  useEffect(() => {
    if (currentGoal) {
      setGoalValue(currentGoal.target);
    }
  }, [currentGoal]);

  const handleSaveGoal = () => {
    if (goalValue !== currentGoal?.target) {
      onUpdateGoal(goalValue);
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Past goals (exclude current month)
  const pastGoals = goalHistory.filter(g => !(g.month === currentMonth && g.year === currentYear));

  return (
    <>
      <SettingsSection
        icon={<Target className="text-purple-600 dark:text-purple-400" size={20} />}
        iconClass="bg-purple-100 dark:bg-purple-900/30"
        title="Monthly Goal"
        description={`Set your application target for ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Target Applications
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={goalValue}
                onChange={(e) => setGoalValue(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-200 text-sm"
              />
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={goalValue === currentGoal?.target}
              className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold transition-all disabled:cursor-not-allowed"
            >
              Update Goal
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            This sets your target for the current month. Past months are tracked below.
          </p>
        </div>
      </SettingsSection>

      {pastGoals.length > 0 && (
        <SettingsSection
          icon={<Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />}
          iconClass="bg-indigo-100 dark:bg-indigo-900/30"
          title="Goal History"
          description="Track your monthly goal performance"
        >
          <div className="space-y-3">
            {pastGoals.map((goal) => (
              <div
                key={goal.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  goal.met
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    goal.met
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {goal.met ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {MONTH_NAMES[goal.month - 1]} {goal.year}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Target: {goal.target} applications
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onUpdateGoalMet(goal.id, !goal.met)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    goal.met
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {goal.met ? 'Met' : 'Not Met'}
                </button>
              </div>
            ))}
          </div>
        </SettingsSection>
      )}
    </>
  );
};

export default React.memo(GoalsSection);
