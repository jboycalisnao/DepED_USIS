import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../../supabaseStore';

interface ManagePartylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolYearId: string;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
}

interface Partylist {
  id: string;
  name: string;
  slogan: string;
}

const ManagePartylistsModal: React.FC<ManagePartylistsModalProps> = ({ isOpen, onClose, schoolYearId, showAlert }) => {
  const store = useStore();
  const [partylists, setPartylists] = useState<Partylist[]>([]);
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const editingParty = useMemo(
    () => partylists.find((party) => party.id === editingId) || null,
    [editingId, partylists]
  );
  const activeSchoolYearLabel = useMemo(() => {
    const matchedSchoolYear = (store.schoolYears || []).find((sy) => {
      const rawId = String(sy.id || '').trim();
      const rawLabel = String(sy.label || '').trim();
      return rawId === String(schoolYearId || '').trim() || rawLabel === String(schoolYearId || '').trim() || sy.isActive || sy.is_active;
    });

    const label = String(matchedSchoolYear?.label || '').trim();
    if (label) return label;

    const rawValue = String(schoolYearId || '').trim();
    const cleaned = rawValue.replace(/^sy/i, '');
    const yearPairMatch = cleaned.match(/(\d{4})[-\s]?(\d{4})/);
    if (yearPairMatch) {
      return `SY ${yearPairMatch[1]}-${yearPairMatch[2]}`;
    }

    const sequentialMatch = rawValue.match(/(\d{4})(\d{4})$/);
    if (sequentialMatch) {
      return `SY ${sequentialMatch[1]}-${sequentialMatch[2]}`;
    }

    return rawValue ? `SY ${rawValue.toUpperCase()}` : '----';
  }, [schoolYearId, store.schoolYears]);

  const refreshPartylists = async () => {
    if (!schoolYearId) {
      setPartylists([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await store.fetchPartylists(schoolYearId);
      setPartylists((data || []).map((row: any) => ({
        id: String(row.id || '').trim(),
        name: String(row.name || '').trim(),
        slogan: String(row.slogan || '').trim(),
      })));
    } catch (error) {
      console.error('Failed to load partylists', error);
      setPartylists([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPartylists();
      setEditingId(null);
      setName('');
      setSlogan('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, schoolYearId]);

  useEffect(() => {
    if (!editingParty) return;
    setName(editingParty.name);
    setSlogan(editingParty.slogan || '');
  }, [editingParty]);

  const clearForm = () => {
    setName('');
    setSlogan('');
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlogan = slogan.trim();
    if (!trimmedName) return;

    try {
      setIsSaving(true);
      if (editingId) {
        await store.updatePartylist(editingId, trimmedName, trimmedSlogan);
        showAlert('Success', 'Partylist updated successfully.', 'success');
      } else {
        await store.addPartylist(trimmedName, trimmedSlogan, schoolYearId);
        showAlert('Success', 'New partylist registered.', 'success');
      }
      clearForm();
      await refreshPartylists();
    } catch (error) {
      console.error('Failed to save partylist', error);
      showAlert('Error', 'Action failed. Please check the console for details.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (party: Partylist) => {
    setEditingId(party.id);
    setName(party.name);
    setSlogan(party.slogan || '');
  };

  const handleDelete = (id: string, partyName: string) => {
    showAlert(
      'Confirm Delete',
      `Remove "${partyName}"? Candidates linked to this party remain, but the partylist entry will be deleted.`,
      'confirm',
      async () => {
        try {
          setIsLoading(true);
          await store.deletePartylist(id);
          await refreshPartylists();
          showAlert('Deleted', 'Partylist removed from roster.', 'info');
        } catch (error) {
          console.error('Failed to delete partylist', error);
          showAlert('Error', 'Could not delete partylist.', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-dialog modal-dialog--wide usis-party-modal" role="dialog" aria-modal="true" aria-labelledby="partylists-modal-title">
        <div className="grid grid-cols-3" aria-hidden="true">
          <span className="h-[4px] bg-[#0038a8]" />
          <span className="h-[4px] bg-[#fcd116]" />
          <span className="h-[4px] bg-[#ce1126]" />
        </div>

        <header className="modal-dialog__header usis-party-modal__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Election Modal</p>
            <h3 id="partylists-modal-title" className="modal-dialog__header-title">
              Manage Partylists
            </h3>
            <p className="modal-dialog__eyebrow">Official Political Groups Registry</p>
          </div>

          <div className="usis-party-modal__header-meta">
            <div className="usis-party-modal__stats">
              <div className="usis-party-modal__stat">
                <span className="usis-party-modal__stat-label">Registered</span>
                <strong className="usis-party-modal__stat-value">{partylists.length}</strong>
              </div>
              <div className="usis-party-modal__stat">
                <span className="usis-party-modal__stat-label">Active SY</span>
                <strong className="usis-party-modal__stat-value">{activeSchoolYearLabel}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="usis-party-modal__close"
              aria-label="Close partylist modal"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        </header>

        <div className="modal-dialog__body usis-party-modal__content">

          <section className="usis-party-modal__grid">
            <form onSubmit={handleSubmit} className="usis-party-modal__form">
              <div className="usis-party-modal__form-head">
                <div>
                  <p className="usis-party-modal__section-label">Registry Entry</p>
                  <h4 className="usis-party-modal__section-title">{editingId ? 'Update Party' : 'New Party'}</h4>
                </div>
                {editingId ? (
                  <button type="button" className="usis-party-modal__ghost-button" onClick={clearForm}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>

              <label className="floating-field usis-party-modal__field">
                <div className="floating-field__control">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder=" "
                    data-has-value={String(Boolean(name.trim()))}
                  />
                  <span>Party Name</span>
                </div>
              </label>

              <label className="floating-field usis-party-modal__field">
                <div className="floating-field__control">
                  <textarea
                    value={slogan}
                    onChange={(event) => setSlogan(event.target.value)}
                    placeholder=" "
                    data-has-value={String(Boolean(slogan.trim()))}
                    style={{ minHeight: '160px' }}
                  />
                  <span>Slogan / Vision</span>
                </div>
              </label>

              <div className="usis-party-modal__actions">
                <button type="submit" disabled={isSaving} className="usis-party-modal__primary">
                  {isSaving ? 'Saving...' : editingId ? 'Update Partylist' : 'Register Partylist'}
                </button>
                <button type="button" onClick={onClose} className="usis-party-modal__secondary">
                  Close
                </button>
              </div>
            </form>

            <section className="usis-party-modal__list-panel">
              <div className="usis-party-modal__list-head">
                <div>
                  <p className="usis-party-modal__section-label">Current Registered Groups</p>
                  <h4 className="usis-party-modal__section-title">Political Groups</h4>
                </div>
                <span className="usis-party-modal__badge">{partylists.length} total</span>
              </div>

              <div className="usis-party-modal__list">
                {isLoading ? (
                  <div className="usis-party-modal__loading">
                    <i className="fa-solid fa-circle-notch animate-spin" />
                    <span>Loading partylists...</span>
                  </div>
                ) : partylists.length === 0 ? (
                  <div className="usis-party-modal__empty">
                    <p className="usis-party-modal__empty-title">No parties registered yet</p>
                    <p className="usis-party-modal__empty-copy">Create the first partylist using the form on the left.</p>
                  </div>
                ) : (
                  partylists.map((party) => (
                    <article key={party.id} className="usis-party-modal__card">
                      <div className="usis-party-modal__card-copy">
                        <h5 className="usis-party-modal__card-title">{party.name}</h5>
                        <p className="usis-party-modal__card-text">{party.slogan || 'No official slogan provided.'}</p>
                      </div>
                      <div className="usis-party-modal__card-actions">
                        <button
                          type="button"
                          onClick={() => handleEdit(party)}
                          className="usis-party-modal__icon-button"
                          aria-label={`Edit ${party.name}`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(party.id, party.name)}
                          className="usis-party-modal__icon-button usis-party-modal__icon-button--danger"
                          aria-label={`Delete ${party.name}`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default ManagePartylistsModal;
