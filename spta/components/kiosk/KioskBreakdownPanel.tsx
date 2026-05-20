import React from 'react';
import { KioskState } from '../../lib/kiosk';
import { formatCurrency } from './kioskDisplayConfig';

interface KioskBreakdownPanelProps {
  fees: KioskState['fees'];
}

export const KioskBreakdownPanel: React.FC<KioskBreakdownPanelProps> = ({ fees }) => (
  <section className="min-h-0 overflow-hidden rounded-xl border border-[var(--deped-line)] bg-[var(--deped-white)] shadow-sm">
    <div className="border-b border-[var(--deped-line)] bg-[var(--deped-canvas)] px-4 py-3">
      <p className="text-[13px] font-semibold text-[var(--deped-muted)]">Fee Breakdown</p>
      <h3 className="mt-1 text-[20px] font-bold text-[var(--deped-ink)]">Live Coverage and Balance</h3>
    </div>

    <div className="h-[calc(100%-76px)] overflow-hidden">
      <table className="min-w-full">
        <thead className="text-left text-[12px] text-[var(--deped-ink)]">
          <tr>
            <th className="border-r border-[var(--deped-line)] bg-[var(--deped-white)] px-3 py-2 font-bold">Fee</th>
            <th className="border-r border-[var(--deped-line)] bg-[var(--deped-canvas)] px-3 py-2 text-right font-bold text-[var(--deped-blue)]">Covered</th>
            <th className="bg-[var(--deped-canvas)] px-3 py-2 text-right font-bold">Balance</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((fee, index) => (
            <tr
              key={fee.name}
              className={`border-t border-slate-200 ${
                fee.selected
                  ? 'bg-[var(--deped-canvas)]'
                  : index % 2 === 0
                    ? 'bg-[var(--deped-white)]'
                    : 'bg-[var(--deped-canvas)]'
              }`}
            >
              <td className="border-r border-[var(--deped-line)] px-3 py-2 align-top">
                <div className="truncate text-[13px] font-semibold leading-tight text-[var(--deped-ink)]" title={fee.name}>{fee.name}</div>
                {fee.waived && <div className="mt-0.5 text-[11px] font-semibold text-[var(--deped-red)]">Waived</div>}
              </td>
              <td className="border-r border-[var(--deped-line)] bg-[var(--deped-canvas)] px-3 py-2 text-right align-top text-[13px] font-bold text-[var(--deped-blue)]">
                {fee.waived ? 'Waived' : fee.allocated > 0 ? formatCurrency(fee.allocated) : '-'}
              </td>
              <td className={`bg-[var(--deped-canvas)] px-3 py-2 text-right align-top text-[13px] font-bold ${fee.balance > 0 ? 'text-[var(--deped-red)]' : 'text-[var(--deped-blue)]'}`}>
                {formatCurrency(fee.balance)}
              </td>
            </tr>
          ))}
          {fees.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-10 text-center text-base font-medium text-slate-500">No fee data available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);
