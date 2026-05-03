import { Outlet } from 'react-router-dom';
import { CoordinatorHeader } from '@/features/brand/components/CoordinatorHeader';
import { CoordinatorNav } from '@/features/navigation/components/CoordinatorNav';
import { SiteFooter } from './SiteFooter';

export function AppLayout() {
  return (
    <>
      <div className="site-chrome">
        <div className="content-width">
          <CoordinatorHeader />
          <CoordinatorNav />
        </div>
      </div>
      <main className="page-frame">
        <div className="content-width">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
