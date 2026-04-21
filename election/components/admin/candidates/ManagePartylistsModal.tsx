
import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const refreshPartylists = async () => {
    setLoading(true);
    const data = await store.fetchPartylists(schoolYearId);
    setPartylists(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshPartylists();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      if (editingId) {
        await store.updatePartylist(editingId, name.trim(), slogan.trim());
        showAlert("Success", "Partylist updated successfully.", "success");
      } else {
        await store.addPartylist(name.trim(), slogan.trim(), schoolYearId);
        showAlert("Success", "New partylist registered.", "success");
      }
      setName('');
      setSlogan('');
      setEditingId(null);
      await refreshPartylists();
    } catch (err) {
      showAlert("Error", "Action failed. Check console for details.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Partylist) => {
    setName(p.name);
    setSlogan(p.slogan || '');
    setEditingId(p.id);
  };

  const handleDelete = (id: string, partyName: string) => {
    showAlert("Confirm Delete", `Remove "${partyName}"? This will not remove candidates who belong to this party, but they will effectively belong to a deleted entity.`, "confirm", async () => {
      try {
        setLoading(true);
        await store.deletePartylist(id);
        await refreshPartylists();
        showAlert("Deleted", "Partylist removed from roster.", "info");
      } catch (err) {
        showAlert("Error", "Could not delete partylist.", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] max-w-4xl w-full h-[85vh] overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300 flex flex-col">
        <div className="bg-[#034F8B] p-8 text-center text-white relative flex-shrink-0">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <i className="fa-solid fa-flag text-2xl text-[#fcd116]"></i>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Manage Partylists</h3>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2">Official Political Groups Registry</p>
          <button onClick={onClose} className="absolute top-8 right-8 text-white/50 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>
        
        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
          {/* Form Side */}
          <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
              {editingId ? 'Edit Partylist' : 'Register New Party'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase mb-2">Party Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#034F8B] outline-none font-bold text-xs uppercase"
                  placeholder="E.G. SULONG KABATAAN"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase mb-2">Slogan / Vision</label>
                <textarea 
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#034F8B] outline-none font-medium text-xs h-24 resize-none"
                  placeholder="ENTER PARTY MISSION STATEMENT..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#034F8B] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all disabled:opacity-50"
                >
                  {editingId ? 'Update Partylist' : 'Register Partylist'}
                </button>
                {editingId && (
                  <button 
                    type="button"
                    onClick={() => { setEditingId(null); setName(''); setSlogan(''); }}
                    className="w-full py-2 text-[10px] font-black text-gray-400 uppercase"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List Side */}
          <div className="flex-grow p-8 overflow-y-auto no-scrollbar">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Current Registered Groups</h4>
            <div className="space-y-4">
              {partylists.length === 0 && !loading && (
                <div className="text-center py-20">
                  <i className="fa-solid fa-flag-checkered text-4xl text-gray-100 mb-4"></i>
                  <p className="text-[10px] font-black text-gray-300 uppercase">No parties registered yet</p>
                </div>
              )}
              {partylists.map(p => (
                <div key={p.id} className="p-4 rounded-2xl border border-gray-100 bg-white flex justify-between items-center group">
                  <div className="max-w-[70%]">
                    <h5 className="font-black text-gray-900 text-xs uppercase">{p.name}</h5>
                    <p className="text-[10px] text-gray-400 italic line-clamp-1 mt-1">{p.slogan || 'No official slogan provided.'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(p)}
                      className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-center py-10"><i className="fa-solid fa-circle-notch animate-spin text-blue-500"></i></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManagePartylistsModal;
