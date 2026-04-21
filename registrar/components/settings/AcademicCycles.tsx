
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { SchoolYear } from '../../types';
import ConfirmationModal from '../ConfirmationModal';

const AcademicCycles: React.FC = () => {
  const { schoolYears, addSchoolYear, removeSchoolYear, setActiveSchoolYear, lockSchoolYear, loading, sections } = useStore();
  
  // Logic to determine the next suggested year
  const latestStartYear = useMemo(() => {
    if (schoolYears.length === 0) return new Date().getFullYear();
    const years = schoolYears.map(sy => {
      const match = sy.label.match(/^(\d{4})/);
      return match ? parseInt(match[1]) : 0;
    });
    return Math.max(...years);
  }, [schoolYears]);

  const [selectedStartYear, setSelectedStartYear] = useState<number>(latestStartYear + 1);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [pendingSYDelete, setPendingSYDelete] = useState<SchoolYear | null>(null);
  const [pendingSYActive, setPendingSYActive] = useState<SchoolYear | null>(null);
  const [pendingSYLock, setPendingSYLock] = useState<SchoolYear | null>(null);

  // Update default when schoolYears change (e.g., after a refresh or add)
  useEffect(() => {
    setSelectedStartYear(latestStartYear + 1);
  }, [latestStartYear]);

  const generatedLabel = useMemo(() => {
    return `${selectedStartYear}-${selectedStartYear + 1}`;
  }, [selectedStartYear]);

  const isDuplicate = useMemo(() => {
    return schoolYears.some(sy => sy.label === generatedLabel);
  }, [generatedLabel, schoolYears]);

  const handleAddSY = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate || loading) return;
    
    setErrorFeedback(null);
    const result = await addSchoolYear(generatedLabel);
    if (result?.error) {
      setErrorFeedback(`Sync Warning: ${result.error}`);
    } else {
      setErrorFeedback(null);
    }
  };

  const getSectionsInSY = (syId: string) => sections.filter(s => s.schoolYearId === syId).length;

  // Generate a range of years for the dropdown (Current - 2 to Current + 10)
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const options = [];
    for (let i = current - 2; i <= current + 10; i++) {
      options.push(i);
    }
    return options;
  }, []);

  return (
    <section>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h4 className="text-sm font-black text-primary uppercase tracking-widest">Academic Cycles (School Years)</h4>
          <p className="text-[10px] font-bold text-outline uppercase mt-1">Manage institutional yearly registry</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <form onSubmit={handleAddSY} className="flex items-center gap-3 bg-white p-2 rounded-3xl border border-surfaceVariant shadow-sm">
            <div className="flex flex-col px-4">
              <span className="text-[8px] font-black text-outline uppercase tracking-tighter">Start Year</span>
              <select 
                value={selectedStartYear}
                onChange={(e) => setSelectedStartYear(parseInt(e.target.value))}
                disabled={loading}
                className="bg-transparent text-sm font-black text-primary outline-none cursor-pointer"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <div className="h-8 w-px bg-surfaceVariant"></div>
            
            <div className="flex flex-col px-4 min-w-[100px]">
              <span className="text-[8px] font-black text-outline uppercase tracking-tighter">Cycle Label</span>
              <span className="text-sm font-black text-primary">{generatedLabel}</span>
            </div>

            <button 
              type="submit" 
              disabled={loading || isDuplicate} 
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale ${isDuplicate ? 'bg-surface text-outline' : 'bg-primary text-white shadow-primary/20 hover:scale-105'}`}
              title={isDuplicate ? "Cycle already exists" : "Register Cycle"}
            >
              <span className={`material-symbols-outlined font-bold ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'sync' : isDuplicate ? 'block' : 'add'}
              </span>
            </button>
          </form>
          
          <div className="flex justify-between items-center px-4">
            {isDuplicate ? (
              <p className="text-[9px] font-black text-accent uppercase tracking-widest animate-pulse">This cycle is already registered</p>
            ) : (
              <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Select year to establish new cycle</p>
            )}
            {errorFeedback && <p className="text-[9px] font-black text-accent uppercase tracking-widest">{errorFeedback}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {schoolYears.length > 0 ? [...schoolYears].sort((a, b) => b.label.localeCompare(a.label)).map((sy) => (
          <div key={sy.id} className={`p-6 rounded-[32px] border-2 transition-all relative ${sy.isActive ? 'border-primary bg-primary/5 shadow-xl' : sy.isLocked ? 'border-surfaceVariant bg-surface grayscale' : 'border-surfaceVariant bg-white shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sy.isActive ? 'bg-primary text-white' : sy.isLocked ? 'bg-outline text-white' : 'bg-surface text-outline'}`}>
                <span className="material-symbols-outlined font-bold">{sy.isActive ? 'verified' : sy.isLocked ? 'lock' : 'calendar_today'}</span>
              </div>
              <div className="flex gap-1">
                {!sy.isActive && !sy.isLocked && <button onClick={() => setPendingSYActive(sy)} title="Set as Active" className="w-8 h-8 rounded-lg bg-white border border-surfaceVariant flex items-center justify-center text-outline hover:text-primary transition-all shadow-sm"><span className="material-symbols-outlined text-lg">check_circle</span></button>}
                <button onClick={() => setPendingSYLock(sy)} title={sy.isLocked ? "Unlock" : "Lock"} className={`w-8 h-8 rounded-lg bg-white border border-surfaceVariant flex items-center justify-center shadow-sm transition-all ${sy.isLocked ? 'text-amber-600 border-amber-200' : 'text-outline hover:text-amber-600'}`}><span className="material-symbols-outlined text-lg">{sy.isLocked ? 'lock_open' : 'lock'}</span></button>
                {!sy.isActive && <button onClick={() => setPendingSYDelete(sy)} className="w-8 h-8 rounded-lg bg-white border border-surfaceVariant flex items-center justify-center text-outline hover:text-accent transition-all shadow-sm"><span className="material-symbols-outlined text-lg">delete</span></button>}
              </div>
            </div>
            <h5 className="text-lg font-black text-primary uppercase tracking-tight">{sy.label}</h5>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[9px] font-black text-outline uppercase tracking-widest">{getSectionsInSY(sy.id)} Sections Linked</span>
              {sy.isActive ? (
                <span className="text-[8px] font-black bg-primary text-white px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">Active Cycle</span>
              ) : sy.isLocked ? (
                <span className="text-[8px] font-black bg-outline text-white px-3 py-1 rounded-full uppercase tracking-tighter">Archived</span>
              ) : null}
            </div>
          </div>
        )) : <div className="col-span-full py-12 text-center opacity-30 uppercase font-black text-[10px] tracking-widest">No Cycles Registered</div>}
      </div>

      <ConfirmationModal isOpen={!!pendingSYActive} title="Switch Cycle" message={`Set ${pendingSYActive?.label} as active?`} confirmLabel="Switch" onConfirm={async () => { if(pendingSYActive) await setActiveSchoolYear(pendingSYActive.id); setPendingSYActive(null); }} onCancel={() => setPendingSYActive(null)} isLoading={loading} />
      <ConfirmationModal isOpen={!!pendingSYLock} title={pendingSYLock?.isLocked ? "Unlock" : "Archive"} message={`Update SY ${pendingSYLock?.label} lock status?`} type={pendingSYLock?.isLocked ? "primary" : "accent"} confirmLabel="Update" onConfirm={async () => { if(pendingSYLock) await lockSchoolYear(pendingSYLock.id, !pendingSYLock.isLocked); setPendingSYLock(null); }} onCancel={() => setPendingSYLock(null)} isLoading={loading} />
      <ConfirmationModal isOpen={!!pendingSYDelete} title="Deregister Year" message={`Remove ${pendingSYDelete?.label}?`} type="danger" confirmLabel="Delete" onConfirm={async () => { if(pendingSYDelete) { if(getSectionsInSY(pendingSYDelete.id) > 0) alert("Remove sections first."); else await removeSchoolYear(pendingSYDelete.id); } setPendingSYDelete(null); }} onCancel={() => setPendingSYDelete(null)} isLoading={loading} />
    </section>
  );
};

export default AcademicCycles;
