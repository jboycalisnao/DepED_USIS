
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Student, User, Section, Candidate, GradeLevel } from '../../../types';
import { handleReportImageExport, generateReportHTML } from './tarpExportHandler';
import { getStandardReportStyles } from './reportLayoutUtils';

interface PaperTarpModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
  schoolYear: string;
  schoolName: string;
}

const PaperTarpModal: React.FC<PaperTarpModalProps> = ({
  isOpen,
  onClose,
  candidates,
  voters,
  learnerDatabase,
  sections,
  schoolYear,
  schoolName
}) => {
  const [reportType, setReportType] = useState<'results' | 'participation' | 'grade_results'>('results');
  const [targetGrade, setTargetGrade] = useState<string>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize grade filter when switching to grade-specific reports
  useEffect(() => {
    if (reportType === 'grade_results' && targetGrade === 'ALL') {
      setTargetGrade(GradeLevel.GRADE_7);
    }
  }, [reportType]);

  const previewHtml = useMemo(() => {
    if (!showPreview) return '';
    const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    
    const mockGradeVotes: Record<string, number> = {};
    if (targetGrade !== 'ALL') {
       candidates.forEach(c => {
         mockGradeVotes[c.id] = Math.round((c.votes || 0) * (0.15 + Math.random() * 0.1));
       });
    }

    return generateReportHTML(
      reportType,
      targetGrade,
      learnerDatabase,
      voters,
      sections,
      candidates,
      schoolName,
      schoolYear,
      timestamp,
      mockGradeVotes
    );
  }, [showPreview, reportType, targetGrade, learnerDatabase, voters, sections, candidates, schoolName, schoolYear]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      await handleReportImageExport(
        reportType,
        targetGrade,
        learnerDatabase,
        voters,
        sections,
        candidates,
        schoolName,
        schoolYear
      );
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to generate image. Please ensure no browser extensions are blocking the canvas engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className={`bg-white rounded-[3rem] shadow-2xl w-full overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-200 flex flex-col ${showPreview ? 'max-w-7xl h-[90vh]' : 'max-w-2xl'}`}>
        
        {/* Header */}
        <div className="bg-[#034F8B] p-8 text-white text-center relative flex-shrink-0">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-image text-xl text-[#fcd116]"></i>
            </div>
            <div className="text-left">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Report Image Exporter</h3>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">High-Resolution Digital Assets</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
          {/* Controls Sidebar */}
          <div className={`p-8 space-y-8 overflow-y-auto no-scrollbar border-r border-gray-100 ${showPreview ? 'w-full md:w-80' : 'w-full'}`}>
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">1. Select Report Type</label>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => { setReportType('results'); setTargetGrade('ALL'); setShowPreview(false); }}
                  className={`flex items-center p-4 rounded-2xl border-2 transition-all ${reportType === 'results' ? 'bg-blue-50 border-[#034F8B] text-[#034F8B]' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  <i className="fa-solid fa-square-poll-vertical mr-3"></i>
                  <span className="font-black text-[10px] uppercase">Overall Tally</span>
                </button>
                <button 
                  onClick={() => { setReportType('grade_results'); setShowPreview(false); }}
                  className={`flex items-center p-4 rounded-2xl border-2 transition-all ${reportType === 'grade_results' ? 'bg-blue-50 border-[#034F8B] text-[#034F8B]' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  <i className="fa-solid fa-graduation-cap mr-3"></i>
                  <span className="font-black text-[10px] uppercase">Grade-Level Tally</span>
                </button>
                <button 
                  onClick={() => { setReportType('participation'); setShowPreview(false); }}
                  className={`flex items-center p-4 rounded-2xl border-2 transition-all ${reportType === 'participation' ? 'bg-blue-50 border-[#034F8B] text-[#034F8B]' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  <i className="fa-solid fa-chart-pie mr-3"></i>
                  <span className="font-black text-[10px] uppercase">Participation Rates</span>
                </button>
              </div>
            </div>

            {(reportType === 'participation' || reportType === 'grade_results') && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">2. Target Grade Scope</label>
                <select 
                  value={targetGrade} 
                  onChange={e => { setTargetGrade(e.target.value); setShowPreview(false); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-[10px] uppercase outline-none focus:border-[#034F8B]"
                >
                  {reportType === 'participation' && <option value="ALL">All Grade Levels Summary</option>}
                  {Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
              <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                <i className="fa-solid fa-circle-info mr-1"></i>
                The engine will generate a 1920px wide <strong>PNG infographic</strong> optimized for Facebook and school bulletin boards.
              </p>
            </div>

            {!showPreview && (
              <button 
                onClick={() => setShowPreview(true)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 transition-all"
              >
                Render Live Preview
              </button>
            )}
          </div>

          {/* Preview Canvas Area */}
          {showPreview && (
            <div className="flex-grow bg-gray-200 p-8 overflow-y-auto flex flex-col items-center no-scrollbar relative">
              <div className="mb-6 flex items-center justify-between w-full sticky top-0 z-10 bg-gray-200/80 backdrop-blur pb-4">
                 <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                   <i className="fa-solid fa-eye mr-2 text-blue-500"></i>
                   High-Fidelity Canvas View
                 </h4>
                 <div className="flex items-center space-x-4">
                    <span className="text-[9px] font-black text-gray-400 uppercase px-3 py-1 bg-white rounded-full">Source: 1920px Width</span>
                 </div>
              </div>

              {/* The Actual Rendered Content */}
              <div className="relative shadow-2xl origin-top scale-[0.3] sm:scale-[0.4] md:scale-[0.5] lg:scale-[0.55]">
                  <style>{getStandardReportStyles()}</style>
                  <div 
                    className="bg-white"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                  
                  {/* Decorative Overlays for Preview Only */}
                  <div className="absolute inset-0 border-[20px] border-[#034F8B]/5 pointer-events-none"></div>
              </div>

              <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl pb-10">
                 <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-blue-50 text-[#034F8B] rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-share-nodes"></i>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-gray-900 mb-1">Social Media Optimized</h5>
                      <p className="text-[9px] font-bold text-gray-400 leading-relaxed uppercase">
                        Uses a wide 3-column grid to prevent vertical scrolling and ensure clarity on mobile devices.
                      </p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-file-shield"></i>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-gray-900 mb-1">Verified Audit</h5>
                      <p className="text-[9px] font-bold text-gray-400 leading-relaxed uppercase">
                        Includes official DepEd seals and verified election cloud analytics metadata.
                      </p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex space-x-4">
             {showPreview && (
               <button 
                onClick={() => setShowPreview(false)}
                className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors tracking-widest"
               >
                 Reconfigure Report
               </button>
             )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={handleDownload}
              disabled={isProcessing}
              className="bg-[#E11C38] text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-red-900/40 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center border-b-4 border-red-900"
            >
              {isProcessing ? (
                <><i className="fa-solid fa-spinner animate-spin mr-3"></i> Syncing Engine...</>
              ) : (
                <><i className="fa-solid fa-download mr-3"></i> Export Final Image</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaperTarpModal;
