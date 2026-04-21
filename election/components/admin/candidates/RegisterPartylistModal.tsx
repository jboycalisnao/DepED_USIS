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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] max-w-md w-full max-h-[95vh] overflow-y-auto no-scrollbar border border-white/20 transform animate-in zoom-in-95 duration-300">
        <div className="bg-[#034F8B] p-8 md:p-12 text-center text-white relative">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-inner relative z-10">
            <i className="fa-solid fa-flag text-2xl md:text-3xl text-[#fcd116]"></i>
          </div>
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none mb-2 relative z-10">Register Partylist</h3>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] relative z-10">Official Election Body Registration</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6 md:space-y-8">
          <UppercaseInput 
            label="Partylist Name"
            value={name}
            onValueChange={setName}
            placeholder="E.G., SULONG KABATAAN"
            required
            autoFocus
          />
          
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3">Official Slogan</label>
            <textarea 
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="ENTER PARTYLIST MISSION STATEMENT..."
              className="w-full px-6 py-4 md:py-5 bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] focus:border-[#034F8B] outline-none font-bold text-sm uppercase tracking-widest transition-all h-28 md:h-32 resize-none placeholder:text-gray-300 shadow-inner"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose} 
              className="w-full sm:flex-1 py-4 text-[11px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors tracking-[0.2em]"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-full sm:flex-[1.5] bg-[#034F8B] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-900/40 hover:bg-blue-800 transition-all active:scale-95 border-b-4 border-blue-900"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RegisterPartylistModal;