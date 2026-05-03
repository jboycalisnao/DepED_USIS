
import React from 'react';
import { GradeLevel, Section, Student, User } from '../../../types';

interface OrganizationTabProps {
  sections: Section[];
  learnerDatabase: Student[];
  voters: User[];
}

const OrganizationTab: React.FC<OrganizationTabProps> = ({ sections, learnerDatabase, voters }) => {
  const gradeLevels = Object.values(GradeLevel);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {gradeLevels.map(grade => {
        const gradeSections = sections.filter(s => s.gradeLevel === grade);
        if (gradeSections.length === 0) return null;

        // Calculate stats for this specific Grade Level
        const learnersInGrade = learnerDatabase.filter(l => {
          const section = sections.find(s => s.id === l.sectionId);
          return section?.gradeLevel === grade;
        });
        const totalGradeLearners = learnersInGrade.length;
        const votedInGrade = learnersInGrade.filter(l => 
          voters.find(v => v.studentId === l.lrn)?.hasVoted
        ).length;
        const gradePercentage = totalGradeLearners > 0 ? Math.round((votedInGrade / totalGradeLearners) * 100) : 0;
        
        return (
          <div key={grade} className="bg-white rounded-[12px] shadow-sm border border-[rgba(18,35,61,0.08)] overflow-hidden">
            <div className="bg-white px-6 py-5 flex justify-between items-center border-b border-[rgba(18,35,61,0.08)]">
              <h3 className="text-[24px] font-bold text-[#0038a8] uppercase tracking-tight flex items-center">
                <i className="fa-solid fa-graduation-cap mr-3 text-[#0038a8]"></i>
                {grade}
              </h3>
              
              <div className="flex items-center space-x-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-bold text-[#68758d] uppercase tracking-[0.06em] leading-none">Grade Turnout</p>
                  <p className="text-[16px] font-bold text-[#12233d] mt-1 uppercase">
                    {votedInGrade.toLocaleString()} / {totalGradeLearners.toLocaleString()} <span className="text-[#68758d] font-bold ml-1">Voters</span>
                  </p>
                </div>
                <div className="bg-[#f4f8ff] px-4 py-2 rounded-[12px] border border-[rgba(0,56,168,0.12)] flex items-center space-x-2">
                  <i className="fa-solid fa-chart-line text-[#0038a8] text-[13px]"></i>
                  <span className="text-[24px] font-bold text-[#0038a8]">{gradePercentage}%</span>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#f8fafc]">
              {gradeSections.map(sec => {
                const secStudents = learnerDatabase.filter(l => l.sectionId === sec.id);
                const studentCount = secStudents.length;
                const votedCount = secStudents.filter(l => 
                  voters.find(v => v.studentId === l.lrn)?.hasVoted
                ).length;
                const sectionTurnout = studentCount > 0 ? Math.round((votedCount / studentCount) * 100) : 0;
                
                return (
                  <div key={sec.id} className="group p-5 bg-white rounded-[12px] border border-[rgba(18,35,61,0.08)] transition-colors hover:border-[#0038a8]/20">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-[16px] text-[#12233d] uppercase">{sec.name}</h4>
                        <p className="text-[13px] font-bold text-[#68758d] mt-1 uppercase tracking-[0.06em]">
                          <i className="fa-solid fa-user-tie mr-1.5"></i>
                          {sec.adviserName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[24px] font-bold text-[#0038a8]">{sectionTurnout}%</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span className="text-gray-400">Section Tally</span>
                        <span className="text-[#E11C38]">{votedCount} / {studentCount} VOTES</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            sectionTurnout > 80 ? 'bg-green-500' : sectionTurnout > 50 ? 'bg-[#034F8B]' : 'bg-[#E11C38]'
                          }`}
                          style={{ width: `${sectionTurnout}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrganizationTab;
