
import React, { useState } from 'react';
import { Student, User, Section, GradeLevel } from '../../types';

interface VotersTabProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
}

const VotersTab: React.FC<VotersTabProps> = ({ learnerDatabase, voters, sections }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const getLearnerName = (l: Student) => {
    const firstName = l.firstName || (l as any).first_name || '';
    const lastName = l.lastName || (l as any).last_name || '';
    return `${firstName} ${lastName}`;
  };

  const getLearnerLRN = (l: Student) => l.lrn || (l as any).LRN || 'N/A';

  const gradeLevels = Object.values(GradeLevel);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#034F8B] p-8 rounded-3xl shadow-2xl border-b-4 border-[#E11C38]">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-blue-200 text-xl"></i>
          <input 
            type="text"
            placeholder="SEARCH BY LRN OR NAME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-[#011a2e] border-2 border-blue-400/50 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/60 focus:border-red-500 transition-all font-black text-white placeholder:text-blue-300/30 uppercase tracking-[0.2em] text-lg shadow-inner"
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] font-black text-blue-100 uppercase tracking-widest px-2">
          <span className="flex items-center">
            <i className="fa-solid fa-shield-halved mr-2 text-green-400"></i>
            Cloud Database Filter Active
          </span>
          <span>{learnerDatabase.length} Total Registered Learners</span>
        </div>
      </div>

      <div className="space-y-4">
        {gradeLevels.map(grade => {
          const gradeLearners = learnerDatabase.filter(l => {
            const section = sections.find(s => s.id === l.sectionId);
            return section?.gradeLevel === grade;
          });

          const filteredGradeLearners = gradeLearners.filter(l => {
            const fullName = getLearnerName(l).toLowerCase();
            const lrn = getLearnerLRN(l);
            return fullName.includes(searchTerm.toLowerCase()) || lrn.includes(searchTerm);
          });

          if (filteredGradeLearners.length === 0 && searchTerm) return null;

          const isGradeExpanded = expandedGrades[grade] || searchTerm !== '';
          const gradeVotedCount = filteredGradeLearners.filter(l => voters.find(v => v.studentId === getLearnerLRN(l))?.hasVoted).length;

          return (
            <div key={grade} className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
              <button 
                onClick={() => toggleGrade(grade)}
                className={`w-full px-8 py-6 flex items-center justify-between transition-all duration-300 ${isGradeExpanded ? 'bg-[#034F8B] text-white shadow-inner' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}`}
              >
                <div className="flex items-center space-x-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${isGradeExpanded ? 'bg-white/10' : 'bg-[#034F8B]/5 text-[#034F8B]'}`}>
                    <i className={`fa-solid ${isGradeExpanded ? 'fa-folder-open' : 'fa-folder'}`}></i>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase tracking-widest">{grade}</h3>
                    <div className="flex items-center mt-1">
                      <div className={`h-1.5 w-24 rounded-full mr-3 ${isGradeExpanded ? 'bg-white/20' : 'bg-gray-200'}`}>
                        <div 
                          className="h-full bg-[#E11C38] rounded-full" 
                          style={{ width: `${filteredGradeLearners.length > 0 ? (gradeVotedCount/filteredGradeLearners.length)*100 : 0}%` }}
                        ></div>
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-tighter ${isGradeExpanded ? 'text-blue-200' : 'text-gray-400'}`}>
                        {gradeVotedCount} / {filteredGradeLearners.length} VOTES CAST
                      </p>
                    </div>
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-${isGradeExpanded ? 'up' : 'down'} text-xl opacity-50`}></i>
              </button>

              {isGradeExpanded && (
                <div className="p-6 space-y-4 bg-gray-50/50">
                  {sections.filter(s => s.gradeLevel === grade).map(sec => {
                    const sectionLearners = filteredGradeLearners.filter(l => l.sectionId === sec.id);
                    if (sectionLearners.length === 0 && searchTerm) return null;

                    const isSecExpanded = expandedSections[sec.id] || searchTerm !== '';
                    const secVotedCount = sectionLearners.filter(l => voters.find(v => v.studentId === getLearnerLRN(l))?.hasVoted).length;

                    return (
                      <div key={sec.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                        <button 
                          onClick={() => toggleSection(sec.id)}
                          className={`w-full px-6 py-5 flex items-center justify-between transition-all ${isSecExpanded ? 'bg-[#E11C38] text-white' : 'bg-white text-gray-700 hover:bg-blue-50/30'}`}
                        >
                          <div className="flex items-center space-x-4">
                            <i className="fa-solid fa-people-group text-lg opacity-40"></i>
                            <div className="text-left">
                              <span className="font-black text-base uppercase tracking-wider">{sec.name}</span>
                              <span className={`ml-4 text-[10px] font-bold uppercase tracking-widest ${isSecExpanded ? 'text-white/70' : 'text-gray-400'}`}>
                                <i className="fa-solid fa-user-tie mr-1.5"></i>
                                {sec.adviserName}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                             <div className="text-right">
                               <p className={`text-[9px] font-black uppercase tracking-widest ${isSecExpanded ? 'text-white/60' : 'text-gray-400'}`}>Turnout</p>
                               <span className="font-black text-sm">{secVotedCount} / {sectionLearners.length}</span>
                             </div>
                             <i className={`fa-solid fa-angle-${isSecExpanded ? 'up' : 'down'} opacity-50`}></i>
                          </div>
                        </button>

                        {isSecExpanded && (
                          <div className="overflow-x-auto border-t border-gray-100">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50/80">
                                <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                  <th className="px-8 py-4">LRN Identification</th>
                                  <th className="px-8 py-4">Full Legal Name</th>
                                  <th className="px-8 py-4 text-right">Election Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sectionLearners.map(l => {
                                  const lrn = getLearnerLRN(l);
                                  const hasVoted = voters.find(v => v.studentId === lrn)?.hasVoted;
                                  return (
                                    <tr key={l.id} className="hover:bg-blue-50/40 transition-colors group">
                                      <td className="px-8 py-4 font-mono text-xs font-black text-[#034F8B]">{lrn}</td>
                                      <td className="px-8 py-4">
                                        <div className="flex items-center">
                                          <p className="font-bold text-gray-900 text-sm group-hover:text-[#034F8B] transition-colors">{getLearnerName(l)}</p>
                                          {l.isSSLG && (
                                            <span className="ml-3 text-[8px] font-black text-white bg-[#E11C38] px-2 py-0.5 rounded-full uppercase tracking-tighter">Officer</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-8 py-4 text-right">
                                        <span className={`inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                          hasVoted 
                                            ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm' 
                                            : 'bg-red-50 text-red-400 border border-red-100'
                                        }`}>
                                          <i className={`fa-solid ${hasVoted ? 'fa-check-double' : 'fa-hourglass-half'} mr-2`}></i>
                                          {hasVoted ? 'Confirmed' : 'Pending'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotersTab;
