import { useEffect, useState } from 'react';
import { createIdleKioskState, KioskState, readKioskState, subscribeToKioskState } from '../../lib/kiosk';

export const useKioskDisplay = () => {
  const [state, setState] = useState<KioskState>(() => readKioskState() || createIdleKioskState());
  const [fullscreenError, setFullscreenError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => subscribeToKioskState(setState), []);

  const handleFullscreen = async () => {
    setFullscreenError('');
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error(error);
      setFullscreenError('Fullscreen must be allowed from this window.');
    }
  };

  return {
    state,
    fullscreenError,
    handleFullscreen
  };
};
