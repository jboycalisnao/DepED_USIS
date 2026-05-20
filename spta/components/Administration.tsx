
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SystemConfig, User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

interface AdministrationProps {
    config: SystemConfig;
    setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    onLogAction: (action: string, module: string, details: string) => void;
}

export const Administration: React.FC<AdministrationProps> = ({ config, setConfig, users, setUsers, onLogAction: _onLogAction }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    
    // Default form state
    const defaultUserForm: Partial<User> = { 
        role: UserRole.OFFICER, 
        status: 'Active',
        password: '' 
    };
    const [userForm, setUserForm] = useState<Partial<User>>(defaultUserForm);

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const userData = {
            id: userForm.id || Math.random().toString(36).substr(2, 9),
            username: userForm.username!,
            password: userForm.password,
            fullName: userForm.fullName!,
            role: userForm.role,
            status: userForm.status || 'Active'
        };

        if (!userData.password && !userForm.id) userData.password = '123456'; 

        const { error } = await supabase.from('app_users').upsert(userData);

        if (!error) {
            if (userForm.id) {
                setUsers(prev => prev.map(u => u.id === userData.id ? { ...u, ...userData } as User : u));
            } else {
                setUsers([...users, userData as User]);
            }
            setIsUserModalOpen(false);
            setUserForm(defaultUserForm);
        } else {
            setNotice({ open: true, title: 'Save Failed', message: `Error saving user: ${error.message}`, tone: 'danger' });
        }
    };

    const handleDeleteUser = async (id: string) => {
        const { error } = await supabase.from('app_users').delete().eq('id', id);
        if (!error) {
            setUsers(prev => prev.filter(u => u.id !== id));
        } else {
            setNotice({ open: true, title: 'Delete Failed', message: `Error deleting user: ${error.message}`, tone: 'danger' });
        }
    };

    const handleEditUser = (user: User) => {
        setUserForm({ ...user, password: user.password }); 
        setIsUserModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-[28px] font-normal text-[var(--md-sys-color-on-surface)]">User Management</h1>

            <div className="m3-card p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-medium text-[var(--md-sys-color-on-surface)]">Authorized Personnel</h3>
                    <button onClick={() => { setUserForm(defaultUserForm); setIsUserModalOpen(true); }} className="m3-btn-primary">
                        <span className="material-symbols-outlined mr-2">person_add</span> Add User
                    </button>
                </div>
                
                <div className="overflow-x-auto border border-[var(--md-sys-color-outline-variant)] rounded-lg">
                    <table className="w-full text-left text-sm text-[var(--md-sys-color-on-surface)]">
                        <thead className="bg-[var(--md-sys-color-surface-container)] font-medium">
                            <tr>
                                <th className="px-6 py-3">Full Name</th>
                                <th className="px-6 py-3">Username</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors">
                                    <td className="px-6 py-4 font-medium">{u.fullName}</td>
                                    <td className="px-6 py-4">{u.username}</td>
                                    <td className="px-6 py-4"><span className="bg-[var(--md-sys-color-surface-container-high)] px-2 py-1 rounded text-xs font-medium">{u.role}</span></td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleEditUser(u)}
                                                className="p-1.5 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] rounded-full transition-colors"
                                                title="Edit User"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button 
                                                onClick={() => setPendingDeleteId(u.id)}
                                                className="p-1.5 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] rounded-full transition-colors"
                                                title="Delete User"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* USER MODAL */}
             {isUserModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[var(--md-sys-color-surface-container-high)] w-full max-w-md p-6 rounded-[28px] shadow-elevation-3 border border-white/20">
                        <h3 className="text-xl font-normal text-[var(--md-sys-color-on-surface)] mb-6">{userForm.id ? 'Edit' : 'Create'} User Account</h3>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <label className="floating-field">
                                <div className="floating-field__control">
                                    <input placeholder=" " required value={userForm.fullName || ''} onChange={e => setUserForm({...userForm, fullName: e.target.value})} />
                                    <span>Full Name</span>
                                </div>
                            </label>
                            <label className="floating-field">
                                <div className="floating-field__control">
                                    <input placeholder=" " required value={userForm.username || ''} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                                    <span>Username</span>
                                </div>
                            </label>
                            <label className="floating-field">
                                <div className="floating-field__control">
                                    <input
                                        type="text"
                                        placeholder=" "
                                        value={userForm.password || ''}
                                        onChange={e => setUserForm({...userForm, password: e.target.value})}
                                        required={!userForm.id}
                                    />
                                    <span>Password{userForm.id ? ' (Optional)' : ''}</span>
                                </div>
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="floating-field">
                                    <div className="floating-field__control">
                                    <select required value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} data-has-value={Boolean(userForm.role)}>
                                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <span>Role</span>
                                    </div>
                                </label>
                                <label className="floating-field">
                                    <div className="floating-field__control">
                                    <select required value={userForm.status} onChange={e => setUserForm({...userForm, status: e.target.value as any})} data-has-value={Boolean(userForm.status)}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                    <span>Status</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="m3-btn-tonal bg-transparent text-[var(--md-sys-color-primary)] shadow-none">Cancel</button>
                                <button type="submit" className="m3-btn-primary">Save Account</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            <UsisAlertModal
                open={pendingDeleteId !== null}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
                tone="danger"
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onClose={() => setPendingDeleteId(null)}
                onConfirm={() => {
                    if (pendingDeleteId) {
                        void handleDeleteUser(pendingDeleteId);
                    }
                    setPendingDeleteId(null);
                }}
            />
            <UsisAlertModal
                open={notice.open}
                title={notice.title}
                message={notice.message}
                tone={notice.tone}
                onClose={() => setNotice(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};
