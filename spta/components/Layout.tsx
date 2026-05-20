import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemConfig, User } from '../types';
import { UsisUnifiedHeader } from '../../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../../common/footer/UsisGlobalFooter';
import { UsisSideNav, type UsisSideNavItem } from '../../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../../common/components/UsisBreadcrumbBar';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onLogout: () => void;
  config: SystemConfig;
}

export const Layout: React.FC<LayoutProps> = ({
  children, currentUser, onLogout, config
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });

  const openKioskWindow = async () => {
    const kioskUrl = `${window.location.origin}/kiosk`;
    const defaultFeatures = `popup=yes,width=${window.screen.availWidth},height=${window.screen.availHeight},left=0,top=0`;

    const openWithFeatures = (features: string) => {
      const kioskWindow = window.open(kioskUrl, 'pta-kiosk-window', features);
      if (!kioskWindow) {
        setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to open the kiosk window.', tone: 'warning' });
      }
    };

    try {
      const windowWithScreenApi = window as Window & {
        getScreenDetails?: () => Promise<{
          currentScreen?: { left: number; top: number };
          screens: Array<{ left: number; top: number; width: number; height: number }>;
        }>;
      };

      if (!windowWithScreenApi.getScreenDetails) {
        openWithFeatures(defaultFeatures);
        return;
      }

      const details = await windowWithScreenApi.getScreenDetails();
      const currentScreen = details.currentScreen;
      const targetScreen = details.screens.find(screen =>
        !currentScreen || screen.left !== currentScreen.left || screen.top !== currentScreen.top
      ) || details.screens[0];

      if (!targetScreen) {
        openWithFeatures(defaultFeatures);
        return;
      }

      openWithFeatures(
        `popup=yes,left=${targetScreen.left},top=${targetScreen.top},width=${targetScreen.width},height=${targetScreen.height}`
      );
    } catch (error) {
      console.error('Unable to query screen details for kiosk window.', error);
      openWithFeatures(defaultFeatures);
    }
  };

  const menuItems: UsisSideNavItem[] = [
    { label: 'Counter Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Collection Window', path: '/admin/finance/collection', icon: 'point_of_sale' },
    { label: 'Cash Receipt Register', path: '/admin/finance/history', icon: 'receipt_long' },
    { label: 'Quarter Ledger', path: '/admin/finance/quarterly', icon: 'calendar_month' },
    { label: 'Assessment Setup', path: '/admin/finance/fees', icon: 'tune' },
    { label: 'Disbursement Desk', path: '/admin/disbursements', icon: 'receipt_long' },
    { label: 'Learner Registry', path: '/admin/learners', icon: 'badge' },
    { label: 'System Controls', path: '/admin/settings', icon: 'settings' },
  ];

  const currentSectionLabel =
    menuItems.find((item) => (item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)))
      ?.label || 'Dashboard';

  const profileDisplayName = (() => {
    const source = String(currentUser?.fullName || '').trim();
    if (!source) return null;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return source;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  })();

  const profileSubtitle = 'SPTA Module Access';

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader />
        </div>
      </header>
      <main className="page-frame spta-admin-frame flex-1">
        <div className="content-width spta-admin-shell px-0 py-0">
          <UsisBreadcrumbBar
            rootLabel="SPTA Admin"
            currentLabel={currentSectionLabel}
            profileName={profileDisplayName}
            profileRole={currentUser?.role || 'School Coordinator'}
            profileSubtitle={profileSubtitle}
            onLogout={onLogout}
            leftActions={(
              <button
                type="button"
                className="usis-side-nav__mobile-toggle usis-side-nav__mobile-toggle--inline"
                aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen((value) => !value)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  menu
                </span>
              </button>
            )}
          />

          <div className="flex gap-0">
            <div className="w-[280px] shrink-0 max-[920px]:w-0 max-[920px]:shrink">
              <UsisSideNav
                items={menuItems}
                onLogout={onLogout}
                activePath={location.pathname}
                onItemSelect={(path) => navigate(path)}
                ariaLabel="SPTA admin sections"
                isMobileOpen={isMobileNavOpen}
                onMobileOpenChange={setIsMobileNavOpen}
                hideInternalMobileToggle
              />
            </div>

            <section className="flex flex-1 flex-col border border-slate-300 bg-white">
              <header className="border-b border-slate-200 bg-slate-50 shadow-sm">
                <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                  </div>
                  <div className="hidden items-center gap-3 md:flex">
                    <div className="rounded-md border border-slate-300 bg-white px-4 py-2 text-right">
                      <p className="text-[13px] font-semibold text-slate-500">Today</p>
                      <p className="text-sm font-semibold text-slate-800">{new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={openKioskWindow} className="primary-button flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Open Kiosk
                    </button>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-4 md:p-8">
                <div className="w-full max-w-none pb-0">
                  {children}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <UsisGlobalFooter />
      <UsisAlertModal
        open={notice.open}
        title={notice.title}
        message={notice.message}
        tone={notice.tone}
        onClose={() => setNotice(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};
