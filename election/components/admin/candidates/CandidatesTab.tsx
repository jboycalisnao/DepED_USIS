
import React, { useState, useMemo } from 'react';
import { Candidate, SchoolYear, ElectionConfig } from '../../../types';
import { POSITIONS, LEON_NHS_LOGO_URL, DEPED_COLORS } from '../../../constants';
import { optimizeImageUrl } from '../../../utils/imageUtils';
import ManagePartylistsModal from './ManagePartylistsModal';
import RegisterCandidateModal from './RegisterCandidateModal';
import { handlePrintEncodingSlip } from './encodingSlipExportHandler';
import { handleCandidatesPrint } from './candidatesExportHandler';
import CandidateRemarks from './CandidateRemarks';

interface CandidatesTabProps {
  candidates: Candidate[];
  turnoutByPosition: Record<string, number>;
  onAddCandidate: (candidate: Partial<Candidate>, syId: string) => Promise<void>;
  onUpdateCandidate: (id: string, candidate: Partial<Candidate>) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
  schoolYears: SchoolYear[];
  electionConfig: ElectionConfig;
}

const CandidatesTab: React.FC<CandidatesTabProps> = ({ 
  candidates = [], 
  turnoutByPosition = {},
  onAddCandidate, 
  onUpdateCandidate, 
  onDeleteCandidate, 
  showAlert, 
  schoolYears = [],
  electionConfig
}) => {
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeSyLabel = schoolYears.find(sy => sy.isActive || sy.is_active)?.label || '----';

  // Filter candidates based on search term
  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidates;
    const term = searchTerm.toLowerCase().trim();
    return candidates.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.party.toLowerCase().includes(term) ||
      c.position.toLowerCase().includes(term)
    );
  }, [candidates, searchTerm]);

  // Duplicate Detection Engine: Registry Audit
  const duplicates = useMemo(() => {
    const nameMap = new Map<string, string[]>();
    candidates.forEach(c => {
      const normalizedName = c.name.toUpperCase().trim();
      if (!nameMap.has(normalizedName)) nameMap.set(normalizedName, []);
      nameMap.get(normalizedName)!.push(c.id);
    });
    
    const dupeIds = new Set<string>();
    nameMap.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach(id => dupeIds.add(id));
      }
    });
    return dupeIds;
  }, [candidates]);

  const handleOpenEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidate = async (data: any) => {
    try {
      setIsProcessing(true);
      if (editingCandidate) {
        await onUpdateCandidate(editingCandidate.id, data);
        showAlert("Update Successful", `${data.name}'s profile has been updated.`, "success");
      } else {
        await onAddCandidate(data, data.schoolYearId);
        showAlert("Registration Successful", `${data.name} is now an official candidate for ${data.position}.`, "success");
      }
      setIsCandidateModalOpen(false);
      setEditingCandidate(null);
    } catch (err) {
      showAlert("Database Error", "We could not save the candidate. Please check your connection.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCandidate = (id: string, name: string) => {
    showAlert(
      "Confirm Removal", 
      `Are you sure you want to remove ${name}? This action is permanent and clears all votes for this candidate.`, 
      "confirm",
      async () => {
        try {
          setIsProcessing(true);
          await onDeleteCandidate(id);
          showAlert("Candidate Removed", "Database updated successfully.", "info");
        } catch (err) {
          showAlert("Deletion Failed", "Could not remove the candidate.", "error");
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  const handlePrintSlip = (candidate: Candidate) => {
    handlePrintEncodingSlip(candidate, activeSyLabel);
  };

  const handlePrintList = () => {
    handleCandidatesPrint(candidates, electionConfig, activeSyLabel);
  };

  return (
    <div className="bg-white rounded-[12px] shadow-sm border border-[rgba(18,35,61,0.08)] overflow-hidden no-print">
      <div className="grid grid-cols-3" aria-hidden="true">
        <span className="h-[4px] bg-[#0038a8]" />
        <span className="h-[4px] bg-[#fcd116]" />
        <span className="h-[4px] bg-[#ce1126]" />
      </div>
      <ManagePartylistsModal 
        isOpen={isPartyModalOpen} 
        onClose={() => setIsPartyModalOpen(false)} 
        schoolYearId={schoolYears.find(sy => sy.isActive || sy.is_active)?.id || ''}
        showAlert={showAlert}
      />
      
      <RegisterCandidateModal 
        isOpen={isCandidateModalOpen} 
        onClose={() => {
          setIsCandidateModalOpen(false);
          setEditingCandidate(null);
        }} 
        onSave={handleSaveCandidate} 
        schoolYears={schoolYears}
        initialData={editingCandidate || undefined}
      />

      {/* Admin Header */}
      <div className="p-6 border-b border-[rgba(18,35,61,0.08)] flex flex-col md:flex-row justify-between items-center bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] gap-4">
        <div className="flex flex-col">
          <h3 className="text-[24px] font-bold text-[#0038a8] tracking-tight flex items-center">
            <i className="fa-solid fa-id-card-clip mr-3 text-[#0038a8]"></i>
            Official Candidate Registry
          </h3>
          <div className="flex items-center mt-1 space-x-3">
             <span className="text-[13px] text-[#68758d] font-bold">
               {(candidates || []).length} Registered Candidates
             </span>
             {duplicates.size > 0 && (
               <span className="text-[13px] text-[#ce1126] font-bold flex items-center">
                 <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                 {duplicates.size} Registry Duplicates Found
               </span>
             )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          <button 
            onClick={handlePrintList}
            disabled={candidates.length === 0}
            className="bg-white text-[#0038a8] px-4 py-2 rounded-[4px] font-bold text-[13px] uppercase tracking-[0.06em] hover:bg-[#f4f8ff] transition-colors border border-[rgba(18,35,61,0.12)] flex items-center justify-center disabled:opacity-50"
          >
            <i className="fa-solid fa-print mr-2"></i>
            Candidates List
          </button>

          <button 
            onClick={() => setIsPartyModalOpen(true)}
            disabled={isProcessing}
            className="bg-white text-[#0038a8] px-4 py-2 rounded-[4px] font-bold text-[13px] uppercase tracking-[0.06em] hover:bg-[#f4f8ff] transition-colors border border-[rgba(18,35,61,0.12)] flex items-center justify-center disabled:opacity-50"
          >
            <i className="fa-solid fa-flag mr-2"></i>
            Partylists
          </button>
          
          <button 
            onClick={() => {
              setEditingCandidate(null);
              setIsCandidateModalOpen(true);
            }}
            disabled={isProcessing}
            className="bg-[#0038a8] text-white px-4 py-2 rounded-[4px] font-bold text-[13px] uppercase tracking-[0.06em] hover:bg-[#002f8a] transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <i className="fa-solid fa-user-plus mr-2"></i>
            New Candidate
          </button>
        </div>
      </div>

      {/* Search Bar Section */}
      <div className="px-6 py-5 bg-[#f8fbff] border-b border-[rgba(18,35,61,0.08)]">
        <label className="floating-field w-full">
          <div className="floating-field__control">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder=" "
            />
            <span>Search candidate by name, party, or position</span>
          </div>
        </label>
      </div>

      {/* Candidate List grouped by Position */}
      <div className="p-6 space-y-10 bg-[#f8fbff]">
        {(POSITIONS || []).map(pos => {
          const positionCandidates = (filteredCandidates || []).filter(c => c.position === pos);
          if (positionCandidates.length === 0) return null;

          const posTotalBallots = turnoutByPosition[pos] || 0;

          return (
            <section key={pos} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center space-x-4">
                <div className="h-px flex-grow bg-gray-200"></div>
                <div className="flex flex-col items-center">
                  <h4 className="text-[13px] font-bold text-[#0038a8] uppercase tracking-[0.08em] bg-white px-4 py-2 rounded-[12px] border border-[rgba(18,35,61,0.08)]">
                    {pos}
                  </h4>
                  <span className="text-[13px] font-bold text-[#68758d] uppercase tracking-[0.06em] mt-1">
                    Audit Tally: {posTotalBallots} Ballots Verified
                  </span>
                </div>
                <div className="h-px flex-grow bg-gray-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positionCandidates.map(c => {
                  const isDupe = duplicates.has(c.id);
                  const votePercentage = posTotalBallots > 0 ? ((c.votes || 0) / posTotalBallots) * 100 : 0;

                  return (
                    <div key={c.id} className={`bg-white rounded-[12px] p-5 shadow-sm border transition-colors group relative flex flex-col ${isDupe ? 'border-[#ce1126]/20 bg-[#fff9fa]' : 'border-[rgba(18,35,61,0.08)] hover:border-[#0038a8]/20'}`}>
                      {isDupe && (
                        <div className="absolute top-4 right-4 z-10 flex items-center bg-[#fff1f2] text-[#ce1126] px-3 py-1.5 rounded-[12px] border border-[#ce1126]/20">
                          <i className="fa-solid fa-copy mr-2"></i>
                          <span className="text-[13px] font-bold uppercase tracking-[0.06em]">Duplicate</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative flex-shrink-0">
                          <img 
                            src={c.imageUrl ? optimizeImageUrl(c.imageUrl, 200) : LEON_NHS_LOGO_URL} 
                            className={`w-20 h-20 rounded-2xl object-cover border shadow-sm group-hover:scale-105 transition-transform bg-gray-50 ${isDupe ? 'border-red-200' : 'border-[rgba(18,35,61,0.08)]'}`} 
                            alt={c.name} 
                            onError={(e) => { (e.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
                          />
                          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl shadow-sm border flex items-center justify-center ${isDupe ? 'bg-red-500 text-white border-red-400' : 'bg-white text-[#034F8B] border-gray-50'}`}>
                            <span className="text-xs font-black">{c.votes || 0}</span>
                          </div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h5 className={`font-bold text-[24px] leading-tight truncate ${isDupe ? 'text-red-700' : 'text-[#12233d]'}`}>{c.name}</h5>
                          <p className={`text-[16px] font-medium mt-1 ${c.party === 'Independent' ? 'text-[#68758d]' : 'text-[#ce1126]'}`}>
                            {c.party}
                          </p>
                          <div className="mt-1">
                            <CandidateRemarks candidate={c} />
                          </div>
                        </div>
                      </div>

                      {/* Vote Tally Audit Visualization */}
                      <div className="mb-4 space-y-1.5">
                        <div className="flex justify-between items-center text-[13px] font-bold text-[#94a3b8] px-1">
                          <span>Vote Distribution</span>
                          <span className="text-[#034F8B]">{votePercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                          <div 
                            className="h-full transition-all duration-1000 rounded-full"
                            style={{ 
                              width: `${votePercentage}%`,
                              backgroundColor: DEPED_COLORS.blue 
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className={`rounded-[12px] p-4 mb-6 flex-grow overflow-hidden ${isDupe ? 'bg-red-50/50 border border-red-100' : 'bg-[#f8fafc] border border-[rgba(18,35,61,0.06)]'}`}>
                        <p className={`text-[16px] font-medium leading-relaxed line-clamp-2 italic ${isDupe ? 'text-red-900/60' : 'text-[#64748b]'}`}>
                          "{c.vision || 'No platform statement provided.'}"
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handlePrintSlip(c)}
                          title="Print Encoding Slip"
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] border font-bold text-[13px] transition-colors active:scale-95 ${isDupe ? 'border-[#ce1126]/20 bg-[#fff1f2] text-[#ce1126] hover:bg-[#ce1126] hover:text-white' : 'border-[#fcd116]/60 bg-[#fff8db] text-[#8a6a00] hover:bg-[#fcd116] hover:text-[#12233d]'}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">print</span>
                        </button>
                        <button 
                          onClick={() => handleOpenEditCandidate(c)}
                          disabled={isProcessing}
                          className={`inline-flex h-10 flex-1 items-center justify-center rounded-[12px] border font-bold text-[14px] transition-colors disabled:opacity-30 ${isDupe ? 'border-[#ce1126]/20 bg-[#fff1f2] text-[#ce1126] hover:bg-[#ce1126] hover:text-white' : 'border-[rgba(0,56,168,0.2)] bg-[#eef4ff] text-[#0038a8] hover:bg-[#0038a8] hover:text-white'}`}
                        >
                          <span className="material-symbols-outlined mr-2" style={{ fontSize: '18px' }} aria-hidden="true">edit</span>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteCandidate(c.id, c.name)}
                          disabled={isProcessing}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#ce1126]/20 bg-[#fff1f2] text-[#ce1126] font-bold text-[13px] hover:bg-[#ce1126] hover:text-white transition-colors disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filteredCandidates.length === 0 && candidates.length > 0 && (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <i className="fa-solid fa-magnifying-glass text-5xl text-gray-100 mb-6"></i>
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">No candidates match your search "{searchTerm}"</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-4 text-[#034F8B] font-black text-[10px] uppercase underline underline-offset-4"
            >
              Clear Search
            </button>
          </div>
        )}

        {(candidates || []).length === 0 && (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <i className="fa-solid fa-users-slash text-6xl text-gray-100 mb-6"></i>
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">No official candidates registered yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatesTab;
