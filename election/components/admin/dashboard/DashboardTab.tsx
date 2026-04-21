
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Candidate, User, Student, Section, GradeLevel } from '../../../types';
import { DEPED_COLORS } from '../../../constants';
import { getCacheStats } from '../../../utils/imagePersistence';
import { useStore } from '../../../supabaseStore';

interface DashboardTabProps {
  candidates: Candidate[];
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
}

const DashboardTab: React.FC<DashboardTabProps> = ({ candidates, voters, learnerDatabase, sections }) => {
  const { egressSaved } = useStore();
  
  // Eligible Learners: Grades 7-11
  const eligibleLearners = learnerDatabase.filter(l => {
    const section = sections.find(s => s.id === l.sectionId);
    return section?.gradeLevel !== GradeLevel.GRADE_12;
  });

  const totalVotersParticipated = voters.filter(v => v.hasVoted).length;
  const totalRegistered = eligibleLearners.length;
  const turnoutPercentage = totalRegistered > 0 ? Math.round((totalVotersParticipated / totalRegistered) * 100) : 0;
  
  const cacheStats = getCacheStats();
  const totalBytesSaved = cacheStats.size + egressSaved;
  const mbSaved = (totalBytesSaved / 1024 / 1024).toFixed(2);

  const gradeLevelStats = Object.values(GradeLevel).map(grade => {
    const isGrade12 = grade === GradeLevel.GRADE_12;
    const learnersInGrade = learnerDatabase.filter(l => {
      const section = sections.find(s => s.id === l.sectionId);
      return section?.gradeLevel === grade;
    });
    const votedInGrade = learnersInGrade.filter(l => 
      voters.find(v => v.studentId === l.lrn)?.hasVoted
    ).length;
    const percentage = learnersInGrade.length > 0 
      ? Math.round((votedInGrade / learnersInGrade.length) * 100) 
      : 0;
    return { grade, voted: votedInGrade, total: learnersInGrade.length, percentage, isGrade12 };
  });

  return (
    <div className="space-y-8 opacity-0 transition-opacity duration-300 ease-in" style={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#034F8B] p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-square-poll-vertical text-6xl"></i>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1 opacity-60">Election Turnout</p>
          <h4 className="text-4xl font-black">{turnoutPercentage}%</h4>
          <div className="w-full bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-[#fcd116] h-full" style={{ width: `${turnoutPercentage}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ballots Cast</p>
            <h4 className="text-3xl font-black text-[#034F8B]">{totalVotersParticipated.toLocaleString()}</h4>
          </div>
          <p className="text-[9px] text-green-500 mt-3 font-black uppercase tracking-tighter">
            <i className="fa-solid fa-bolt mr-1"></i> {totalRegistered > 0 ? Math.max(0, totalRegistered - totalVotersParticipated) : 0} Remaining
          </p>
        </div>

        <div className="bg-[#fcd116] p-6 rounded-[2rem] shadow-lg text-[#034F8B] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-id-card-clip text-6xl"></i>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1">Eligible Voters</p>
            <h4 className="text-3xl font-black">{totalRegistered.toLocaleString()}</h4>
          </div>
          <p className="text-[9px] font-black uppercase mt-3 opacity-60">
            JHS (G7-G10) & SHS (G11)
          </p>
        </div>

        <div className="bg-[#E11C38] p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden group border-b-4 border-red-900">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-server text-6xl"></i>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1 opacity-60">Bandwidth Saved</p>
          <h4 className="text-3xl font-black">{mbSaved}MB</h4>
          <p className="text-[8px] font-bold mt-3 opacity-80 uppercase tracking-widest">
            {cacheStats.items} Assets Cached Locally
          </p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h3 className="text-xl font-black text-[#034F8B] uppercase tracking-tight">Grade-Level Participation</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time Turnout Breakdown</p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center space-x-3 border border-blue-100">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black text-[#034F8B] uppercase">Tally Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {gradeLevelStats.map((stat) => (
            <div key={stat.grade} className={`p-6 rounded-2xl border transition-all ${stat.isGrade12 ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-gray-50/50 border-gray-100 group hover:border-[#034F8B]/30 hover:bg-white hover:shadow-lg hover:shadow-blue-900/5'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="font-black text-[#034F8B] uppercase text-sm tracking-widest">{stat.grade}</h5>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                    {stat.isGrade12 ? 'Non-Voting Grade' : `${stat.voted} / ${stat.total} Voters`}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${stat.isGrade12 ? 'text-gray-400' : stat.percentage > 70 ? 'text-green-500' : 'text-[#034F8B]'}`}>
                    {stat.isGrade12 ? 'N/A' : `${stat.percentage}%`}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                {!stat.isGrade12 ? (
                  <div 
                    className={`h-full transition-all duration-1000 ${stat.percentage > 75 ? 'bg-green-500' : 'bg-[#034F8B]'}`}
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                ) : (
                  <div className="h-full bg-gray-300 w-full opacity-20"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-xl font-black text-[#034F8B] uppercase tracking-tight">Candidate Performance</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Vote Distribution across all Registry</p>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={candidates}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '20px' }}
              />
              <Bar dataKey="votes" radius={[12, 12, 0, 0]} barSize={50}>
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
