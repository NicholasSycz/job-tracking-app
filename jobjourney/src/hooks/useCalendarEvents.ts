import { useCallback, useState } from "react";

import { CalendarEvent, EventType } from "../types";
import { apiService } from "../services/apiService";
import { useToast } from "../contexts/ToastContext";

type EventInput = {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  type?: EventType;
  jobId?: string;
};

/** Owns custom calendar events. Mutations re-throw so the modal can stay open. */
export function useCalendarEvents() {
  const { showError } = useToast();

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const load = useCallback(async () => {
    setCalendarEvents(await apiService.fetchEvents());
  }, []);

  const createEvent = useCallback(
    async (event: EventInput) => {
      try {
        const created = await apiService.createEvent(event);
        setCalendarEvents((prev) => [...prev, created]);
      } catch {
        showError("Save Failed", "Unable to save the event. Please try again.");
        throw new Error("create failed");
      }
    },
    [showError]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<EventInput>) => {
      try {
        const updated = await apiService.updateEvent(id, updates);
        setCalendarEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      } catch {
        showError("Save Failed", "Unable to update the event. Please try again.");
        throw new Error("update failed");
      }
    },
    [showError]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      try {
        await apiService.deleteEvent(id);
        setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
      } catch {
        showError("Delete Failed", "Unable to delete the event. Please try again.");
        throw new Error("delete failed");
      }
    },
    [showError]
  );

  return { calendarEvents, load, createEvent, updateEvent, deleteEvent };
}
