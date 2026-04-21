
import React, { useState } from 'react';
import { DEPED_SEAL_URL } from '../constants';

interface AdminAccessModalProps {
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (code: string) => void;
}

const AdminAccessModal: React.FC<AdminAccessModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [code, setCode] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 transform scale-100 transition-all">
        <div className="bg-[#034F8B] p-6 text-center">
          <img src={DEPED_SEAL_URL} className="h-16 mx-auto mb-4" alt="DepEd" />
          <h3 className="text-white font-black uppercase tracking-widest text-sm">Administrative Access</h3>
        </div>
        <div className="p-8">
          <p className="text-xs font-bold text-gray-500 uppercase mb-4 text-center">Enter Access Credentials</p>
          <input 
            type="password" 
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ACCESS CODE"
            className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#034F8B] outline-none text-center font-black tracking-[0.3em] text-lg uppercase"
            onKeyDown={(e) => e.key === 'Enter' && onConfirm(code)}
          />
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">
              Cancel
            </button>
            <button onClick={() => onConfirm(code)} className="flex-1 bg-[#E11C38] text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-900/20">
              Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccessModal;
