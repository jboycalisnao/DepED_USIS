
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Candidate, User, Student, Section } from '../../types';
import { DEPED_COLORS } from '../../constants';

interface DashboardTabProps {
  candidates: Candidate[];
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
}

const DashboardTab: React.FC<DashboardTabProps> = ({ candidates, voters, learnerDatabase, sections }) => {
  const totalVotes = voters.filter(v => v.hasVoted).length;
  const totalRegistered = learnerDatabase.length;
  const turnoutPercentage = totalRegistered > 0 ? Math.round((totalVotes / totalRegistered) * 100) : 0;

  return (
    <div className="space-y-8 opacity-0 transition-opacity duration-300 ease-in" style={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Turnout</p>
          <h4 className="text-3xl font-black text-[#034F8B]">{turnoutPercentage}%</h4>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#E11C38] h-full" style={{ width: `${turnoutPercentage}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Votes Cast</p>
          <h4 className="text-3xl font-black text-[#034F8B]">{totalVotes}</h4>
          <p className="text-[10px] text-gray-400 mt-2 font-bold italic">Securely Tallying...</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Learner Population</p>
          <h4 className="text-3xl font-black text-[#034F8B]">{totalRegistered.toLocaleString()}</h4>
          <p className="text-[10px] text-gray-400 mt-2 font-bold italic">Synced from Cloud</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Sections</p>
          <h4 className="text-3xl font-black text-[#034F8B]">{sections.length}</h4>
          <p className="text-[10px] text-gray-400 mt-2 font-bold italic">Across Grade Levels</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-[#034F8B] uppercase tracking-tight">Candidate Performance Overview</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full">Real-time Tally</span>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={candidates}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
              />
              <Bar dataKey="votes" radius={[6, 6, 0, 0]} barSize={40}>
                {candidates.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? DEPED_COLORS.blue : DEPED_COLORS.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
