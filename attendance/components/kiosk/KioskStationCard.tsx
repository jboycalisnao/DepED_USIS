import React from 'react';
import { ScanResult } from '../../types';
import { getScanToneClasses } from './kioskUtils';

interface KioskStationCardProps {
  index: number;
  result: ScanResult | null;
  unknown: string | null;
}

const KioskStationCard: React.FC<KioskStationCardProps> = ({ index, result, unknown }) => {
  const isEmpty = !result && !unknown;

  return (
    <section className="h-full min-w-0 overflow-hidden rounded-md border border-[#dfe4ee] bg-white shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
      <div className="border-b border-[#e8edf5] px-5 py-4">
        <div className="flex items-center justify-center gap-3">
          <span className="h-3 w-3 rounded-md bg-[#123f9c]" />
          <span className="text-[12px] font-black text-[#0f1f5e]">Station {index + 1}</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="grid min-h-[22rem] place-items-center px-6 py-10 text-center">
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="flex h-28 w-28 items-center justify-center rounded-md border border-[#dfe4ee] bg-[#f7f9fd]">
              <span className="material-symbols-outlined text-[3.8rem] leading-none text-[#123f9c]/35">
                contactless
              </span>
            </div>
            <h2 className="text-[clamp(1.05rem,2vw,1.55rem)] font-black text-[#8d95a8]">
              Ready for Scan
            </h2>
            <p className="mt-3 max-w-[20rem] text-[11px] font-medium text-[#8a93a5]">
              Place the learner card on the reader to begin.
            </p>
          </div>
        </div>
      ) : result ? (
        <div className="grid min-h-[22rem] place-items-center px-5 py-10 text-center">
          <div className="flex w-full max-w-[28rem] flex-col items-center gap-6">
            <div className={`inline-flex items-center gap-2 rounded-md border px-4 py-2.5 font-bold ${getScanToneClasses(result.isDuplicate, result.type)}`}>
              <span className="material-symbols-outlined text-[20px] leading-none">
                {result.isDuplicate ? 'history' : 'check_circle'}
              </span>
              <span className="text-[10px] leading-none">
                {result.isDuplicate ? 'Already Logged' : 'Verified'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-5">
              <h3 className="break-words text-[clamp(1.8rem,3.5vw,3.1rem)] font-black leading-[0.95] text-[#1a2433]">
                {result.learner.first_name} {result.learner.last_name}
              </h3>

              <div className="inline-flex min-h-[52px] flex-wrap items-center justify-center gap-2 rounded-md border border-[#dfe4ee] bg-[#f7f9fd] px-4 py-3">
                <span className="text-[10px] font-bold leading-none text-[#667085]">
                  {result.learner.grade_level}
                </span>
                <span className="h-1.5 w-1.5 rounded-md bg-[#c9d2e4]" />
                <span className="text-[10px] font-bold leading-none text-[#123f9c]">
                  {result.learner.section_name}
                </span>
                {result.isLate ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-md bg-[#c9d2e4]" />
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold leading-none text-amber-700">
                      Late
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid w-full max-w-[18rem] grid-cols-2 gap-3">
              <div className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md border border-[#e7ecf4] bg-[#fbfcfe] px-4 py-2 text-[#123f9c]">
                <span className="material-symbols-outlined text-[1.15rem] leading-none">schedule</span>
                <span className="text-[clamp(1rem,1.8vw,1.35rem)] font-black leading-none tabular-nums">
                  {result.time}
                </span>
              </div>

              <span className={`inline-flex min-h-[50px] items-center justify-center rounded-md border px-4 py-2 text-[10px] font-bold leading-none ${result.isDuplicate ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {result.isDuplicate ? 'Duplicate Entry' : 'Recorded'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[22rem] place-items-center px-6 py-10 text-center">
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-md border border-[#f1d0d4] bg-[#fff7f8]">
              <span className="material-symbols-outlined text-[3rem] leading-none text-[#c8152b]">
                warning
              </span>
            </div>
            <h3 className="text-[clamp(1.1rem,2.2vw,1.7rem)] font-black text-[#1a2433]">
              Access Restricted
            </h3>
            <p className="mt-3 max-w-[20rem] break-all text-[11px] font-bold text-[#667085] font-mono px-2">
              UID: {unknown}
            </p>
            <p className="mt-2 text-[11px] font-bold text-[#c8152b]">
              Unknown ID
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default KioskStationCard;
