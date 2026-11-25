import { useCallback, useEffect, useRef, useState } from "react";

import { AuthUser } from "../types";
import { apiService } from "../services/apiService";
import { useToast } from "../contexts/ToastContext";
import { API_BASE_URL } from "../config";

interface UseAuthOptions {
  /** Runs once the user is authenticated, to fetch their data. Must not reject. */
  onAuthenticated: () => Promise<void>;
}

/** Owns the session: restore on mount, OAuth callback, invite tokens, login/logout. */
export function useAuth({ onAuthenticated }: UseAuthOptions) {
  const { showSuccess, showError } = useToast();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // Held in a ref so the mount-only session restore always calls the current
  // closure rather than the one captured on first render.
  const onAuthenticatedRef = useRef(onAuthenticated);
  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
  }, [onAuthenticated]);

  const acceptInviteToken = useCallback(
    async (token: string) => {
      try {
        const { tenantId } = await apiService.acceptInvite(token);
        localStorage.setItem("tenant_id", tenantId);
        showSuccess("Invite accepted", "You've joined the workspace.");
      } catch (err) {
        console.error("Failed to accept invite:", err);
        showError(
          "Invite error",
          err instanceof Error ? err.message : "Unable to accept invite."
        );
      } finally {
        setPendingInviteToken(null);
      }
    },
    [showSuccess, showError]
  );

  const login = useCallback(
    async (authenticatedUser: AuthUser) => {
      setUser(authenticatedUser);
      setIsLoading(true);
      // If the user came in via an invite link (and logged in rather than signing
      // up), consume it now so they join the inviting tenant before data loads.
      if (pendingInviteToken) {
        await acceptInviteToken(pendingInviteToken);
      }
      try {
        await onAuthenticatedRef.current();
      } finally {
        setIsLoading(false);
      }
    },
    [pendingInviteToken, acceptInviteToken]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("tenant_id");
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      // Check for OAuth callback parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const oauthToken = urlParams.get("token");
      const oauthTenantId = urlParams.get("tenantId");
      const oauthError = urlParams.get("error");
      const inviteParam = urlParams.get("invite");

      // Clear URL parameters
      if (oauthToken || oauthError || inviteParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Capture invite token for later acceptance (either after login, or
      // forwarded to signup).
      if (inviteParam) {
        setPendingInviteToken(inviteParam);
      }

      if (oauthError) {
        console.error("OAuth error:", oauthError);
        showError("Authentication Failed", oauthError);
        return;
      }

      if (oauthToken && oauthTenantId) {
        localStorage.setItem("auth_token", oauthToken);
        localStorage.setItem("tenant_id", oauthTenantId);
      }

      const token = localStorage.getItem("auth_token");
      if (!token) return;

      setIsLoading(true);

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // token invalid/expired
          localStorage.removeItem("auth_token");
          localStorage.removeItem("tenant_id");
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser({ ...(data.user as AuthUser), role: data.role ?? null });

        // Store tenantId from session restore
        if (data.tenantId) {
          localStorage.setItem("tenant_id", data.tenantId);
        }

        // If an invite token was in the URL, accept it now that we know the
        // user is authed.
        if (inviteParam) {
          await acceptInviteToken(inviteParam);
        }

        await onAuthenticatedRef.current();
      } catch (err) {
        console.error("Failed to restore session:", err);
        showError("Session Error", "Unable to restore your session. Please log in again.");
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isLoading, pendingInviteToken, login, logout, updateUser };
}
