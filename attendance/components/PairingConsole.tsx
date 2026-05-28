
import React from 'react';
import { Learner } from '../types';

interface PairingConsoleProps {
  activeRfid: string;
  selectedLearner: Learner | null;
  conflictWarning: string | null;
  scanFlash: boolean;
  onSave: () => void;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}

const PairingConsole: React.FC<PairingConsoleProps> = ({
  activeRfid, selectedLearner, conflictWarning, scanFlash, onSave, isAdmin, onToggleAdmin
}) => {
  return (
    <section className="bg-white rounded-md p-8 shadow-sm border border-gray-200 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
        <span className="material-symbols-outlined text-9xl leading-none">link</span>
      </div>

      <h2 className="text-[11px] font-bold text-primary-600 uppercase tracking-widest mb-10 flex items-center gap-3">
        <span className="material-symbols-outlined text-xl leading-none">sync_alt</span>
        Pairing Unit
      </h2>

      <div className="space-y-10">
        <div className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sensor Status</label>
            {activeRfid && (
              <button 
                onClick={onToggleAdmin}
                className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-md border transition-all ${
                  isAdmin 
                  ? 'bg-accent-50 border-accent-600/20 text-accent-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-600/20'
                }`}
              >
                {isAdmin ? '★ Master Key Active' : 'Set as Master Key'}
              </button>
            )}
          </div>
          
          <div 
            className={`p-8 rounded-md border-2 transition-all duration-300 ${scanFlash ? 'scale-[1.02] bg-primary-50' : 'bg-gray-50'} ${
              activeRfid 
              ? (conflictWarning ? 'border-error-600/20 bg-error-50' : 'border-primary-600/20 bg-white shadow-lg shadow-primary-600/5') 
              : 'border-gray-200'
            }`}
          >
            {activeRfid ? (
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-md flex items-center justify-center ${
                  conflictWarning 
                  ? 'bg-error-600 text-white shadow-lg shadow-error-600/20' 
                  : (isAdmin ? 'bg-accent-600 text-white shadow-lg shadow-accent-600/20' : 'bg-primary-600 text-white shadow-lg shadow-primary-600/50')
                }`}>
                  <span className="material-symbols-outlined leading-none">{conflictWarning ? 'error' : (isAdmin ? 'key' : 'nfc')}</span>
                </div>
                <div>
                  <div className={`text-[11px] font-bold tracking-wider uppercase ${conflictWarning ? 'text-error-700' : (isAdmin ? 'text-accent-700' : 'text-primary-700')}`}>
                    {conflictWarning ? 'UID Reserved' : (isAdmin ? 'Master Key' : 'RFID Active')}
                  </div>
                  <code className="text-2xl font-bold text-gray-900 font-mono tracking-tighter">{activeRfid}</code>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-gray-200 text-5xl animate-pulse leading-none">contactless</span>
                <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Tap Tag to Begin</p>
              </div>
            )}
          </div>
          {conflictWarning && (
            <p className="text-[10px] font-bold text-error-600 px-2 flex items-center gap-2 animate-pulse uppercase">
              <span className="material-symbols-outlined text-sm leading-none">priority_high</span>
              {conflictWarning}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Assignment Target</label>
          <div className={`p-8 rounded-md border-2 transition-all duration-300 ${selectedLearner ? 'bg-white border-primary-600/20 shadow-lg shadow-primary-600/5' : 'bg-gray-50 border-gray-200 border-dashed'}`}>
            {selectedLearner ? (
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-primary-600 text-white rounded-md flex items-center justify-center font-bold text-xl shadow-lg shadow-primary-600/20 flex-shrink-0">
                  {selectedLearner.last_name?.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-gray-900 text-lg leading-tight truncate">
                    {selectedLearner.last_name}, {selectedLearner.first_name}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">LRN: {selectedLearner.lrn || 'INTERNAL'}</div>
                    <div className="text-[9px] text-primary-600/60 font-bold uppercase tracking-wider truncate">
                      {selectedLearner.grade_level} • {selectedLearner.section_name}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-gray-200 text-5xl leading-none">person_search</span>
                <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Select Student</p>
              </div>
            )}
          </div>
        </div>

        <button
          disabled={!activeRfid || !selectedLearner || !!conflictWarning}
          onClick={onSave}
          className="w-full bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-md shadow-sm hover:bg-primary-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm"
        >
          <span className="material-symbols-outlined text-xl leading-none">link</span>
          Complete Link
        </button>
      </div>
    </section>
  );
};

export default PairingConsole;

