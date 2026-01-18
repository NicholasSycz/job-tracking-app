import React, { useState } from "react";
import { Mail, Lock, Loader2, ArrowRight, User } from "lucide-react";
import { AuthUser } from "../types";

interface Props {
  onLogin: (user: AuthUser) => void;
}

type AuthMode = "login" | "signup";

const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const API_BASE_URL = "http://localhost:4000";

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login" ? { email, password } : { name, email, password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Authentication failed");
        return;
      }

      // Store token for future requests
      localStorage.setItem("auth_token", data.token);

      // data.user should match your AuthUser type
      onLogin(data.user as AuthUser);
    } catch (err) {
      console.error(err);
      setError("Network error. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Simulate Google OAuth Redirect/Callback flow
    setTimeout(() => {
      onLogin({
        id: "google-123",
        email: "alex.explorer@gmail.com",
        name: "Alex Explorer",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Alex`,
      });
      setIsGoogleLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl text-white font-black text-3xl mb-4 shadow-xl shadow-emerald-200 dark:shadow-none animate-in zoom-in duration-500">
            J
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
            JobJourney
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {mode === "login"
              ? "Your career milestone starts here."
              : "Start your professional voyage today."}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-colors">
          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all mb-6 group disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 size={20} className="animate-spin text-emerald-500" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>
              {mode === "login"
                ? "Continue with Google"
                : "Sign up with Google"}
            </span>
          </button>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
              {mode === "login" ? "or use email" : "or create account"}
            </span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>

          {error && (
            <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 px-3 py-2 rounded-xl">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {mode === "signup" && (
              <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    required={mode === "signup"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Explorer"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                Work Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 dark:shadow-none group mt-2"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {mode === "login"
                ? "New to the journey?"
                : "Already have an account?"}
            </p>
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline transition-colors"
            >
              {mode === "login" ? "Create an account" : "Sign In instead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
