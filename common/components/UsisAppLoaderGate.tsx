import { useEffect, useState, type ReactNode } from 'react';
import UsisPageLoader from './UsisPageLoader';
import '../css/page-loader.css';

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
      {isVisible ? <UsisPageLoader message={label} /> : null}
    </>
  );
}
