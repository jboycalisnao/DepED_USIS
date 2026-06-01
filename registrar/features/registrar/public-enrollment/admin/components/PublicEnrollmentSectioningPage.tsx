import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { SearchableSelect } from '../../../../../components/ui/SearchableSelect';
import type { EnrollmentDraft, PublicEnrollmentSubmission } from '../../types';
import { validateSectioningAccessCode } from '../../services/sectioningAccessCodes';
import { updatePublicEnrollmentSubmissionRecord } from '../../services/publicEnrollmentSubmissions';
import { useStore } from '../../../../../store';
import { RegistrarHeader } from '../../../../../components/shell/RegistrarHeader';
import { RegistrarFooter } from '../../../../../components/shell/RegistrarFooter';

type SectionOption = { id: string; name: string };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function PublicEnrollmentSectioningPage() {
  const { registrarAccess } = useStore();
  const schoolId = String(registrarAccess?.schoolId || '302522').trim();

  const [isLoading, setIsLoading] = useState(true);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [unlockedGradeLevel, setUnlockedGradeLevel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<PublicEnrollmentSubmission[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionBySubmission, setSelectedSectionBySubmission] = useState<Record<string, string>>({});
  const [currentSectionBySubmission, setCurrentSectionBySubmission] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadActiveSchoolYear = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('registrar_school_years')
      .select('label')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    setActiveSchoolYear(String((data as any)?.label || '').trim());
    setIsLoading(false);
  };

  useEffect(() => {
    void loadActiveSchoolYear();
  }, []);

  const loadGradeData = async (gradeLevel: string, schoolYear: string) => {
    const [{ data: submissionRows }, { data: syRow }] = await Promise.all([
      supabase
        .from('registrar_public_enrollment_submissions')
        .select('id,submission_reference_id,created_at,school_id,school_year,lrn,last_name,first_name,middle_name,grade_to_enroll,guardian_contact,payload')
        .eq('school_year', schoolYear)
        .eq('grade_to_enroll', gradeLevel)
        .order('created_at', { ascending: false }),
      supabase.from('registrar_school_years').select('id').eq('label', schoolYear).limit(1).maybeSingle(),
    ]);

    const schoolYearId = String((syRow as any)?.id || '').trim();
    let nextSections: SectionOption[] = [];
    if (schoolYearId) {
      const { data: sectionRows } = await supabase
        .from('registrar_sections')
        .select('id,name')
        .eq('school_year_id', schoolYearId)
        .eq('grade_level', gradeLevel)
        .order('name', { ascending: true });
      nextSections = (sectionRows || []).map((row: any) => ({ id: String(row.id || ''), name: String(row.name || '') }));
    }

    const rows = (submissionRows || []) as PublicEnrollmentSubmission[];
    const lrnList = Array.from(
      new Set(
        rows
          .map((row) => String(row.lrn || '').trim())
          .filter(Boolean),
      ),
    );

    const nextCurrentSectionBySubmission: Record<string, string> = {};
    if (lrnList.length) {
      const { data: learnerRows } = await supabase
        .from('registrar_learners')
        .select('lrn,section_id')
        .in('lrn', lrnList);

      const sectionIds = Array.from(
        new Set(
          (learnerRows || [])
            .map((row: any) => String(row.section_id || '').trim())
            .filter(Boolean),
        ),
      );

      const sectionNameById: Record<string, string> = {};
      if (sectionIds.length) {
        const { data: sectionNameRows } = await supabase
          .from('registrar_sections')
          .select('id,name')
          .in('id', sectionIds);
        for (const sectionRow of sectionNameRows || []) {
          const key = String((sectionRow as any).id || '').trim();
          if (key) sectionNameById[key] = String((sectionRow as any).name || '').trim();
        }
      }

      const learnerSectionByLrn: Record<string, string> = {};
      for (const learnerRow of learnerRows || []) {
        const lrn = String((learnerRow as any).lrn || '').trim();
        const sectionId = String((learnerRow as any).section_id || '').trim();
        if (!lrn) continue;
        learnerSectionByLrn[lrn] = sectionNameById[sectionId] || '--';
      }

      for (const row of rows) {
        const lrn = String(row.lrn || '').trim();
        nextCurrentSectionBySubmission[row.id] = lrn ? learnerSectionByLrn[lrn] || '--' : '--';
      }
    } else {
      for (const row of rows) nextCurrentSectionBySubmission[row.id] = '--';
    }

    setSubmissions(rows);
    setSections(nextSections);
    setCurrentSectionBySubmission(nextCurrentSectionBySubmission);
    setSelectedSectionBySubmission(() => {
      const initial: Record<string, string> = {};
      for (const row of rows) {
        const payload = (row.payload || {}) as any;
        initial[row.id] = String(payload.assignedSectionId || '').trim();
      }
      return initial;
    });
  };

  const unlock = async () => {
    setErrorMessage(null);
    if (!activeSchoolYear) {
      setErrorMessage('Active school year is unavailable.');
      return;
    }
    const row = await validateSectioningAccessCode({
      schoolId,
      schoolYear: activeSchoolYear,
      accessCode,
    });
    if (!row?.grade_level) {
      setErrorMessage('Invalid access code for the active school year.');
      return;
    }
    setUnlockedGradeLevel(row.grade_level);
    await loadGradeData(row.grade_level, activeSchoolYear);
  };

  const assignSection = async (row: PublicEnrollmentSubmission) => {
    const selectedSectionId = String(selectedSectionBySubmission[row.id] || '').trim();
    if (!selectedSectionId) {
      setErrorMessage('Please select a section before saving.');
      return;
    }
    const selectedSection = sections.find((entry) => entry.id === selectedSectionId);
    if (!selectedSection) {
      setErrorMessage('Selected section is invalid.');
      return;
    }

    setSavingId(row.id);
    setErrorMessage(null);
    try {
      const { data: sectionInfo, error: sectionInfoError } = await supabase
        .from('registrar_sections')
        .select('id,name,school_year_id,grade_level')
        .eq('id', selectedSectionId)
        .maybeSingle();
      if (sectionInfoError || !sectionInfo) throw new Error('Selected section is invalid.');

      const { data: schoolYearInfo } = await supabase
        .from('registrar_school_years')
        .select('label')
        .eq('id', String((sectionInfo as any).school_year_id || '').trim())
        .maybeSingle();

      const payload = (row.payload || {}) as EnrollmentDraft & Record<string, any>;
      const nextPayload = {
        ...payload,
        assignedSectionId: selectedSectionId,
        assignedSectionName: selectedSection.name,
        assignedSectionAt: new Date().toISOString(),
        assignedSectionBy: 'Teacher Sectioning Access',
      } as EnrollmentDraft;

      const lrn = String(row.lrn || payload.lrn || '').trim();
      if (!lrn) throw new Error('LRN is required before assigning section.');

      const { data: existingLearner } = await supabase
        .from('registrar_learners')
        .select('id')
        .eq('lrn', lrn)
        .maybeSingle();

      const upsertPayload: Record<string, any> = {
        id: existingLearner?.id || crypto.randomUUID(),
        lrn,
        first_name: String(row.first_name || payload.firstName || '').trim() || null,
        middle_name: String(row.middle_name || payload.middleName || '').trim() || null,
        last_name: String(row.last_name || payload.lastName || '').trim() || null,
        birth_date: String(payload.birthDate || '').trim() || null,
        gender: String(payload.gender || '').trim() || null,
        address: String(payload.currentAddress || payload.permanentAddress || '').trim() || null,
        contact_number: String(payload.learnerContact || row.guardian_contact || payload.guardianContact || '').trim() || null,
        guardian_name: String(payload.guardianName || '').trim() || null,
        father_name: String(payload.fatherName || '').trim() || null,
        mother_name: String(payload.motherName || '').trim() || null,
        status: 'Enrolled',
        section_id: selectedSectionId,
        school_id: String(row.school_id || payload.schoolId || schoolId).trim() || null,
        email: String(payload.email || '').trim() || null,
      };

      const { error: upsertError } = await supabase.from('registrar_learners').upsert(upsertPayload, { onConflict: 'lrn' });
      if (upsertError) throw upsertError;

      const { data: resolvedLearner } = await supabase.from('registrar_learners').select('id').eq('lrn', lrn).maybeSingle();
      const resolvedLearnerId = String((resolvedLearner as any)?.id || existingLearner?.id || '').trim();
      if (!resolvedLearnerId) throw new Error('Unable to resolve learner id for enrollment history.');

      await supabase.from('registrar_enrollment_history').insert({
        learner_id: resolvedLearnerId,
        school_year: String(schoolYearInfo?.label || row.school_year || payload.schoolYear || '').trim(),
        grade_level: String(row.grade_to_enroll || payload.gradeToEnroll || (sectionInfo as any).grade_level || '').trim() || null,
        section: String((sectionInfo as any).name || selectedSection.name || '').trim() || null,
        status: 'Section Assigned',
        enrollment_date: new Date().toISOString(),
        submission_payload: nextPayload,
        source: 'registrar.sectioning',
      });

      await updatePublicEnrollmentSubmissionRecord(row.id, {
        school_id: row.school_id,
        school_year: row.school_year,
        lrn: row.lrn,
        last_name: row.last_name,
        first_name: row.first_name,
        middle_name: row.middle_name,
        grade_to_enroll: row.grade_to_enroll,
        guardian_contact: row.guardian_contact,
        payload: nextPayload,
      });

      setSubmissions((current) =>
        current.map((entry) => (entry.id === row.id ? { ...entry, payload: nextPayload } : entry)),
      );
      setCurrentSectionBySubmission((current) => ({ ...current, [row.id]: selectedSection.name }));
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to save section assignment.');
    } finally {
      setSavingId(null);
    }
  };

  const gradeSummary = useMemo(() => {
    if (!unlockedGradeLevel) return '';
    return `${unlockedGradeLevel} - ${activeSchoolYear}`;
  }, [unlockedGradeLevel, activeSchoolYear]);

  const filteredSubmissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return submissions;
    return submissions.filter((row) => {
      const learner = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ').toLowerCase();
      const lrn = String(row.lrn || '').toLowerCase();
      const referenceId = String(row.submission_reference_id || '').toLowerCase();
      const assignedSection = String((row.payload as any)?.assignedSectionName || '').toLowerCase();
      return learner.includes(normalized) || lrn.includes(normalized) || referenceId.includes(normalized) || assignedSection.includes(normalized);
    });
  }, [query, submissions]);

  if (isLoading) return <UsisPageLoader message="Loading sectioning access..." />;

  return (
    <>
      <RegistrarHeader />
      <main className="page-frame registrar-public-enrollment">
        <div className="content-width">
          <section className="section-shell">
            <section className="portal-panel registrar-public-enrollment-submissions registrar-sectioning-page">
              <header className="portal-panel__header">
                <h2>Teacher Sectioning Access</h2>
                <p>Use your grade-level access code to view and assign online submissions.</p>
              </header>

              <div className="portal-panel__body" style={{ display: 'grid', gap: 12 }}>
                {!unlockedGradeLevel ? (
                  <div className="form-grid" style={{ gridTemplateColumns: 'minmax(260px, 1fr) auto' }}>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} placeholder=" " />
                        <span>Sectioning Access Code</span>
                      </div>
                    </label>
                    <button type="button" className="secondary-button" style={{ minHeight: 56 }} onClick={() => void unlock()}>
                      Open Sectioning Page
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="status-badge status-badge--open" style={{ minHeight: 42, display: 'inline-flex', alignItems: 'center' }}>
                      {gradeSummary}
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'minmax(260px, 1fr) auto', alignItems: 'stretch' }}>
                      <label className="floating-field">
                        <div className="floating-field__control">
                          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder=" " />
                          <span>Search learner / LRN / reference / section</span>
                        </div>
                      </label>
                      <div className="status-badge" style={{ minHeight: 56, display: 'inline-flex', alignItems: 'center' }}>
                        {filteredSubmissions.length} shown
                      </div>
                    </div>
                    <div className="table-card">
                      <table className="usis-table" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px 10px' }}>Date</th>
                            <th style={{ padding: '8px 10px' }}>Submission Ref</th>
                            <th style={{ padding: '8px 10px' }}>Learner</th>
                            <th style={{ padding: '8px 10px' }}>LRN</th>
                            <th style={{ padding: '8px 10px', minWidth: 150 }}>Current Section</th>
                            <th style={{ padding: '8px 10px', minWidth: 260 }}>Assign Section</th>
                            <th style={{ padding: '8px 10px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubmissions.length ? (
                            filteredSubmissions.map((row) => {
                              const learner = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(', ') || '--';
                              const isSavingRow = savingId === row.id;
                              const hasCurrentSection = String(currentSectionBySubmission[row.id] || '').trim() !== '' && String(currentSectionBySubmission[row.id] || '').trim() !== '--';
                              return (
                                <tr key={row.id}>
                                  <td style={{ padding: '7px 10px' }}>{formatDate(row.created_at)}</td>
                                  <td style={{ padding: '7px 10px' }}>{row.submission_reference_id || '--'}</td>
                                  <td style={{ padding: '7px 10px' }}>{learner}</td>
                                  <td style={{ padding: '7px 10px' }}>{row.lrn || '--'}</td>
                                  <td style={{ padding: '7px 10px' }}>{currentSectionBySubmission[row.id] || '--'}</td>
                                  <td style={{ padding: '7px 10px', minWidth: 260 }}>
                                    <SearchableSelect
                                      label="Section"
                                      placeholder="Select section"
                                      floatingLabel
                                      showLabel={false}
                                      value={selectedSectionBySubmission[row.id] || ''}
                                      onChange={(value) => setSelectedSectionBySubmission((current) => ({ ...current, [row.id]: value }))}
                                      options={sections.map((section) => ({ value: section.id, label: section.name }))}
                                      disabled={hasCurrentSection}
                                    />
                                  </td>
                                  <td style={{ padding: '7px 10px' }}>
                                    <button type="button" className="secondary-button" onClick={() => void assignSection(row)} disabled={isSavingRow || hasCurrentSection} style={{ minHeight: 34, padding: '0 10px' }}>
                                      {isSavingRow ? 'Saving...' : 'Save'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ padding: '8px 10px' }}>No submissions found for this grade level.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {errorMessage ? <p style={{ margin: 0, color: 'var(--deped-red)', fontSize: 13 }}>{errorMessage}</p> : null}
              </div>
            </section>
          </section>
        </div>
      </main>
      <RegistrarFooter />
    </>
  );
}
