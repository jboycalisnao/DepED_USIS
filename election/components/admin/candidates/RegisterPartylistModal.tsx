import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import UppercaseInput from '../../common/UppercaseInput';

interface RegisterPartylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, slogan: string) => void;
}

const RegisterPartylistModal: React.FC<RegisterPartylistModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim().toUpperCase(), slogan.trim());
    setName('');
    setSlogan('');
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="register-partylist-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Election Modal</p>
            <h3 id="register-partylist-title">Register Partylist</h3>
            <p className="modal-dialog__eyebrow">Official Election Body Registration</p>
          </div>
          <button onClick={onClose} className="modal-dialog__close" aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-dialog__body space-y-6">
          <UppercaseInput
            label="Partylist Name"
            value={name}
            onValueChange={setName}
            placeholder="E.G., SULONG KABATAAN"
            required
            autoFocus
          />

          <div className="space-y-2">
            <label className="text-[13px] font-bold uppercase text-[#68758d]">Official Slogan</label>
            <textarea
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="ENTER PARTYLIST MISSION STATEMENT..."
              className="min-h-[120px] w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-[#fbfcff] px-4 py-3 text-[13px] font-normal text-[#12233d] outline-none focus:border-[#0038a8]"
            />
          </div>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-dialog__blue">
              Confirm Registration
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
};

export default RegisterPartylistModal;
