
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Candidate, Position, ElectionConfig } from '../types';
import { POSITIONS, DEPED_COLORS, LEON_NHS_LOGO_URL, DEPED_SEAL_URL } from '../constants';

interface PublicResultsProps {
  candidates: Candidate[];
  turnoutByPosition: Record<string, number>;
  config: ElectionConfig;
  schoolYearLabel: string;
}

const PublicResults: React.FC<PublicResultsProps> = ({ candidates, turnoutByPosition, config, schoolYearLabel }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!config.publicResultsEnabled) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 text-center p-12">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fa-solid fa-lock text-4xl text-red-500"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Tally Restricted</h2>
          <p className="text-gray-500 font-medium leading-relaxed mb-8">
            The official election results are currently hidden by the LG COMEA. Please wait for an official announcement.
          </p>
          <div className="flex justify-center items-center space-x-4 opacity-30 grayscale">
            <img src={DEPED_SEAL_URL} className="h-10 w-auto" alt="DepEd" />
            <img src={LEON_NHS_LOGO_URL} className="h-10 w-auto" alt="LNHS" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8fafc] pb-20 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Dynamic Header */}
      <header className="bg-[#034F8B] text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img src={LEON_NHS_LOGO_URL} className="absolute -right-20 -top-20 w-96 h-auto grayscale brightness-200 rotate-12" alt="" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center space-x-6 text-center md:text-left flex-col md:flex-row">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <img src={DEPED_SEAL_URL} className="h-16 w-auto drop-shadow-lg" alt="DepEd" />
                <div className="w-px h-12 bg-white/20 hidden md:block"></div>
                <img src={LEON_NHS_LOGO_URL} className="h-16 w-auto drop-shadow-lg" alt="LNHS" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">Real-Time Election Tally</h1>
                <p className="text-blue-200 text-xs md:text-sm font-bold uppercase tracking-[0.3em] mt-3">
                  {config.schoolName || 'Leon National High School'} • SY {schoolYearLabel}
                </p>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-center min-w-[200px] shadow-2xl">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Live Sync Active</span>
              </div>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Public Access Module</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {POSITIONS.map(pos => {
            const positionCandidates = candidates.filter(c => c.position === pos);
            if (positionCandidates.length === 0) return null;
            const totalPositionVotes = turnoutByPosition[pos] || 0;
            
            const posLower = pos.toLowerCase();
            // RULE: Multi-seat (2) for regular Reps, but SINGLE (1) for STE and SPA.
            const isMultiSeatRep = posLower.includes('representative') && 
                                 !posLower.includes('ste') && 
                                 !posLower.includes('spa');

            return (
              <div key={pos} className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-[#034F8B] uppercase tracking-tight">{pos}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {isMultiSeatRep ? 'Top 2 Winners for this Grade Level' : 'Official Candidate Performance'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-blue-50 text-[#034F8B] px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-blue-100">
                      {totalPositionVotes} Total Voters
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="h-80 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={positionCandidates}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} 
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '16px' }}
                        />
                        <Bar dataKey="votes" radius={[12, 12, 0, 0]} barSize={40}>
                          {positionCandidates.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? DEPED_COLORS.blue : DEPED_COLORS.red} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {positionCandidates.sort((a, b) => b.votes - a.votes).map((c, idx) => {
                      const percentage = totalPositionVotes > 0 ? (c.votes / totalPositionVotes) * 100 : 0;
                      // Logic: Top 2 win for Regular Representatives, Top 1 for others (including STE/SPA)
                      const isWinner = isMultiSeatRep ? idx < 2 : idx < 1;
                      const hasVotes = c.votes > 0;

                      return (
                        <div key={c.id} className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${isWinner && hasVotes ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'} group hover:bg-white`}>
                          <div className="flex items-center space-x-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isWinner && hasVotes ? (idx === 0 ? 'bg-[#fcd116] text-[#034F8B]' : 'bg-slate-300 text-slate-700') : 'bg-gray-200 text-gray-500'}`}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 uppercase">
                                {isWinner && hasVotes && '★ '}{c.name}
                              </p>
                              <p className="text-[9px] font-bold text-[#E11C38] uppercase">{c.party}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-[#034F8B]">{c.votes} <span className="text-[10px] text-gray-400">MARKS</span></p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{percentage.toFixed(1)}% Batch Share</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="mt-20 text-center px-6">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4">Official Election Cloud Services • Tally Verification System</p>
        <div className="flex justify-center items-center space-x-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
          <img src={DEPED_SEAL_URL} className="h-8 w-auto" alt="DepEd" />
          <img src={LEON_NHS_LOGO_URL} className="h-8 w-auto" alt="LNHS" />
        </div>
      </footer>
    </div>
  );
};

export default PublicResults;
