import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SystemConfig, SignatoryProfile, FinanceSettings, QuarterSchedule } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';

interface SettingsProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  embedded?: boolean;
}

const InputGroup = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (val: any) => void; type?: string }) => (
  <div className="mb-3">
    <label className="mb-1 ml-1 block text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">{label}</label>
    <input type={type} className="m3-input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const SignatoryInput = ({ label, signatory, onChange }: { label: string; signatory: SignatoryProfile; onChange: (s: SignatoryProfile) => void }) => (
  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
    <label className="mb-2 block text-xs font-bold uppercase text-gray-500">{label}</label>
    <div className="grid grid-cols-2 gap-2">
      <input
        className="m3-input w-full text-sm"
        placeholder="Name"
        value={signatory.name || ''}
        onChange={(e) => onChange({ ...signatory, name: e.target.value })}
      />
      <input
        className="m3-input w-full text-sm"
        placeholder="Title / Position"
        value={signatory.title || ''}
        onChange={(e) => onChange({ ...signatory, title: e.target.value })}
      />
    </div>
  </div>
);

export const Settings: React.FC<SettingsProps> = ({ config, setConfig, embedded = false }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'signatories'>('general');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [schoolYears, setSchoolYears] = useState<Array<{ id: string; label: string; isActive: boolean }>>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
  const [isQuarterScheduleModalOpen, setIsQuarterScheduleModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({
    open: false,
    title: '',
    message: '',
  });
  const [scheduleForm, setScheduleForm] = useState<QuarterSchedule>({
    q1: { start: '', end: '' },
    q2: { start: '', end: '' },
    q3: { start: '', end: '' },
    q4: { start: '', end: '' },
  });

  useEffect(() => {
    const loadSchoolYears = async () => {
      const { data, error } = await supabase
        .from('registrar_school_years')
        .select('id,label,is_active')
        .order('label', { ascending: false });
      if (error || !data) return;
      const mapped = data.map((row: any) => ({
        id: String(row.id),
        label: String(row.label || ''),
        isActive: Boolean(row.is_active),
      }));
      setSchoolYears(mapped);
      const preferred = mapped.find((entry) => entry.label === config.schoolYear) || mapped.find((entry) => entry.isActive) || mapped[0];
      if (preferred) setSelectedSchoolYearId(preferred.id);
    };
    loadSchoolYears();
  }, [config.schoolYear]);

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const resolveSchoolYear = () => {
    return config.schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  };

  const handleSignatoryChange = (section: keyof FinanceSettings, role: string, value: SignatoryProfile) => {
    setConfig((prev) => ({
      ...prev,
      financeSettings: {
        ...prev.financeSettings,
        [section]: {
          ...prev.financeSettings?.[section],
          [role]: value,
        },
      } as FinanceSettings,
    }));
  };

  const saveConfig = async () => {
    const { error } = await supabase.from('spta_system_config').upsert({ id: 1, config });
    if (error) {
      setNotice({ open: true, title: 'Save Failed', message: `Error saving settings: ${error.message}`, tone: 'danger' });
    } else {
      setNotice({ open: true, title: 'Saved', message: 'Settings saved successfully.', tone: 'success' });
    }
  };

  const handleSchoolYearChange = async (schoolYearId: string) => {
    if (!schoolYearId || schoolYearId === selectedSchoolYearId) return;
    const selected = schoolYears.find((entry) => entry.id === schoolYearId);
    if (!selected) return;

    await supabase.from('registrar_school_years').update({ is_active: false }).neq('id', schoolYearId);
    const { error: activeError } = await supabase
      .from('registrar_school_years')
      .update({ is_active: true })
      .eq('id', schoolYearId);
    if (activeError) {
      setNotice({ open: true, title: 'Update Failed', message: `Unable to set active school year: ${activeError.message}`, tone: 'danger' });
      return;
    }

    const { data: feeData } = await supabase
      .from('spta_fee_configurations')
      .select('fee_schedule,contribution_categories')
      .eq('school_year', selected.label)
      .maybeSingle();

    const nextConfig: SystemConfig = {
      ...config,
      schoolYear: selected.label,
      feeSchedule: (feeData?.fee_schedule as any[]) || [],
      contributionCategories: (feeData?.contribution_categories as string[]) || []
    };

    setConfig(nextConfig);
    setSelectedSchoolYearId(schoolYearId);
    setSchoolYears((prev) => prev.map((entry) => ({ ...entry, isActive: entry.id === schoolYearId })));

    await supabase.from('spta_system_config').upsert({ id: 1, config: nextConfig });
    await supabase.from('spta_fee_configurations').upsert({
      school_year: selected.label,
      registrar_school_year_id: schoolYearId,
      fee_schedule: nextConfig.feeSchedule || [],
      contribution_categories: nextConfig.contributionCategories || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'school_year' });

    setNotice({ open: true, title: 'School Year Updated', message: `Switched to ${selected.label}. Fee schedule is now year-based.`, tone: 'success' });
  };

  const openQuarterScheduleModal = async () => {
    const currentYear = new Date().getFullYear();
    const fallbackSchedule: QuarterSchedule =
      config.quarterSchedule || {
        q1: { start: `${currentYear}-08-01`, end: `${currentYear}-10-31` },
        q2: { start: `${currentYear}-11-01`, end: `${currentYear + 1}-01-31` },
        q3: { start: `${currentYear + 1}-02-01`, end: `${currentYear + 1}-04-30` },
        q4: { start: `${currentYear + 1}-05-01`, end: `${currentYear + 1}-07-31` },
      };

    const schoolYear = resolveSchoolYear();
    const { data, error } = await supabase
      .from('spta_quarter_configurations')
      .select('*')
      .eq('school_year', schoolYear)
      .maybeSingle();

    if (error) {
      setScheduleForm(fallbackSchedule);
      setNotice({ open: true, title: 'Quarter Configuration', message: `Unable to fetch quarter schedule from database: ${error.message}`, tone: 'warning' });
      setIsQuarterScheduleModalOpen(true);
      return;
    }

    if (data) {
      const dbSchedule: QuarterSchedule = {
        q1: { start: data.q1_start || '', end: data.q1_end || '' },
        q2: { start: data.q2_start || '', end: data.q2_end || '' },
        q3: { start: data.q3_start || '', end: data.q3_end || '' },
        q4: { start: data.q4_start || '', end: data.q4_end || '' }
      };
      setScheduleForm(dbSchedule);
      setConfig(prev => ({ ...prev, quarterSchedule: dbSchedule }));
    } else {
      setScheduleForm(fallbackSchedule);
    }

    setIsQuarterScheduleModalOpen(true);
  };

  const handleSaveQuarterSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolYear = resolveSchoolYear();
    const updatedConfig = { ...config, quarterSchedule: scheduleForm };
    const [quartersResult, configResult] = await Promise.all([
      supabase.from('spta_quarter_configurations').upsert({
        school_year: schoolYear,
        q1_start: scheduleForm.q1.start,
        q1_end: scheduleForm.q1.end,
        q2_start: scheduleForm.q2.start,
        q2_end: scheduleForm.q2.end,
        q3_start: scheduleForm.q3.start,
        q3_end: scheduleForm.q3.end,
        q4_start: scheduleForm.q4.start,
        q4_end: scheduleForm.q4.end
      }, { onConflict: 'school_year' }),
      supabase.from('spta_system_config').upsert({ id: 1, config: updatedConfig })
    ]);

    if (!quartersResult.error && !configResult.error) {
      setConfig(updatedConfig);
      setIsQuarterScheduleModalOpen(false);
      setNotice({ open: true, title: 'Saved', message: 'Quarter schedule saved successfully.', tone: 'success' });
    } else {
      const errorMessage = quartersResult.error?.message || configResult.error?.message || 'Unknown error';
      setNotice({ open: true, title: 'Save Failed', message: `Error saving quarter schedule: ${errorMessage}`, tone: 'danger' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof SystemConfig) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleConfigChange(field, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={embedded ? 'bg-white' : 'm3-card overflow-hidden p-0'}>
      <div className="flex border-b border-[var(--md-sys-color-outline-variant)]">
        {['general', 'signatories'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'general' | 'signatories')}
            className={`capitalize transition-colors px-6 py-4 text-sm font-medium border-b-2 ${
              activeTab === tab
                ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]'
                : 'border-transparent text-[var(--md-sys-color-on-surface-variant)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InputGroup label="Website / App Name" value={config.appName || ''} onChange={(v) => handleConfigChange('appName', v)} />
              <InputGroup label="School Name" value={config.schoolName || ''} onChange={(v) => handleConfigChange('schoolName', v)} />
              <InputGroup label="PTA President" value={config.ptaPresidentName || ''} onChange={(v) => handleConfigChange('ptaPresidentName', v)} />
              <InputGroup label="PTA Staff" value={config.ptaTreasurerName || ''} onChange={(v) => handleConfigChange('ptaTreasurerName', v)} />
              <div className="mb-3">
                <UsisSearchableSelect
                  ariaLabel="School Year"
                  floatingLabel
                  label="School Year"
                  value={selectedSchoolYearId}
                  onChange={(value) => { void handleSchoolYearChange(value); }}
                  options={schoolYears.map((entry) => ({
                    label: `${entry.label}${entry.isActive ? ' (Active)' : ''}`,
                    value: entry.id
                  }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 ml-1 block text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Logo URL / Upload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="m3-input flex-1"
                  value={config.logoUrl || ''}
                  onChange={(e) => handleConfigChange('logoUrl', e.target.value)}
                  placeholder="https://..."
                />
                <button onClick={() => logoInputRef.current?.click()} className="m3-btn-tonal px-3">
                  <span className="material-symbols-outlined">upload</span>
                </button>
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
              </div>
              {config.logoUrl && <img src={config.logoUrl} className="mt-2 h-12 w-12 rounded border object-contain" alt="Logo Preview" />}
            </div>

            <div className="rounded-xl border border-[var(--deped-line)] bg-[var(--deped-canvas)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[16px] font-bold text-[var(--deped-ink)]">Quarter Schedule</p>
                  <p className="text-[13px] text-[var(--deped-muted)]">Manage official posting date ranges for quarterly finance reporting.</p>
                </div>
                <button onClick={openQuarterScheduleModal} className="m3-btn-tonal">
                  Configure Quarter Dates
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
              <button onClick={saveConfig} className="m3-btn-primary">
                Save General Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === 'signatories' && (
          <div className="space-y-8">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Configure the default names and titles that appear on printed forms and reports.
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="material-symbols-outlined text-gray-500">receipt_long</span>
                Disbursement Voucher
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SignatoryInput
                  label="Box A: Prepared By"
                  signatory={config.financeSettings?.voucher?.prepared || { name: '', title: '' }}
                  onChange={(s) => handleSignatoryChange('voucher', 'prepared', s)}
                />
                <SignatoryInput
                  label="Box B: Certified By"
                  signatory={config.financeSettings?.voucher?.certified || { name: '', title: '' }}
                  onChange={(s) => handleSignatoryChange('voucher', 'certified', s)}
                />
                <SignatoryInput
                  label="Box C: Approved By"
                  signatory={config.financeSettings?.voucher?.approved || { name: '', title: '' }}
                  onChange={(s) => handleSignatoryChange('voucher', 'approved', s)}
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="material-symbols-outlined text-gray-500">policy</span>
                Audit Certificate
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SignatoryInput
                  label="Examined By"
                  signatory={config.financeSettings?.audit?.examined || { name: '', title: '' }}
                  onChange={(s) => handleSignatoryChange('audit', 'examined', s)}
                />
                <SignatoryInput
                  label="Noted By"
                  signatory={config.financeSettings?.audit?.noted || { name: '', title: '' }}
                  onChange={(s) => handleSignatoryChange('audit', 'noted', s)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
              <button onClick={saveConfig} className="m3-btn-primary">
                Save Signatories
              </button>
            </div>
          </div>
        )}
      </div>

      {isQuarterScheduleModalOpen &&
        createPortal(
          <div className="spta-usis fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/55 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl animate-fade-in">
              <div className="h-2 grid grid-cols-3">
                <span className="bg-[var(--deped-blue)]" />
                <span className="bg-[var(--deped-red)]" />
                <span className="bg-[var(--deped-yellow)]" />
              </div>
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                <p className="text-[13px] font-semibold text-[var(--deped-blue)]">Quarter Configuration</p>
                <h3 className="mt-2 text-[24px] font-bold text-slate-900">Posting Date Schedule</h3>
                <p className="mt-2 text-sm text-slate-600">Define official quarter ranges used by collection and reporting modules.</p>
              </div>

              <form onSubmit={handleSaveQuarterSchedule} className="space-y-4 p-6">
                {['q1', 'q2', 'q3', 'q4'].map((q) => {
                  const key = q as keyof QuarterSchedule;
                  return (
                    <div key={key} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_1fr_1fr] md:items-center">
                      <span className="text-[16px] font-bold text-slate-800">{key.toUpperCase()}</span>
                      <label className="floating-field">
                        <div className="floating-field__control">
                          <input
                            type="date"
                            value={scheduleForm[key].start}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, [key]: { ...scheduleForm[key], start: e.target.value } })}
                            placeholder=" "
                            required
                          />
                          <span>Start Date</span>
                        </div>
                      </label>
                      <label className="floating-field">
                        <div className="floating-field__control">
                          <input
                            type="date"
                            value={scheduleForm[key].end}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, [key]: { ...scheduleForm[key], end: e.target.value } })}
                            placeholder=" "
                            required
                          />
                          <span>End Date</span>
                        </div>
                      </label>
                    </div>
                  );
                })}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsQuarterScheduleModalOpen(false)} className="m3-btn-tonal">
                    Cancel
                  </button>
                  <button type="submit" className="m3-btn-primary">
                    Save Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <UsisAlertModal
        open={notice.open}
        title={notice.title}
        message={notice.message}
        tone={notice.tone}
        onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

