
import React, { useState } from 'react';
import VoterChecker from './VoterChecker';
import MasterlistGenerator from './MasterlistGenerator';
import SectionListExporter from './SectionListExporter';
import VoterAccessControl from './VoterAccessControl';
import SchoolProfileConfig from './SchoolProfileConfig';
import ManualTallyModal from './ManualTallyModal';
import GenderTurnoutAudit from './GenderTurnoutAudit';
import PaperTarpModal from './PaperTarpModal';
import GradeResultsModal from './GradeResultsModal';
import { Student, User, Section, ElectionConfig, SchoolYear, Candidate, ElectionStatus } from '../../../types';
import { handleResultsPrint } from './resultsExportHandler';
import { handleParticipationPrint } from './participationExportHandler';
import { handleNonVotersPrint } from './nonVotersExportHandler';
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../../../constants';

interface SettingsTabProps {
  candidates: Candidate[];
  onReset: () => void;
  onLogout: () => void;
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
  electionConfig: ElectionConfig;
  setElectionConfig: (config: ElectionConfig) => void;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
  schoolYears: SchoolYear[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
  candidates,
  onReset, 
  onLogout, 
  learnerDatabase, 
  voters, 
  sections, 
  electionConfig,
  setElectionConfig,
  showAlert,
  schoolYears
}) => {
  const activeSyLabel = schoolYears.find(sy => sy.isActive || sy.is_active)?.label || '----';
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isTarpModalOpen, setIsTarpModalOpen] = useState(false);
  const [isGradeResultsOpen, setIsGradeResultsOpen] = useState(false);

  const handleTogglePublicResults = () => {
    const nextState = !electionConfig.publicResultsEnabled;
    setElectionConfig({ ...electionConfig, publicResultsEnabled: nextState });
    showAlert(
      nextState ? "Public Results Enabled" : "Public Results Disabled",
      `The live results page is now ${nextState ? 'accessible' : 'hidden'} to the general public.`,
      nextState ? "success" : "info"
    );
  };

  const handleCopyLink = (type: 'results' | 'turnout') => {
    const route = type === 'results' ? 'public-results' : 'public-turnout';
    const publicUrl = `${window.location.origin}${window.location.pathname}#/${route}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      showAlert("Link Copied", `The ${type} URL has been copied to your clipboard.`, "success");
    });
  };

  const handleFinalizeAndPrint = (verifiedCandidates: Candidate[]) => {
    handleResultsPrint(verifiedCandidates, electionConfig, activeSyLabel);
    setIsManualModalOpen(false);
  };

  const handleExportParticipation = () => {
    handleParticipationPrint(learnerDatabase, voters, sections, electionConfig, activeSyLabel);
  };

  const handleExportNonVoters = () => {
    handleNonVotersPrint(learnerDatabase, voters, sections, electionConfig, activeSyLabel);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <ManualTallyModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        candidates={candidates}
        onPrint={handleFinalizeAndPrint}
      />

      <PaperTarpModal 
        isOpen={isTarpModalOpen}
        onClose={() => setIsTarpModalOpen(false)}
        candidates={candidates}
        voters={voters}
        learnerDatabase={learnerDatabase}
        sections={sections}
        schoolYear={activeSyLabel}
        schoolName={electionConfig.schoolName || 'Leon National High School'}
      />

      <GradeResultsModal 
        isOpen={isGradeResultsOpen}
        onClose={() => setIsGradeResultsOpen(false)}
        learnerDatabase={learnerDatabase}
        sections={sections}
        candidates={candidates}
        electionConfig={electionConfig}
        schoolYear={activeSyLabel}
      />

      {/* Branding Header within Tab */}
      <div className="bg-[#034F8B] p-10 rounded-[2.5rem] shadow-xl border-b-4 border-[#fcd116]/20 flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div className="flex items-center space-x-6">
          <img src={DEPED_SEAL_URL} className="h-16 w-auto" alt="DepEd Seal" />
          <div className="w-px h-12 bg-white/20"></div>
          <img src={LEON_NHS_LOGO_URL} className="h-16 w-auto" alt="School Logo" />
          <div className="text-left">
            <h2 className="text-white font-black text-2xl uppercase tracking-tight">System Settings</h2>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Election Configuration Module</p>
          </div>
        </div>
      </div>

      {/* Public Accessibility Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        {/* Results Visibility */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${electionConfig.publicResultsEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <i className={`fa-solid ${electionConfig.publicResultsEnabled ? 'fa-square-poll-vertical' : 'fa-eye-slash'} text-lg`}></i>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase">Live Tally Access</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Broadcast candidate performance</p>
              </div>
            </div>
            <button 
              onClick={handleTogglePublicResults}
              className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${electionConfig.publicResultsEnabled ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}
            >
              {electionConfig.publicResultsEnabled ? 'PUBLISHED' : 'HIDDEN'}
            </button>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}${window.location.pathname}#/public-results`}
              className="flex-grow bg-transparent text-[8px] font-mono font-bold text-gray-400 outline-none"
            />
            <button onClick={() => handleCopyLink('results')} className="text-blue-500 hover:text-blue-700 p-2"><i className="fa-solid fa-copy"></i></button>
          </div>
        </div>

        {/* Turnout Visibility - ALWAYS ONLINE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                <i className="fa-solid fa-chart-area text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase">Participation Dashboard</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Public engagement statistics</p>
              </div>
            </div>
            <span className="px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest bg-blue-600 text-white shadow-lg">
              ALWAYS ONLINE
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}${window.location.pathname}#/public-turnout`}
              className="flex-grow bg-transparent text-[8px] font-mono font-bold text-gray-400 outline-none"
            />
            <button onClick={() => handleCopyLink('turnout')} className="text-blue-500 hover:text-blue-700 p-2"><i className="fa-solid fa-copy"></i></button>
          </div>
          <p className="text-[8px] font-bold text-gray-400 mt-3 uppercase italic">
            <i className="fa-solid fa-circle-info mr-1 text-blue-400"></i>
            Aggregated stats are shared automatically to promote transparency.
          </p>
        </div>
      </div>

      {/* School Profile Branding */}
      <SchoolProfileConfig 
        config={electionConfig} 
        onUpdate={setElectionConfig} 
        schoolYears={schoolYears}
      />

      {/* Voter Access & Scheduling */}
      <VoterAccessControl 
        config={electionConfig} 
        onUpdate={setElectionConfig} 
      />

      {/* Searchable Records Checker Section */}
      <VoterChecker 
        learnerDatabase={learnerDatabase} 
        voters={voters} 
        sections={sections} 
      />

      {/* Masterlist Generation Section */}
      <MasterlistGenerator 
        learnerDatabase={learnerDatabase} 
        sections={sections} 
        schoolName={electionConfig.schoolName || 'Leon National High School'}
      />

      {/* Section Directory Exporter */}
      <SectionListExporter 
        sections={sections} 
        schoolYear={activeSyLabel} 
      />

      {/* Advance Election Controls */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 no-print">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-gray-900 uppercase flex items-center">
            <i className="fa-solid fa-sliders mr-3 text-[#034F8B]"></i>
            Advanced Election Controls
          </h3>
          <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center space-x-2 border border-blue-100">
            <i className="fa-solid fa-shield-check text-[#034F8B] text-xs"></i>
            <span className="text-[10px] font-black text-[#034F8B] uppercase">Authorized Access Only</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group shadow-sm"
          >
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
              <i className="fa-solid fa-file-export"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Results Tally</span>
            <span className="text-xs font-bold text-gray-900 text-center">Verify & Print Official Tally</span>
          </button>

          <button 
            onClick={() => setIsGradeResultsOpen(true)}
            className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group shadow-sm"
          >
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Grade Tally</span>
            <span className="text-xs font-bold text-gray-900 text-center">Export Grade Results (PDF)</span>
          </button>

          <button 
            onClick={handleExportParticipation}
            className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group shadow-sm"
          >
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Participation Audit</span>
            <span className="text-xs font-bold text-gray-900 text-center">Voter Turnout Analysis (PDF)</span>
          </button>

          <GenderTurnoutAudit 
            learnerDatabase={learnerDatabase}
            voters={voters}
            sections={sections}
            schoolYear={activeSyLabel}
            schoolName={electionConfig.schoolName || 'Leon National High School'}
          />
          
          <button 
            onClick={handleExportNonVoters}
            className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-red-600 transition-all group shadow-sm"
          >
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors text-red-600">
              <i className="fa-solid fa-user-xmark"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Non-Voters List</span>
            <span className="text-xs font-bold text-gray-900 text-center">Official Record of Non-Participation</span>
          </button>

          <button 
            onClick={() => setIsTarpModalOpen(true)}
            className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group shadow-sm"
          >
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
              <i className="fa-solid fa-file-image"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Report Image</span>
            <span className="text-xs font-bold text-gray-900 text-center">High-Res PNG Infographic Exporter</span>
          </button>
        </div>
      </div>

      {/* Security Protocol */}
      <div className="bg-red-50 p-10 rounded-[2.5rem] border border-red-100 no-print">
        <div className="flex items-start space-x-4 mb-8">
          <div className="bg-red-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/20">
            <i className="fa-solid fa-triangle-exclamation text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-red-800 uppercase leading-none">Emergency Protocol</h3>
            <p className="text-red-600 text-xs font-bold mt-2 uppercase tracking-tighter italic">Warning: Data wipes are permanent.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onReset}
            className="flex-1 bg-red-600 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase hover:bg-red-700 transition-all shadow-xl shadow-red-900/10 flex items-center justify-center"
          >
            <i className="fa-solid fa-skull-crossbones mr-3"></i>
            Clear Election Records
          </button>
        </div>
      </div>
      
      <div className="flex justify-center pt-8 no-print">
         <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-gray-900 transition-colors font-black uppercase text-[10px] tracking-[0.2em] flex items-center"
          >
            <i className="fa-solid fa-door-open mr-2"></i>
            Deauthorize Administrator Access
          </button>
      </div>
    </div>
  );
};

export default SettingsTab;
