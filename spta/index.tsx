
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Polyfill for CDN libraries (like Recharts or some builds of React Router) 
// that might expect React to be available globally
if (typeof window !== 'undefined') {
    (window as any).React = React;
    (window as any).ReactDOM = ReactDOM;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
