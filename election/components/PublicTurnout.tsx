
import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { Student, User, Section, GradeLevel, ElectionConfig } from '../types';
import { DEPED_COLORS, LEON_NHS_LOGO_URL, DEPED_SEAL_URL } from '../constants';

interface PublicTurnoutProps {
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
  config: ElectionConfig;
  schoolYearLabel: string;
}

const PublicTurnout: React.FC<PublicTurnoutProps> = ({ voters, learnerDatabase, sections, config, schoolYearLabel }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Stats Logic - Alignment with official counting rules (G7-G11 Only)
  const eligibleLearners = useMemo(() => learnerDatabase.filter(l => {
    const section = sections.find(s => s.id === l.sectionId);
    return section?.gradeLevel !== GradeLevel.GRADE_12;
  }), [learnerDatabase, sections]);

  const votedLrnSet = useMemo(() => new Set(voters.filter(v => v.hasVoted).map(v => v.studentId)), [voters]);
  
  const totalVoted = votedLrnSet.size;
  const totalEligible = eligibleLearners.length;
  const globalTurnout = totalEligible > 0 ? ((totalVoted / totalEligible) * 100).toFixed(1) : "0.0";

  // Detailed Grade & Section Breakdown for Teacher Review
  const gradeLevelBreakdown = useMemo(() => {
    return Object.values(GradeLevel)
      .filter(g => g !== GradeLevel.GRADE_12)
      .map(grade => {
        const gradeSections = sections.filter(s => s.gradeLevel === grade);
        
        const sectionDetails = gradeSections.map(sec => {
          const secLearners = eligibleLearners.filter(l => l.sectionId === sec.id);
          const secVotedCount = secLearners.filter(l => votedLrnSet.has(l.lrn)).length;
          const percentage = secLearners.length > 0 ? (secVotedCount / secLearners.length) * 100 : 0;
          
          return {
            ...sec,
            voted: secVotedCount,
            total: secLearners.length,
            percentage
          };
        }).sort((a, b) => a.name.localeCompare(b.name));

        const gradeVoted = sectionDetails.reduce((acc, s) => acc + s.voted, 0);
        const gradeTotal = sectionDetails.reduce((acc, s) => acc + s.total, 0);

        return {
          grade,
          sections: sectionDetails,
          gradeVoted,
          gradeTotal,
          gradePercentage: gradeTotal > 0 ? (gradeVoted / gradeTotal) * 100 : 0
        };
      }).filter(g => g.sections.length > 0);
  }, [eligibleLearners, votedLrnSet, sections]);

  // Search filter for the detailed breakdown
  const filteredBreakdown = useMemo(() => {
    if (!searchQuery.trim()) return gradeLevelBreakdown;
    const term = searchQuery.toLowerCase().trim();
    
    return gradeLevelBreakdown.map(g => ({
      ...g,
      sections: g.sections.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.adviserName.toLowerCase().includes(term)
      )
    })).filter(g => g.sections.length > 0);
  }, [gradeLevelBreakdown, searchQuery]);

  // Gender Breakdown (Public Aggregate)
  const genderData = useMemo(() => {
    const normalize = (g: string) => (g || '').toUpperCase().startsWith('M') ? 'Male' : (g || '').toUpperCase().startsWith('F') ? 'Female' : 'Unclassified';
    const votedLearners = eligibleLearners.filter(l => votedLrnSet.has(l.lrn));
    
    const counts = { Male: 0, Female: 0, Unclassified: 0 };
    votedLearners.forEach(l => {
      const g = normalize(l.gender || (l as any).GENDER);
      counts[g as keyof typeof counts]++;
    });

    return [
      { name: 'Male Voters', value: counts.Male, fill: '#034F8B' },
      { name: 'Female Voters', value: counts.Female, fill: '#E11C38' },
      { name: 'Unclassified', value: counts.Unclassified, fill: '#64748b' }
    ].filter(d => d.value > 0);
  }, [eligibleLearners, votedLrnSet]);

  const gradeChartData = useMemo(() => {
    return gradeLevelBreakdown.map(g => ({
      name: g.grade,
      turnout: Number(g.gradePercentage.toFixed(1))
    }));
  }, [gradeLevelBreakdown]);

  return (
    <div className={`min-h-screen bg-[#f8fafc] pb-20 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <header className="bg-white border-b-4 border-[#034F8B] py-10 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <img src={DEPED_SEAL_URL} className="h-14 w-auto" alt="DepEd" />
              <img src={LEON_NHS_LOGO_URL} className="h-16 w-auto" alt="LNHS" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#034F8B] uppercase tracking-tighter leading-none">Participation Dashboard</h1>
              <p className="text-[#E11C38] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Live Cloud Monitoring • SY {schoolYearLabel}</p>
            </div>
          </div>
          
          <div className="bg-[#034F8B] text-white p-6 rounded-[2rem] text-center min-w-[220px] shadow-xl shadow-blue-900/20">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Current Turnout</p>
            <h2 className="text-5xl font-black leading-none">{globalTurnout}%</h2>
            <div className="mt-3 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/60">Data Refreshed Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Visual Analytics Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#034F8B] uppercase tracking-tight">Turnout by Grade Level</h3>
              <span className="bg-blue-50 text-[#034F8B] px-3 py-1 rounded-full text-[9px] font-black uppercase border border-blue-100">Live Statistics</span>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="turnout" radius={[12, 12, 0, 0]} barSize={45}>
                    {gradeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#034F8B' : '#E11C38'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-black text-[#034F8B] uppercase tracking-tight mb-8">Voter Profile</h3>
            <div className="flex-grow flex items-center justify-center">
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 p-5 bg-gray-50 rounded-2xl text-center border border-gray-100">
               <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed">
                 Encrypted Aggregate Data <br/>No Individual Ballots Exposed
               </p>
            </div>
          </div>
        </div>

        {/* Detailed Review Section for Teachers */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#034F8B] p-10 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <i className="fa-solid fa-list-check text-2xl text-[#fcd116]"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Section Participation Registry</h3>
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Official Review Panel for Advisers</p>
                </div>
              </div>
              
              <div className="relative w-full md:w-80 group">
                <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#fcd116] transition-colors"></i>
                <input 
                  type="text" 
                  placeholder="SEARCH SECTION OR ADVISER..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white focus:text-[#034F8B] focus:border-white transition-all text-xs font-black uppercase placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          <div className="p-10 space-y-12">
            {filteredBreakdown.length === 0 ? (
              <div className="py-32 text-center">
                 <i className="fa-solid fa-filter-circle-xmark text-6xl text-gray-100 mb-6"></i>
                 <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">No sections match your current search query</p>
                 <button onClick={() => setSearchQuery('')} className="mt-4 text-[#034F8B] font-black text-[10px] uppercase underline underline-offset-4">Reset Filter</button>
              </div>
            ) : (
              filteredBreakdown.map(g => (
                <div key={g.grade} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between border-b-2 border-gray-100 pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#034F8B] border border-gray-100">
                        <i className="fa-solid fa-graduation-cap"></i>
                      </div>
                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">{g.grade}</h4>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-4">Overall Grade Progress</span>
                       <span className="text-2xl font-black text-[#034F8B]">{g.gradePercentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {g.sections.map(sec => (
                      <div key={sec.id} className="bg-gray-50/50 rounded-[2rem] p-6 border border-gray-100 hover:bg-white hover:border-blue-200 transition-all group shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h5 className="font-black text-gray-900 uppercase text-sm tracking-tight group-hover:text-[#034F8B] transition-colors">{sec.name}</h5>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase flex items-center">
                              <i className="fa-solid fa-user-tie mr-1.5 opacity-50"></i>
                              {sec.adviserName || 'NO ADVISER LISTED'}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            sec.percentage >= 100 ? 'bg-green-100 text-green-700 border-green-200' :
                            sec.percentage >= 80 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            'bg-red-50 text-red-500 border-red-100'
                          }`}>
                            {sec.percentage >= 100 ? 'COMPLETE' : 'IN-PROGRESS'}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-gray-400">Class Turnout</span>
                            <span className="text-[#034F8B]">{sec.voted} / {sec.total} <span className="text-gray-300 ml-1">VOTERS</span></span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                             <div 
                              className={`h-full transition-all duration-1000 ${
                                sec.percentage >= 100 ? 'bg-green-500' : 
                                sec.percentage >= 50 ? 'bg-[#034F8B]' : 'bg-[#E11C38]'
                              }`}
                              style={{ width: `${sec.percentage}%` }}
                             ></div>
                          </div>
                          <div className="text-right">
                             <span className="text-xl font-black text-[#034F8B]">{sec.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="mt-20 text-center py-10 px-6 border-t border-gray-100 opacity-40">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4">Official Participation Audit Tool • Leon NHS Cloud Infrastructure</p>
        <div className="flex justify-center items-center space-x-8">
          <img src={DEPED_SEAL_URL} className="h-6" alt="" />
          <img src={LEON_NHS_LOGO_URL} className="h-8" alt="" />
        </div>
      </footer>
    </div>
  );
};

export default PublicTurnout;
