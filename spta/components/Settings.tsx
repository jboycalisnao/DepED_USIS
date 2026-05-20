import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SystemConfig, PortalFeature, SignatoryProfile, FinanceSettings, FinancialTransaction, TransactionType, QuarterSchedule } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

interface SettingsProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  embedded?: boolean;
  transactions?: FinancialTransaction[];
}

const InputGroup = ({ label, value, onChange, type = "text" }: { label: string, value: string | number, onChange: (val: any) => void, type?: string }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase ml-1 mb-1">{label}</label>
        <input 
            type={type}
            className="m3-input w-full"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

const SignatoryInput = ({ label, signatory, onChange }: { label: string, signatory: SignatoryProfile, onChange: (s: SignatoryProfile) => void }) => (
    <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
        <div className="grid grid-cols-2 gap-2">
            <input 
                className="m3-input w-full text-sm" 
                placeholder="Name" 
                value={signatory.name || ''} 
                onChange={e => onChange({...signatory, name: e.target.value})} 
            />
            <input 
                className="m3-input w-full text-sm" 
                placeholder="Title / Position" 
                value={signatory.title || ''} 
                onChange={e => onChange({...signatory, title: e.target.value})} 
            />
        </div>
    </div>
);

export const Settings: React.FC<SettingsProps> = ({ config, setConfig, embedded = false, transactions = [] }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'portal' | 'signatories' | 'reports'>('general');
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const [isQuarterScheduleModalOpen, setIsQuarterScheduleModalOpen] = useState(false);
    const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });
    const [scheduleForm, setScheduleForm] = useState<QuarterSchedule>({
        q1: { start: '', end: '' },
        q2: { start: '', end: '' },
        q3: { start: '', end: '' },
        q4: { start: '', end: '' },
    });

    // Report State
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [reportQuarter, setReportQuarter] = useState('q1');

    const handleConfigChange = (key: keyof SystemConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleFeatureChange = (index: number, field: keyof PortalFeature, value: string) => {
        const newFeatures = [...(config.portalFeatures || [])];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        handleConfigChange('portalFeatures', newFeatures);
    };

    const addFeature = () => {
        const newFeatures = [...(config.portalFeatures || []), { title: 'New Feature', icon: 'star', description: 'Description', colorTheme: 'blue' }];
        handleConfigChange('portalFeatures', newFeatures);
    };

    const removeFeature = (index: number) => {
        const newFeatures = (config.portalFeatures || []).filter((_, i) => i !== index);
        handleConfigChange('portalFeatures', newFeatures);
    };

    const handleSignatoryChange = (
        section: keyof FinanceSettings, 
        role: string, 
        value: SignatoryProfile
    ) => {
        setConfig(prev => ({
            ...prev,
            financeSettings: {
                ...prev.financeSettings,
                [section]: {
                    ...prev.financeSettings?.[section],
                    [role]: value
                }
            } as FinanceSettings
        }));
    };

    const saveConfig = async () => {
        const { error } = await supabase.from('system_config').upsert({ id: 1, config });
        if (error) setNotice({ open: true, title: 'Save Failed', message: `Error saving settings: ${error.message}`, tone: 'danger' });
        else setNotice({ open: true, title: 'Saved', message: 'Settings saved successfully.', tone: 'success' });
    };

    const openQuarterScheduleModal = () => {
        const currentYear = new Date().getFullYear();
        setScheduleForm(config.quarterSchedule || {
            q1: { start: `${currentYear}-08-01`, end: `${currentYear}-10-31` },
            q2: { start: `${currentYear}-11-01`, end: `${currentYear + 1}-01-31` },
            q3: { start: `${currentYear + 1}-02-01`, end: `${currentYear + 1}-04-30` },
            q4: { start: `${currentYear + 1}-05-01`, end: `${currentYear + 1}-07-31` },
        });
        setIsQuarterScheduleModalOpen(true);
    };

    const handleSaveQuarterSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        const updatedConfig = { ...config, quarterSchedule: scheduleForm };
        const { error } = await supabase.from('system_config').upsert({ id: 1, config: updatedConfig });
        if (!error) {
            setConfig(updatedConfig);
            setIsQuarterScheduleModalOpen(false);
            setNotice({ open: true, title: 'Saved', message: 'Quarter schedule saved successfully.', tone: 'success' });
        } else {
            setNotice({ open: true, title: 'Save Failed', message: `Error saving quarter schedule: ${error.message}`, tone: 'danger' });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof SystemConfig) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                handleConfigChange(field, base64);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- REPORT GENERATION LOGIC ---
    const generateReport = (type: 'Quarterly' | 'Annual') => {
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) { setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to generate the report.', tone: 'warning' }); return; }

        let filteredTxs: FinancialTransaction[] = [];
        let dateRangeText = '';
        
        if (type === 'Quarterly') {
            const sched = config.quarterSchedule?.[reportQuarter as keyof typeof config.quarterSchedule];
            if (!sched || !sched.start || !sched.end) {
                setNotice({ open: true, title: 'Quarter Schedule Required', message: 'Quarter dates are not configured. Set them in Settings first.', tone: 'warning' });
                printWindow.close();
                return;
            }
            dateRangeText = `${new Date(sched.start).toLocaleDateString()} - ${new Date(sched.end).toLocaleDateString()}`;
            filteredTxs = transactions.filter(t => t.status === 'Posted' && t.date >= sched.start && t.date <= sched.end);
        } else {
            // Annual: Match fiscal year or range
            dateRangeText = `Fiscal Year ${reportYear}`;
            filteredTxs = transactions.filter(t => t.status === 'Posted' && (t.fiscalYear === reportYear || new Date(t.date).getFullYear() === reportYear));
        }

        const collections = filteredTxs.filter(t => t.type === TransactionType.COLLECTION);
        const expenses = filteredTxs.filter(t => t.type === TransactionType.EXPENSE);
        
        const totalCollections = collections.reduce((s, t) => s + t.amount, 0);
        const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
        
        // Breakdown Logic
        const expenseBreakdown = Object.entries(expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>)).sort((a,b) => b[1] - a[1]);

        printWindow.document.write(`
            <html><head><title>${type} Financial Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #000; max-width: 8.5in; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .school-name { font-weight: 800; font-size: 14pt; text-transform: uppercase; }
                .rpt-title { font-weight: 800; font-size: 16pt; text-transform: uppercase; margin-top: 15px; }
                .rpt-meta { font-size: 11pt; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
                th, td { border: 1px solid #000; padding: 8px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .section-head { background-color: #f0f0f0; font-weight: bold; }
                .total-row { font-weight: bold; border-top: 2px solid #000; }
                .signatories { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; page-break-inside: avoid; }
                .sig-box { text-align: center; }
                .sig-line { border-top: 1px solid #000; width: 80%; margin: 40px auto 5px auto; font-weight: bold; text-transform: uppercase; }
                @media print { body { padding: 0; } .no-print { display: none; } }
            </style>
            </head><body>
                <div class="header">
                    ${config.logoUrl ? `<img src="${config.logoUrl}" style="height: 60px; margin-bottom: 10px;" />` : ''}
                    <div class="school-name">${config.schoolName}</div>
                    <div>School Parent-Teacher Association</div>
                    <div class="rpt-title">${type === 'Annual' ? 'Annual Financial Report' : 'Quarterly Financial Report'}</div>
                    <div class="rpt-meta">${dateRangeText}</div>
                </div>

                <table>
                    <thead>
                        <tr class="section-head"><th colspan="2">I. RECEIPTS / COLLECTIONS</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Total Collections (All Sources)</td><td class="text-right">₱${totalCollections.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
                    </tbody>
                    
                    <thead>
                        <tr class="section-head"><th colspan="2">II. DISBURSEMENTS / EXPENSES</th></tr>
                    </thead>
                    <tbody>
                        ${expenseBreakdown.map(([cat, amt]) => `<tr><td>${cat}</td><td class="text-right">₱${amt.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>`).join('')}
                        <tr class="total-row"><td>Total Disbursements</td><td class="text-right">₱${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
                    </tbody>

                    <thead>
                        <tr class="section-head"><th colspan="2">III. SUMMARY</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Total Receipts</td><td class="text-right">₱${totalCollections.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
                        <tr><td>Less: Total Disbursements</td><td class="text-right">(₱${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})})</td></tr>
                        <tr class="total-row"><td>NET CASH BALANCE</td><td class="text-right">₱${(totalCollections - totalExpenses).toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
                    </tbody>
                </table>

                <div class="signatories">
                    <div class="sig-box">
                        <div>Prepared by:</div>
                        <div class="sig-line">${config.financeSettings?.voucher?.prepared?.name || 'Treasurer'}</div>
                        <div>PTA Staff</div>
                    </div>
                    <div class="sig-box">
                        <div>Audited by:</div>
                        <div class="sig-line">${config.financeSettings?.audit?.examined?.name || 'Auditor'}</div>
                        <div>PTA Auditor</div>
                    </div>
                    <div class="sig-box" style="grid-column: span 2; margin-top: 30px;">
                        <div>Noted by:</div>
                        <div class="sig-line" style="width: 40%;">${config.financeSettings?.voucher?.approved?.name || 'President'}</div>
                        <div>PTA President / School Head</div>
                    </div>
                </div>
                <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); }<\/script>
            </body></html>
        `);
        printWindow.document.close();
    };

    return (
        <div className={embedded ? "bg-white" : "m3-card p-0 overflow-hidden"}>
            <div className="flex border-b border-[var(--md-sys-color-outline-variant)]">
                {['general', 'portal', 'signatories', 'reports'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)} 
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]' : 'border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                    >
                        {tab === 'portal' ? 'Public Portal' : tab}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Website / App Name" value={config.appName || ''} onChange={v => handleConfigChange('appName', v)} />
                            <InputGroup label="School Name" value={config.schoolName || ''} onChange={v => handleConfigChange('schoolName', v)} />
                            <InputGroup label="School ID" value={config.schoolId || ''} onChange={v => handleConfigChange('schoolId', v)} />
                            <InputGroup label="School Head / Principal" value={config.schoolHeadName || ''} onChange={v => handleConfigChange('schoolHeadName', v)} />
                            <InputGroup label="PTA President" value={config.ptaPresidentName || ''} onChange={v => handleConfigChange('ptaPresidentName', v)} />
                            <InputGroup label="PTA Staff" value={config.ptaTreasurerName || ''} onChange={v => handleConfigChange('ptaTreasurerName', v)} />
                            <InputGroup label="School Year" value={config.schoolYear || ''} onChange={v => handleConfigChange('schoolYear', v)} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase ml-1 mb-1">Logo URL / Upload</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        className="m3-input flex-1"
                                        value={config.logoUrl || ''}
                                        onChange={e => handleConfigChange('logoUrl', e.target.value)}
                                        placeholder="https://..."
                                    />
                                    <button onClick={() => logoInputRef.current?.click()} className="m3-btn-tonal px-3">
                                        <span className="material-symbols-outlined">upload</span>
                                    </button>
                                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrl')} />
                                </div>
                                {config.logoUrl && <img src={config.logoUrl} className="h-12 w-12 object-contain mt-2 border rounded" alt="Logo Preview" />}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase ml-1 mb-1">Favicon URL / Upload</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        className="m3-input flex-1"
                                        value={config.faviconUrl || ''}
                                        onChange={e => handleConfigChange('faviconUrl', e.target.value)}
                                        placeholder="https://..."
                                    />
                                    <button onClick={() => faviconInputRef.current?.click()} className="m3-btn-tonal px-3">
                                        <span className="material-symbols-outlined">upload</span>
                                    </button>
                                    <input type="file" ref={faviconInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'faviconUrl')} />
                                </div>
                                {config.faviconUrl && <img src={config.faviconUrl} className="h-8 w-8 object-contain mt-2 border rounded" alt="Favicon Preview" />}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase ml-1 mb-1">Footer Text</label>
                            <textarea 
                                className="m3-input w-full"
                                value={config.footerText || ''}
                                onChange={e => handleConfigChange('footerText', e.target.value)}
                                placeholder={`© ${new Date().getFullYear()} ${config.schoolName}. All rights reserved.`}
                                rows={2}
                            />
                        </div>

                        <div className="rounded-xl border border-[var(--deped-line)] bg-[var(--deped-canvas)] p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-[16px] font-bold text-[var(--deped-ink)]">Quarter Schedule</p>
                                    <p className="text-[13px] text-[var(--deped-muted)]">Manage official posting date ranges for quarterly finance reporting.</p>
                                </div>
                                <button type="button" onClick={openQuarterScheduleModal} className="m3-btn-primary whitespace-nowrap">
                                    Configure Quarter Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'portal' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Hero Title" value={config.portalHeroTitle || ''} onChange={v => handleConfigChange('portalHeroTitle', v)} />
                            <InputGroup label="Hero Subtitle" value={config.portalHeroSubtitle || ''} onChange={v => handleConfigChange('portalHeroSubtitle', v)} />
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800">Portal Features</h3>
                                <button onClick={addFeature} className="m3-btn-tonal text-xs">Add Feature Card</button>
                            </div>
                            <div className="space-y-4">
                                {(config.portalFeatures || []).map((feature, idx) => (
                                    <div key={idx} className="p-4 border border-[var(--md-sys-color-outline-variant)] rounded-xl relative">
                                        <button onClick={() => removeFeature(idx)} className="absolute top-2 right-2 text-red-500"><span className="material-symbols-outlined">close</span></button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <InputGroup 
                                                    label="Card Title" 
                                                    value={feature.title || ''} 
                                                    onChange={v => handleFeatureChange(idx, 'title', v)} 
                                            />
                                            <div>
                                                    <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] ml-1">Icon Name (Material Symbols)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text" 
                                                            className="m3-input w-full"
                                                            value={feature.icon || ''} 
                                                            onChange={e => handleFeatureChange(idx, 'icon', e.target.value)} 
                                                        />
                                                        <span className="material-symbols-outlined text-[var(--md-sys-color-primary)] text-2xl">{feature.icon}</span>
                                                    </div>
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                                <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] ml-1 mb-1">Description</label>
                                                <input 
                                                    type="text" 
                                                    className="m3-input w-full"
                                                    value={feature.description || ''} 
                                                    onChange={e => handleFeatureChange(idx, 'description', e.target.value)} 
                                                />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputGroup label="Link (Optional)" value={feature.link || ''} onChange={v => handleFeatureChange(idx, 'link', v)} />
                                            <div className="mb-3">
                                                <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase ml-1 mb-1">Color Theme</label>
                                                <select className="m3-input w-full" value={feature.colorTheme} onChange={e => handleFeatureChange(idx, 'colorTheme', e.target.value)}>
                                                    <option value="blue">Blue</option>
                                                    <option value="purple">Purple</option>
                                                    <option value="teal">Teal</option>
                                                    <option value="orange">Orange</option>
                                                    <option value="red">Red</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'signatories' && (
                    <div className="space-y-8">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            Configure the default names and titles that appear on printed forms and reports. You can override these during printing.
                        </div>

                        {/* Disbursement Voucher */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-500">receipt_long</span>
                                Disbursement Voucher
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SignatoryInput 
                                    label="Box A: Prepared By" 
                                    signatory={config.financeSettings?.voucher?.prepared || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('voucher', 'prepared', s)} 
                                />
                                <SignatoryInput 
                                    label="Box B: Certified By" 
                                    signatory={config.financeSettings?.voucher?.certified || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('voucher', 'certified', s)} 
                                />
                                <SignatoryInput 
                                    label="Box C: Approved By" 
                                    signatory={config.financeSettings?.voucher?.approved || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('voucher', 'approved', s)} 
                                />
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Liquidation Report */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-500">assignment_turned_in</span>
                                Liquidation Report
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SignatoryInput 
                                    label="Checked By" 
                                    signatory={config.financeSettings?.liquidation?.checked || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('liquidation', 'checked', s)} 
                                />
                                <SignatoryInput 
                                    label="Noted By" 
                                    signatory={config.financeSettings?.liquidation?.noted || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('liquidation', 'noted', s)} 
                                />
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Audit Certificate */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-500">policy</span>
                                Audit Certificate
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SignatoryInput 
                                    label="Examined By" 
                                    signatory={config.financeSettings?.audit?.examined || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('audit', 'examined', s)} 
                                />
                                <SignatoryInput 
                                    label="Noted By" 
                                    signatory={config.financeSettings?.audit?.noted || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('audit', 'noted', s)} 
                                />
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Daily Report */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-500">fact_check</span>
                                Daily Closing Report
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SignatoryInput 
                                    label="Prepared By" 
                                    signatory={config.financeSettings?.daily?.prepared || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('daily', 'prepared', s)} 
                                />
                                <SignatoryInput 
                                    label="Certified Correct" 
                                    signatory={config.financeSettings?.daily?.certified || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('daily', 'certified', s)} 
                                />
                                <SignatoryInput 
                                    label="Noted By" 
                                    signatory={config.financeSettings?.daily?.noted || { name: '', title: '' }} 
                                    onChange={s => handleSignatoryChange('daily', 'noted', s)} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="space-y-8">
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900 flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl">print</span>
                            <div>
                                <p className="font-bold">Administrative Reports</p>
                                <p>Generate printable high-level financial reports for submission and auditing.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Quarterly Report Card */}
                            <div className="border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-500">date_range</span>
                                    Quarterly Financial Report
                                </h3>
                                <p className="text-xs text-gray-500 mb-6">Generates collection vs. expense breakdown for a specific quarter.</p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select Quarter</label>
                                        <select 
                                            className="m3-input w-full"
                                            value={reportQuarter}
                                            onChange={e => setReportQuarter(e.target.value)}
                                        >
                                            <option value="q1">Quarter 1</option>
                                            <option value="q2">Quarter 2</option>
                                            <option value="q3">Quarter 3</option>
                                            <option value="q4">Quarter 4</option>
                                        </select>
                                    </div>
                                    <button onClick={() => generateReport('Quarterly')} className="m3-btn-primary w-full">Print Quarterly Report</button>
                                </div>
                            </div>

                            {/* Annual Report Card */}
                            <div className="border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-500">calendar_month</span>
                                    Year-End Financial Report
                                </h3>
                                <p className="text-xs text-gray-500 mb-6">Consolidated report of all financial activities for the fiscal year.</p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fiscal Year</label>
                                        <input 
                                            type="number"
                                            className="m3-input w-full"
                                            value={reportYear}
                                            onChange={e => setReportYear(parseInt(e.target.value))}
                                        />
                                    </div>
                                    <button onClick={() => generateReport('Annual')} className="m3-btn-primary w-full">Print Annual Report</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isQuarterScheduleModalOpen && createPortal(
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/55 p-4">
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
                            {['q1', 'q2', 'q3', 'q4'].map(q => {
                                const key = q as keyof QuarterSchedule;
                                return (
                                    <div key={key} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_1fr_1fr] md:items-center">
                                        <span className="text-[16px] font-bold text-slate-800">{key.toUpperCase()}</span>
                                        <input
                                            type="date"
                                            className="m3-input py-3 text-sm"
                                            value={scheduleForm[key].start}
                                            onChange={e => setScheduleForm({ ...scheduleForm, [key]: { ...scheduleForm[key], start: e.target.value } })}
                                            required
                                        />
                                        <input
                                            type="date"
                                            className="m3-input py-3 text-sm"
                                            value={scheduleForm[key].end}
                                            onChange={e => setScheduleForm({ ...scheduleForm, [key]: { ...scheduleForm[key], end: e.target.value } })}
                                            required
                                        />
                                    </div>
                                );
                            })}

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsQuarterScheduleModalOpen(false)} className="m3-btn-tonal">Cancel</button>
                                <button type="submit" className="m3-btn-primary">Save Schedule</button>
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
                onClose={() => setNotice(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};
