
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SystemConfig, FeeItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';
import { DEFAULT_FEE_SCHEDULE } from '../config/systemDefaults';

interface FinanceFeesProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
}

export const FinanceFees: React.FC<FinanceFeesProps> = ({ config, setConfig }) => {
  const feeTypeOptions = [
    { value: 'Base', label: 'All Learners (Base)' },
    { value: 'SHS_Only', label: 'Senior High School Only' },
    { value: 'STE_SPA_Only', label: 'Special Programs (STE/SPA) Only' }
  ];
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState<Partial<FeeItem>>({ type: 'Base', amount: 0 });
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [isSeedingDefaultFees, setIsSeedingDefaultFees] = useState(false);
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({
      open: false,
      title: '',
      message: ''
  });

  useEffect(() => {
      const loadFeeConfigForYear = async () => {
          if (!config.schoolYear) return;
          const { data } = await supabase
              .from('spta_fee_configurations')
              .select('fee_schedule,contribution_categories')
              .eq('school_year', config.schoolYear)
              .maybeSingle();
          if (data) {
              setConfig(prev => ({
                  ...prev,
                  feeSchedule: (data.fee_schedule as FeeItem[]) || [],
                  contributionCategories: (data.contribution_categories as string[]) || []
              }));
          }
      };
      loadFeeConfigForYear();
  }, [config.schoolYear, setConfig]);

  const saveYearScopedFeeConfig = async (updatedConfig: SystemConfig) => {
      const schoolYear = updatedConfig.schoolYear;
      if (!schoolYear) return;

      const { data: selectedYear } = await supabase
          .from('registrar_school_years')
          .select('id')
          .eq('label', schoolYear)
          .limit(1)
          .maybeSingle();

      await supabase.from('spta_fee_configurations').upsert({
          school_year: schoolYear,
          registrar_school_year_id: selectedYear?.id ? String(selectedYear.id) : null,
          fee_schedule: updatedConfig.feeSchedule || [],
          contribution_categories: updatedConfig.contributionCategories || [],
          updated_at: new Date().toISOString()
      }, { onConflict: 'school_year' });
  };

  const handleSeedCommonFees = async () => {
      if (!config.schoolYear) {
          setNotice({ open: true, title: 'School Year Required', message: 'Please set an active school year in Settings first.', tone: 'warning' });
          return;
      }

      const seededSchedule = [...DEFAULT_FEE_SCHEDULE];
      const seededCategories = seededSchedule
          .filter((fee, index, list) => list.findIndex(candidate => candidate.name === fee.name) === index)
          .map(fee => fee.name);

      const updatedConfig: SystemConfig = {
          ...config,
          feeSchedule: seededSchedule,
          contributionCategories: seededCategories
      };

      await Promise.all([
          saveYearScopedFeeConfig(updatedConfig),
          supabase.from('spta_system_config').upsert({ id: 1, config: updatedConfig })
      ]);

      setConfig(updatedConfig);
      setNotice({
          open: true,
          title: 'Common Fees Seeded',
          message: `Recurring fee template was seeded to school year ${config.schoolYear}.`,
          tone: 'success'
      });
  };

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

      // 1. Persist to year-scoped fee table + keep system config in sync
      await Promise.all([
          saveYearScopedFeeConfig(updatedConfig),
          supabase.from('spta_system_config').upsert({ id: 1, config: updatedConfig })
      ]);

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
      await Promise.all([
          saveYearScopedFeeConfig(updatedConfig),
          supabase.from('spta_system_config').upsert({ id: 1, config: updatedConfig })
      ]);
      setConfig(updatedConfig);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-gray-800">Fee Schedule</h3>
                <p className="text-sm text-gray-500">Manage authorized contributions and fees.</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsSeedingDefaultFees(true)}
                    className="m3-btn-tonal"
                >
                    <span className="material-symbols-outlined mr-2">content_copy</span> Seed Common Fees
                </button>
                <button onClick={() => { setFeeForm({ type: 'Base', amount: 0 }); setEditingFeeIndex(null); setIsFeeModalOpen(true); }} className="m3-btn-primary">
                    <span className="material-symbols-outlined mr-2">add</span> Add Fee Item
                </button>
            </div>
        </div>

        <div className="border border-gray-200 rounded-lg bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-2.5">Fee Name</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                                        {(config.feeSchedule || []).map((fee, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-900 break-words" title={fee.name}>{fee.name}</td>
                            <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                                    fee.type === 'Base' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    fee.type === 'SHS_Only' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                    'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                    {fee.type.replace(/_/g, ' ')}
                                </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 break-words" title={fee.description || '-'}>{fee.description || '-'}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">PHP {fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2.5 text-right">
                                <div className="inline-flex items-center gap-1">
                                    <button onClick={() => handleEditFee(fee, idx)} className="text-blue-700 hover:bg-blue-50 p-1.5 rounded-md" title="Edit fee item"><span className="material-symbols-outlined text-[19px]">edit</span></button>
                                    <button onClick={() => setPendingDeleteIndex(idx)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-md" title="Remove fee item"><span className="material-symbols-outlined text-[19px]">delete</span></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {(!config.feeSchedule || config.feeSchedule.length === 0) && (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400">No fees configured.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {isFeeModalOpen && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,35,61,0.45)] p-4">
                <div className="w-full max-w-md overflow-hidden rounded-md border border-[var(--deped-line)] bg-[var(--deped-white)] shadow-2xl animate-fade-in">
                    <div className="h-2 grid grid-cols-3">
                        <span className="bg-[var(--deped-blue)]" />
                        <span className="bg-[var(--deped-red)]" />
                        <span className="bg-[var(--deped-yellow)]" />
                    </div>
                    <div className="border-b border-[var(--deped-line)] px-6 py-4">
                        <h3 className="text-xl font-bold text-[var(--deped-ink)]">{editingFeeIndex !== null ? 'Edit' : 'Add'} Fee Item</h3>
                    </div>
                    <form onSubmit={handleSaveFee} className="space-y-4 px-6 py-5">
                        <label className="floating-field">
                            <div className="floating-field__control">
                                <input placeholder=" " required value={feeForm.name || ''} onChange={e => setFeeForm({...feeForm, name: e.target.value})} />
                                <span>Fee Name</span>
                            </div>
                        </label>
                        <UsisSearchableSelect
                            ariaLabel="Applicable To"
                            floatingLabel
                            label="Applicable To"
                            options={feeTypeOptions}
                            value={feeForm.type || 'Base'}
                            onChange={(value) => setFeeForm({ ...feeForm, type: value })}
                            emptyQueryMessage="No matching fee type"
                        />
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
                        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--deped-line)]">
                            <button
                                type="button"
                                onClick={() => setIsFeeModalOpen(false)}
                                className="inline-flex items-center justify-center rounded-md border border-[var(--deped-line)] bg-[var(--deped-white)] px-5 py-2.5 text-sm font-bold text-[var(--deped-ink)] transition-colors hover:bg-[var(--deped-canvas)] hover:border-[var(--deped-line-strong)]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-md border border-[var(--deped-blue)] bg-[var(--deped-blue)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
                            >
                                Save Fee
                            </button>
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
        <UsisAlertModal
            open={isSeedingDefaultFees}
            title="Seed Common Fees"
            message={`Apply the recurring common fees to active school year ${config.schoolYear || '(not set)'}? This will replace current fee schedule for that year.`}
            tone="warning"
            cancelLabel="Cancel"
            confirmLabel="Seed Now"
            onClose={() => setIsSeedingDefaultFees(false)}
            onConfirm={() => {
                setIsSeedingDefaultFees(false);
                void handleSeedCommonFees();
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



