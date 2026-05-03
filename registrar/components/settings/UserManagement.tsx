
import React, { useState } from 'react';
import { useStore, SystemUser } from '../../store';

const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, removeUser, loading } = useStore();
  const [userForm, setUserForm] = useState({ displayName: '', username: '', password: '' });
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ displayName: '', username: '', password: '' });

  const generateCredentials = (isEdit: boolean = false) => {
    const num = Math.floor(100000 + Math.random() * 900000).toString();
    if (isEdit) setEditUserForm(prev => ({ ...prev, username: num, password: num }));
    else setUserForm(prev => ({ ...prev, username: num, password: num }));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.displayName || !userForm.username || !userForm.password) return;
    addUser(userForm.displayName, userForm.username, userForm.password);
    setUserForm({ displayName: '', username: '', password: '' });
  };

  const startEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setEditUserForm({ displayName: u.displayName, username: u.username, password: u.password });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserForm.displayName || !editUserForm.username || !editUserForm.password) return;
    await updateUser(editingUser.id, editUserForm);
    setEditingUser(null);
  };

  return (
    <section>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h4 className="text-sm font-black text-primary uppercase tracking-widest">System Access & Credentials</h4>
          <p className="text-[10px] font-bold text-outline uppercase mt-1">Manage registrar accounts and secure entry keys</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleAddUser} className="bg-surface p-6 rounded-[32px] border border-surfaceVariant/50 space-y-4">
            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Grant System Access</h5>
            <input type="text" placeholder="Account Display Name" value={userForm.displayName} onChange={(e) => setUserForm(prev => ({ ...prev, displayName: e.target.value }))} className="w-full px-5 py-3 rounded-2xl bg-white border border-surfaceVariant font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10" />
            <input type="text" placeholder="User ID" value={userForm.username} onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))} className="w-full px-5 py-3 rounded-2xl bg-white border border-surfaceVariant font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10" />
            <input type="text" placeholder="Access Key" value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))} className="w-full px-5 py-3 rounded-2xl bg-white border border-surfaceVariant font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => generateCredentials(false)} className="flex-1 px-4 py-3 bg-white text-primary border border-primary/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 transition-all">Generate</button>
              <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Add Account</button>
            </div>
          </form>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-surfaceVariant overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-surface/50">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-outline tracking-widest">Authorized User</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-outline tracking-widest">Identification</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-outline tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceVariant">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm text-primary uppercase">{u.displayName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-outline">{u.username}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEditUser(u)} className="w-8 h-8 rounded-lg text-outline hover:text-primary transition-all flex items-center justify-center border border-surfaceVariant bg-white"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button onClick={() => removeUser(u.id)} disabled={users.length <= 1} className="w-8 h-8 rounded-lg text-outline hover:text-accent disabled:opacity-30 transition-all flex items-center justify-center border border-surfaceVariant bg-white"><span className="material-symbols-outlined text-lg">person_remove</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="modal-overlay modal-overlay--high">
          <div className="modal-backdrop" onClick={() => setEditingUser(null)}></div>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-account-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="edit-account-title">Edit Account</h3>
                <p className="modal-dialog__eyebrow">Registrar user access</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="modal-dialog__close" aria-label="Close edit account"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-dialog__body form-grid">
                <label className="floating-field__control"><input type="text" value={editUserForm.displayName} onChange={(e) => setEditUserForm(prev => ({ ...prev, displayName: e.target.value }))} placeholder=" " /><span>Display Name</span></label>
                <label className="floating-field__control"><input type="text" value={editUserForm.username} onChange={(e) => setEditUserForm(prev => ({ ...prev, username: e.target.value }))} placeholder=" " /><span>User ID</span></label>
                <label className="floating-field__control"><input type="text" value={editUserForm.password} onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))} placeholder=" " /><span>Access Key</span></label>
              </div>
              <div className="modal-dialog__actions">
                <button type="button" onClick={() => generateCredentials(true)}>Regenerate</button>
                <button type="submit" disabled={loading} className="modal-dialog__blue">{loading ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserManagement;
