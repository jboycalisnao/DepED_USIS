import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import { MerchOverviewPage } from './features/merch/pages/MerchOverviewPage';
import { MerchProductPage } from './features/merch/pages/MerchProductPage';

function MerchShell() {
  return (
    <div className="merch-app">
      <UsisPortalGate moduleKey="merch" />
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader searchId="merch-search" searchLabel="Search school merchandise hub" />
        </div>
      </header>

      <main className="page-frame merch-main">
        <div className="content-width">
          <section className="merch-shell">
            <Routes>
              <Route path="/" element={<MerchOverviewPage />} />
              <Route path="/product/:slug" element={<MerchProductPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MerchShell />
    </BrowserRouter>
  );
}
