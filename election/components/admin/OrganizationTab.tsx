
import React from 'react';
import { GradeLevel, Section, Student, User } from '../../types';
import { CURRENT_SY_LABEL } from '../../constants';

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
        
        return (
          <div key={grade} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#034F8B] px-8 py-5 flex justify-between items-center">
              <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center">
                <i className="fa-solid fa-graduation-cap mr-3 opacity-50"></i>
                {grade}
              </h3>
              <span className="text-[10px] font-black text-white/50 uppercase">School Year {CURRENT_SY_LABEL}</span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gradeSections.map(sec => {
                const secStudents = learnerDatabase.filter(l => l.sectionId === sec.id);
                const studentCount = secStudents.length;
                const votedCount = secStudents.filter(l => 
                  voters.find(v => v.studentId === l.lrn)?.hasVoted
                ).length;
                const sectionTurnout = studentCount > 0 ? Math.round((votedCount / studentCount) * 100) : 0;
                
                return (
                  <div key={sec.id} className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-[#034F8B] transition-all hover:shadow-xl hover:shadow-[#034F8B]/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-gray-900 uppercase group-hover:text-[#034F8B] transition-colors">{sec.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                          <i className="fa-solid fa-user-tie mr-1.5"></i>
                          {sec.adviserName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-[#034F8B]">{sectionTurnout}%</span>
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
