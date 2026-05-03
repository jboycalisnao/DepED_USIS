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
import { Candidate } from '../types';
import { POSITIONS, DEPED_COLORS, LEON_NHS_LOGO_URL, CURRENT_SY_LABEL } from '../constants';

interface ResultsProps {
  candidates: Candidate[];
  turnoutByPosition?: Record<string, number>;
}

const Results: React.FC<ResultsProps> = ({ candidates, turnoutByPosition = {} }) => {
  return (
    <section className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-10">
      <div className="mb-6 rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <img src={LEON_NHS_LOGO_URL} className="h-[50px] w-auto" alt="Leon NHS Seal" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Election Results
              </p>
              <h2 className="mt-0 text-[24px] font-black uppercase text-[#034F8B]">
                Official Election Tally
              </h2>
              <p className="mt-2 text-[16px] leading-[1.5] text-slate-600">
                Leon National High School • SY {CURRENT_SY_LABEL}
              </p>
            </div>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Final recording
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {POSITIONS.map((pos) => {
          const positionCandidates = candidates.filter((candidate) => candidate.position === pos);
          const uniqueVotersCount = turnoutByPosition[pos] || 0;

          if (positionCandidates.length === 0) return null;

          return (
            <article
              key={pos}
              className="rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm"
            >
              <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
                <h3 className="text-[24px] font-black uppercase text-[#034F8B]">{pos}</h3>
                <span className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold text-slate-600">
                  {uniqueVotersCount} voters
                </span>
              </div>

              <div className="h-72">
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
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                        padding: '12px',
                      }}
                      cursor={{ fill: '#f8fafc' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 700 }}
                    />
                    <Bar barSize={45} dataKey="votes" radius={[8, 8, 0, 0]}>
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
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default Results;
