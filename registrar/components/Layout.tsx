
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { activeSchoolYear, setSchoolYear, schoolYears, connectionError, refreshData, logout } = useStore();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Learners', path: '/learners', icon: 'groups' },
    { label: 'Enrollment', path: '/enroll', icon: 'app_registration' },
    { label: 'Section/s', path: '/sections', icon: 'meeting_room' },
    { label: 'Bulk Import', path: '/import', icon: 'upload_file' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  const depEdLogo = "https://ik.imagekit.io/astrasolutions/Leon%20NHS/leon%20nhs%20marks%20-%20upscaled/Leon%20NHS%20-%20Seal(Blue).png?updatedAt=1769134600365";
  const schoolSeal = "https://ik.imagekit.io/astrasolutions/Leon%20NHS/leon%20nhs%20marks%20-%20upscaled/Leon%20NHS%20-%20Seal(Blue).png?updatedAt=1769134600365";

  return (
    <div className="flex h-screen overflow-hidden font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-20'
        } transition-all duration-500 ease-in-out bg-white border-r border-surfaceVariant flex flex-col shadow-m3-2 z-20`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md border border-surfaceVariant p-1">
            <img src={schoolSeal} alt="Leon NHS Seal" className="w-full h-full object-contain" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[9px] font-black text-outline uppercase tracking-widest leading-none mb-1">Republic of the Philippines</span>
              <span className="font-black text-primary leading-tight truncate">Leon National High School</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black">Registrar's Office</span>
            </div>
          )}
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg translate-x-1' 
                    : 'text-onSurface hover:bg-surface active:scale-95'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
                {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-surfaceVariant space-y-4">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all mb-2">
              <img src={depEdLogo} alt="DepEd Logo" className="h-10 w-auto" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-outline">Affiliated with</span>
                <span className="text-[10px] font-bold text-primary">Department of Education</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={logout}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 text-accent hover:bg-accent/5 active:scale-95`}
            >
              <span className="material-symbols-outlined">logout</span>
              {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
            </button>

            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center w-full p-3 rounded-2xl hover:bg-surface transition-all text-outline hover:text-primary"
            >
              <span className="material-symbols-outlined">
                {isSidebarOpen ? 'first_page' : 'last_page'}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-surface relative">
        <header className="sticky top-0 z-10 bg-surface/70 backdrop-blur-xl px-8 py-4 flex items-center justify-between border-b border-surfaceVariant/50">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-primary flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary/40 text-lg">
                  {menuItems.find(i => i.path === location.pathname)?.icon || 'home'}
                </span>
              </div>
              {menuItems.find(i => i.path === location.pathname)?.label || 'Leon NHS Registrar'}
            </h2>
            
            <div 
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-surfaceVariant"
            >
              <div className={`w-2 h-2 rounded-full ${connectionError ? 'bg-accent animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-[8px] font-black uppercase text-outline tracking-tighter">
                {connectionError ? 'Local Mode' : 'Online'}
              </span>
            </div>

            {activeSchoolYear.isLocked && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 animate-in slide-in-from-left-2 duration-300">
                <span className="material-symbols-outlined text-[14px] text-amber-600 font-bold">lock</span>
                <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Read-Only Archive</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white pl-5 pr-2 py-1.5 rounded-full shadow-m3-1 border border-surfaceVariant group transition-all hover:border-primary/50">
              <span className="text-xs font-bold text-outline group-hover:text-primary transition-colors uppercase">Year</span>
              <select 
                value={activeSchoolYear.id}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="bg-transparent text-sm font-black text-primary focus:outline-none border-none py-1 cursor-pointer pr-6"
              >
                {schoolYears.map(sy => (
                  <option key={sy.id} value={sy.id}>{sy.label} {sy.isLocked ? '(Locked)' : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="h-8 w-[1px] bg-surfaceVariant mx-1"></div>

            <button className="w-10 h-10 rounded-full bg-white border border-surfaceVariant flex items-center justify-center hover:bg-surface transition-all group relative">
              <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">notifications</span>
              <span className="absolute top-1 right-1 w-3 h-3 bg-accent rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 bg-white p-1 rounded-full border border-surfaceVariant pl-3 pr-1 shadow-m3-1 hover:shadow-m3-2 transition-all cursor-pointer">
              <span className="text-xs font-black text-primary hidden md:inline uppercase tracking-tight">Admin Portal</span>
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm p-1 overflow-hidden">
                <img src={schoolSeal} alt="User" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
