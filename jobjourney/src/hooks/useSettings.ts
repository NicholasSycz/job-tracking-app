import { useCallback, useState } from "react";

import { UserSettings } from "../types";
import { apiService } from "../services/apiService";

/** Owns the user's settings payload (job sources, recruiting services, interview types). */
export function useSettings() {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const load = useCallback(async () => {
    setUserSettings(await apiService.fetchSettings());
  }, []);

  return { userSettings, setUserSettings, load };
}
