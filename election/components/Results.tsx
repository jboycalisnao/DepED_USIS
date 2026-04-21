
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Candidate, Position } from '../types';
import { POSITIONS, DEPED_COLORS, LEON_NHS_LOGO_URL, CURRENT_SY_LABEL } from '../constants';

interface ResultsProps {
  candidates: Candidate[];
  turnoutByPosition?: Record<string, number>;
}

const Results: React.FC<ResultsProps> = ({ candidates, turnoutByPosition = {} }) => {
  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-6">
          <img src={LEON_NHS_LOGO_URL} className="h-24 w-auto" alt="Leon NHS Seal" />
          <div>
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">Official Election Tally</h2>
            <p className="text-[#034F8B] font-bold uppercase text-xs tracking-[0.2em] mt-2">Leon National High School • SY {CURRENT_SY_LABEL}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-[#E11C38] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center shadow-lg shadow-red-900/20">
            <i className="fa-solid fa-circle-dot mr-3 animate-pulse"></i>
            Final Recording
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {POSITIONS.map(pos => {
          const positionCandidates = candidates.filter(c => c.position === pos);
          const uniqueVotersCount = turnoutByPosition[pos] || 0;

          if (positionCandidates.length === 0) return null;

          return (
            <div key={pos} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 transform transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-start mb-8 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-black text-[#034F8B] uppercase tracking-tight flex items-center">
                    <i className="fa-solid fa-chart-simple mr-3 text-[#E11C38]"></i>
                    {pos}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black bg-blue-50 text-[#034F8B] px-3 py-1 rounded-full uppercase tracking-tighter">
                    {uniqueVotersCount} Total Votes
                  </span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionCandidates}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px' }}
                      itemStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}
                    />
                    <Bar dataKey="votes" radius={[8, 8, 0, 0]} barSize={45}>
                      {positionCandidates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? DEPED_COLORS.blue : DEPED_COLORS.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-20 text-center py-12 px-8 bg-[#034F8B] rounded-3xl border-t-4 border-[#fcd116]">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-white text-[11px] font-black uppercase tracking-[0.4em]">
            Automated Tallying System • Leon National High School • Secure Election Cloud SY {CURRENT_SY_LABEL}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
