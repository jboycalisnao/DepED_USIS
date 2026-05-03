
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseSF1 } from '../services/sf1Service';
import { useStore } from '../store';
import { GradeLevel, Student } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

const BulkImport: React.FC = () => {
  const navigate = useNavigate();
  const { bulkAddLearners, activeSchoolYear, gradeLevels, sections, learners, loading: storeLoading } = useStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(gradeLevels[0] || GradeLevel.GRADE_7);
  const [sectionId, setSectionId] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSections = useMemo(() => {
    return sections
      .filter(s => s.schoolYearId === activeSchoolYear.id && (gradeLevel ? s.gradeLevel === gradeLevel : true))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(s => {
        const count = learners.filter(l => String(l.sectionId).trim() === String(s.id).trim()).length;
        return { ...s, learnerCount: count };
      });
  }, [sections, gradeLevel, activeSchoolYear.id, learners]);

  const selectedSectionName = useMemo(() => {
    return sections.find(s => s.id === sectionId)?.name || '';
  }, [sectionId, sections]);

  /**
   * Automatic Extraction Trigger
   * When both a file and a section are present, initiate the parsing logic.
   */
  useEffect(() => {
    const triggerExtraction = async () => {
      if (file && sectionId && !isParsing && !isSaving) {
        setError(null);
        setIsParsing(true);
        const shsMode = gradeLevel === GradeLevel.GRADE_11 || gradeLevel === GradeLevel.GRADE_12;
        
        try {
          const result = await parseSF1(file, gradeLevel, sectionId, selectedSectionName, activeSchoolYear.label, shsMode);
          if (result.error) {
            setError(result.error);
            setFile(null); // Reset file so user can try again
          } else {
            setPreviewData(result.students);
            setShowPreview(true);
          }
        } catch (err: any) {
          setError("Processing failure: " + err.message);
        } finally {
          setIsParsing(false);
        }
      }
    };

    triggerExtraction();
  }, [file, sectionId]); // Watch both file and sectionId for automatic triggers

  // Enhanced totals to show duplicates
  const totals = useMemo(() => {
    const existingLrns = new Set(learners.map(l => l.lrn));
    let existingCount = 0;
    let newCount = 0;

    previewData.forEach(p => {
      if (existingLrns.has(p.lrn)) existingCount++;
      else newCount++;
    });

    const male = previewData.filter(s => s.gender === 'Male').length;
    const female = previewData.filter(s => s.gender === 'Female').length;
    
    return { male, female, newCount, existingCount, total: previewData.length };
  }, [previewData, learners]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      // If section is not selected, we alert the user
      if (!sectionId) {
        setError("Please designate a target section first so the system can map the records.");
      }
    }
  };

  const handleCommit = async () => {
    if (previewData.length === 0) return;
    
    setIsSaving(true);
    const result = await bulkAddLearners(previewData);
    
    if (result?.error) {
      setError(`Database Error: ${result.error}.`);
      setIsSaving(false);
      setShowFinalConfirm(false);
    } else {
      setIsSaving(false);
      setShowFinalConfirm(false);
      setShowPreview(false);
      setShowSuccessModal(true);
    }
  };

  const resetForNewImport = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
    setShowSuccessModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700 relative">
      {(isSaving || storeLoading) && (
        <div className="fixed inset-0 z-[500] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center px-6">
          <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-8 shadow-2xl"></div>
          <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Syncing Cloud Registry</h3>
          <p className="text-sm font-bold text-outline uppercase mt-2 max-w-xs">Processing {previewData.length} records through the Duplicate Resolution Engine.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-m3-2 border border-surfaceVariant">
            <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-6">Batch Configuration</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-2">Grade Level</label>
                <select 
                  value={gradeLevel}
                  onChange={(e) => {
                    setGradeLevel(e.target.value as GradeLevel);
                    setSectionId(''); 
                  }}
                  className="w-full px-4 py-4 rounded-2xl bg-surface focus:ring-4 focus:ring-primary/10 outline-none border-none font-bold text-sm"
                >
                  {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-2">Class Section</label>
                <select 
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-surface focus:ring-4 focus:ring-primary/10 outline-none border-none font-bold text-sm"
                >
                  <option value="">Select Target Destination</option>
                  {availableSections.map(sec => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.learnerCount} Learners)
                    </option>
                  ))}
                </select>
                {availableSections.length === 0 && (
                  <p className="text-[9px] text-accent font-black mt-1 ml-2 uppercase">No active section found for this level.</p>
                )}
              </div>
            </div>
          </div>
          
          {sectionId && (
            <div className="bg-primary p-6 rounded-[32px] text-white shadow-lg animate-in fade-in duration-500">
               <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined">auto_fix_high</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Auto-Extractor Active</span>
               </div>
               <p className="text-[11px] font-medium opacity-80 leading-relaxed">
                 The system is ready. Upload a spreadsheet below and it will be parsed immediately for section <strong>{selectedSectionName}</strong>.
               </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-12 rounded-[48px] shadow-m3-2 border border-surfaceVariant border-dashed border-4 flex flex-col items-center justify-center text-center space-y-8 min-h-[420px]">
            <div className={`w-28 h-28 bg-surface rounded-[40px] flex items-center justify-center shadow-inner relative group transition-all ${isParsing ? 'scale-110 shadow-primary/20' : 'hover:scale-105'}`}>
              <span className={`material-symbols-outlined text-primary text-5xl ${isParsing ? 'animate-bounce' : ''}`}>
                {isParsing ? 'hourglass_top' : 'upload_file'}
              </span>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">
                {isParsing ? 'Extracting Intelligence...' : 'Bulk School Form 1'}
              </h2>
              <p className="text-outline text-sm max-w-sm font-medium">
                {isParsing 
                  ? 'Mapping column indices and resolving student identities against the master registry...' 
                  : 'Automatic extraction: Records will be processed instantly once both section and file are specified.'}
              </p>
            </div>
            
            {!isParsing && (
              <>
                <input 
                  type="file" 
                  id="sf1-upload" 
                  className="hidden" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
                
                <div className="flex flex-col items-center gap-6">
                  <label 
                    htmlFor="sf1-upload"
                    className={`px-12 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all cursor-pointer shadow-xl border-2 ${!sectionId ? 'bg-surface border-surfaceVariant text-outline opacity-50' : 'bg-white border-primary text-primary hover:bg-primary hover:text-white'}`}
                  >
                    {!sectionId ? 'Designate Section First' : 'Select Spreadsheet'}
                  </label>
                </div>
              </>
            )}

            {error && (
              <div className="mt-6 p-6 bg-red-50 text-red-600 rounded-[28px] text-xs font-bold border border-red-100 flex items-center gap-3 max-w-lg text-left shadow-sm animate-in shake duration-500">
                <span className="material-symbols-outlined text-xl flex-shrink-0">error_outline</span>
                <span>{error}</span>
              </div>
            )}
            
            {isParsing && (
               <div className="w-full max-w-xs space-y-2">
                  <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                     <div className="h-full bg-primary animate-progress-fast"></div>
                  </div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Processing Data Streams</span>
               </div>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="modal-overlay">
          <div 
            className="modal-backdrop" 
            onClick={() => setShowPreview(false)}
          ></div>
          
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="resolution-preview-title">
            <div className="modal-dialog__header">
                <div className="modal-dialog__title-group">
                  <h3 id="resolution-preview-title">Resolution Preview</h3>
                  <div className="flex gap-4 mt-1">
                    <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{totals.newCount} New Profiles</span>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{totals.existingCount} Profile Updates</span>
                  </div>
                </div>
            </div>

            <div className="modal-dialog__body custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0 z-10">
                  <tr>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-outline tracking-widest border-b border-surfaceVariant">LRN</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-outline tracking-widest border-b border-surfaceVariant">Identity</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-outline tracking-widest border-b border-surfaceVariant">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceVariant">
                  {previewData.map((s, idx) => {
                    const isExisting = learners.some(l => l.lrn === s.lrn);
                    return (
                      <tr key={idx} className="hover:bg-primary/5 transition-all">
                        <td className="px-10 py-5 font-mono text-sm font-bold text-primary">{s.lrn}</td>
                        <td className="px-10 py-5">
                          <div className="text-sm font-black text-onSurface uppercase tracking-tight">{s.lastName}, {s.firstName}</div>
                          <div className="text-[10px] font-bold text-outline uppercase">{s.birthDate}</div>
                        </td>
                        <td className="px-10 py-5">
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${isExisting ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            {isExisting ? 'Update Profile' : 'New Entry'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-dialog__actions">
              <button 
                onClick={() => { setShowPreview(false); resetForNewImport(); }}
              >
                Abort & Return
              </button>
              <button 
                onClick={() => setShowFinalConfirm(true)}
                className="modal-dialog__blue"
              >
                <span className="material-symbols-outlined">save</span>
                Commit Batch Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showFinalConfirm}
        title="Execute Batch Operation"
        message={`Confirming the resolution of ${totals.total} records into ${selectedSectionName}. New profiles will be created and existing profiles will be updated with information from the spreadsheet.`}
        onConfirm={handleCommit}
        onCancel={() => setShowFinalConfirm(false)}
        confirmLabel="Finalize & Commit"
        isLoading={isSaving}
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        title="Batch Import Successful"
        message="The learner records have been successfully synchronized with the central database. Would you like to upload another batch for this grade level or proceed to the learner registry?"
        onConfirm={resetForNewImport}
        onCancel={() => navigate('/learners')}
        confirmLabel="Upload More"
        cancelLabel="View Registry"
        type="primary"
      />
    </div>
  );
};

export default BulkImport;
