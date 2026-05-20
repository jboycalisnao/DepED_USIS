import React from 'react';
import { SystemConfig } from '../../types';

interface LoadingScreenProps {
  config: SystemConfig;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ config }) => (
  <div className="fixed inset-0 bg-slate-100 z-[9999] flex flex-col items-center justify-center">
    {config.logoUrl ? (
      <img src={config.logoUrl} className="w-12 h-12 object-contain mb-4" />
    ) : (
      <span className="material-symbols-outlined text-4xl text-[var(--md-sys-color-primary)] mb-4">account_balance</span>
    )}
    <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">{config.schoolName || 'System Loading'}</h2>
    <p className="text-gray-500 text-sm">Loading system...</p>
  </div>
);
