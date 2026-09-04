import React, { useState, useRef, useEffect } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import { CopilotService } from '../services/copilotService';
import { CopilotMessage } from '../types';
import {
  Sparkles,
  Send,
  HelpCircle,
  AlertCircle,
  Calculator,
  RefreshCw,
  Bot,
  User,
  ArrowRight,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "What needs attention today?",
  "What should I reorder today?",
  "Which products are not moving?",
  "Show me today's sales spikes.",
  "Compare all stores.",
  "How did Aavin Milk perform this month?",
  "What were sales during Diwali last year?", // Intentional insufficient data demonstration
];

export const CopilotPage: React.FC = () => {
  const { retailData, openWhy } = useExplain();
  const { selectedStoreId, stores } = retailData;

  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content: `### Welcome to RetailIQ Copilot\n\nI am your deterministic sales and inventory assistant. Every number I present is directly computed from your verified store transaction records and inventory ledgers.\n\nAsk me about stock-out horizons, replenishment purchase orders, slow-moving SKUs, or sales anomalies.`,
      intent: 'DASHBOARD_SUMMARY',
      confidence: 'HIGH',
      dataAvailable: true,
      assumptions: ['All metrics derived from the active 90-day POS ledger.'],
      recommendation: 'Click any suggested question below or enter your own query.',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuestion).trim();
    if (!q || isThinking) return;

    // Append user message
    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      content: q,
      confidence: 'HIGH',
      dataAvailable: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsThinking(true);

    try {
      // Simulate realistic short inference delay while deterministic engine computes
      await new Promise((res) => setTimeout(res, 600));

      const answer = await CopilotService.askCopilot(q, {
        storeId: selectedStoreId,
      });

      setMessages((prev) => [...prev, answer]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: 'An error occurred while evaluating this query. Please check your data connection.',
          intent: 'GENERAL_ANALYTICS',
          confidence: 'LIMITED',
          dataAvailable: false,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const currentStoreLabel = selectedStoreId !== 'all'
    ? stores.find((s) => s.id === selectedStoreId)?.name || 'Selected Store'
    : 'All Stores';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Neumorphic Copilot Header */}
      <div className="flex items-center justify-between p-4 neu-card rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 flex items-center justify-center text-white shadow-[4px_4px_10px_#060910,-4px_-4px_10px_#18243a]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white">RetailIQ Copilot</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 shadow-[inset_1px_1px_3px_#060910] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Strict Grounding Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Natural-language questions answered strictly using verified POS numbers and mathematical formulas.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs text-slate-500">Active Scope</span>
          <div className="text-xs font-bold text-slate-200 font-mono">{currentStoreLabel}</div>
        </div>
      </div>

      {/* Message History Feed in Sunken Well */}
      <div className="flex-1 overflow-y-auto space-y-4 p-5 rounded-2xl neu-sunken">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs shrink-0 font-bold ${
                  isUser
                    ? 'neu-sunken text-slate-200 border border-slate-700/50'
                    : 'bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-[3px_3px_7px_#060910,-3px_-3px_7px_#18243a]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Card */}
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'neu-btn-brand text-white rounded-tr-none'
                    : 'neu-card text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap prose prose-invert max-w-none text-xs sm:text-sm font-sans">
                  {msg.content}
                </div>

                {/* Verified Numbers Grid (Assistant Only) */}
                {!isUser && msg.numbers && msg.numbers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Calculator className="w-3 h-3 text-brand-400" />
                      Verified Ground Truth Metrics
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.numbers.map((num, idx) => (
                        <div key={idx} className="p-2.5 neu-sunken rounded-xl font-mono">
                          <div className="text-[11px] text-slate-400 font-sans">{num.label}</div>
                          <div className="text-xs font-bold text-white mt-0.5">{num.value}</div>
                          {num.context && (
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5">{num.context}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence & Assumptions */}
                {!isUser && msg.assumptions && msg.assumptions.length > 0 && (
                  <div className="mt-3 text-[11px] text-slate-400 neu-sunken p-2.5 rounded-xl">
                    <strong className="text-slate-300 font-semibold block mb-1">Assumptions Used:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {msg.assumptions.map((asmp, i) => (
                        <li key={i}>{asmp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confidence & "Why?" Button Bar */}
                {!isUser && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-[inset_1px_1px_3px_#060910] border ${
                          msg.confidence === 'HIGH'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : msg.confidence === 'INSUFFICIENT_DATA'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Confidence: {msg.confidence}
                      </span>
                      {msg.dataAvailable === false && (
                        <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> No guessing allowed
                        </span>
                      )}
                    </div>

                    {msg.explanation && (
                      <button
                        onClick={() => openWhy(msg.explanation!)}
                        className="neu-btn inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Why this calculation?</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex gap-3 items-center text-xs text-brand-400 p-3 neu-card rounded-2xl w-fit">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
            <span>Evaluating transaction ledgers & computing deterministic formulas...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Suggested Questions for Store Manager:
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="neu-btn text-xs px-3 py-1.5 rounded-xl text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5"
            >
              <span>{q}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 p-2 neu-card rounded-2xl">
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask about stock-outs, reorders, sales drops, or products..."
          className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuestion.trim() || isThinking}
          className="neu-btn-brand p-2.5 rounded-xl disabled:opacity-40 text-white cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
