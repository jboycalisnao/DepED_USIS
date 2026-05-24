import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { applyDocumentBranding } from '../common/config/usisBranding';
import { UsisAppLoaderGate } from '../common/components/UsisAppLoaderGate';

applyDocumentBranding({ moduleTitle: 'Integrated Admin' });

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <UsisAppLoaderGate label="Loading Integrated Admin subsystem">
      <App />
    </UsisAppLoaderGate>
  </React.StrictMode>,
);
