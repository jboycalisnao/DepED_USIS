
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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(18,35,61,0.24)] p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="flex max-h-[90vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white shadow-[0_18px_36px_rgba(18,35,61,0.18)] animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(18,35,61,0.12)] px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-[#eef4ff]">
                <img src={DEPED_SEAL_URL} className="h-8 w-8 object-contain" alt="DepEd" />
              </div>
              <div>
                <h3 className="text-[24px] font-black uppercase tracking-tight text-[#12233d]">
                  Voter Audit Report
                </h3>
                <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Official ballot record
                </p>
              </div>
            </div>

            <button
              onClick={() => { setAuditedUser(null); setAuditBallot(null); }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white text-[16px] font-bold text-[#12233d] transition-colors hover:bg-slate-50"
              aria-label="Close audit modal"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="overflow-y-auto p-6 no-scrollbar">
            <div className="mb-6 rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-5 shadow-sm">
              <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Voter Profile</p>
              <h4 className="text-[24px] font-black uppercase text-[#12233d]">{getLearnerName(auditedUser)}</h4>
              <p className="mt-2 text-[16px] font-bold text-[#0038a8]">{getLearnerLRN(auditedUser)}</p>
            </div>

            <div className="space-y-4">
              <p className="border-b border-[rgba(18,35,61,0.08)] pb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Identified Choices
              </p>
              {isAuditing ? (
                <div className="py-12 text-center">
                  <i className="fa-solid fa-circle-notch animate-spin text-3xl text-blue-500"></i>
                  <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Retrieving ballot data</p>
                </div>
              ) : auditBallot && auditBallot.length > 0 ? (
                <div className="space-y-3">
                  {auditBallot.map((item, idx) => {
                    const candidateRecord = Array.isArray(item.election_candidates)
                      ? item.election_candidates[0]
                      : item.election_candidates;

                    return (
                      <div key={idx} className="flex items-center justify-between rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white px-4 py-4 shadow-sm">
                        <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">{item.position}</span>
                        <span className="text-[16px] font-bold uppercase text-[#0038a8]">
                          {candidateRecord?.name || 'Candidate record unavailable'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[12px] border border-red-100 bg-red-50 py-10 text-center">
                  <i className="fa-solid fa-box-open mb-2 text-3xl text-red-200"></i>
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-red-400">No ballot lines recorded for this LRN</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-[rgba(18,35,61,0.12)] bg-slate-50 px-6 py-5">
            <button
              onClick={() => {
                setAuditedUser(null);
                setAuditBallot(null);
              }}
              className="rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#12233d] transition-colors hover:bg-slate-50"
            >
              Dismiss Audit View
            </button>
            <button 
              onClick={() => handleDeleteVote(auditedUser)}
              disabled={isProcessingDelete}
              className="inline-flex items-center justify-center rounded-[12px] bg-[#ce1126] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#b10f21] disabled:opacity-50"
            >
              <i className={`fa-solid ${isProcessingDelete ? 'fa-circle-notch animate-spin' : 'fa-trash-can'} mr-2`}></i>
              Permanently Void This Ballot
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

      <div className="bg-white p-6 rounded-[12px] shadow-sm border border-[rgba(18,35,61,0.08)]">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] text-[16px]"></i>
          <input 
            type="text"
            placeholder="Search by LRN or learner name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-[#f8fafc] border border-[rgba(18,35,61,0.12)] rounded-[12px] outline-none focus:border-[#0038a8] transition-colors font-medium text-[16px] text-[#12233d] placeholder:text-[#98a2b3]"
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-[13px] font-bold text-[#68758d] uppercase tracking-[0.06em] px-1">
          <span className="flex items-center">
            <i className="fa-solid fa-user-lock mr-2 text-[#0038a8]"></i>
            Demographic audit with gender grouping
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
            <div key={grade} className={`bg-white rounded-[12px] shadow-sm border overflow-hidden ${isG12 ? 'border-[rgba(18,35,61,0.08)] opacity-70' : 'border-[rgba(18,35,61,0.08)]'}`}>
              <button 
                onClick={() => toggleGrade(grade)}
                className={`w-full px-6 py-5 flex items-center justify-between transition-colors ${isGradeExpanded ? 'bg-[#f4f8ff] text-[#12233d]' : 'bg-white hover:bg-[#f8fafc] text-[#12233d]'}`}
              >
                <div className="flex items-center space-x-5">
                  <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center text-[16px] ${isGradeExpanded ? 'bg-white text-[#0038a8] border border-[rgba(18,35,61,0.08)]' : 'bg-[#f4f8ff] text-[#0038a8]'}`}>
                    <i className={`fa-solid ${isGradeExpanded ? (isG12 ? 'fa-folder-closed' : 'fa-folder-open') : 'fa-folder'}`}></i>
                  </div>
                  <div className="text-left">
                    <h3 className="text-[24px] font-bold uppercase tracking-tight">{grade} {isG12 && '(Non-Voting)'}</h3>
                    {!isG12 && (
                      <div className="flex items-center mt-1">
                        <div className={`h-1.5 w-24 rounded-full mr-3 ${isGradeExpanded ? 'bg-white/20' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full bg-[#E11C38] rounded-full" 
                            style={{ width: `${filteredGradeLearners.length > 0 ? (gradeVotedCount/filteredGradeLearners.length)*100 : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#68758d]">
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
