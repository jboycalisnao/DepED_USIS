import { Outlet } from 'react-router-dom';
import { CoordinatorHeader } from '@/features/brand/components/CoordinatorHeader';
import { SiteFooter } from './SiteFooter';

export function AppLayout() {
  return (
    <>
      <div className="site-chrome">
        <div className="content-width">
          <CoordinatorHeader />
        </div>
      </div>
      <main className="page-frame coordinator-page-frame">
        <div className="content-width">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
