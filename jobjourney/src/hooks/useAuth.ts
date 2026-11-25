import { useCallback, useEffect, useRef, useState } from "react";

import { AuthUser } from "../types";
import { apiService } from "../services/apiService";
import { useToast } from "../contexts/ToastContext";
import { API_BASE_URL } from "../config";
import { disablePush } from "../services/webPush";

interface UseAuthOptions {
  /** Runs once the user is authenticated, to fetch their data. Must not reject. */
  onAuthenticated: () => Promise<void>;
}

/** Owns the session: restore on mount, OAuth callback, invite tokens, login/logout. */
export function useAuth({ onAuthenticated }: UseAuthOptions) {
  const { showSuccess, showError } = useToast();

  // Capture once, before any child effects run. Only this hook consumes auth
  // URL parameters; password-reset links are identified by their route.
  const [redirect] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const isReset = window.location.pathname === "/reset-password";
    return {
      oauthToken: isReset ? null : params.get("token"),
      oauthTenantId: isReset ? null : params.get("tenantId"),
      oauthError: params.get("error"),
      inviteToken: params.get("invite"),
      resetToken: isReset ? params.get("token") : null,
    };
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState(redirect.inviteToken);
  const active = useRef(true);

  // Held in a ref so the mount-only session restore always calls the current
  // closure rather than the one captured on first render.
  const onAuthenticatedRef = useRef(onAuthenticated);
  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
  }, [onAuthenticated]);

  const acceptInviteToken = useCallback(
    async (token: string, isCurrent = () => active.current) => {
      try {
        const { tenantId } = await apiService.acceptInvite(token);
        if (!isCurrent()) return;
        localStorage.setItem("tenant_id", tenantId);
        showSuccess("Invite accepted", "You've joined the workspace.");
      } catch (err) {
        if (!isCurrent()) return;
        console.error("Failed to accept invite:", err);
        showError(
          "Invite error",
          err instanceof Error ? err.message : "Unable to accept invite."
        );
      } finally {
        if (isCurrent()) setPendingInviteToken(null);
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
      if (!active.current) return;
      try {
        await onAuthenticatedRef.current();
      } finally {
        setIsLoading(false);
      }
    },
    [pendingInviteToken, acceptInviteToken]
  );

  const logout = useCallback(async () => {
    await disablePush();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("tenant_id");
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    const controller = new AbortController();
    const restoreSession = async () => {
      const { oauthToken, oauthTenantId, oauthError, inviteToken: inviteParam, resetToken } = redirect;

      if (oauthToken || oauthError || inviteParam || resetToken) {
        const url = new URL(window.location.href);
        ["token", "tenantId", "error", "invite"].forEach(key => url.searchParams.delete(key));
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
      }

      if (resetToken) return;
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
          signal: controller.signal,
        });
        if (cancelled) return;

        if (!res.ok) {
          // token invalid/expired
          localStorage.removeItem("auth_token");
          localStorage.removeItem("tenant_id");
          setUser(null);
          return;
        }

        const data = await res.json();
        if (cancelled) return;
        setUser({ ...(data.user as AuthUser), role: data.role ?? null });

        if (data.tenantId) {
          localStorage.setItem("tenant_id", data.tenantId);
        }

        // If an invite token was in the URL, accept it now that we know the
        // user is authed.
        if (inviteParam) {
          await acceptInviteToken(inviteParam, () => !cancelled);
        }

        if (cancelled) return;
        await onAuthenticatedRef.current();
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to restore session:", err);
        showError("Session Error", "Unable to restore your session. Please log in again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      active.current = false;
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isLoading, pendingInviteToken, resetToken: redirect.resetToken, login, logout, updateUser };
}
