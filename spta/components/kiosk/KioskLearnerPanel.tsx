import React from 'react';
import { KioskState } from '../../lib/kiosk';
import { buildStatItems } from './kioskDisplayConfig';
import { KioskStatCard } from './KioskStatCard';

interface KioskLearnerPanelProps {
  state: KioskState;
}

export const KioskLearnerPanel: React.FC<KioskLearnerPanelProps> = ({ state }) => {
  const statItems = buildStatItems(state);
  const [balanceCard, assessmentCard, paidCard, tenderedCard] = statItems;

  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] gap-3 overflow-hidden">
      <section className="flex flex-none items-center justify-between gap-4 rounded-xl border border-[var(--deped-line)] bg-[var(--deped-white)] px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--deped-muted)]">Learner in service</p>
          <h2 className="mt-2 line-clamp-2 text-[28px] font-bold leading-tight text-[var(--deped-ink)]">{state.learnerName}</h2>
          <p className="mt-1 text-[18px] font-semibold text-[var(--deped-muted)]">{state.gradeSection}</p>
        </div>
        <div className="flex-none rounded-md border border-[var(--deped-line)] bg-[var(--deped-canvas)] px-4 py-3 text-right shadow-sm">
          <p className="text-[13px] font-semibold text-[var(--deped-muted)]">Updated</p>
          <p className="mt-1 text-[20px] font-bold text-[var(--deped-ink)]">{new Date(state.updatedAt).toLocaleTimeString()}</p>
        </div>
      </section>

      <section className="grid min-h-0 grid-cols-[1.06fr_0.94fr] gap-3">
        <KioskStatCard item={balanceCard} index={0} className="min-h-0" />

        <div className="grid min-h-0 grid-rows-[1.12fr_0.88fr] gap-4">
          <KioskStatCard item={assessmentCard} index={1} className="min-h-0" />
          <div className="grid min-h-0 grid-cols-2 gap-4">
            <KioskStatCard item={paidCard} index={2} className="min-h-0" />
            <KioskStatCard item={tenderedCard} index={3} className="min-h-0" />
          </div>
        </div>
      </section>
    </div>
  );
};
