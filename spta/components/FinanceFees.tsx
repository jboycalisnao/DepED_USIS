
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SystemConfig, FeeItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

interface FinanceFeesProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
}

export const FinanceFees: React.FC<FinanceFeesProps> = ({ config, setConfig }) => {
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState<Partial<FeeItem>>({ type: 'Base', amount: 0 });
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  const handleSaveFee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!feeForm.name || feeForm.amount === undefined) return;

      const newFee: FeeItem = {
          name: feeForm.name,
          amount: Number(feeForm.amount),
          type: feeForm.type || 'Base',
          description: feeForm.description
      };

      const currentSchedule = config.feeSchedule || [];
      let newSchedule = [...currentSchedule];

      if (editingFeeIndex !== null) {
          newSchedule[editingFeeIndex] = newFee;
      } else {
          newSchedule.push(newFee);
      }

      // Update Config & Sync Categories
      const updatedCategories = newSchedule.map(f => f.name);
      const updatedConfig = { 
          ...config, 
          feeSchedule: newSchedule,
          contributionCategories: updatedCategories 
      };

      // 1. Update DB First (Await for reliability)
      await supabase.from('system_config').upsert({ id: 1, config: updatedConfig });

      // 2. Update Local State
      setConfig(updatedConfig);
      
      // Reset
      setIsFeeModalOpen(false);
      setFeeForm({ type: 'Base', amount: 0 });
      setEditingFeeIndex(null);
  };

  const handleEditFee = (fee: FeeItem, index: number) => {
      setFeeForm(fee);
      setEditingFeeIndex(index);
      setIsFeeModalOpen(true);
  };

  const handleDeleteFee = async (index: number) => {
      const newSchedule = (config.feeSchedule || []).filter((_, i) => i !== index);
      const updatedCategories = newSchedule.map(f => f.name);
      const updatedConfig = {
          ...config,
          feeSchedule: newSchedule,
          contributionCategories: updatedCategories
      };
      await supabase.from('system_config').upsert({ id: 1, config: updatedConfig });
      setConfig(updatedConfig);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-gray-800">Fee Schedule</h3>
                <p className="text-sm text-gray-500">Manage authorized contributions and fees.</p>
            </div>
            <button onClick={() => { setFeeForm({ type: 'Base', amount: 0 }); setEditingFeeIndex(null); setIsFeeModalOpen(true); }} className="m3-btn-primary">
                <span className="material-symbols-outlined mr-2">add</span> Add Fee Item
            </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b">
                    <tr>
                        <th className="p-3">Fee Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {(config.feeSchedule || []).map((fee, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 font-bold text-gray-800">{fee.name}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    fee.type === 'Base' ? 'bg-blue-100 text-blue-800' :
                                    fee.type === 'SHS_Only' ? 'bg-orange-100 text-orange-800' :
                                    'bg-purple-100 text-purple-800'
                                }`}>
                                    {fee.type.replace(/_/g, ' ')}
                                </span>
                            </td>
                            <td className="p-3 text-gray-500">{fee.description || '-'}</td>
                            <td className="p-3 text-right font-mono font-bold">₱{fee.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="p-3 text-right">
                                <button onClick={() => handleEditFee(fee, idx)} className="text-blue-600 hover:bg-blue-50 p-2 rounded mr-2"><span className="material-symbols-outlined text-lg">edit</span></button>
                                <button onClick={() => setPendingDeleteIndex(idx)} className="text-red-600 hover:bg-red-50 p-2 rounded"><span className="material-symbols-outlined text-lg">delete</span></button>
                            </td>
                        </tr>
                    ))}
                    {(!config.feeSchedule || config.feeSchedule.length === 0) && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No fees configured.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {isFeeModalOpen && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                    <h3 className="text-xl font-bold mb-4">{editingFeeIndex !== null ? 'Edit' : 'Add'} Fee Item</h3>
                    <form onSubmit={handleSaveFee} className="space-y-4">
                        <label className="floating-field">
                            <div className="floating-field__control">
                                <input placeholder=" " required value={feeForm.name || ''} onChange={e => setFeeForm({...feeForm, name: e.target.value})} />
                                <span>Fee Name</span>
                            </div>
                        </label>
                        <label className="floating-field">
                            <div className="floating-field__control">
                                <select value={feeForm.type} onChange={e => setFeeForm({...feeForm, type: e.target.value as any})} data-has-value={(feeForm.type || '').length > 0}>
                                <option value="Base">All Students (Base)</option>
                                <option value="SHS_Only">Senior High School Only</option>
                                <option value="STE_SPA_Only">Special Programs (STE/SPA) Only</option>
                                </select>
                                <span>Applicable To</span>
                            </div>
                        </label>
                        <label className="floating-field">
                            <div className="floating-field__control">
                                <input type="number" step="0.01" placeholder=" " required value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: parseFloat(e.target.value)})} />
                                <span>Amount (PHP)</span>
                            </div>
                        </label>
                        <label className="floating-field">
                            <div className="floating-field__control">
                                <input placeholder=" " value={feeForm.description || ''} onChange={e => setFeeForm({...feeForm, description: e.target.value})} />
                                <span>Description (Optional)</span>
                            </div>
                        </label>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => setIsFeeModalOpen(false)} className="m3-btn-tonal">Cancel</button>
                            <button type="submit" className="m3-btn-primary">Save Fee</button>
                        </div>
                    </form>
                </div>
            </div>, document.body
        )}
        <UsisAlertModal
            open={pendingDeleteIndex !== null}
            title="Remove Fee Item"
            message="This fee item will no longer be calculated for new collections. Continue?"
            tone="warning"
            cancelLabel="Cancel"
            confirmLabel="Remove"
            onClose={() => setPendingDeleteIndex(null)}
            onConfirm={() => {
                if (pendingDeleteIndex !== null) {
                    void handleDeleteFee(pendingDeleteIndex);
                }
                setPendingDeleteIndex(null);
            }}
        />
    </div>
  );
};
