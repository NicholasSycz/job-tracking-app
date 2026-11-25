import { useCallback, useEffect, useState } from "react";

import { AuthUser } from "../types";
import { apiService } from "../services/apiService";

const POLL_INTERVAL_MS = 15000;

/** Unread message count, polled while logged in and the tab is visible. */
export function useUnreadCount(user: AuthUser | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setUnreadCount(await apiService.fetchUnreadCount());
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  return { unreadCount, refresh };
}
