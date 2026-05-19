import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { MerchOverviewPage } from './features/merch/pages/MerchOverviewPage';

function MerchShell() {
  return (
    <div className="merch-app">
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
