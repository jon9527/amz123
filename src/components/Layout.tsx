
import React from 'react';
import { AppView } from '../types';
import { NAVIGATION_ITEMS } from '../constants';

interface LayoutProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onViewChange, children }) => {
  return (
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#27272a] bg-[#09090b] flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 size-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <span className="material-symbols-outlined text-white">hub</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-white text-base font-black leading-tight tracking-tight">AmazonOps</h1>
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded font-mono font-bold leading-none">v1.0</span>
            </div>
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">指挥中心</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAVIGATION_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${currentView === item.view
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
                }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${currentView === item.view ? 'text-white' : 'text-zinc-500 group-hover:text-blue-400'
                }`}>
                {item.icon}
              </span>
              <span className="text-sm font-semibold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#27272a]">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="size-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
              <img src="https://picsum.photos/seed/amazonops/100/100" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <p className="text-white text-sm font-bold">张小明 (运营主管)</p>
              <p className="text-blue-500 text-[10px] font-mono uppercase tracking-tighter">Stable Release • 店铺 A</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <nav className="flex items-center text-sm text-zinc-500 font-mono">
              <span className="hover:text-white cursor-pointer">运营系统</span>
              <span className="mx-2 text-zinc-800">/</span>
              <span className="text-white font-medium">{NAVIGATION_ITEMS.find(n => n.view === currentView)?.label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">系统正常 v1.0</span>
            </div>

            <div className="h-6 w-px bg-[#27272a]"></div>

            <button className="text-zinc-500 hover:text-white transition-colors relative p-1">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1 right-1 size-1.5 bg-orange-500 rounded-full border border-[#09090b]"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
