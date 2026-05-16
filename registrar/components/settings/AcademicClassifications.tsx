import React, { useState } from 'react';
import { useStore } from '../../store';
import { AcademicProgram } from '../../types';
import ConfirmationModal from '../ConfirmationModal';

const AcademicClassifications: React.FC = () => {
  const {
    availableStrands,
    addStrand,
    updateStrand,
    removeStrand,
    availableSpecialPrograms,
    addSpecialProgram,
    updateSpecialProgram,
    removeSpecialProgram,
    loading,
  } = useStore();

  const [isAddingStrand, setIsAddingStrand] = useState(false);
  const [newStrandAcronym, setNewStrandAcronym] = useState('');
  const [newStrandFullName, setNewStrandFullName] = useState('');

  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [newProgramAcronym, setNewProgramAcronym] = useState('');
  const [newProgramFullName, setNewProgramFullName] = useState('');

  const [editingProgram, setEditingProgram] = useState<{ type: 'strand' | 'program'; item: AcademicProgram } | null>(null);
  const [editAcronym, setEditAcronym] = useState('');
  const [editFullName, setEditFullName] = useState('');

  const [pendingDelete, setPendingDelete] = useState<{ type: 'strand' | 'program'; id: string } | null>(null);

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
    setEditingProgram(null);

    if (type === 'strand') await updateStrand(targetId, { acronym, fullName });
    else await updateSpecialProgram(targetId, { acronym, fullName });
  };

  return (
    <div className="settings-classifications">
      <section className="settings-classifications__column">
        <header className="settings-classifications__head">
          <div>
            <h4>SHS Strands</h4>
            <p>Available for Grades 11-12</p>
          </div>
          <button type="button" onClick={() => setIsAddingStrand((v) => !v)} disabled={loading} className="settings-classifications__add-btn">
            <span className="material-symbols-outlined">{isAddingStrand ? 'close' : 'add'}</span>
          </button>
        </header>

        {isAddingStrand && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const acro = newStrandAcronym.trim().toUpperCase();
              const name = newStrandFullName.trim();
              if (!acro || !name || loading) return;
              await addStrand(acro, name);
              setNewStrandAcronym('');
              setNewStrandFullName('');
              setIsAddingStrand(false);
            }}
            className="settings-classifications__form"
          >
            <h5>New Strand Registration</h5>
            <input type="text" placeholder="Acronym (e.g., STEM)" value={newStrandAcronym} onChange={(e) => setNewStrandAcronym(e.target.value)} disabled={loading} />
            <input type="text" placeholder="Full Name" value={newStrandFullName} onChange={(e) => setNewStrandFullName(e.target.value)} disabled={loading} />
            <button type="submit" className="primary-button" disabled={loading}>Register Strand</button>
          </form>
        )}

        <div className="settings-classifications__list">
          {availableStrands.map((s) => (
            <article key={s.id} className="settings-classifications__item">
              <div>
                <strong>{s.acronym}</strong>
                <span>{s.fullName}</span>
              </div>
              <div className="settings-classifications__item-actions">
                <button type="button" onClick={() => startEdit('strand', s)}><span className="material-symbols-outlined">edit</span></button>
                <button type="button" onClick={() => setPendingDelete({ type: 'strand', id: s.id })}><span className="material-symbols-outlined">delete</span></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-classifications__column">
        <header className="settings-classifications__head">
          <div>
            <h4>JHS Special Programs</h4>
            <p>Available for Grades 7-10</p>
          </div>
          <button type="button" onClick={() => setIsAddingProgram((v) => !v)} disabled={loading} className="settings-classifications__add-btn">
            <span className="material-symbols-outlined">{isAddingProgram ? 'close' : 'add'}</span>
          </button>
        </header>

        {isAddingProgram && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const acro = newProgramAcronym.trim().toUpperCase();
              const name = newProgramFullName.trim();
              if (!acro || !name || loading) return;
              await addSpecialProgram(acro, name);
              setNewProgramAcronym('');
              setNewProgramFullName('');
              setIsAddingProgram(false);
            }}
            className="settings-classifications__form"
          >
            <h5>New Program Registration</h5>
            <input type="text" placeholder="Acronym (e.g., STE)" value={newProgramAcronym} onChange={(e) => setNewProgramAcronym(e.target.value)} disabled={loading} />
            <input type="text" placeholder="Full Name" value={newProgramFullName} onChange={(e) => setNewProgramFullName(e.target.value)} disabled={loading} />
            <button type="submit" className="primary-button" disabled={loading}>Register Program</button>
          </form>
        )}

        <div className="settings-classifications__list">
          {availableSpecialPrograms.map((p) => (
            <article key={p.id} className="settings-classifications__item">
              <div>
                <strong>{p.acronym}</strong>
                <span>{p.fullName}</span>
              </div>
              <div className="settings-classifications__item-actions">
                <button type="button" onClick={() => startEdit('program', p)}><span className="material-symbols-outlined">edit</span></button>
                <button type="button" onClick={() => setPendingDelete({ type: 'program', id: p.id })}><span className="material-symbols-outlined">delete</span></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editingProgram && (
        <div className="modal-overlay modal-overlay--high">
          <div className="modal-backdrop" onClick={() => setEditingProgram(null)} />
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-classification-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="edit-classification-title">Edit {editingProgram.type === 'strand' ? 'Strand' : 'Program'}</h3>
              </div>
              <button type="button" onClick={() => setEditingProgram(null)} className="modal-dialog__close" aria-label="Close edit classification"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-dialog__body form-grid">
                <div className="floating-field"><label className="floating-field__control"><input type="text" value={editAcronym} onChange={(e) => setEditAcronym(e.target.value)} placeholder=" " /><span>Acronym</span></label></div>
                <div className="floating-field"><label className="floating-field__control"><input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder=" " /><span>Full Name</span></label></div>
              </div>
              <div className="modal-dialog__actions"><button type="button" onClick={() => setEditingProgram(null)}>Cancel</button><button type="submit" className="modal-dialog__blue">Update Record</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!pendingDelete}
        title={`Remove ${pendingDelete?.type === 'strand' ? 'Strand' : 'Program'}`}
        message="This will remove the item from the selection registry."
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
