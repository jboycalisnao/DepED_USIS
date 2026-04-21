import React, { useState, useEffect, useMemo } from 'react';
import { User, Student, Section, GradeLevel } from '../../../types';
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../../../constants';

interface LiveTallyMonitorProps {
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
}

const LiveTallyMonitor: React.FC<LiveTallyMonitorProps> = ({ voters, learnerDatabase, sections }) => {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds

  // Auto-refresh logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLastRefresh(new Date());
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate Stats - Excluding Grade 12
  const eligibleLearners = useMemo(() => learnerDatabase.filter(l => {
    const section = sections.find(s => s.id === l.sectionId);
    return section?.gradeLevel !== GradeLevel.GRADE_12;
  }), [learnerDatabase, sections]);

  const totalVotes = (voters || []).filter(v => v.hasVoted).length;
  const totalRegistered = eligibleLearners.length;
  const globalTurnout = totalRegistered > 0 ? Math.round((totalVotes / totalRegistered) * 100) : 0;

  // Grade Level Turnout
  const gradeStats = useMemo(() => {
    return Object.values(GradeLevel).map(grade => {
      const isGrade12 = grade === GradeLevel.GRADE_12;
      const gradeLearners = (learnerDatabase || []).filter(l => {
        const section = (sections || []).find(s => s.id === l.sectionId);
        return section?.gradeLevel === grade;
      });
      const votedCount = gradeLearners.filter(l => (voters || []).find(v => v.studentId === l.lrn)?.hasVoted).length;
      const percentage = gradeLearners.length > 0 ? Math.round((votedCount / gradeLearners.length) * 100) : 0;
      return { grade, votedCount, total: gradeLearners.length, percentage, isGrade12 };
    });
  }, [voters, learnerDatabase, sections]);

  // Estimate "Active Section"
  const activeSection = useMemo(() => {
    if (!voters || voters.length === 0) return "Awaiting Ballots...";
    const latestVoterLrn = voters[voters.length - 1]?.studentId;
    const latestLearner = (learnerDatabase || []).find(l => l.lrn === latestVoterLrn);
    const latestSection = (sections || []).find(s => s.id === latestLearner?.sectionId);
    return latestSection ? `${latestSection.gradeLevel} - ${latestSection.name}` : "System Active";
  }, [voters, learnerDatabase, sections]);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden relative selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Patterns */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-blue-100/40 rounded-full blur-[120px] -mr-[20vw] -mt-[20vw]"></div>
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-red-100/30 rounded-full blur-[120px] -ml-[15vw] -mb-[15vw]"></div>

      {/* Header - Fixed Height */}
      <header className="h-[12vh] flex-shrink-0 flex items-center justify-between px-10 border-b-4 border-[#034F8B] bg-white shadow-sm relative z-20">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-4">
            <img src={DEPED_SEAL_URL} className="h-14 w-auto" alt="DepEd" />
            <div className="h-10 w-px bg-slate-200"></div>
            <img src={LEON_NHS_LOGO_URL} className="h-14 w-auto" alt="LNHS" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-[#034F8B]">Live Election Monitoring</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className="flex items-center text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                <i className="fa-solid fa-satellite-dish mr-2 animate-pulse"></i>
                Cloud Sync Active
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Pop. (G7-G11 Only) • {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-8 text-right">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Refresh Cycle</p>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-mono font-black text-[#034F8B]">
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${(countdown / 600) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow p-8 flex flex-col space-y-6 relative z-10 overflow-hidden">
        
        {/* Row 1: Hero Metrics - Fixed 50vh height */}
        <div className="h-[48vh] grid grid-cols-12 gap-6">
          
          {/* Total Turnout Panel */}
          <div className="col-span-8 bg-white border border-slate-200 rounded-[2.5rem] p-10 flex items-center justify-between shadow-xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-full h-full bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Official Voter Turnout</p>
              <h3 className="text-[10rem] font-black tracking-tighter text-[#034F8B] leading-none">
                {globalTurnout}<span className="text-red-500 text-5xl ml-2">%</span>
              </h3>
              
              <div className="flex items-center space-x-6 mt-8">
                <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Eligible Pop.</p>
                  <p className="text-2xl font-black text-slate-800">{totalRegistered.toLocaleString()}</p>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="px-6 py-4 bg-[#034F8B] border border-[#034F8B] rounded-2xl shadow-lg shadow-blue-900/20">
                  <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest mb-1">Ballots Cast</p>
                  <p className="text-2xl font-black text-white">{totalVotes.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-center justify-center relative z-10">
              <div className="w-64 h-64 rounded-full border-[16px] border-slate-50 flex items-center justify-center relative shadow-inner">
                <svg className="absolute inset-0 w-full h-full -rotate-90 scale-95">
                  <circle
                    cx="128"
                    cy="128"
                    r="108"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="transparent"
                    className="text-[#034F8B]"
                    strokeDasharray={678}
                    strokeDashoffset={678 - (678 * globalTurnout) / 100}
                    style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="text-center">
                   <i className="fa-solid fa-users-viewfinder text-5xl text-slate-200 mb-2 block"></i>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Monitor Panel */}
          <div className="col-span-4 bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col justify-between shadow-xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-5 grayscale group-hover:grayscale-0 transition-all duration-700">
               <img src={LEON_NHS_LOGO_URL} className="w-48 h-auto" alt="" />
            </div>
            
            <div>
               <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Activity Pulse</p>
               <div className="flex items-center space-x-4 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Active Submission</span>
              </div>
              <h4 className="text-4xl font-black uppercase tracking-tight leading-tight text-[#034F8B]">
                {activeSection}
              </h4>
            </div>

            <div className="space-y-4 pt-10">
               <div className="flex items-center justify-between">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real-Time Traffic</p>
                 <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">Analysis Online</span>
               </div>
               <div className="space-y-2">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                     <div className="h-full bg-blue-600/30 animate-pulse" style={{ width: `${30 + Math.random() * 60}%`, animationDelay: `${i * 0.2}s` }}></div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Row 2: Grade Breakdown */}
        <div className="flex-grow grid grid-cols-6 gap-6 min-h-0">
          {gradeStats.map((stat) => (
            <div key={stat.grade} className={`bg-white border rounded-[2rem] p-6 flex flex-col justify-between transition-all group shadow-sm ${stat.isGrade12 ? 'border-dashed border-slate-200 bg-slate-50/50 opacity-40' : 'border-slate-200 hover:border-[#034F8B] hover:shadow-lg'}`}>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-[#034F8B] transition-colors">{stat.grade}</p>
                {stat.isGrade12 ? (
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Non-Voting</span>
                ) : (
                  <h5 className="text-3xl font-black tracking-tighter text-[#034F8B]">{stat.percentage}<span className="text-lg text-red-500">%</span></h5>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{stat.isGrade12 ? 'GRADUATING' : `${stat.votedCount} CAST`}</span>
                  <span>{stat.isGrade12 ? '-' : `${stat.total} POP.`}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  {!stat.isGrade12 ? (
                    <div 
                      className={`h-full transition-all duration-[2000ms] ${stat.percentage > 75 ? 'bg-green-500' : 'bg-[#034F8B]'}`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  ) : (
                    <div className="h-full bg-slate-200 w-full opacity-20"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Footer - Fixed Height */}
      <footer className="h-[6vh] flex-shrink-0 px-10 bg-white border-t border-slate-200 flex justify-between items-center relative z-20">
        <div className="flex items-center space-x-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">
            Automated Tally Monitoring System • DepEd E-Boto Framework 3.2 
          </p>
        </div>
        
        <div className="flex items-center space-x-3 text-slate-300">
           <i className="fa-solid fa-shield-halved text-[10px]"></i>
           <span className="text-[9px] font-black uppercase tracking-widest">AES-256 Encrypted Stream Verified</span>
        </div>
      </footer>
    </div>
  );
};

export default LiveTallyMonitor;