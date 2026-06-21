import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { SearchableSelect } from '../../../../../components/ui/SearchableSelect';
import type { EnrollmentDraft, PublicEnrollmentSubmission } from '../../types';
import { validateSectioningAccessCode } from '../../services/sectioningAccessCodes';
import { updatePublicEnrollmentSubmissionRecord } from '../../services/publicEnrollmentSubmissions';
import { logEnrollmentBandwidthEstimate } from '../../utils/enrollmentBandwidthLog';
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
  const { registrarAccess, activeSchoolYear: storeActiveSchoolYear, sections: storeSections, learners: storeLearners } = useStore();
  const schoolId = String(registrarAccess?.schoolId || '302522').trim();

  const isLoading = false;
  const [accessCode, setAccessCode] = useState('');
  const [unlockedGradeLevel, setUnlockedGradeLevel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<PublicEnrollmentSubmission[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionBySubmission, setSelectedSectionBySubmission] = useState<Record<string, string>>({});
  const [currentSectionBySubmission, setCurrentSectionBySubmission] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadGradeData = async (gradeLevel: string, schoolYear: string) => {
    const { data: submissionRows } = await supabase
      .from('registrar_public_enrollment_submissions')
      .select('id,submission_reference_id,created_at,school_id,school_year,lrn,last_name,first_name,middle_name,grade_to_enroll,guardian_contact,payload')
      .eq('school_year', schoolYear)
      .eq('grade_to_enroll', gradeLevel)
      .order('created_at', { ascending: false });

    const nextSections: SectionOption[] = storeSections
      .filter((section) => section.schoolYearId === storeActiveSchoolYear.id && section.gradeLevel === gradeLevel)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((section) => ({ id: section.id, name: section.name }));

    const rows = (submissionRows || []) as PublicEnrollmentSubmission[];

    const nextCurrentSectionBySubmission: Record<string, string> = {};
    const sectionNameById: Record<string, string> = storeSections.reduce((acc, section) => {
      acc[section.id] = section.name;
      return acc;
    }, {} as Record<string, string>);
    const learnerSectionByLrn: Record<string, string> = storeLearners.reduce((acc, learner) => {
      const lrn = String(learner.lrn || '').trim();
      const sectionId = String(learner.sectionId || '').trim();
      if (!lrn) return acc;
      acc[lrn] = sectionNameById[sectionId] || '--';
      return acc;
    }, {} as Record<string, string>);

    for (const row of rows) {
      const lrn = String(row.lrn || '').trim();
      nextCurrentSectionBySubmission[row.id] = lrn ? learnerSectionByLrn[lrn] || '--' : '--';
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
    const activeSchoolYear = String(storeActiveSchoolYear.label || '').trim();
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
      const payload = (row.payload || {}) as EnrollmentDraft & Record<string, any>;
      const activeSchoolYear = String(storeActiveSchoolYear.label || '').trim();
      const nextPayload = {
        ...payload,
        assignedSectionId: selectedSectionId,
        assignedSectionName: selectedSection.name,
        assignedSectionAt: new Date().toISOString(),
        assignedSectionBy: 'Teacher Sectioning Access',
      } as EnrollmentDraft;

      const lrn = String(row.lrn || payload.lrn || '').trim();
      if (!lrn) throw new Error('LRN is required before assigning section.');

      const cachedLearner = storeLearners.find((entry) => String(entry.lrn || '').trim() === lrn);
      let resolvedLearnerId = String(cachedLearner?.id || '').trim();
      if (!resolvedLearnerId) {
        const { data: existingLearner } = await supabase
          .from('registrar_learners')
          .select('id')
          .eq('lrn', lrn)
          .maybeSingle();
        resolvedLearnerId = String((existingLearner as any)?.id || '').trim();
      }
      if (!resolvedLearnerId) {
        resolvedLearnerId = crypto.randomUUID();
      }

      const upsertPayload: Record<string, any> = {
        id: resolvedLearnerId || crypto.randomUUID(),
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

      await supabase.from('registrar_enrollment_history').insert({
        learner_id: resolvedLearnerId,
        school_year: activeSchoolYear || String(row.school_year || payload.schoolYear || '').trim(),
        grade_level: String(unlockedGradeLevel || row.grade_to_enroll || payload.gradeToEnroll || '').trim() || null,
        section: String(selectedSection.name || '').trim() || null,
        status: 'Enrolled',
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

      logEnrollmentBandwidthEstimate({
        action: 'Submission section assigned',
        meta: {
          submissionId: row.id,
          learnerId: resolvedLearnerId,
          schoolYear: activeSchoolYear || String(row.school_year || payload.schoolYear || '').trim() || 'unscoped',
          source: 'registrar-sectioning',
        },
        request: {
          learnerUpsert: upsertPayload,
          enrollmentHistoryEntry: {
            learner_id: resolvedLearnerId,
            school_year: activeSchoolYear || String(row.school_year || payload.schoolYear || '').trim() || '',
            grade_level: String(unlockedGradeLevel || row.grade_to_enroll || payload.gradeToEnroll || '').trim() || null,
            section: String(selectedSection.name || '').trim() || null,
            status: 'Enrolled',
            submission_payload: nextPayload,
            source: 'registrar.sectioning',
          },
          submissionUpdate: {
            school_id: row.school_id,
            school_year: row.school_year,
            lrn: row.lrn,
            last_name: row.last_name,
            first_name: row.first_name,
            middle_name: row.middle_name,
            grade_to_enroll: row.grade_to_enroll,
            guardian_contact: row.guardian_contact,
            payload: nextPayload,
          },
        },
        response: {
          submissionId: row.id,
          learnerId: resolvedLearnerId,
          section: selectedSection.name,
        },
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
    return `${unlockedGradeLevel} - ${String(storeActiveSchoolYear.label || '').trim()}`;
  }, [unlockedGradeLevel, storeActiveSchoolYear.label]);

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
