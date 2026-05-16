import React, { useMemo, useState } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useStore } from '../store';
import { AcademicProgram, GradeLevel, Section } from '../types';
import CreateSectionModal from './sections/CreateSectionModal';

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
    loading,
  } = useStore();

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevels[0]);
  const [newName, setNewName] = useState('');
  const [newAdviser, setNewAdviser] = useState('');
  const [newClassification, setNewClassification] = useState('');
  const [sectionSearch, setSectionSearch] = useState('');
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editName, setEditName] = useState('');
  const [editAdviser, setEditAdviser] = useState('');
  const [editClassification, setEditClassification] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'update' | 'create' | 'clear' | 'dedupe'; data: any } | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const isLocked = activeSchoolYear.isLocked;

  const currentSections = useMemo(
    () => sections.filter((s) => s.gradeLevel === selectedGrade && s.schoolYearId === activeSchoolYear.id),
    [sections, selectedGrade, activeSchoolYear],
  );

  const sectionsByProgram = useMemo(() => {
    const groups: Record<string, Section[]> = {};
    currentSections.forEach((s) => {
      const prog = s.strand || 'General Curriculum';
      if (!groups[prog]) groups[prog] = [];
      groups[prog].push(s);
    });

    Object.keys(groups).forEach((key) => groups[key].sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [currentSections]);

  const totalInYear = currentSections.length;
  const normalizedSectionSearch = sectionSearch.trim().toLowerCase();

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
      setSystemError('Registry is archived. New sections cannot be established.');
      return;
    }
    if (!newName.trim()) return;
    setPendingAction({ type: 'create', data: { name: newName, adviser: newAdviser, strand: newClassification } });
  };

  const executeCreate = async () => {
    if (pendingAction?.type !== 'create') return;
    const { name, adviser, strand } = pendingAction.data;
    const res = await addSection(name, selectedGrade, adviser, isSHS(selectedGrade) || isJHS(selectedGrade) ? strand : undefined);
    if (res.error) setSystemError(res.error);
    else {
      setNewName('');
      setNewAdviser('');
      setNewClassification('');
      setCreateModalOpen(false);
    }
    setPendingAction(null);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editName.trim()) return;
    setPendingAction({ type: 'update', data: { name: editName, adviser: editAdviser, strand: editClassification } });
  };

  const executeUpdate = async () => {
    if (pendingAction?.type !== 'update' || !editingSection) return;
    const { name, adviser, strand } = pendingAction.data;
    const res = await updateSection(editingSection.id, {
      name,
      adviserName: adviser,
      strand: isSHS(editingSection.gradeLevel) || isJHS(editingSection.gradeLevel) ? strand : undefined,
    });
    if (res.error) setSystemError(res.error);
    else closeEditModal();
    setPendingAction(null);
  };

  const executeDelete = async () => {
    if (pendingAction?.type !== 'delete') return;
    const res = await removeSection(pendingAction.data.id);
    if (res.error) setSystemError(res.error);
    setPendingAction(null);
  };

  const executeClear = async () => {
    if (pendingAction?.type !== 'clear') return;
    const res = await clearSectionLearners(pendingAction.data.id);
    if (res.error) setSystemError(res.error);
    setPendingAction(null);
  };

  const executeDedupe = async () => {
    if (pendingAction?.type !== 'dedupe') return;
    const targets: Section[] = Array.isArray(pendingAction.data?.sections) ? pendingAction.data.sections : [];
    for (const section of targets) {
      const res = await removeSection(section.id);
      if (res.error) {
        setSystemError(res.error);
        break;
      }
    }
    setPendingAction(null);
  };

  const getLearnerCount = (sectionId: string) => {
    const cleanId = String(sectionId).trim();
    return learners.filter((l) => String(l.sectionId).trim() === cleanId).length;
  };

  const createClassificationOptions = (grade: GradeLevel) =>
    (isSHS(grade) ? (availableStrands as AcademicProgram[]) : (availableSpecialPrograms as AcademicProgram[])).map((item) => ({
      value: item.acronym,
      label: `${item.acronym} - ${item.fullName}`,
    }));

  const filteredSectionsByProgram = useMemo(() => {
    if (!normalizedSectionSearch) return sectionsByProgram;

    const groups: Record<string, Section[]> = {};
    Object.entries(sectionsByProgram).forEach(([programName, sectionList]) => {
      const filtered = sectionList.filter((section) => {
        const searchable = [section.name, section.adviserName || '', section.strand || 'General', section.gradeLevel, programName]
          .join(' ')
          .toLowerCase();
        return searchable.includes(normalizedSectionSearch);
      });

      if (filtered.length > 0) groups[programName] = filtered;
    });

    return groups;
  }, [normalizedSectionSearch, sectionsByProgram]);

  const duplicateZeroLearnerSections = useMemo(() => {
    const groups = new Map<string, Section[]>();
    currentSections.forEach((section) => {
      const key = String(section.name || '').trim().toLowerCase();
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(section);
    });

    const removable: Section[] = [];
    groups.forEach((group) => {
      if (group.length <= 1) return;
      const withCount = group.map((section) => ({ section, count: getLearnerCount(section.id) }));
      const zeroLearner = withCount.filter((entry) => entry.count === 0);
      if (zeroLearner.length === 0) return;

      // Keep at least one record when all duplicates are empty.
      if (zeroLearner.length === group.length) {
        zeroLearner.slice(1).forEach((entry) => removable.push(entry.section));
      } else {
        zeroLearner.forEach((entry) => removable.push(entry.section));
      }
    });

    return removable;
  }, [currentSections, learners]);

  return (
    <div className="registrar-sections-page">
      <div className="registrar-sections-page__layout">
        <aside className="registrar-sections-page__sidebar">
          <section className="registrar-sections-page__panel">
            <header className="registrar-sections-page__panel-head">
              <h3>Academic Tiers</h3>
              <span>{totalInYear} {totalInYear > 1 ? 'SECTIONS' : 'SECTION'}</span>
            </header>
            <div className="registrar-sections-page__grade-list">
              {gradeLevels.map((grade) => {
                const count = sections.filter((s) => s.gradeLevel === grade && s.schoolYearId === activeSchoolYear.id).length;
                const active = selectedGrade === grade;
                return (
                  <button key={grade} onClick={() => setSelectedGrade(grade)} className={`registrar-sections-page__grade-btn ${active ? 'is-active' : ''}`}>
                    <span>{grade}</span>
                    <span>{count} {count > 1 ? 'SECTIONS' : 'SECTION'}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <main className="registrar-sections-page__main">
          <section className="registrar-sections-page__panel">
            <div className="registrar-sections-page__main-head">
              <h3 className="registrar-sections-page__title">{selectedGrade}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!isLocked && duplicateZeroLearnerSections.length > 0 && (
                  <button
                    disabled={loading}
                    type="button"
                    className="secondary-button"
                    onClick={() => setPendingAction({ type: 'dedupe', data: { sections: duplicateZeroLearnerSections } })}
                    title="Delete duplicate section names with 0 learners"
                  >
                    <span className="material-symbols-outlined">cleaning_services</span>
                    Delete Duplicate Section List ({duplicateZeroLearnerSections.length})
                  </button>
                )}
                {!isLocked && (
                  <button
                    disabled={loading}
                    type="button"
                    className="primary-button"
                    onClick={() => setCreateModalOpen(true)}
                  >
                    <span className="material-symbols-outlined">add</span>
                    Add Section
                  </button>
                )}
              </div>
            </div>

            <div className="registrar-sections-page__content">
              <div className="floating-field registrar-floating-search">
                <label className="floating-field__control">
                  <input type="text" value={sectionSearch} onChange={(e) => setSectionSearch(e.target.value)} placeholder=" " />
                  <span>Search Sections</span>
                  {sectionSearch.trim() && (
                    <button
                      type="button"
                      className="registrar-floating-search__clear"
                      onClick={() => setSectionSearch('')}
                      aria-label="Clear section search"
                      title="Clear"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                  )}
                </label>
              </div>

              {Object.keys(filteredSectionsByProgram).length > 0 ? (
                (Object.entries(filteredSectionsByProgram) as [string, Section[]][]).map(([progName, sectionsInProg]) => (
                  <section key={progName} className="registrar-sections-page__group">
                    <header className="registrar-sections-page__group-head">
                      <span className="material-symbols-outlined">category</span>
                      <h4>{progName}</h4>
                    </header>

                    <div className="registrar-sections-page__cards">
                      {sectionsInProg.map((section) => (
                        <article key={section.id} className="registrar-sections-page__card">
                          <div>
                            <div className="registrar-sections-page__card-top">
                              <div className="registrar-sections-page__card-avatar">{section.name[0]}</div>
                              <div>
                                <strong>{section.name}</strong>
                                <span>{section.adviserName || 'No Adviser'}</span>
                              </div>
                            </div>
                            <p>{getLearnerCount(section.id)} Enrolled Learners</p>
                          </div>

                          <div className="registrar-sections-page__card-foot">
                            <span className="registrar-sections-page__chip">{section.strand || 'General'}</span>
                            {!isLocked && (
                              <div className="registrar-sections-page__card-actions">
                                <button onClick={() => handleEditClick(section)} title="Edit Section" className="icon-btn"><span className="material-symbols-outlined">edit</span></button>
                                <button onClick={() => setPendingAction({ type: 'clear', data: section })} title="Clear Learner List" className="icon-btn"><span className="material-symbols-outlined">person_remove</span></button>
                                <button onClick={() => setPendingAction({ type: 'delete', data: section })} title="Delete Section" className="icon-btn danger"><span className="material-symbols-outlined">delete</span></button>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="registrar-sections-page__empty">No sections established</div>
              )}
            </div>
          </section>
        </main>
      </div>

      {editingSection && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={closeEditModal} />
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-section-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="edit-section-title">Edit Section</h3>
                <p>{editingSection.gradeLevel} - {editingSection.name}</p>
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
                  <div>
                    <SearchableSelect
                      label="Classification"
                      placeholder="Classification"
                      floatingLabel
                      showLabel={false}
                      value={editClassification}
                      onChange={setEditClassification}
                      options={[{ value: '', label: 'General' }, ...createClassificationOptions(editingSection.gradeLevel)]}
                    />
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

      <CreateSectionModal
        isOpen={createModalOpen && !isLocked}
        onClose={() => {
          setCreateModalOpen(false);
          setSystemError(null);
        }}
        loading={loading}
        onSubmit={handleCreateSubmit}
        newName={newName}
        setNewName={setNewName}
        newAdviser={newAdviser}
        setNewAdviser={setNewAdviser}
        newClassification={newClassification}
        setNewClassification={setNewClassification}
        selectedGrade={selectedGrade}
        isSHS={isSHS}
        isJHS={isJHS}
        createClassificationOptions={createClassificationOptions}
      />

      <ConfirmationModal
        isOpen={pendingAction?.type === 'delete'}
        type="danger"
        title="Delete Section"
        message={`This will permanently remove "${pendingAction?.data?.name}" and purge ${getLearnerCount(pendingAction?.data?.id || '')} linked learners.`}
        confirmLabel="Purge Everything"
        onConfirm={executeDelete}
        onCancel={() => setPendingAction(null)}
        isLoading={loading}
      />

      <ConfirmationModal
        isOpen={pendingAction?.type === 'clear'}
        type="accent"
        title="Clear Learner List"
        message={`Remove all ${getLearnerCount(pendingAction?.data?.id || '')} learners from "${pendingAction?.data?.name}"?`}
        confirmLabel="Purge Learners"
        onConfirm={executeClear}
        onCancel={() => setPendingAction(null)}
        isLoading={loading}
      />
      <ConfirmationModal
        isOpen={pendingAction?.type === 'dedupe'}
        type="danger"
        title="Delete Duplicate Section List"
        message={`Delete ${Array.isArray(pendingAction?.data?.sections) ? pendingAction.data.sections.length : 0} duplicate section record(s) with 0 learners for ${selectedGrade}?`}
        confirmLabel="Delete Duplicates"
        onConfirm={executeDedupe}
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
