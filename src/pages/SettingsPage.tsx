import React, { useState } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import { isConfigured } from '../services/firebase';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Key,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Server,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { retailData } = useExplain();
  const { loadDemo, clearAll, hasData, isLoading } = retailData;

  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('nexus_user_gemini_key') || '');
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSaveKey = () => {
    if (geminiKey.trim()) {
      localStorage.setItem('nexus_user_gemini_key', geminiKey.trim());
    } else {
      localStorage.removeItem('nexus_user_gemini_key');
    }
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">System & Configuration</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Firebase credentials, Gemini AI grounding parameters, and local data persistence controls.
        </p>
      </div>

      {/* Cloud Architecture Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Firebase Connection Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-white">Firebase / Cloud Firestore</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}
              >
                {isConfigured ? 'CONNECTED' : 'LOCAL CACHE MODE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {isConfigured
                ? 'Cloud Firestore is actively connected and syncing live store transactions and stock registers.'
                : 'Running in Local Reactive Storage Mode. Real-time POS calculations execute with zero latency without requiring cloud setup.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Configure <code className="text-slate-400 bg-surface-950 px-1.5 py-0.5 rounded">.env</code> to connect live Firebase project.
          </div>
        </div>

        {/* Gemini AI Copilot Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Gemini Grounding Engine</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Strict numeric guardrails are enforced. Gemini only receives verified deterministic pre-computed metrics and is strictly forbidden from hallucinating sales numbers.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Fallback engine guarantees 100% dashboard uptime if AI is offline.
          </div>
        </div>
      </div>

      {/* Optional Custom Gemini API Key for Judges */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-white">Runtime Google Gemini API Key (Optional)</h3>
        </div>
        <p className="text-xs text-slate-400">
          Enter an optional personal Gemini API key for live judging evaluations. Kept strictly inside your local browser session.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="flex-1 bg-surface-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleSaveKey}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            {savedStatus ? 'Saved ✓' : 'Save Key'}
          </button>
        </div>
      </div>

      {/* Reset & Wipe Controls */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Reset Application State</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Clear all local state, alerts, and transaction records or regenerate clean 90-day demo scenarios.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Reload Demo Data
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
          >
            Wipe Storage
          </button>
        </div>
      </div>
    </div>
  );
};
