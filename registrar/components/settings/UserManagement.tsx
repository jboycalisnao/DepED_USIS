
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
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-[#004E8C]/30 backdrop-blur-xl" onClick={() => setEditingUser(null)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[48px] shadow-2xl overflow-hidden border border-surfaceVariant/30">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg"><span className="material-symbols-outlined text-2xl font-bold">manage_accounts</span></div>
                <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Edit Account</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center text-outline"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-4">
              <input type="text" value={editUserForm.displayName} onChange={(e) => setEditUserForm(prev => ({ ...prev, displayName: e.target.value }))} className="w-full px-5 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm" />
              <input type="text" value={editUserForm.username} onChange={(e) => setEditUserForm(prev => ({ ...prev, username: e.target.value }))} className="w-full px-5 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm" />
              <input type="text" value={editUserForm.password} onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))} className="w-full px-5 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm" />
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => generateCredentials(true)} className="flex-1 py-4 bg-white text-primary border border-primary/20 rounded-2xl font-black text-[10px] uppercase tracking-widest">Regenerate</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2">{loading ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserManagement;
