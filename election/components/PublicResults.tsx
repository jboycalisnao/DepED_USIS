import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Candidate, ElectionConfig } from '../types';
import { POSITIONS, DEPED_COLORS } from '../constants';
import {
  getPositionOutcomeLabel,
  getWinnerSlotsForPosition,
  isRegularGradeRepresentativePosition,
} from '../utils/electionRules';

interface PublicResultsProps {
  candidates: Candidate[];
  turnoutByPosition: Record<string, number>;
  config: ElectionConfig;
  schoolYearLabel: string;
}

const shellWidthClass = 'w-full px-[var(--page-inset)]';

const PublicResults: React.FC<PublicResultsProps> = ({
  candidates,
  turnoutByPosition,
  config,
  schoolYearLabel,
}) => {
  if (!config.publicResultsEnabled) {
    return (
      <section className={`${shellWidthClass} py-10`}>
        <div className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Public Results
            </p>
          </div>
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-red-50">
              <i className="fa-solid fa-lock text-[20px] text-[#E11C38]"></i>
            </div>
            <h2 className="mt-5 text-[24px] font-black uppercase text-slate-900">
              Tally Restricted
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-[1.5] text-slate-600">
              The official election results are currently hidden by the LG COMEA. Please
              wait for an official announcement.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${shellWidthClass} py-10`}>
      <div className="rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Public Results
        </p>
        <h1 className="mt-3 text-[24px] font-black uppercase text-[#034F8B]">
          Official Election Tally
        </h1>
        <p className="mt-2 text-[16px] leading-[1.5] text-slate-600">
          {config.schoolName || 'Leon National High School'} • SY {schoolYearLabel}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {POSITIONS.map((pos) => {
          const positionCandidates = candidates.filter((candidate) => candidate.position === pos);
          if (positionCandidates.length === 0) return null;

          const totalPositionVoters = turnoutByPosition[pos] || 0;
          const winnerSlots = getWinnerSlotsForPosition(pos);
          const isMultiSeatRep = isRegularGradeRepresentativePosition(pos);

          return (
            <article
              key={pos}
              className="rounded-[12px] border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-[24px] font-black uppercase text-[#034F8B]">{pos}</h2>
                  <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {getPositionOutcomeLabel(pos)}
                  </p>
                </div>
                <span className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold text-slate-600">
                  {totalPositionVoters} voters
                </span>
              </div>

              <div className="px-6 py-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={positionCandidates}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                      />
                      <YAxis
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                        }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar barSize={38} dataKey="votes" radius={[8, 8, 0, 0]}>
                        {positionCandidates.map((entry, index) => (
                          <Cell
                            key={`${entry.id}-${index}`}
                            fill={index % 2 === 0 ? DEPED_COLORS.blue : DEPED_COLORS.red}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 space-y-3">
                  {[...positionCandidates]
                    .sort((a, b) => b.votes - a.votes)
                    .map((candidate, index) => {
                      const percentage =
                        totalPositionVoters > 0 ? (candidate.votes / totalPositionVoters) * 100 : 0;
                      const isWinner = index < winnerSlots;
                      const hasVotes = candidate.votes > 0;

                      return (
                        <div
                          key={candidate.id}
                          className={`flex items-center justify-between rounded-[12px] border px-4 py-3 ${
                            isWinner && hasVotes
                              ? 'border-blue-100 bg-blue-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-[12px] text-[13px] font-black ${
                                isWinner && hasVotes
                                  ? index === 0
                                    ? 'bg-[#fcd116] text-[#034F8B]'
                                    : 'bg-slate-300 text-slate-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-[16px] font-bold text-slate-900">
                                {candidate.name}
                              </p>
                              <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[#E11C38]">
                                {candidate.party}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[16px] font-bold text-[#034F8B]">
                              {candidate.votes} marks
                            </p>
                            <p className="mt-1 text-[13px] text-slate-500">
                              {percentage.toFixed(1)}% of recorded turnout
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {isMultiSeatRep && (
                  <p className="mt-4 text-[13px] leading-[1.5] text-slate-500">
                    Regular grade representative positions recognize the top two vote totals.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PublicResults;
