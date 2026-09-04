import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Boxes,
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, getFriendlyErrorMessage } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resetPassword(email);
      setSuccessMessage('Password reset link sent! Check your inbox to set a new password.');
      setEmail('');
    } catch (err: any) {
      console.error('[Forgot Password Error]:', err);
      const msg = err.code ? getFriendlyErrorMessage(err.code) : err.message || 'Failed to send reset link.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c101a] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 antialiased font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
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
          <h1 className="text-xl font-bold text-white tracking-tight pt-1">Forgot your password?</h1>
          <p className="text-xs text-slate-400">
            Enter your email and we'll send a password recovery link.
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 neu-card-success rounded-xl text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 neu-card-critical rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Account email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@store.com"
                className="w-full neu-sunken rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="neu-btn-brand w-full py-3 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center border-t border-slate-800/80">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
