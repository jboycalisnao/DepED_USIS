import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Learner, Section, GradeLevel, SystemConfig } from '../types';
import { supabase, adminClient } from '../lib/supabaseClient';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';

interface LearnerProps {
  learners: Learner[];
  setLearners: any;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  config: SystemConfig;
  setConfig: any;
  readOnly?: boolean;
}

export const Learners: React.FC<LearnerProps> = ({ learners, sections, setSections, readOnly, config, setConfig }) => {
  const [schoolYears, setSchoolYears] = useState<Array<{ id: string; label: string; isActive: boolean }>>([]);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState('');
  const [isSwitchingSchoolYear, setIsSwitchingSchoolYear] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'families'>('sections');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Section Management Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [expandedModalGrades, setExpandedModalGrades] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });

  useEffect(() => {
    const loadSchoolYears = async () => {
      const { data, error } = await adminClient
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

      const active = mapped.find((row) => row.isActive) || mapped.find((row) => row.label === config.schoolYear) || mapped[0];
      if (active) setActiveSchoolYearId(active.id);
    };

    loadSchoolYears();
  }, [config.schoolYear]);

  const sectionsHaveSchoolYear = useMemo(
    () => sections.some((section) => Boolean(section.schoolYearId)),
    [sections],
  );

  const scopedSections = useMemo(() => {
    if (!sectionsHaveSchoolYear || !activeSchoolYearId) return sections;
    return sections.filter((section) => section.schoolYearId === activeSchoolYearId);
  }, [sections, sectionsHaveSchoolYear, activeSchoolYearId]);

  const activeSectionIds = useMemo(() => new Set(scopedSections.map((section) => section.id)), [scopedSections]);

  const scopedLearners = useMemo(() => {
    if (!sectionsHaveSchoolYear || !activeSchoolYearId) return learners;
    return learners.filter((learner) => activeSectionIds.has(learner.sectionId));
  }, [learners, sectionsHaveSchoolYear, activeSchoolYearId, activeSectionIds]);

  const toggleSection = (sectionId: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(sectionId)) newSet.delete(sectionId);
    else newSet.add(sectionId);
    setExpandedSections(newSet);
  };

  const toggleModalGrade = (grade: string) => {
    const newSet = new Set(expandedModalGrades);
    if (newSet.has(grade)) newSet.delete(grade);
    else newSet.add(grade);
    setExpandedModalGrades(newSet);
  };

  // --- Filter Logic for Sections View ---
  const filteredLearners = useMemo(() => {
      return scopedLearners.filter(l => 
        l.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.lrn.includes(searchTerm)
      );
  }, [scopedLearners, searchTerm]);

  // --- Grouping Logic for Family View ---
  const familyGroups = useMemo(() => {
      const groups: Record<string, Learner[]> = {};
      
      scopedLearners.forEach(l => {
          // Normalization: Key is Guardian Name (or Father/Mother if Guardian is missing)
          const rawKey = l.guardianName || l.fatherName || l.motherName || 'Unspecified';
          const key = rawKey.trim().toUpperCase();
          
          // Skip empty or generic placeholders if necessary, currently grouping them
          if (!groups[key]) groups[key] = [];
          groups[key].push(l);
      });

      let entries = Object.entries(groups);

      // Filter based on search (matches Guardian OR Child)
      if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          entries = entries.filter(([guardian, children]) => {
              const guardianMatch = guardian.toLowerCase().includes(lowerSearch);
              const childrenMatch = children.some(c => 
                  c.firstName.toLowerCase().includes(lowerSearch) || 
                  c.lastName.toLowerCase().includes(lowerSearch) ||
                  c.lrn.includes(lowerSearch)
              );
              return guardianMatch || childrenMatch;
          });
      }

      // Sort: Multiple children (Siblings) first, then Alphabetical
      return entries.sort((a, b) => {
          // Prioritize families with > 1 child
          if (a[1].length > 1 && b[1].length <= 1) return -1;
          if (b[1].length > 1 && a[1].length <= 1) return 1;
          
          // Then by count descending
          if (b[1].length !== a[1].length) return b[1].length - a[1].length;
          
          // Then alphabetical
          return a[0].localeCompare(b[0]);
      });
  }, [scopedLearners, searchTerm]);

  // Dynamic Grade Levels based on available sections
  const availableGradeLevels = useMemo(() => {
      const grades = new Set(scopedSections.map(s => s.gradeLevel));
      // Sort logic: prioritize Enum order, then alphanumeric
      const enumValues = Object.values(GradeLevel) as string[];
      
      return Array.from(grades).sort((a: string, b: string) => {
          const idxA = enumValues.indexOf(a);
          const idxB = enumValues.indexOf(b);
          
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          
          return a.localeCompare(b);
      });
  }, [scopedSections]);

  // Helper to get section name
  const getSectionName = (secId: string) => {
      const sec = scopedSections.find(s => s.id === secId);
      return sec ? `${sec.gradeLevel} - ${sec.name}` : 'Unassigned';
  };

  const handleSchoolYearChange = async (schoolYearId: string) => {
    if (!schoolYearId || schoolYearId === activeSchoolYearId || isSwitchingSchoolYear) return;
    setIsSwitchingSchoolYear(true);
    try {
      await adminClient.from('registrar_school_years').update({ is_active: false }).neq('id', schoolYearId);
      const { error: setActiveError } = await adminClient
        .from('registrar_school_years')
        .update({ is_active: true })
        .eq('id', schoolYearId);
      if (setActiveError) throw setActiveError;

      const selected = schoolYears.find((row) => row.id === schoolYearId);
      if (selected?.label) {
        const { data: currentConfigRow } = await adminClient
          .from('spta_system_config')
          .select('config')
          .eq('id', 1)
          .maybeSingle();
        const mergedConfig = {
          ...(currentConfigRow?.config || {}),
          schoolYear: selected.label
        };
        await adminClient.from('spta_system_config').upsert({ id: 1, config: mergedConfig }, { onConflict: 'id' });
        setConfig((prev: SystemConfig) => ({ ...prev, schoolYear: selected.label }));
      }

      setActiveSchoolYearId(schoolYearId);
      setSchoolYears((prev) => prev.map((row) => ({ ...row, isActive: row.id === schoolYearId })));
      setNotice({ open: true, title: 'School Year Updated', message: 'Active school year was switched using registrar school years.', tone: 'success' });
    } catch (error: any) {
      setNotice({ open: true, title: 'Update Failed', message: error?.message || 'Unable to switch active school year.', tone: 'danger' });
    } finally {
      setIsSwitchingSchoolYear(false);
    }
  };

  const isUUID = (str: string) => {
      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return regex.test(str);
  };

  const handleRegenerateCode = async (section: Section) => {
      // 1. Generate 6-digit numeric code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      let targetId = section.id;
      let performInsert = false;

      // 2. ID Validation & Sync Logic
      // If ID is NOT a UUID (e.g. "51qtqkfsb"), we cannot update the Admin DB directly.
      // We must find the real record or create it.
      if (!isUUID(section.id)) {
          // Check if this section already exists in Admin DB by Name + Grade
          const { data: existing } = await adminClient
              .from('sections')
              .select('id')
              .eq('name', section.name)
              .eq('gradeLevel', section.gradeLevel)
              .single();

          if (existing) {
              targetId = existing.id; // Use the REAL uuid for the DB update
          } else {
              performInsert = true; // Need to create it
          }
      }

      let error = null;

      if (performInsert) {
          // Insert new record with valid UUID
          const { data, error: insertError } = await adminClient.from('sections').insert({
              name: section.name,
              gradeLevel: section.gradeLevel,
              adviserName: section.adviserName,
              roomNumber: section.roomNumber,
              strand: section.strand,
              access_code: newCode
          }).select().single();
          
          if (data) targetId = data.id;
          error = insertError;
      } else {
          // Normal Update using valid UUID
          const res = await adminClient.from('sections').update({ access_code: newCode }).eq('id', targetId);
          error = res.error;
      }

      // 3. Fallback for UUID Column Constraint (in case AccessCode column itself is UUID typed)
      if (error && error.message && error.message.includes('invalid input syntax for type uuid')) {
          const uuidCode = crypto.randomUUID(); 
          const retry = await adminClient.from('sections').update({ access_code: uuidCode }).eq('id', targetId);
          error = retry.error;
          
          if (!error) {
              setNotice({ open: true, title: 'Access Code Format Notice', message: "Used a UUID access code because your database currently requires UUID. To use 6-digit numeric codes, change 'access_code' column type to TEXT.", tone: 'warning' });
              // Update local state with the UUID code, but keep original section ID to maintain student links
              setSections(prev => prev.map(s => s.id === section.id ? { ...s, accessCode: uuidCode } : s));
              return;
          }
      }

      if (!error) {
          // Update local state
          // NOTE: We do NOT update s.id to targetId here. 
          // We keep the original ID (e.g. "51qtqkfsb") so that the Learners list remains linked to this section in the UI.
          setSections(prev => prev.map(s => s.id === section.id ? { ...s, accessCode: newCode } : s));
      } else {
          setNotice({ open: true, title: 'Update Failed', message: `Error updating code: ${error.message}`, tone: 'danger' });
      }
  };

  const handlePrintAccessSlip = (section: Section) => {
      if (!section.accessCode) {
          setNotice({ open: true, title: 'Access Code Required', message: 'Please generate an access code first.', tone: 'warning' });
          return;
      }

      const printWindow = window.open('', '', 'height=600,width=800');
      if (!printWindow) {
          setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to print the adviser access slip.', tone: 'warning' });
          return;
      }

      const portalUrl = `${window.location.origin}/adviser`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}`;

      // Formatting based on code type
      const isNumeric = /^\d+$/.test(section.accessCode);
      const codeFontSize = isNumeric ? '48px' : (section.accessCode.length > 10 ? '14px' : '42px');
      const letterSpacing = isNumeric ? '12px' : (section.accessCode.length > 10 ? '1px' : '8px');

      printWindow.document.write(`
        <html><head><title>Adviser Access Slip</title>
        <style>
            @page { size: A5 landscape; margin: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; color: #1a1a1a; }
            .card { width: 90%; height: 90%; border: 4px solid #3c5ba9; border-radius: 20px; padding: 20px; display: flex; gap: 20px; box-sizing: border-box; position: relative; overflow: hidden; }
            .bg-watermark { position: absolute; top: -50px; right: -50px; opacity: 0.05; width: 300px; height: 300px; z-index: 0; pointer-events: none; }
            .col-info { flex: 1; z-index: 1; display: flex; flex-direction: column; justify-content: center; }
            .col-qr { width: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 2px dashed #ccc; padding-left: 20px; z-index: 1; }
            .header { margin-bottom: 20px; }
            .school-name { font-weight: 800; font-size: 14px; text-transform: uppercase; color: #3c5ba9; }
            .system-name { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
            .title { font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 5px; color: #000; }
            .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #888; margin-top: 10px; }
            .val-large { font-size: 18px; font-weight: 700; color: #000; }
            .code-box { background: #f0f4ff; border: 2px solid #3c5ba9; border-radius: 10px; padding: 10px 20px; margin-top: 15px; display: inline-block; word-break: break-all; }
            .code-val { font-family: 'Courier New', monospace; font-size: ${codeFontSize}; font-weight: 900; letter-spacing: ${letterSpacing}; color: #3c5ba9; }
            .adviser-name { font-size: 16px; font-weight: 600; color: #333; }
            .qr-img { width: 140px; height: 140px; border: 4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 8px; }
            .instr { font-size: 10px; text-align: center; margin-top: 10px; color: #555; line-height: 1.3; }
            .url { font-size: 9px; font-weight: bold; color: #3c5ba9; margin-top: 5px; text-decoration: underline; }
        </style>
        </head><body>
            <div class="card">
                ${config.logoUrl ? `<img src="${config.logoUrl}" class="bg-watermark" />` : ''}
                <div class="col-info">
                    <div class="header">
                        <div class="school-name">${config.schoolName}</div>
                        <div class="system-name">SPTA Management System</div>
                        <div class="title">Adviser Portal Access</div>
                    </div>
                    
                    <div class="label">Class Adviser</div>
                    <div class="adviser-name">${section.adviserName || 'Adviser'}</div>
                    
                    <div class="label">Grade & Section</div>
                    <div class="val-large">${section.name} (${section.gradeLevel})</div>
                    
                    <div class="label">Access PIN</div>
                    <div class="code-box">
                        <div class="code-val">${section.accessCode}</div>
                    </div>
                </div>
                <div class="col-qr">
                    <img src="${qrApiUrl}" class="qr-img" />
                    <div class="instr">
                        Scan to access your class collection report and learner list.
                    </div>
                    <div class="url">Portal > Adviser Access</div>
                </div>
            </div>
            <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Learner Registry</h2>
            <div className="flex gap-3 items-center">
                <div className="min-w-[240px]">
                    <UsisSearchableSelect
                        ariaLabel="Active School Year"
                        floatingLabel
                        label="Active School Year"
                        value={activeSchoolYearId}
                        onChange={handleSchoolYearChange}
                        disabled={isSwitchingSchoolYear || schoolYears.length === 0}
                        options={schoolYears.map((row) => ({
                          label: `${row.label}${row.isActive ? ' (Active)' : ''}`,
                          value: row.id
                        }))}
                    />
                </div>
                <button onClick={() => setIsSectionModalOpen(true)} className="m3-btn-tonal flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">vpn_key</span>
                    Manage Access Codes
                </button>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">cloud</span>
                    Synced
                </div>
            </div>
        </div>

        {/* Controls Container */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
                <input 
                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder={activeTab === 'sections' ? "Search by Name or LRN..." : "Search by Parent/Guardian..."}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('sections')}
                    className={`flex-1 pb-3 text-sm font-bold transition-colors relative ${activeTab === 'sections' ? 'text-[var(--md-sys-color-primary)]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">grid_view</span> By Grade / Section
                    </span>
                    {activeTab === 'sections' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--md-sys-color-primary)] rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('families')}
                    className={`flex-1 pb-3 text-sm font-bold transition-colors relative ${activeTab === 'families' ? 'text-[var(--md-sys-color-primary)]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">family_restroom</span> By Family
                    </span>
                    {activeTab === 'families' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--md-sys-color-primary)] rounded-t-full"></div>}
                </button>
            </div>
        </div>

        {/* --- PUROK SECTION VIEW --- */}
        {activeTab === 'sections' && (
            <div className="space-y-8 animate-fade-in">
                {availableGradeLevels.map(grade => {
                    const gradeSections = scopedSections.filter(s => s.gradeLevel === grade);
                    if (gradeSections.length === 0) return null;

                    return (
                        <div key={grade} className="space-y-3">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400">school</span>
                                {grade}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {gradeSections.map(section => {
                                    const students = filteredLearners.filter(l => l.sectionId === section.id);
                                    const isExpanded = expandedSections.has(section.id);
                                    const autoExpand = searchTerm.length > 0 && students.length > 0;
                                    const show = isExpanded || autoExpand;

                                    if (searchTerm && students.length === 0) return null; // Hide empty sections during search

                                    return (
                                        <div key={section.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <div 
                                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => toggleSection(section.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${show ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        <span className={`material-symbols-outlined transition-transform duration-200 ${show ? 'rotate-180' : ''}`}>expand_more</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-sm md:text-base">{section.name}</h4>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">person</span>
                                                            {section.adviserName || 'No Adviser Assigned'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {section.strand && (
                                                        <span className="hidden md:inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded uppercase border border-orange-100">
                                                            {section.strand}
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${students.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                        {students.length} Learner{students.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {show && (
                                                <div className="border-t border-gray-100 p-0 overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-6 py-3 font-medium">LRN</th>
                                                                <th className="px-6 py-3 font-medium">Name</th>
                                                                <th className="px-6 py-3 font-medium">Gender</th>
                                                                <th className="px-6 py-3 font-medium">Parent / Guardian</th>
                                                                <th className="px-6 py-3 font-medium">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {students.map(l => (
                                                                <tr key={l.id} className="hover:bg-blue-50/30 transition-colors">
                                                                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{l.lrn}</td>
                                                                    <td className="px-6 py-3 font-bold text-gray-700">{l.lastName}, {l.firstName}</td>
                                                                    <td className="px-6 py-3 text-gray-600">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${l.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                                                                            {l.gender}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-gray-600 text-sm">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium text-gray-800">{l.guardianName}</span>
                                                                            {l.contactNumber && l.contactNumber !== 'N/A' && (
                                                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                                    <span className="material-symbols-outlined text-[10px]">call</span>
                                                                                    {l.contactNumber}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${l.status === 'Enrolled' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                            {l.status === 'Enrolled' ? 'Active' : l.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {availableGradeLevels.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">school</span>
                        <p>No grades or sections found.</p>
                    </div>
                )}
            </div>
        )}

        {/* --- FAMILY GROUP VIEW --- */}
        {activeTab === 'families' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                {familyGroups.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-2 opacity-50">diversity_1</span>
                        <p>No families found matching your search.</p>
                    </div>
                )}
                
                {familyGroups.map(([guardian, children], idx) => {
                    const isSiblings = children.length > 1;
                    return (
                        <div 
                            key={idx} 
                            className={`rounded-xl border bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col ${isSiblings ? 'border-blue-200 shadow-sm' : 'border-gray-200'}`}
                        >
                            <div className={`p-4 flex justify-between items-center ${isSiblings ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${isSiblings ? 'bg-blue-600' : 'bg-gray-400'}`}>
                                        {guardian.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm truncate max-w-[180px]" title={guardian}>{guardian}</h4>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                                            {isSiblings ? 'Multi-Learner Family' : 'Parent / Guardian'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isSiblings ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                                    {children.length} {children.length === 1 ? 'Learner' : 'Learners'}
                                </span>
                            </div>
                            
                            <div className="p-0 flex-1">
                                <ul className="divide-y divide-gray-100">
                                    {children.map(child => (
                                        <li key={child.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-8 rounded-full ${child.gender === 'Female' ? 'bg-pink-300' : 'bg-blue-300'}`}></div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800">{child.firstName} {child.lastName}</p>
                                                    <p className="text-xs text-gray-500">{getSectionName(child.sectionId)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 block mb-0.5">{child.lrn}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            {isSiblings && (
                                <div className="p-2 bg-blue-50 text-center border-t border-blue-100">
                                    <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-sm">savings</span>
                                        Sibling Records Linked
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        {/* SECTION MANAGEMENT MODAL */}
        {isSectionModalOpen && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[28px] w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] animate-fade-in overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Adviser Access Management</h3>
                            <p className="text-sm text-gray-500">Manage Adviser credentials and print access slips.</p>
                        </div>
                        <button onClick={() => setIsSectionModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0 bg-gray-50">
                        {availableGradeLevels.map(grade => {
                            const gradeSections = scopedSections.filter(s => s.gradeLevel === grade);
                            if (gradeSections.length === 0) return null;
                            
                            const isExpanded = expandedModalGrades.has(grade);
                            
                            return (
                                <div key={grade} className="bg-white border-b border-gray-200 mb-1 last:mb-0 shadow-sm">
                                    <button 
                                        onClick={() => toggleModalGrade(grade)}
                                        className={`w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                <span className={`material-symbols-outlined transition-transform duration-200 text-lg ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                            </div>
                                            <h4 className="font-bold text-gray-800 text-sm">{grade}</h4>
                                        </div>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold">{gradeSections.length} Section{gradeSections.length !== 1 ? 's' : ''}</span>
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 animate-fade-in">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-white text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                                                    <tr>
                                                        <th className="p-3 pl-14">Section Name</th>
                                                        <th className="p-3">Adviser</th>
                                                        <th className="p-3 text-center">Access PIN</th>
                                                        <th className="p-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-5">
                                                    {gradeSections.map(s => (
                                                        <tr key={s.id} className="hover:bg-blue-50/20">
                                                            <td className="p-3 pl-14 font-medium text-gray-800">
                                                                {s.name}
                                                                {s.strand && <span className="ml-2 font-bold text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">{s.strand}</span>}
                                                            </td>
                                                            <td className="p-3 text-gray-600 text-sm">{s.adviserName || 'N/A'}</td>
                                                            <td className="p-3 text-center">
                                                                {s.accessCode ? (
                                                                    <span className={`font-mono text-sm font-bold px-2 py-1 rounded border tracking-widest ${/^\d+$/.test(s.accessCode) ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                                        {s.accessCode.length > 8 ? s.accessCode.substring(0,8)+'...' : s.accessCode}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 italic">Not Generated</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleRegenerateCode(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs font-bold border border-blue-100" title="Generate New 6-Digit PIN">
                                                                        <span className="material-symbols-outlined text-lg">autorenew</span>
                                                                    </button>
                                                                    <button onClick={() => handlePrintAccessSlip(s)} className="p-1.5 bg-[var(--md-sys-color-primary)] text-white hover:opacity-90 rounded text-xs font-bold flex items-center gap-1 shadow-sm" disabled={!s.accessCode}>
                                                                        <span className="material-symbols-outlined text-lg">print</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {scopedSections.length === 0 && (
                            <div className="p-12 text-center text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">school</span>
                                <p>No sections found for the active school year.</p>
                            </div>
                        )}
                    </div>
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


