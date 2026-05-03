
import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { GradeLevel, Section, AcademicProgram } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

const SectionManagement: React.FC = () => {
  const { 
    gradeLevels, 
    sections, 
    learners,
    availableStrands, 
    availableSpecialPrograms,
    activeSchoolYear, 
    addSection, 
    updateSection, 
    removeSection, 
    clearSectionLearners,
    loading 
  } = useStore();
  
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevels[0]);
  
  const [newName, setNewName] = useState('');
  const [newAdviser, setNewAdviser] = useState('');
  const [newClassification, setNewClassification] = useState('');

  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editName, setEditName] = useState('');
  const [editAdviser, setEditAdviser] = useState('');
  const [editClassification, setEditClassification] = useState('');

  const [pendingAction, setPendingAction] = useState<{type: 'delete' | 'update' | 'create' | 'clear', data: any} | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  const isLocked = activeSchoolYear.isLocked;

  const currentSections = useMemo(() => 
    sections.filter(s => s.gradeLevel === selectedGrade && s.schoolYearId === activeSchoolYear.id),
    [sections, selectedGrade, activeSchoolYear]
  );

  // Group current sections by Strand/Program
  const sectionsByProgram = useMemo(() => {
    const groups: Record<string, Section[]> = {};
    currentSections.forEach(s => {
      const prog = s.strand || 'General Curriculum';
      if (!groups[prog]) groups[prog] = [];
      groups[prog].push(s);
    });
    
    // Sort sections within each group alphabetically
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return groups;
  }, [currentSections]);

  const totalInYear = currentSections.length;
  
  const isSHS = (grade: GradeLevel) => grade === GradeLevel.GRADE_11 || grade === GradeLevel.GRADE_12;
  const isJHS = (grade: GradeLevel) => [GradeLevel.GRADE_7, GradeLevel.GRADE_8, GradeLevel.GRADE_9, GradeLevel.GRADE_10].includes(grade);

  const handleEditClick = (section: Section) => {
    if (isLocked) return;
    setEditingSection(section);
    setEditName(section.name);
    setEditAdviser(section.adviserName || '');
    setEditClassification(section.strand || '');
  };

  const closeEditModal = () => setEditingSection(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setSystemError("Registry is archived. New sections cannot be established.");
      return;
    }
    if (!newName.trim()) return;
    setPendingAction({ type: 'create', data: { name: newName, adviser: newAdviser, strand: newClassification } });
  };

  const executeCreate = async () => {
    if (pendingAction?.type === 'create') {
      const { name, adviser, strand } = pendingAction.data;
      const res = await addSection(name, selectedGrade, adviser, (isSHS(selectedGrade) || isJHS(selectedGrade)) ? strand : undefined);
      if (res.error) setSystemError(res.error);
      else {
        setNewName(''); setNewAdviser(''); setNewClassification('');
      }
      setPendingAction(null);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editName.trim()) return;
    setPendingAction({ type: 'update', data: { name: editName, adviser: editAdviser, strand: editClassification } });
  };

  const executeUpdate = async () => {
    if (pendingAction?.type === 'update' && editingSection) {
      const { name, adviser, strand } = pendingAction.data;
      const res = await updateSection(editingSection.id, {
        name,
        adviserName: adviser,
        strand: (isSHS(editingSection.gradeLevel) || isJHS(editingSection.gradeLevel)) ? strand : undefined
      });
      if (res.error) setSystemError(res.error);
      else closeEditModal();
      setPendingAction(null);
    }
  };

  const handleDeleteRequest = (section: Section) => {
    if (isLocked) return;
    setPendingAction({ type: 'delete', data: section });
  };

  const handleClearRequest = (section: Section) => {
    if (isLocked) return;
    setPendingAction({ type: 'clear', data: section });
  };

  const executeDelete = async () => {
    if (pendingAction?.type === 'delete') {
      const res = await removeSection(pendingAction.data.id);
      if (res.error) setSystemError(res.error);
      setPendingAction(null);
    }
  };

  const executeClear = async () => {
    if (pendingAction?.type === 'clear') {
      const res = await clearSectionLearners(pendingAction.data.id);
      if (res.error) setSystemError(res.error);
      setPendingAction(null);
    }
  };

  const getLearnerCount = (sectionId: string) => {
    const cleanId = String(sectionId).trim();
    return learners.filter(l => String(l.sectionId).trim() === cleanId).length;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[32px] shadow-m3-2 border border-surfaceVariant">
            <div className="flex justify-between items-center mb-6 px-2">
              <h3 className="text-xs font-black text-outline uppercase tracking-widest">Academic Tiers</h3>
              <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase">
                {totalInYear} {totalInYear > 1 ? 'SECTIONS' : 'SECTION'}
              </span>
            </div>
            <div className="space-y-1">
              {gradeLevels.map(grade => {
                const count = sections.filter(s => s.gradeLevel === grade && s.schoolYearId === activeSchoolYear.id).length;
                return (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${
                      selectedGrade === grade ? 'bg-primary text-white shadow-lg translate-x-1' : 'text-onSurface hover:bg-surface'
                    }`}
                  >
                    <span className="font-bold text-sm">{grade}</span>
                    <span className={`text-[10px] font-black uppercase ${selectedGrade === grade ? 'text-white/60' : 'text-outline'}`}>
                      {count} {count > 1 ? 'SECTIONS' : 'SECTION'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-m3-2 border border-surfaceVariant">
            <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-8">{selectedGrade}</h3>
            
            {!isLocked && (
              <form onSubmit={handleCreateSubmit} className="space-y-4 mb-10 p-6 rounded-3xl border bg-surface/30 border-surfaceVariant/50">
                <h4 className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">Register New Section</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="Section Name" value={newName} onChange={(e) => setNewName(e.target.value)} required className="px-5 py-4 rounded-2xl bg-white border border-surfaceVariant font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                  <input type="text" placeholder="Class Adviser" value={newAdviser} onChange={(e) => setNewAdviser(e.target.value)} className="px-5 py-4 rounded-2xl bg-white border border-surfaceVariant font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                  
                  {(isSHS(selectedGrade) || isJHS(selectedGrade)) && (
                    <div className="sm:col-span-2">
                      <select 
                        value={newClassification} 
                        onChange={(e) => setNewClassification(e.target.value)} 
                        className="w-full px-5 py-4 rounded-2xl bg-white border border-surfaceVariant font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                      >
                        <option value="">{isSHS(selectedGrade) ? 'Select Strand' : 'Select Special Program'}</option>
                        {/* Simplified ternary with explicit typing to resolve "Property 'map' does not exist on type 'unknown'" */}
                        {(isSHS(selectedGrade) ? (availableStrands as AcademicProgram[]) : (availableSpecialPrograms as AcademicProgram[])).map((item) => (
                          <option key={item.id} value={item.acronym}>{item.acronym} - {item.fullName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button disabled={loading} type="submit" className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:scale-105 transition-all">
                    <span className="material-symbols-outlined text-[18px]">add</span> Create Section
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-10">
              {Object.keys(sectionsByProgram).length > 0 ? Object.entries(sectionsByProgram).map(([progName, sectionsInProg]) => (
                <div key={progName} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                     <span className="material-symbols-outlined text-outline text-lg">category</span>
                     <h4 className="text-[11px] font-black text-outline uppercase tracking-widest">{progName}</h4>
                     <div className="flex-1 h-px bg-surfaceVariant opacity-40"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sectionsInProg.map(section => (
                      <div key={section.id} className="p-6 rounded-3xl border bg-surface/50 border-surfaceVariant hover:border-primary/50 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white text-primary shadow-sm flex items-center justify-center font-black">{section.name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <span className="font-black block text-primary truncate text-lg leading-tight">{section.name}</span>
                              <span className="text-[10px] text-outline font-bold block truncate uppercase tracking-widest">{section.adviserName || 'No Adviser'}</span>
                            </div>
                          </div>
                          <div className="mb-2">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest">{getLearnerCount(section.id)} Enrolled Learners</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-surfaceVariant/50">
                          <div className="flex flex-wrap gap-1">
                            {section.strand ? (
                              <span className={`px-3 py-1 text-[8px] font-black rounded-full border uppercase tracking-widest ${
                                isSHS(section.gradeLevel) 
                                  ? 'bg-accent/5 text-accent border-accent/10' 
                                  : 'bg-primary/5 text-primary border-primary/10'
                              }`}>
                                {section.strand}
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-surface text-outline text-[8px] font-black rounded-full border border-surfaceVariant uppercase tracking-widest">
                                General
                              </span>
                            )}
                          </div>
                          {!isLocked && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditClick(section)} title="Edit Section" className="w-8 h-8 rounded-lg bg-white border border-surfaceVariant flex items-center justify-center text-outline hover:text-primary transition-all"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                              <button onClick={() => handleClearRequest(section)} title="Clear Learner List" className="w-8 h-8 rounded-lg bg-white border border-surfaceVariant flex items-center justify-center text-outline hover:text-amber-600 transition-all"><span className="material-symbols-outlined text-[18px]">person_remove</span></button>
                              <button onClick={() => handleDeleteRequest(section)} title="Delete Section" className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-accent transition-all"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-50 uppercase font-black text-[10px] tracking-widest">No sections established</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingSection && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={closeEditModal}></div>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-section-title">
             <div className="modal-dialog__header">
                <div className="modal-dialog__title-group">
                  <div>
                    <h3 id="edit-section-title">Edit Section</h3>
                    <p className="text-[11px] font-bold text-outline uppercase mt-2 tracking-widest">{editingSection.gradeLevel} • {editingSection.name}</p>
                  </div>
                </div>
                <button type="button" onClick={closeEditModal} className="modal-dialog__close" aria-label="Close edit section"><span className="material-symbols-outlined">close</span></button>
             </div>
             
             <form onSubmit={handleUpdateSubmit}>
                <div className="modal-dialog__body form-grid">
                  <div className="floating-field">
                    <label className="floating-field__control">
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder=" " />
                      <span>Section Name</span>
                    </label>
                  </div>
                  
                  {(isSHS(editingSection.gradeLevel) || isJHS(editingSection.gradeLevel)) && (
                    <div className="floating-field">
                      <label className="floating-field__control">
                      <select 
                        value={editClassification} 
                        onChange={(e) => setEditClassification(e.target.value)} 
                        data-has-value={editClassification ? 'true' : 'false'}
                      >
                        <option value="">General</option>
                        {/* Simplified ternary with explicit typing to resolve "Property 'map' does not exist on type 'unknown'" */}
                        {(isSHS(editingSection.gradeLevel) ? (availableStrands as AcademicProgram[]) : (availableSpecialPrograms as AcademicProgram[])).map((item) => (
                          <option key={item.id} value={item.acronym}>{item.acronym} - {item.fullName}</option>
                        ))}
                      </select>
                      <span>Classification</span>
                      </label>
                    </div>
                  )}

                  <div className="floating-field">
                    <label className="floating-field__control">
                      <input type="text" value={editAdviser} onChange={(e) => setEditAdviser(e.target.value)} placeholder=" " />
                      <span>Adviser Name</span>
                    </label>
                  </div>
                </div>

                <div className="modal-dialog__actions">
                  <button type="button" onClick={closeEditModal}>Cancel</button>
                  <button type="submit" className="modal-dialog__blue">Update Record</button>
                </div>
             </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={pendingAction?.type === 'delete'} 
        type="danger" 
        title="Delete Section" 
        message={`This will permanently remove "${pendingAction?.data?.name}". BEWARE: This will also purge ALL ${getLearnerCount(pendingAction?.data?.id || '')} learners associated with this section!`} 
        confirmLabel="Purge Everything" 
        onConfirm={executeDelete} 
        onCancel={() => setPendingAction(null)} 
        isLoading={loading} 
      />

      <ConfirmationModal 
        isOpen={pendingAction?.type === 'clear'} 
        type="accent" 
        title="Clear Learner List" 
        message={`Are you sure you want to remove ALL ${getLearnerCount(pendingAction?.data?.id || '')} learners from section "${pendingAction?.data?.name}"? The section itself will remain in the system.`} 
        confirmLabel="Purge Learners" 
        onConfirm={executeClear} 
        onCancel={() => setPendingAction(null)} 
        isLoading={loading} 
      />
      
      <ConfirmationModal isOpen={pendingAction?.type === 'update'} title="Apply Changes" message="Save modifications?" onConfirm={executeUpdate} onCancel={() => setPendingAction(null)} isLoading={loading} />
      <ConfirmationModal isOpen={pendingAction?.type === 'create'} title="Create Section" message={`Establish "${pendingAction?.data?.name}"?`} onConfirm={executeCreate} onCancel={() => setPendingAction(null)} isLoading={loading} />
      <ConfirmationModal isOpen={!!systemError} type="danger" title="System Exception" message={systemError || ''} confirmLabel="Close" hideCancel={true} onConfirm={() => setSystemError(null)} />
    </div>
  );
};

export default SectionManagement;
