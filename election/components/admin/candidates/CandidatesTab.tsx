
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
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden no-print">
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
      <div className="p-8 border-b-4 border-[#fcd116]/20 flex flex-col md:flex-row justify-between items-center bg-[#034F8B] gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center">
            <i className="fa-solid fa-id-card-clip mr-3 text-[#fcd116]"></i>
            Official Candidate Registry
          </h3>
          <div className="flex items-center mt-1 space-x-3">
             <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded">
               {(candidates || []).length} Registered Candidates
             </span>
             {duplicates.size > 0 && (
               <span className="text-[10px] text-red-400 font-black uppercase flex items-center bg-red-950/20 px-2 py-0.5 rounded border border-red-500/30">
                 <i className="fa-solid fa-triangle-exclamation mr-1.5 animate-pulse"></i>
                 {duplicates.size} Registry Duplicates Found
               </span>
             )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          <button 
            onClick={handlePrintList}
            disabled={candidates.length === 0}
            className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center disabled:opacity-50"
          >
            <i className="fa-solid fa-print mr-2"></i>
            Candidates List
          </button>

          <button 
            onClick={() => setIsPartyModalOpen(true)}
            disabled={isProcessing}
            className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center disabled:opacity-50"
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
            className="bg-[#E11C38] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 flex items-center justify-center border-2 border-white/20 disabled:opacity-50"
          >
            <i className="fa-solid fa-user-plus mr-2"></i>
            New Candidate
          </button>
        </div>
      </div>

      {/* Search Bar Section */}
      <div className="px-8 py-6 bg-gray-50 border-b border-gray-100">
        <div className="relative group max-w-xl">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#034F8B] transition-colors"></i>
          <input 
            type="text"
            placeholder="SEARCH CANDIDATE BY NAME OR PARTY..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-10 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-[#034F8B] outline-none font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500"
            >
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Candidate List grouped by Position */}
      <div className="p-8 space-y-12 bg-gray-50/30">
        {(POSITIONS || []).map(pos => {
          const positionCandidates = (filteredCandidates || []).filter(c => c.position === pos);
          if (positionCandidates.length === 0) return null;

          const posTotalBallots = turnoutByPosition[pos] || 0;

          return (
            <section key={pos} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center space-x-4">
                <div className="h-px flex-grow bg-gray-200"></div>
                <div className="flex flex-col items-center">
                  <h4 className="text-[11px] font-black text-[#034F8B] uppercase tracking-[0.3em] bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                    {pos}
                  </h4>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">
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
                    <div key={c.id} className={`bg-white rounded-[2.5rem] p-6 shadow-sm border transition-all hover:shadow-lg group relative flex flex-col ${isDupe ? 'border-red-200 bg-red-50/10 shadow-red-900/5' : 'border-gray-100 hover:border-blue-100'}`}>
                      {isDupe && (
                        <div className="absolute -top-3 -right-3 z-10 flex items-center bg-red-600 text-white px-3 py-1.5 rounded-xl shadow-xl border-2 border-white animate-bounce">
                          <i className="fa-solid fa-copy mr-2"></i>
                          <span className="text-[9px] font-black uppercase tracking-tighter">Duplicate Record</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative flex-shrink-0">
                          <img 
                            src={c.imageUrl ? optimizeImageUrl(c.imageUrl, 200) : LEON_NHS_LOGO_URL} 
                            className={`w-20 h-20 rounded-2xl object-cover border-2 shadow-md group-hover:scale-105 transition-transform bg-gray-50 ${isDupe ? 'border-red-200' : 'border-gray-50'}`} 
                            alt={c.name} 
                            onError={(e) => { (e.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
                          />
                          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl shadow-sm border flex items-center justify-center ${isDupe ? 'bg-red-500 text-white border-red-400' : 'bg-white text-[#034F8B] border-gray-50'}`}>
                            <span className="text-xs font-black">{c.votes || 0}</span>
                          </div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h5 className={`font-black text-sm uppercase leading-tight truncate ${isDupe ? 'text-red-700' : 'text-gray-900'}`}>{c.name}</h5>
                          <p className={`text-[10px] font-black uppercase mt-1 ${c.party === 'Independent' ? 'text-gray-400' : 'text-[#E11C38]'}`}>
                            {c.party}
                          </p>
                          <div className="mt-1">
                            <CandidateRemarks candidate={c} />
                          </div>
                        </div>
                      </div>

                      {/* Vote Tally Audit Visualization */}
                      <div className="mb-4 space-y-1.5">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-gray-400 px-1">
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

                      <div className={`rounded-xl p-4 mb-6 flex-grow overflow-hidden ${isDupe ? 'bg-red-50/50 border border-red-100' : 'bg-gray-50'}`}>
                        <p className={`text-[10px] font-medium leading-relaxed line-clamp-2 italic ${isDupe ? 'text-red-900/60' : 'text-gray-500'}`}>
                          "{c.vision || 'No platform statement provided.'}"
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handlePrintSlip(c)}
                          title="Print Encoding Slip"
                          className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${isDupe ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-500 hover:text-white'}`}
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                        <button 
                          onClick={() => handleOpenEditCandidate(c)}
                          disabled={isProcessing}
                          className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-30 ${isDupe ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-blue-50 text-[#034F8B] hover:bg-[#034F8B] hover:text-white'}`}
                        >
                          <i className="fa-solid fa-user-pen mr-2"></i>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteCandidate(c.id, c.name)}
                          disabled={isProcessing}
                          className="bg-red-50 text-[#E11C38] px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#E11C38] hover:text-white transition-all disabled:opacity-30"
                        >
                          <i className="fa-solid fa-trash"></i>
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
