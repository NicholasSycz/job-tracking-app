import { useCallback, useState } from "react";

import { MonthlyGoal } from "../types";
import { apiService } from "../services/apiService";
import { useToast } from "../contexts/ToastContext";

/** Owns the current monthly goal and the goal history. */
export function useGoals() {
  const { showSuccess, showError } = useToast();

  const [currentGoal, setCurrentGoal] = useState<MonthlyGoal | null>(null);
  const [goalHistory, setGoalHistory] = useState<MonthlyGoal[]>([]);

  const loadCurrent = useCallback(async () => {
    setCurrentGoal(await apiService.fetchCurrentGoal());
  }, []);

  const loadHistory = useCallback(async () => {
    setGoalHistory(await apiService.fetchGoalHistory());
  }, []);

  const updateGoal = useCallback(
    async (target: number) => {
      try {
        const updated = await apiService.updateCurrentGoal(target);
        setCurrentGoal(updated);
        setGoalHistory((prev) => {
          const filtered = prev.filter(
            (g) => !(g.month === updated.month && g.year === updated.year)
          );
          return [updated, ...filtered];
        });
        showSuccess(
          "Goal Updated",
          `Your ${new Date(updated.year, updated.month - 1).toLocaleString("default", {
            month: "long",
          })} goal is now ${target} applications.`
        );
      } catch (err) {
        console.error("Failed to update goal:", err);
        showError("Update Failed", "Unable to save your goal.");
      }
    },
    [showSuccess, showError]
  );

  const updateGoalMet = useCallback(
    async (goalId: string, met: boolean) => {
      try {
        const updated = await apiService.updateGoalMet(goalId, met);
        setGoalHistory((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        setCurrentGoal((prev) => (prev?.id === updated.id ? updated : prev));
      } catch (err) {
        console.error("Failed to update goal status:", err);
        showError("Update Failed", "Unable to update goal status.");
      }
    },
    [showError]
  );

  return { currentGoal, goalHistory, loadCurrent, loadHistory, updateGoal, updateGoalMet };
}
