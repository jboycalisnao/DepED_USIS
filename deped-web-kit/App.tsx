import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/ui/AppLayout';
import { FoundationsPage } from './features/brand/pages/FoundationsPage';
import { InterfacePatternsPage } from './features/brand/pages/InterfacePatternsPage';
import { OverviewPage } from './features/brand/pages/OverviewPage';
import { FormCatalogPage } from './features/forms/pages/FormCatalogPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/foundations" element={<FoundationsPage />} />
          <Route path="/forms" element={<FormCatalogPage />} />
          <Route path="/patterns" element={<InterfacePatternsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
