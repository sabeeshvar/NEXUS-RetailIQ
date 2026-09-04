import React from 'react';
import { WhyExplanation } from '../../types';
import { X, HelpCircle, CheckCircle2, AlertTriangle, Calculator, Database, ShieldAlert } from 'lucide-react';

interface WhyModalProps {
  explanation: WhyExplanation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({ explanation, isOpen, onClose }) => {
  if (!isOpen || !explanation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 border border-brand-500/30 rounded-xl text-brand-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">Mathematical Explainability</span>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 rounded-full border border-slate-700">Zero Hallucination</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">{explanation.title}</h2>
              {explanation.productName && (
                <p className="text-xs text-slate-400">
                  Target: <span className="text-slate-200 font-medium">{explanation.productName}</span> • Store: <span className="text-slate-200 font-medium">{explanation.storeName || 'All Stores'}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm">
          {/* 1. Underlying Source Data */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              <Database className="w-3.5 h-3.5 text-brand-400" />
              1. Ground Truth Ledger Data
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {explanation.dataUsed.map((item, idx) => (
                <div key={idx} className="p-3 bg-surface-950 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-base font-bold text-white font-mono">{item.value}</span>
                    <span className="text-[10px] text-slate-500">{item.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Deterministic Calculation Steps */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              2. Deterministic Formula & Steps
            </div>
            <div className="space-y-2 bg-surface-950/80 p-4 border border-slate-800 rounded-xl">
              {explanation.calculationSteps.map((step, idx) => (
                <div key={idx} className="pb-3 last:pb-0 border-b last:border-0 border-slate-800/80">
                  <div className="font-semibold text-xs text-slate-300">{step.step}</div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">{step.formula}</span>
                    <span className="text-brand-300 font-bold bg-brand-950/50 px-2.5 py-1 rounded border border-brand-800/40">
                      = {step.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Decision Boundary & Threshold */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Decision Threshold</span>
              <p className="text-xs text-amber-200/90 mt-0.5">{explanation.threshold}</p>
            </div>
          </div>

          {/* 4. Business Assumptions */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              3. Explicit System Assumptions
            </div>
            <ul className="space-y-1.5 pl-1">
              {explanation.assumptions.map((assump, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <span>{assump}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 5. Final Verdict & Action */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Deterministic Recommendation
            </div>
            <p className="text-sm font-semibold text-white">{explanation.recommendedAction}</p>
            <p className="text-xs text-slate-300 mt-1 font-sans">{explanation.finalVerdict}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
