
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Student, User, Section, GradeLevel } from '../../../types';
import { useStore } from '../../../supabaseStore';
import { DEPED_SEAL_URL } from '../../../constants';

interface VotersTabProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
  onDeleteBallot: (lrn: string) => Promise<void>;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
}

const VotersTab: React.FC<VotersTabProps> = ({ learnerDatabase = [], voters = [], sections = [], onDeleteBallot, showAlert }) => {
  const store = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [auditBallot, setAuditBallot] = useState<any[] | null>(null);
  const [auditedUser, setAuditedUser] = useState<Student | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const getLearnerName = (l: Student) => {
    const firstName = l.firstName || '';
    const lastName = l.lastName || '';
    const middleName = l.middleName ? ` ${l.middleName}` : '';
    return `${firstName}${middleName} ${lastName}`;
  };

  const getLearnerLRN = (l: Student) => l.lrn || 'N/A';

  // Normalization helper for gender strings
  const getGenderChar = (l: Student) => {
    const g = (l.gender || (l as any).GENDER || '').toUpperCase();
    if (g.startsWith('M')) return 'M';
    if (g.startsWith('F')) return 'F';
    return 'U';
  };

  const handleAudit = async (learner: Student) => {
    setIsAuditing(true);
    setAuditedUser(learner);
    try {
      const ballot = await store.fetchVoterBallot(getLearnerLRN(learner), store.activeSchoolYear?.id || '');
      setAuditBallot(ballot || []);
    } catch (err) {
      console.error("Audit fetch failed", err);
      setAuditBallot([]);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleDeleteVote = (learner: Student) => {
    const lrn = getLearnerLRN(learner);
    const name = getLearnerName(learner);
    
    showAlert(
      "Confirm Ballot Void",
      `Are you sure you want to permanently void the ballot cast by ${name} (LRN: ${lrn})? This will allow the student to vote again.`,
      "confirm",
      async () => {
        try {
          setIsProcessingDelete(true);
          await onDeleteBallot(lrn);
          setAuditedUser(null);
          setAuditBallot(null);
          showAlert("Ballot Voided", `Records for ${name} have been cleared.`, "success");
        } catch (err) {
          showAlert("Action Failed", "Could not void the ballot. Please check cloud connection.", "error");
        } finally {
          setIsProcessingDelete(false);
        }
      }
    );
  };

  const gradeLevels = Object.values(GradeLevel);

  const renderAuditModal = () => {
    if (!auditedUser) return null;

    return createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          <div className="bg-[#034F8B] p-8 text-white text-center relative">
            <img src={DEPED_SEAL_URL} className="h-16 mx-auto mb-4" alt="DepEd" />
            <h3 className="text-xl font-black uppercase tracking-tight">Voter Audit Report</h3>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Official Ballot Record</p>
            
            <button 
              onClick={() => { setAuditedUser(null); setAuditBallot(null); }}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
          
          <div className="p-8 overflow-y-auto no-scrollbar">
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Voter Profile</p>
              <h4 className="text-xl font-black text-gray-900 uppercase">{getLearnerName(auditedUser)}</h4>
              <p className="text-sm font-mono font-bold text-[#034F8B] mt-1">{getLearnerLRN(auditedUser)}</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Identified Choices</p>
              {isAuditing ? (
                <div className="py-12 text-center">
                  <i className="fa-solid fa-circle-notch animate-spin text-3xl text-blue-500"></i>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-4">Retrieving Ballot Data...</p>
                </div>
              ) : auditBallot && auditBallot.length > 0 ? (
                <div className="space-y-3">
                  {auditBallot.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl">
                      <span className="text-[10px] font-black text-gray-400 uppercase">{item.position}</span>
                      <span className="text-xs font-black text-[#034F8B] uppercase">{item.candidates?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center bg-red-50 rounded-xl border border-red-100">
                  <i className="fa-solid fa-box-open text-3xl text-red-200 mb-2"></i>
                  <p className="text-[10px] font-black text-red-400 uppercase">No ballot lines recorded for this LRN</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex flex-col gap-3">
            <button 
              onClick={() => handleDeleteVote(auditedUser)}
              disabled={isProcessingDelete}
              className="w-full bg-[#E11C38] text-white py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
              <i className={`fa-solid ${isProcessingDelete ? 'fa-circle-notch animate-spin' : 'fa-trash-can'} mr-2`}></i>
              Permanently Void This Ballot
            </button>
            <button 
              onClick={() => {
                setAuditedUser(null);
                setAuditBallot(null);
              }}
              className="w-full bg-white text-gray-500 border border-gray-200 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all"
            >
              Dismiss Audit View
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderLearnerTable = (learnersList: Student[], label: string, colorClass: string, icon: string) => {
    if (learnersList.length === 0) return null;
    
    const votedCount = learnersList.filter(l => (voters || []).find(v => v.studentId === getLearnerLRN(l))?.hasVoted).length;

    return (
      <div className="mb-8">
        <div className={`flex items-center justify-between px-6 py-2 ${colorClass} bg-opacity-5 rounded-t-xl border-x border-t border-gray-100`}>
          <div className="flex items-center space-x-2">
            <i className={`fa-solid ${icon} ${colorClass.replace('bg-', 'text-')} text-xs`}></i>
            <span className={`text-[10px] font-black uppercase tracking-widest ${colorClass.replace('bg-', 'text-')}`}>{label}</span>
          </div>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
            {votedCount} / {learnersList.length} Cast
          </span>
        </div>
        <div className="overflow-x-auto border border-gray-100 rounded-b-xl shadow-sm bg-white">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80">
              <tr className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <th className="px-6 py-3">LRN Identification</th>
                <th className="px-6 py-3">Full Legal Name</th>
                <th className="px-6 py-3 text-right">Election Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {learnersList.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')).map(l => {
                const lrn = getLearnerLRN(l);
                const hasVoted = (voters || []).find(v => v.studentId === lrn)?.hasVoted;
                const isG12 = sections.find(s => s.id === l.sectionId)?.gradeLevel === GradeLevel.GRADE_12;
                
                return (
                  <tr key={l.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-3 font-mono text-[10px] font-black text-[#034F8B]">{lrn}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <p className="font-bold text-gray-900 text-xs group-hover:text-[#034F8B] transition-colors">{getLearnerName(l)}</p>
                        {l.isSSLG && (
                          <span className="ml-3 text-[7px] font-black text-white bg-[#E11C38] px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Officer</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {isG12 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-gray-100 text-gray-400 border border-gray-200">
                          <i className="fa-solid fa-ban mr-1.5"></i> Non-Voter
                        </span>
                      ) : hasVoted ? (
                        <div className="flex justify-end items-center space-x-1">
                          <button 
                            onClick={() => handleAudit(l)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-[#034F8B] border border-blue-100 shadow-sm hover:bg-[#034F8B] hover:text-white transition-all active:scale-95"
                          >
                            <i className="fa-solid fa-magnifying-glass-chart mr-1.5"></i>
                            Audit
                          </button>
                          <button 
                            onClick={() => handleDeleteVote(l)}
                            className="inline-flex items-center p-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-100 shadow-sm hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            title="Void Ballot"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-400 border border-red-100 italic opacity-50">
                          No Vote Yet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {renderAuditModal()}

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
            <i className="fa-solid fa-user-lock mr-2 text-red-400"></i>
            Demographic Audit Active: Gender Grouping Enabled
          </span>
          <span>{(learnerDatabase || []).length} Total Database Records</span>
        </div>
      </div>

      <div className="space-y-4">
        {gradeLevels.map(grade => {
          const isG12 = grade === GradeLevel.GRADE_12;
          const gradeLearners = (learnerDatabase || []).filter(l => {
            const section = (sections || []).find(s => s.id === l.sectionId);
            return section?.gradeLevel === grade;
          });

          const filteredGradeLearners = gradeLearners.filter(l => {
            const fullName = getLearnerName(l).toLowerCase();
            const lrn = getLearnerLRN(l);
            return fullName.includes(searchTerm.toLowerCase()) || lrn.includes(searchTerm);
          });

          if (filteredGradeLearners.length === 0 && searchTerm) return null;

          const isGradeExpanded = expandedGrades[grade] || searchTerm !== '';
          const gradeVotedCount = filteredGradeLearners.filter(l => (voters || []).find(v => v.studentId === getLearnerLRN(l))?.hasVoted).length;

          return (
            <div key={grade} className={`bg-white rounded-3xl shadow-lg border overflow-hidden ${isG12 ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
              <button 
                onClick={() => toggleGrade(grade)}
                className={`w-full px-8 py-6 flex items-center justify-between transition-all duration-300 ${isGradeExpanded ? 'bg-[#034F8B] text-white shadow-inner' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}`}
              >
                <div className="flex items-center space-x-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${isGradeExpanded ? 'bg-white/10' : 'bg-[#034F8B]/5 text-[#034F8B]'}`}>
                    <i className={`fa-solid ${isGradeExpanded ? (isG12 ? 'fa-folder-closed' : 'fa-folder-open') : 'fa-folder'}`}></i>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase tracking-widest">{grade} {isG12 && '(Non-Voting)'}</h3>
                    {!isG12 && (
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
                    )}
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-${isGradeExpanded ? 'up' : 'down'} text-xl opacity-50`}></i>
              </button>

              {isGradeExpanded && (
                <div className="p-6 space-y-4 bg-gray-50/50">
                  {(sections || []).filter(s => s.gradeLevel === grade).map(sec => {
                    const sectionLearners = filteredGradeLearners.filter(l => l.sectionId === sec.id);
                    if (sectionLearners.length === 0 && searchTerm) return null;

                    const isSecExpanded = expandedSections[sec.id] || searchTerm !== '';
                    const secVotedCount = sectionLearners.filter(l => (voters || []).find(v => v.studentId === getLearnerLRN(l))?.hasVoted).length;

                    // GENDER CLASSIFICATION WITHIN SECTION
                    const males = sectionLearners.filter(l => getGenderChar(l) === 'M');
                    const females = sectionLearners.filter(l => getGenderChar(l) === 'F');
                    const others = sectionLearners.filter(l => getGenderChar(l) === 'U');

                    return (
                      <div key={sec.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                        <button 
                          onClick={() => toggleSection(sec.id)}
                          className={`w-full px-6 py-5 flex items-center justify-between transition-all ${isSecExpanded ? (isG12 ? 'bg-slate-700 text-white' : 'bg-[#E11C38] text-white') : 'bg-white text-gray-700 hover:bg-blue-50/30'}`}
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
                             {!isG12 && (
                               <div className="text-right">
                                 <p className={`text-[9px] font-black uppercase tracking-widest ${isSecExpanded ? 'text-white/60' : 'text-gray-400'}`}>Turnout</p>
                                 <span className="font-black text-sm">{secVotedCount} / {sectionLearners.length}</span>
                               </div>
                             )}
                             {isG12 && <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded">Ineligible Batch</span>}
                             <i className={`fa-solid fa-angle-${isSecExpanded ? 'up' : 'down'} opacity-50`}></i>
                          </div>
                        </button>

                        {isSecExpanded && (
                          <div className="p-6 bg-gray-50/30">
                            {renderLearnerTable(males, "Male Learners", "bg-blue-500", "fa-mars")}
                            {renderLearnerTable(females, "Female Learners", "bg-pink-500", "fa-venus")}
                            {renderLearnerTable(others, "Unclassified", "bg-gray-500", "fa-genderless")}
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
