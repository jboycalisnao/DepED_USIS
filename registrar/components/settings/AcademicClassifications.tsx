
import React, { useState } from 'react';
import { useStore } from '../../store';
import { AcademicProgram } from '../../types';
import ConfirmationModal from '../ConfirmationModal';

const AcademicClassifications: React.FC = () => {
  const { 
    availableStrands, addStrand, updateStrand, removeStrand, 
    availableSpecialPrograms, addSpecialProgram, updateSpecialProgram, removeSpecialProgram, 
    loading 
  } = useStore();
  
  const [isAddingStrand, setIsAddingStrand] = useState(false);
  const [newStrandAcronym, setNewStrandAcronym] = useState('');
  const [newStrandFullName, setNewStrandFullName] = useState('');
  
  const [editingProgram, setEditingProgram] = useState<{ type: 'strand' | 'program', item: AcademicProgram } | null>(null);
  const [editAcronym, setEditAcronym] = useState('');
  const [editFullName, setEditFullName] = useState('');

  const [pendingDelete, setPendingDelete] = useState<{ type: 'strand' | 'program', id: string } | null>(null);
  
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [newProgramAcronym, setNewProgramAcronym] = useState('');
  const [newProgramFullName, setNewProgramFullName] = useState('');

  const handleStrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const acro = newStrandAcronym.trim().toUpperCase();
    const name = newStrandFullName.trim();
    if (!acro || !name || loading) return;
    
    await addStrand(acro, name);
    setNewStrandAcronym('');
    setNewStrandFullName('');
    setIsAddingStrand(false);
  };

  const handleProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const acro = newProgramAcronym.trim().toUpperCase();
    const name = newProgramFullName.trim();
    if (!acro || !name || loading) return;
    
    await addSpecialProgram(acro, name);
    setNewProgramAcronym('');
    setNewProgramFullName('');
    setIsAddingProgram(false);
  };

  const startEdit = (type: 'strand' | 'program', item: AcademicProgram) => {
    setEditingProgram({ type, item });
    setEditAcronym(item.acronym);
    setEditFullName(item.fullName);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram || !editAcronym.trim() || !editFullName.trim() || loading) return;
    
    const acronym = editAcronym.toUpperCase();
    const fullName = editFullName;
    const targetId = editingProgram.item.id;
    const type = editingProgram.type;

    // Snappy modal close
    setEditingProgram(null);
    
    if (type === 'strand') {
      await updateStrand(targetId, { acronym, fullName });
    } else {
      await updateSpecialProgram(targetId, { acronym, fullName });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-sm font-black text-primary uppercase tracking-widest">SHS Strands</h4>
            <p className="text-[9px] font-bold text-outline uppercase mt-1">Available for Grades 11-12</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="material-symbols-outlined text-primary text-sm animate-spin">sync</span>}
            <button 
              onClick={() => setIsAddingStrand(!isAddingStrand)} 
              disabled={loading}
              className={`w-10 h-10 rounded-xl bg-surface border flex items-center justify-center transition-all ${isAddingStrand ? 'bg-accent text-white border-accent' : 'border-surfaceVariant text-primary hover:border-primary'}`}
            >
              <span className="material-symbols-outlined font-bold">{isAddingStrand ? 'close' : 'add'}</span>
            </button>
          </div>
        </div>

        {isAddingStrand && (
          <form onSubmit={handleStrandSubmit} className="mb-8 p-6 bg-surface rounded-3xl border border-surfaceVariant/50 space-y-4 animate-in slide-in-from-top-2">
            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">New Strand Registration</h5>
            <input type="text" placeholder="ACRONYM (e.g., STEM)" value={newStrandAcronym} onChange={(e) => setNewStrandAcronym(e.target.value)} disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-white border border-surfaceVariant font-black text-[11px] uppercase outline-none focus:ring-4 focus:ring-primary/10" />
            <input type="text" placeholder="FULL NAME (e.g., Science and Tech...)" value={newStrandFullName} onChange={(e) => setNewStrandFullName(e.target.value)} disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-white border border-surfaceVariant font-bold text-[11px] outline-none focus:ring-4 focus:ring-primary/10" />
            <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg">
              {loading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined font-bold text-sm">check</span>}
              Register Strand
            </button>
          </form>
        )}

        <div className="space-y-3">
          {availableStrands.map(s => (
            <div key={s.id} className="group flex items-center justify-between p-4 bg-white border border-surfaceVariant rounded-2xl hover:border-primary transition-all">
              <div className="flex flex-col">
                <span className="text-sm font-black text-primary uppercase tracking-tighter">{s.acronym}</span>
                <span className="text-[10px] font-bold text-outline uppercase leading-tight">{s.fullName}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => startEdit('strand', s)} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                <button onClick={() => setPendingDelete({ type: 'strand', id: s.id })} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-accent"><span className="material-symbols-outlined text-[20px]">delete</span></button>
              </div>
            </div>
          ))}
          {availableStrands.length === 0 && <p className="text-[10px] font-black text-outline uppercase tracking-widest text-center py-4 opacity-40">No strands configured</p>}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-sm font-black text-primary uppercase tracking-widest">JHS Special Programs</h4>
            <p className="text-[9px] font-bold text-outline uppercase mt-1">Available for Grades 7-10</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="material-symbols-outlined text-primary text-sm animate-spin">sync</span>}
            <button 
              onClick={() => setIsAddingProgram(!isAddingProgram)} 
              disabled={loading}
              className={`w-10 h-10 rounded-xl bg-surface border flex items-center justify-center transition-all ${isAddingProgram ? 'bg-accent text-white border-accent' : 'border-surfaceVariant text-primary hover:border-primary'}`}
            >
              <span className="material-symbols-outlined font-bold">{isAddingProgram ? 'close' : 'add'}</span>
            </button>
          </div>
        </div>

        {isAddingProgram && (
          <form onSubmit={handleProgramSubmit} className="mb-8 p-6 bg-surface rounded-3xl border border-surfaceVariant/50 space-y-4 animate-in slide-in-from-top-2">
            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">New Program Registration</h5>
            <input type="text" placeholder="ACRONYM (e.g., STE)" value={newProgramAcronym} onChange={(e) => setNewProgramAcronym(e.target.value)} disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-white border border-surfaceVariant font-black text-[11px] uppercase outline-none focus:ring-4 focus:ring-primary/10" />
            <input type="text" placeholder="FULL NAME (e.g., Special Program...)" value={newProgramFullName} onChange={(e) => setNewProgramFullName(e.target.value)} disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-white border border-surfaceVariant font-bold text-[11px] outline-none focus:ring-4 focus:ring-primary/10" />
            <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg">
              {loading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined font-bold text-sm">check</span>}
              Register Program
            </button>
          </form>
        )}

        <div className="space-y-3">
          {availableSpecialPrograms.map(p => (
            <div key={p.id} className="group flex items-center justify-between p-4 bg-white border border-surfaceVariant rounded-2xl hover:border-primary transition-all">
              <div className="flex flex-col">
                <span className="text-sm font-black text-primary uppercase tracking-tighter">{p.acronym}</span>
                <span className="text-[10px] font-bold text-outline uppercase leading-tight">{p.fullName}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => startEdit('program', p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                <button onClick={() => setPendingDelete({ type: 'program', id: p.id })} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-accent"><span className="material-symbols-outlined text-[20px]">delete</span></button>
              </div>
            </div>
          ))}
          {availableSpecialPrograms.length === 0 && <p className="text-[10px] font-black text-outline uppercase tracking-widest text-center py-4 opacity-40">No programs configured</p>}
        </div>
      </section>

      {editingProgram && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-[#004E8C]/30 backdrop-blur-xl" onClick={() => setEditingProgram(null)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[48px] shadow-2xl overflow-hidden border border-surfaceVariant/30 animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg"><span className="material-symbols-outlined text-2xl font-bold">edit_note</span></div>
                <div>
                  <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Edit {editingProgram.type === 'strand' ? 'Strand' : 'Program'}</h3>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Update institutional classification</p>
                </div>
              </div>
              <button onClick={() => setEditingProgram(null)} className="w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center text-outline"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-4">Acronym</label>
                <input type="text" value={editAcronym} onChange={(e) => setEditAcronym(e.target.value)} disabled={loading} className="w-full px-5 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-4">Full Name</label>
                <input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} disabled={loading} className="w-full px-5 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm" />
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setEditingProgram(null)} className="flex-1 py-4 text-outline font-black text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={!!pendingDelete} 
        title={`Remove ${pendingDelete?.type === 'strand' ? 'Strand' : 'Program'}`} 
        message="This will remove the item from the selection registry. Existing section labels will remain unchanged unless updated manually." 
        confirmLabel="Remove" 
        type="danger" 
        onConfirm={async () => { 
          if (pendingDelete) {
            if (pendingDelete.type === 'strand') await removeStrand(pendingDelete.id);
            else await removeSpecialProgram(pendingDelete.id);
          }
          setPendingDelete(null); 
        }} 
        onCancel={() => setPendingDelete(null)} 
        isLoading={loading} 
      />
    </div>
  );
};

export default AcademicClassifications;
