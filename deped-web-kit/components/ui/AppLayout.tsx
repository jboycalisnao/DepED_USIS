import { Outlet } from 'react-router-dom';
import { PageFrame } from './PageFrame';
import { BrandHeader } from '@/features/brand/components/BrandHeader';
import { Breadcrumbs } from './Breadcrumbs';
import { FaviconSync } from './FaviconSync';
import { KitNav } from '@/features/navigation/components/KitNav';
import { SiteFooter } from './SiteFooter';
import depedLogo from '../../../common/assets/Department_of_Education_(DepEd).svg.png';

export function AppLayout() {
  return (
    <>
      <FaviconSync href={depedLogo} />
      <div className="site-chrome w-full bg-white shadow-[0_2px_0_rgba(18,35,61,0.04)]">
        <div className="content-width">
          <BrandHeader />
          <KitNav />
        </div>
      </div>
      <PageFrame>
        <Breadcrumbs />
        <Outlet />
      </PageFrame>
      <SiteFooter />
    </>
  );
}
