import React from 'react';

export const KioskIdleState: React.FC = () => (
  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[36px] border border-slate-200 bg-slate-50 px-10 py-12 shadow-sm">
    <div className="w-full max-w-4xl text-center">
      <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <span className="material-symbols-outlined text-[60px]">point_of_sale</span>
      </div>
      <p className="mt-8 text-lg font-bold uppercase tracking-[0.28em] text-sky-700">Leon NHS - SPTA</p>
      <h2 className="mt-4 font-display text-6xl font-bold text-slate-900">Ready for next payer</h2>
      <p className="mt-4 text-2xl text-slate-600">Select a learner from the collection window to show updated balances and payment details here.</p>
    </div>
  </div>
);
