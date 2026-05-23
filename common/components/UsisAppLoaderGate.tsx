import { useEffect, useState, type ReactNode } from 'react';
import '../css/fullscreen-loader.css';

type UsisAppLoaderGateProps = {
  children: ReactNode;
  label?: string;
  minimumMs?: number;
};

export function UsisAppLoaderGate({
  children,
  label = 'Loading subsystem',
  minimumMs = 900,
}: UsisAppLoaderGateProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), Math.max(0, minimumMs));
    return () => window.clearTimeout(timer);
  }, [minimumMs]);

  return (
    <>
      {children}
      <div className={`usis-loader-overlay ${isVisible ? 'is-visible' : 'is-hidden'}`} aria-hidden={!isVisible}>
        <div className="usis-loader-card" role="status" aria-live="polite" aria-label={label}>
          <div className="usis-loader-spinner" />
          <p className="usis-loader-label">{label}</p>
        </div>
      </div>
    </>
  );
}
