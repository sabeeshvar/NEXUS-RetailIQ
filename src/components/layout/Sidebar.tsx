import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  TrendingUp,
  Package,
  Boxes,
  Store,
  Bell,
  Sparkles,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ alertCount }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/copilot', label: 'AI Copilot', icon: Bot, highlight: true },
    { to: '/sales', label: 'Sales Analytics', icon: TrendingUp },
    { to: '/inventory', label: 'Inventory Intelligence', icon: Boxes },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/stores', label: 'Stores', icon: Store },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { to: '/recommendations', label: 'Recommendations', icon: Sparkles },
    { to: '/import', label: 'Data Import', icon: FileSpreadsheet },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0c101a] border-r border-slate-900/80 flex flex-col shrink-0 min-h-screen shadow-[4px_0_20px_#060910]">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-900 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 flex items-center justify-center shadow-[4px_4px_10px_#060910,-4px_-4px_10px_#18243a]">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">NEXUS</span>
              <span className="font-bold text-base tracking-tight text-brand-400">RetailIQ</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Neumorphic Soft Copilot
            </div>
          </div>
        </NavLink>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Core Intelligence
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'neu-sunken text-white font-bold border-l-2 border-brand-500 shadow-[inset_3px_3px_7px_#05080e,inset_-3px_-3px_7px_#151f30]'
                    : item.highlight
                    ? 'text-brand-300 hover:text-brand-200 hover:shadow-[3px_3px_8px_#060910,-3px_-3px_8px_#162032] border border-brand-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:shadow-[3px_3px_8px_#060910,-3px_-3px_8px_#162032]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 shadow-[inset_1px_1px_3px_#060910] border border-rose-500/30">
                  {item.badge}
                </span>
              )}
              {item.highlight && !item.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 shadow-[inset_1px_1px_3px_#060910] uppercase">
                  AI
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Guardrail Badge */}
      <div className="p-4 m-3 rounded-2xl neu-sunken text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Strict AI Grounding</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Zero invented numbers. All answers backed by deterministic retail calculations.
        </p>
      </div>
    </aside>
  );
};
