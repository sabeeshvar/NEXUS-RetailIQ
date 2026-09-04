import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Boxes,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, getFriendlyErrorMessage, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to target or root
  React.useEffect(() => {
    if (currentUser) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('[Login Error]:', err);
      const msg = err.code ? getFriendlyErrorMessage(err.code) : err.message || 'Failed to sign in.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('manager@nexusretailiq.com');
    setPassword('RetailIQ@2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0c101a] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 antialiased font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md neu-card-lg p-8 sm:p-10 relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-[6px_6px_14px_#060910,-6px_-6px_14px_#18243a] mb-2">
            <Boxes className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-extrabold text-2xl tracking-tight text-white">NEXUS</span>
            <span className="font-bold text-2xl tracking-tight text-brand-400">RetailIQ</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight pt-1">Welcome back</h1>
          <p className="text-xs text-slate-400">
            Sign in to your retail intelligence dashboard.
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-3.5 neu-card-critical rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@store.com"
                className="w-full neu-sunken rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full neu-sunken rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="neu-btn-brand w-full py-3 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing in to NEXUS...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Helper for Hackathon / Evaluators */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleFillDemo}
            className="neu-btn w-full py-2 px-3 rounded-xl text-xs text-brand-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Fill Demo Manager Credentials</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="pt-2 text-center border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 ml-1">
              Create account
            </Link>
          </p>
        </div>

        {/* Security / Grounding Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected by Firebase Authentication & Firestore</span>
        </div>
      </div>
    </div>
  );
};
