
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { RegistrarHeader } from './shell/RegistrarHeader';
import { RegistrarFooter } from './shell/RegistrarFooter';
import { RegistrarSideNav } from './layout/RegistrarSideNav';
import { registrarNavItems } from './layout/nav/registrarNavItems';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, registrarAccess } = useStore();
  const location = useLocation();
  const isPathActive = (itemPath: string) =>
    itemPath === '/' ? location.pathname === '/' : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);

  const currentSection =
    registrarNavItems.find((item) => isPathActive(item.path)) ||
    registrarNavItems[0];

  return (
    <div className="registrar-shell">
      <RegistrarHeader
        actions={
          <>
            {registrarAccess?.coordinatorName && (
              <div className="registrar-user" title={registrarAccess.coordinatorRole || 'Signed-in user'}>
                <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
                <div>
                  <span>Signed in</span>
                  <strong>{registrarAccess.coordinatorName}</strong>
                </div>
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
        </div>
      </main>

      <RegistrarFooter />
    </div>
  );
};

export default Layout;
