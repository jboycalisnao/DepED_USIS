import React, { useEffect, useState } from 'react';
import { UsisSearchableSelect } from '../../../common/components/ui/UsisSearchableSelect';

interface ReusableTagModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: { label: string; category: string; description: string; color: string }) => Promise<void>;
}

const ReusableTagModal: React.FC<ReusableTagModalProps> = ({ isOpen, isSaving, onClose, onSubmit }) => {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#004E8C');

  useEffect(() => {
    if (!isOpen) {
      setLabel('');
      setCategory('');
      setDescription('');
      setColor('#004E8C');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      label: label.trim(),
      category: category.trim(),
      description: description.trim(),
      color: color.trim(),
    });
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="registrar-reusable-tag-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Reusable Tags</p>
            <h3 id="registrar-reusable-tag-title">Create Tag Template</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close create reusable tag modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form id="registrar-reusable-tag-form" className="modal-dialog__body registrar-tagging-page__modal-form" onSubmit={handleSubmit}>
          <div className="floating-field-grid">
            <label className="floating-field">
              <div className="floating-field__control" data-has-value={label.trim() ? 'true' : 'false'}>
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder=" "
                  required
                />
                <span>Tag label</span>
              </div>
            </label>

            <UsisSearchableSelect
              ariaLabel="Category"
              className="registrar-tagging-page__category-select"
              floatingLabel
              label="Category"
              onChange={setCategory}
              options={[
                { label: 'Organization', value: 'Organization' },
                { label: 'Club', value: 'Club' },
                { label: 'Recognition', value: 'Recognition' },
                { label: 'Affiliation', value: 'Affiliation' },
                { label: 'Other', value: 'Other' },
              ]}
              placeholder="Select category"
              value={category}
              showLabel
              allowTyping
              forcePortalMenu
              menuGap={4}
            />

            <label className="floating-field">
              <div className="floating-field__control" data-has-value={description.trim() ? 'true' : 'false'}>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder=" "
                  rows={3}
                />
                <span>Description</span>
              </div>
            </label>

            <label className="floating-field">
              <div className="floating-field__control" data-has-value="true">
                <input
                  className="registrar-tagging-page__color-input"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Reusable tag color"
                />
                <span>Badge color</span>
              </div>
            </label>
          </div>
        </form>

        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__primary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="registrar-reusable-tag-form" className="modal-dialog__blue" disabled={isSaving || !label.trim()}>
            {isSaving ? 'Saving...' : 'Create Tag'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReusableTagModal;
