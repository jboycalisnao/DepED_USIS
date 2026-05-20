import React from 'react';
import { KioskBreakdownPanel } from './kiosk/KioskBreakdownPanel';
import { KioskIdleState } from './kiosk/KioskIdleState';
import { KioskLearnerPanel } from './kiosk/KioskLearnerPanel';
import { useKioskDisplay } from './kiosk/useKioskDisplay';

export const KioskDisplay: React.FC = () => {
  const { state, fullscreenError, handleFullscreen } = useKioskDisplay();

  return (
    <div className="h-screen overflow-hidden bg-[var(--deped-canvas)] text-[var(--deped-ink)]">
      <div className="flex h-full w-full flex-col overflow-hidden px-4 py-3">
        <div className="mb-2 flex flex-none justify-end">
          <button
            onClick={handleFullscreen}
            className="m3-btn-primary rounded-md px-4 py-2 text-xs"
          >
            Enter Fullscreen
          </button>
        </div>

        {fullscreenError && (
          <div className="mb-4 flex-none rounded-md border border-[var(--deped-line)] bg-[var(--deped-white)] px-4 py-3 text-sm font-medium text-[var(--deped-red)]">
            {fullscreenError}
          </div>
        )}

        {state.status === 'idle' ? (
          <KioskIdleState />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3 overflow-hidden">
            <KioskLearnerPanel state={state} />
            <KioskBreakdownPanel fees={state.fees} />
          </div>
        )}
      </div>
    </div>
  );
};
