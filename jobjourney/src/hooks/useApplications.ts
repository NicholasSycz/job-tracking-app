import { useCallback, useState } from "react";

import { JobApplication, JobApplicationCreateInput, ApplicationStatus } from "../types";
import { apiService } from "../services/apiService";
import { useToast } from "../contexts/ToastContext";

/** Owns the application list and every mutation against it. */
export function useApplications() {
  const { showSuccess, showError } = useToast();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Rejects on failure so the caller can decide what to show.
  const load = useCallback(async () => {
    setApplications(await apiService.fetchApplications());
  }, []);

  const clear = useCallback(() => setApplications([]), []);

  const add = useCallback(
    async (newApp: JobApplicationCreateInput) => {
      setIsSaving(true);
      try {
        const savedApp = await apiService.createApplication(newApp);
        setApplications((prev) => [savedApp, ...prev]);
        showSuccess("Application Added", `Added ${newApp.role} at ${newApp.company}`);
      } catch (err) {
        console.error("Failed to save to backend", err);
        showError("Save Failed", "Unable to save the application. Please try again.");
        throw err; // Re-throw so modal knows save failed
      } finally {
        setIsSaving(false);
      }
    },
    [showSuccess, showError]
  );

  const update = useCallback(
    async (updatedApp: JobApplication) => {
      setIsSaving(true);
      try {
        const savedApp = await apiService.updateApplication(updatedApp.id, updatedApp);
        setApplications((prev) =>
          prev.map((app) => (app.id === savedApp.id ? savedApp : app))
        );
        showSuccess("Application Updated", `Updated ${updatedApp.role} at ${updatedApp.company}`);
      } catch (err) {
        console.error("Failed to update backend", err);
        showError("Update Failed", "Unable to update the application. Please try again.");
        throw err; // Re-throw so modal knows save failed
      } finally {
        setIsSaving(false);
      }
    },
    [showSuccess, showError]
  );

  const save = useCallback(
    async (job: JobApplication | JobApplicationCreateInput) => {
      if ("id" in job && job.id) {
        await update(job as JobApplication);
      } else {
        await add(job as JobApplicationCreateInput);
      }
    },
    [add, update]
  );

  const remove = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      try {
        await apiService.deleteApplication(id);
        setApplications((prev) => prev.filter((app) => app.id !== id));
        showSuccess("Application Deleted", "The application has been removed.");
      } catch (err) {
        console.error("Failed to delete from backend", err);
        showError("Delete Failed", "Unable to delete the application. Please try again.");
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [showSuccess, showError]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        const result = await apiService.bulkDeleteApplications(ids);
        setApplications((prev) => prev.filter((app) => !ids.includes(app.id)));
        showSuccess(
          "Applications Deleted",
          `Deleted ${result.deleted} application${result.deleted !== 1 ? "s" : ""}.`
        );
      } catch (err) {
        console.error("Failed to bulk delete", err);
        showError("Delete Failed", "Unable to delete the selected applications. Please try again.");
      }
    },
    [showSuccess, showError]
  );

  const bulkStatusUpdate = useCallback(
    async (ids: string[], status: ApplicationStatus) => {
      try {
        const result = await apiService.bulkUpdateStatus(ids, status);
        setApplications((prev) =>
          prev.map((app) => (ids.includes(app.id) ? { ...app, status } : app))
        );
        showSuccess(
          "Status Updated",
          `Updated ${result.updated} application${result.updated !== 1 ? "s" : ""} to ${status}.`
        );
      } catch (err) {
        console.error("Failed to bulk update status", err);
        showError("Update Failed", "Unable to update the selected applications. Please try again.");
      }
    },
    [showSuccess, showError]
  );

  const bulkImport = useCallback(
    async (incoming: Partial<JobApplication>[]) => {
      const result = await apiService.bulkImportApplications(incoming);
      setApplications((prev) => [...result.applications, ...prev]);
      showSuccess(
        "Import Complete",
        `Successfully imported ${result.imported} application${result.imported !== 1 ? "s" : ""}.`
      );
      return result;
    },
    [showSuccess]
  );

  return {
    applications,
    isSaving,
    deletingIds,
    load,
    clear,
    add,
    update,
    save,
    remove,
    bulkDelete,
    bulkStatusUpdate,
    bulkImport,
  };
}
