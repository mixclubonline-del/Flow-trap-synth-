
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  setCurrentView: (view: AppView) => void;
  activeView: AppView;
  openSections: { [key: string]: boolean };
  toggleSection: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, setCurrentView, activeView, openSections, toggleSection }) => {
  const mainNavigation = [
    { name: 'Sound Banks', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
    ), view: 'soundBanks' },
    { name: 'Synth Editor', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
    ), view: 'synthEditor' },
    { name: 'Sequencer', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
    ), view: 'sequencer' },
    { name: 'Sampler', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
    ), view: 'sampler' },
  ];

  const aiTools = [
     { name: 'AI Assistant', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
    ), view: 'aiChat' },
    { name: 'Voice Input', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
    ), view: 'voiceInput' },
    { name: 'Content Analyzer', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
    ), view: 'contentAnalyzer' },
  ];

  const NavItem: React.FC<{ item: any; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => (
    <li className="mb-2">
      <button
        onClick={onClick}
        className={`flex items-center w-full text-left space-x-3 p-3 rounded-2xl transition-all duration-300 border
          ${active 
            ? 'bg-white/10 border-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md' 
            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
      >
        <span className={active ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : ''}>{item.icon}</span>
        <span className="flex-1 text-sm font-medium tracking-wide">{item.name}</span>
      </button>
    </li>
  );

  const Section: React.FC<{ title: string; sectionKey: string; children: React.ReactNode }> = ({ title, sectionKey, children }) => {
    const isExpanded = openSections[sectionKey];
    return (
      <div className="mb-6">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 hover:text-slate-300 transition-colors px-2"
        >
          <span>{title}</span>
        </button>
        {isExpanded && <ul>{children}</ul>}
      </div>
    );
  };

  return (
    <aside className={`fixed md:relative h-full w-64 p-4 transition-transform duration-500 ease-out z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="glass-panel h-full flex flex-col p-4 rounded-[32px]">
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          <Section title="Studio" sectionKey="navigation">
            {mainNavigation.map((item) => (
              <NavItem key={item.name} item={item} active={activeView === item.view} onClick={() => setCurrentView(item.view as AppView)} />
            ))}
          </Section>
          
          <Section title="Intelligence" sectionKey="aiTools">
            {aiTools.map((item) => (
              <NavItem key={item.name} item={item} active={activeView === item.view} onClick={() => setCurrentView(item.view as AppView)} />
            ))}
          </Section>
        </div>
        <div className="text-[10px] text-center text-slate-600 tracking-widest uppercase py-2 opacity-50">
            v20.30
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;