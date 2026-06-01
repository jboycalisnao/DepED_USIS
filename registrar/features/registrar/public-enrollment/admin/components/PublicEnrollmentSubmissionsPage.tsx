import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicEnrollmentSubmissions } from '../../hooks/usePublicEnrollmentSubmissions';
import { useStore } from '../../../../../store';
import { supabase } from '../../../../../lib/supabase';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { SearchableSelect } from '../../../../../components/ui/SearchableSelect';
import ConfirmationModal from '../../../../../components/ConfirmationModal';
import TopCenterAlert from '../../../../../components/TopCenterAlert';
import type { EnrollmentDraft, PublicEnrollmentSubmission } from '../../types';
import {
  createPublicEnrollmentSubmissionRecord,
  deletePublicEnrollmentSubmissionRecord,
  updatePublicEnrollmentSubmissionRecord,
} from '../../services/publicEnrollmentSubmissions';
import {
  generateSectioningAccessCode,
  listSectioningAccessCodes,
  type SectioningAccessCodeRow,
} from '../../services/sectioningAccessCodes';
import { publishEnrollmentKioskState, type EnrollmentKioskSelectedLearner } from '../../kiosk/enrollmentKioskSync';
import { validatePublicEnrollmentDraft } from '../../utils/validation';
import {
  deviceOptions,
  gradeLevelOptions,
  learnerCategoryOptions,
  modalityOptions,
  religionOptions,
  semesterOptions,
  studentTypeOptions,
} from '../../data/enrollmentOptions';
import '../../../../../styles/publicEnrollment.css';

const SAME_SCHOOL_LABEL = 'Same School';
const SHS_GRADES = new Set(['Grade 11', 'Grade 12']);
const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));

function normalizeLearnerType(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'new student' || normalized === 'new learner') return 'New Learner';
  if (normalized === 'continuing student' || normalized === 'continuing learner') return 'Continuing Learner';
  if (normalized === 'transferee student' || normalized === 'transferee learner') return 'Transferee Learner';
  return value;
}
type SubmissionAuditEntry = {
  id: string;
  action: string;
  at: string;
  detail: string;
};

type PriorYearLearner = EnrollmentKioskSelectedLearner;
type PriorLearnerEditorRecord = {
  id: string;
  schoolId: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeSchoolYear(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/^sy\s*/i, '').replace(/\s+/g, ' ');
  const match = normalized.match(/(20\d{2})\s*[-–]\s*(20\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return normalized.toLowerCase();
}

const insertEnrollmentHistoryRow = async (input: {
  learnerId: string;
  schoolYear: string;
  gradeLevel?: string;
  section?: string;
  status: string;
  submissionPayload?: Record<string, any>;
}) => {
  await supabase.from('registrar_enrollment_history').insert({
    learner_id: input.learnerId,
    school_year: input.schoolYear || '',
    grade_level: input.gradeLevel || null,
    section: input.section || null,
    status: input.status,
    enrollment_date: new Date().toISOString(),
    submission_payload: input.submissionPayload || {},
    source: 'registrar.public-enrollment',
  });
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}


const emptyDraft = (schoolId: string): EnrollmentDraft => ({
  schoolId,
  schoolYear: '',
  schoolToEnroll: '',
  studentType: studentTypeOptions[0],
  learnerCategory: learnerCategoryOptions[0],
  previousSchool: '',
  previousSchoolYear: '',
  lastGradeLevel: '',
  gradeToEnroll: '',
  track: 'Academic Track',
  strand: '',
  semester: '',
  birthCertificateNo: '',
  lrn: '',
  email: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
  birthDate: '',
  gender: 'Male',
  placeOfBirth: '',
  height: '',
  weight: '',
  learnerContact: '',
  motherTongue: '',
  religion: religionOptions[0],
  is4Ps: 'No',
  fourPsHouseholdId: '',
  currentAddress: '',
  permanentAddress: '',
  fatherName: '',
  fatherContact: '',
  motherName: '',
  motherContact: '',
  guardianName: '',
  guardianContact: '',
  hasSpedNeed: 'No',
  preferredModality: modalityOptions[0],
  deviceAccess: deviceOptions[0],
  hasInternet: 'Yes',
  consent: true,
});

const appendSubmissionAudit = (payload: EnrollmentDraft, entry: Omit<SubmissionAuditEntry, 'id' | 'at'>): EnrollmentDraft => {
  const currentPayload = (payload || {}) as any;
  const currentTrail = Array.isArray(currentPayload.auditTrail) ? currentPayload.auditTrail : [];
  const nextEntry: SubmissionAuditEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    action: entry.action,
    detail: entry.detail,
  };
  return {
    ...currentPayload,
    auditTrail: [...currentTrail, nextEntry],
  } as EnrollmentDraft;
};

export default function PublicEnrollmentSubmissionsPage() {
  const navigate = useNavigate();
  const { registrarAccess, refreshData, availableStrands } = useStore();
  const schoolId = registrarAccess?.schoolId || '302522';
  const submissionsScopeKey = registrarAccess?.schoolUuid || schoolId;
  const { submissions, isLoading, errorMessage, refresh } = usePublicEnrollmentSubmissions(submissionsScopeKey);
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<PublicEnrollmentSubmission | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollingSubmission, setEnrollingSubmission] = useState<PublicEnrollmentSubmission | null>(null);
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [topAlert, setTopAlert] = useState<{ title: string; message: string } | null>(null);
  const [existingLearnerLrns, setExistingLearnerLrns] = useState<Set<string>>(new Set());
  const [learnerEnrollmentYearsByLrn, setLearnerEnrollmentYearsByLrn] = useState<Record<string, Set<string>>>({});
  const [collapsedGrades, setCollapsedGrades] = useState<Record<string, boolean>>({});
  const [pendingDeleteSubmissionId, setPendingDeleteSubmissionId] = useState<string | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [draftEditor, setDraftEditor] = useState<EnrollmentDraft>(() => emptyDraft(schoolId));
  const [activeSchoolYearLabel, setActiveSchoolYearLabel] = useState('');
  const [priorYearLearners, setPriorYearLearners] = useState<PriorYearLearner[]>([]);
  const [priorLearnerLookup, setPriorLearnerLookup] = useState('');
  const [selectedPriorLearnerId, setSelectedPriorLearnerId] = useState('');
  const [editorMode, setEditorMode] = useState<'submission' | 'priorLearner'>('submission');
  const [editingPriorLearner, setEditingPriorLearner] = useState<PriorLearnerEditorRecord | null>(null);
  const [isSectioningAccessModalOpen, setIsSectioningAccessModalOpen] = useState(false);
  const [sectioningCodes, setSectioningCodes] = useState<SectioningAccessCodeRow[]>([]);
  const [sectioningGradeLevels, setSectioningGradeLevels] = useState<string[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState<string | null>(null);
  const [sendingEmailSubmissionId, setSendingEmailSubmissionId] = useState<string | null>(null);
  const isEditorSeniorHighTargetGrade = SHS_GRADES.has(draftEditor.gradeToEnroll);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return submissions;
    return submissions.filter((row) => {
      const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ').toLowerCase();
      const lrn = (row.lrn || '').toLowerCase();
      const grade = (row.grade_to_enroll || '').toLowerCase();
      return fullName.includes(normalized) || lrn.includes(normalized) || grade.includes(normalized);
    });
  }, [query, submissions]);

  useEffect(() => {
    const loadExistingLearners = async () => {
      const lrns = Array.from(
        new Set(
          submissions
            .map((row) => (row.lrn || row.payload?.lrn || '').trim())
            .filter(Boolean)
        )
      );
      if (!lrns.length) {
        setExistingLearnerLrns(new Set());
        setLearnerEnrollmentYearsByLrn({});
        return;
      }

      const { data, error } = await supabase.from('registrar_learners').select('id,lrn').in('lrn', lrns);
      if (error) return;

      const allExistingLrns = new Set<string>();
      const yearsByLrn: Record<string, Set<string>> = {};
      const learnerIds: string[] = [];
      for (const row of data || []) {
        const lrn = String((row as any).lrn || '').trim();
        if (!lrn) continue;
        allExistingLrns.add(lrn);
        yearsByLrn[lrn] = new Set();
        const learnerId = String((row as any).id || '').trim();
        if (learnerId) learnerIds.push(learnerId);
      }

      if (learnerIds.length > 0) {
        const { data: historyRows } = await supabase
          .from('registrar_enrollment_history')
          .select('learner_id,school_year')
          .in('learner_id', learnerIds);
        const lrnByLearnerId = new Map<string, string>();
        for (const row of data || []) {
          const learnerId = String((row as any).id || '').trim();
          const lrn = String((row as any).lrn || '').trim();
          if (learnerId && lrn) lrnByLearnerId.set(learnerId, lrn);
        }
        for (const historyRow of historyRows || []) {
          const learnerId = String((historyRow as any).learner_id || '').trim();
          const schoolYear = normalizeSchoolYear(String((historyRow as any).school_year || '').trim());
          const lrn = lrnByLearnerId.get(learnerId);
          if (lrn && schoolYear) yearsByLrn[lrn]?.add(schoolYear);
        }
      }

      setExistingLearnerLrns(allExistingLrns);
      setLearnerEnrollmentYearsByLrn(yearsByLrn);
    };
    loadExistingLearners();
  }, [submissions]);

  useEffect(() => {
    if (!errorMessage) return;
    setTopAlert({ title: 'Submission Issue', message: errorMessage });
  }, [errorMessage]);

  useEffect(() => {
    if (!actionError) return;
    setTopAlert({ title: 'Submission Issue', message: actionError });
  }, [actionError]);

  useEffect(() => {
    if (!enrollError) return;
    setTopAlert({ title: 'Enrollment Issue', message: enrollError });
  }, [enrollError]);

  useEffect(() => {
    const loadActiveSchoolYear = async () => {
      const { data: activeYearRow } = await supabase
        .from('registrar_school_years')
        .select('label')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setActiveSchoolYearLabel(String((activeYearRow as any)?.label || '').trim());
    };
    loadActiveSchoolYear();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const lookup = priorLearnerLookup.trim();
      if (lookup.length < 1) {
        if (!cancelled) setPriorYearLearners([]);
        return;
      }
      let queryBuilder = supabase
        .from('registrar_learners')
        .select('id,lrn,first_name,middle_name,last_name,section_id')
        .order('last_name', { ascending: true })
        .limit(80)
        .or(`lrn.ilike.%${lookup}%,first_name.ilike.%${lookup}%,last_name.ilike.%${lookup}%,middle_name.ilike.%${lookup}%`);

      const { data, error } = await queryBuilder;
      if (cancelled || error || !data) return;

      const sectionIds = Array.from(
        new Set(
          (data as any[])
            .map((row) => String(row.section_id || '').trim())
            .filter(Boolean),
        ),
      );

      const sectionMap = new Map<string, { name: string; gradeLevel: string; schoolYearId: string }>();
      const schoolYearMap = new Map<string, string>();

      if (sectionIds.length > 0) {
        const { data: sectionRows } = await supabase
          .from('registrar_sections')
          .select('id,name,grade_level,school_year_id')
          .in('id', sectionIds);

        const schoolYearIds = Array.from(
          new Set(
            (sectionRows || [])
              .map((row: any) => String(row.school_year_id || '').trim())
              .filter(Boolean),
          ),
        );

        if (schoolYearIds.length > 0) {
          const { data: schoolYearRows } = await supabase
            .from('registrar_school_years')
            .select('id,label')
            .in('id', schoolYearIds);

          for (const row of schoolYearRows || []) {
            schoolYearMap.set(String((row as any).id || ''), String((row as any).label || '').trim());
          }
        }

        for (const row of sectionRows || []) {
          sectionMap.set(String((row as any).id || ''), {
            name: String((row as any).name || '').trim(),
            gradeLevel: String((row as any).grade_level || '').trim(),
            schoolYearId: String((row as any).school_year_id || '').trim(),
          });
        }
      }

      const learnerIds = (data as any[]).map((row) => String(row.id || '').trim()).filter(Boolean);
      const { data: historyRows } = learnerIds.length
        ? await supabase
            .from('registrar_enrollment_history')
            .select('learner_id,school_year,grade_level,section,enrollment_date,created_at')
            .in('learner_id', learnerIds)
        : { data: [] as any[] };

      const historyByLearnerId = new Map<string, any[]>();
      for (const historyRow of historyRows || []) {
        const learnerId = String((historyRow as any).learner_id || '').trim();
        if (!learnerId) continue;
        const current = historyByLearnerId.get(learnerId) || [];
        current.push(historyRow);
        historyByLearnerId.set(learnerId, current);
      }

      const mapped: PriorYearLearner[] = [];
      for (const row of data as any[]) {
        const allYearEntries = [...(historyByLearnerId.get(String(row.id || '').trim()) || [])]
          .sort(
            (a, b) =>
              new Date(String((a as any).enrollment_date || (a as any).created_at || 0)).getTime() -
              new Date(String((b as any).enrollment_date || (b as any).created_at || 0)).getTime(),
          )
          .map((entry: any) => ({
            schoolYear: String(entry?.school_year || '').trim(),
            gradeLevel: String(entry?.grade_level || '').trim(),
            section: String(entry?.section || '').trim(),
          }))
          .filter((entry: any) => Boolean(entry.schoolYear));

        const linkedSection = sectionMap.get(String(row.section_id || '').trim());
        const linkedSchoolYearLabel = linkedSection ? schoolYearMap.get(linkedSection.schoolYearId) || '' : '';
        if (!allYearEntries.length && !linkedSchoolYearLabel) continue;

        const latestEntry =
          allYearEntries[allYearEntries.length - 1] ||
          {
            schoolYear: linkedSchoolYearLabel,
            gradeLevel: linkedSection?.gradeLevel || '',
            section: linkedSection?.name || '',
          };
        const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(', ').replace(/\s+,/g, ',');
        mapped.push({
          id: String(row.id || ''),
          lrn: String(row.lrn || '').trim(),
          fullName: fullName || '--',
          latestSchoolYear: String(latestEntry.schoolYear || '').trim(),
          latestGradeLevel: String(latestEntry.gradeLevel || '').trim(),
          latestSection: String(latestEntry.section || '').trim(),
        });
      }
      if (!cancelled) setPriorYearLearners(mapped);
    };

    const timer = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [priorLearnerLookup, activeSchoolYearLabel]);

  const selectedPriorLearner = useMemo(
    () => priorYearLearners.find((learner) => learner.id === selectedPriorLearnerId) || null,
    [priorYearLearners, selectedPriorLearnerId],
  );

  useEffect(() => {
    publishEnrollmentKioskState({ selectedLearner: selectedPriorLearner });
  }, [selectedPriorLearner]);

  useEffect(() => {
    publishEnrollmentKioskState({
      isEditing: isEditorOpen,
      draft: isEditorOpen ? draftEditor : null,
    });
  }, [isEditorOpen, draftEditor]);

  const groupedByGrade = useMemo(() => {
    const groups = new Map<string, PublicEnrollmentSubmission[]>();
    filtered.forEach((row) => {
      const grade = (row.grade_to_enroll || 'Unspecified').trim() || 'Unspecified';
      if (!groups.has(grade)) groups.set(grade, []);
      groups.get(grade)!.push(row);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [filtered]);

  useEffect(() => {
    setCollapsedGrades((current) => {
      const next = { ...current };
      groupedByGrade.forEach(([grade]) => {
        if (typeof next[grade] !== 'boolean') next[grade] = false;
      });
      return next;
    });
  }, [groupedByGrade]);

  const priorYearLearnerOptions = useMemo(() => {
    return priorYearLearners.map((row) => ({
      value: row.id,
      label: `${row.fullName} | ${row.lrn || 'No LRN'} | ${row.latestSchoolYear || '--'} ${row.latestGradeLevel ? `| ${row.latestGradeLevel}` : ''}`,
    }));
  }, [priorYearLearners]);

  const openCreate = () => {
    setActionError(null);
    setEditorMode('submission');
    setEditingPriorLearner(null);
    setEditingSubmission(null);
    setDraftEditor(emptyDraft(schoolId));
    setIsEditorOpen(true);
  };

  const openKioskWindow = () => {
    const popupWidth = 1400;
    const popupHeight = 900;
    const screenLeft = typeof window.screenLeft === 'number' ? window.screenLeft : 0;
    const screenTop = typeof window.screenTop === 'number' ? window.screenTop : 0;
    const outerWidth = typeof window.outerWidth === 'number' ? window.outerWidth : popupWidth;
    const outerHeight = typeof window.outerHeight === 'number' ? window.outerHeight : popupHeight;
    const left = Math.max(0, screenLeft + Math.round((outerWidth - popupWidth) / 2));
    const top = Math.max(0, screenTop + Math.round((outerHeight - popupHeight) / 2));

    const kioskWindow = window.open(
      '/enroll/kiosk',
      'registrarEnrollmentKiosk',
      `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    kioskWindow?.focus();
  };

  const openSectioningAccessModal = async () => {
    setIsSectioningAccessModalOpen(true);
    setActionError(null);
    try {
      const { data: activeSchoolYear } = await supabase
        .from('registrar_school_years')
        .select('id,label')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      const schoolYearLabel = String((activeSchoolYear as any)?.label || '').trim();
      const schoolYearId = String((activeSchoolYear as any)?.id || '').trim();
      if (!schoolYearLabel || !schoolYearId) throw new Error('Active school year not found.');

      const { data: sectionRows } = await supabase
        .from('registrar_sections')
        .select('grade_level')
        .eq('school_year_id', schoolYearId);
      const grades = Array.from(
        new Set((sectionRows || []).map((row: any) => String(row.grade_level || '').trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      setSectioningGradeLevels(grades);
      setSectioningCodes(await listSectioningAccessCodes(schoolId, schoolYearLabel));
    } catch (error: any) {
      setActionError(error?.message || 'Unable to load sectioning access data.');
    }
  };

  const handleGenerateCode = async (gradeLevel: string) => {
    if (!activeSchoolYearLabel) {
      setActionError('Active school year not found.');
      return;
    }
    setIsGeneratingCode(gradeLevel);
    try {
      const nextRow = await generateSectioningAccessCode({
        schoolId,
        schoolYear: activeSchoolYearLabel,
        gradeLevel,
      });
      setSectioningCodes((current) => {
        const filteredCodes = current.filter((row) => row.grade_level !== gradeLevel);
        return [...filteredCodes, nextRow].sort((a, b) =>
          String(a.grade_level || '').localeCompare(String(b.grade_level || ''), undefined, { numeric: true }),
        );
      });
    } catch (error: any) {
      setActionError(error?.message || 'Unable to generate access code.');
    } finally {
      setIsGeneratingCode(null);
    }
  };

  const openEdit = (row: PublicEnrollmentSubmission) => {
    navigate(`/enroll/${row.id}/edit`);
  };

  const openPriorLearnerEditor = async (learnerId: string) => {
    if (!learnerId) return;
    setActionError(null);
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('registrar_learners')
        .select('id,school_id,lrn,first_name,middle_name,last_name,birth_date,gender,address,contact_number,guardian_name,father_name,mother_name,email')
        .eq('id', learnerId)
        .maybeSingle();
      if (error || !data) throw new Error('Learner record not found.');

      const { data: learnerHistoryRows } = await supabase
        .from('registrar_enrollment_history')
        .select('school_year,grade_level,submission_payload,enrollment_date,created_at')
        .eq('learner_id', String((data as any).id || learnerId));
      const priorEntries = (learnerHistoryRows || [])
        .map((entry: any) => ({
          schoolYear: String(entry?.school_year || '').trim(),
          gradeLevel: String(entry?.grade_level || '').trim(),
          submissionPayload: entry?.submission_payload && typeof entry.submission_payload === 'object' ? entry.submission_payload : {},
          sortAt: new Date(String(entry?.enrollment_date || entry?.created_at || 0)).getTime(),
        }))
        .filter((entry: any) => {
          const sy = String(entry?.schoolYear || '').trim();
          if (!sy) return false;
          return !activeSchoolYearLabel || normalizeSchoolYear(sy) !== normalizeSchoolYear(activeSchoolYearLabel);
        })
        .sort((a: any, b: any) => a.sortAt - b.sortAt);
      const latestPriorEntry = priorEntries[priorEntries.length - 1] || {};
      const sourcePayload = (latestPriorEntry as any).submissionPayload || {};
      const sourceSchoolToEnroll = String(sourcePayload.schoolToEnroll || '').trim();
      const sourcePreviousSchool = String(sourcePayload.previousSchool || '').trim();

      setEditorMode('priorLearner');
      setEditingSubmission(null);
      setEditingPriorLearner({
        id: String((data as any).id || learnerId),
        schoolId: String((data as any).school_id || schoolId),
      });
      setDraftEditor({
        ...emptyDraft(String((data as any).school_id || schoolId)),
        ...sourcePayload,
        studentType: normalizeLearnerType(String(sourcePayload.studentType || 'Continuing Learner')) || 'Continuing Learner',
        learnerCategory: SAME_SCHOOL_LABEL,
        schoolId: String((data as any).school_id || schoolId),
        schoolYear: String((latestPriorEntry as any).schoolYear || ''),
        schoolToEnroll: sourceSchoolToEnroll,
        previousSchool: sourcePreviousSchool || sourceSchoolToEnroll,
        lrn: String((data as any).lrn || ''),
        email: String((data as any).email || sourcePayload.email || ''),
        lastName: String((data as any).last_name || sourcePayload.lastName || ''),
        firstName: String((data as any).first_name || sourcePayload.firstName || ''),
        middleName: String((data as any).middle_name || sourcePayload.middleName || ''),
        birthDate: String((data as any).birth_date || sourcePayload.birthDate || ''),
        gender: String((data as any).gender || sourcePayload.gender || 'Male'),
        currentAddress: String((data as any).address || sourcePayload.currentAddress || ''),
        permanentAddress: String(sourcePayload.permanentAddress || ''),
        learnerContact: String((data as any).contact_number || sourcePayload.learnerContact || ''),
        guardianName: String((data as any).guardian_name || sourcePayload.guardianName || ''),
        guardianContact: String(sourcePayload.guardianContact || ''),
        fatherName: String((data as any).father_name || sourcePayload.fatherName || ''),
        fatherContact: String(sourcePayload.fatherContact || ''),
        motherName: String((data as any).mother_name || sourcePayload.motherName || ''),
        motherContact: String(sourcePayload.motherContact || ''),
        gradeToEnroll: String((latestPriorEntry as any).gradeLevel || sourcePayload.gradeToEnroll || ''),
      });
      setIsEditorOpen(true);
    } catch (error: any) {
      setActionError(error?.message || 'Unable to open learner edit modal.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingSubmission(null);
    setEditingPriorLearner(null);
    setEditorMode('submission');
    setActionError(null);
  };

  const updateDraftField = (name: keyof EnrollmentDraft, value: string | boolean) => {
    if (typeof value === 'string') {
      if (name === 'lrn') {
        const next = value.replace(/\D/g, '').slice(0, 12);
        setDraftEditor((current) => ({ ...current, [name]: next }));
        return;
      }
      if (name === 'learnerContact' || name === 'fatherContact' || name === 'motherContact' || name === 'guardianContact') {
        const next = value.replace(/[^\d+]/g, '').slice(0, 15);
        setDraftEditor((current) => ({ ...current, [name]: next }));
        return;
      }
      if (name === 'previousSchoolYear') {
        const next = value.replace(/[^\d-]/g, '').slice(0, 9);
        setDraftEditor((current) => ({ ...current, [name]: next }));
        return;
      }
    }
    setDraftEditor((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    const isNewLearner = String(draftEditor.studentType || '').toLowerCase().includes('new');
    if (!isNewLearner || draftEditor.gradeToEnroll !== 'Grade 7' || draftEditor.lastGradeLevel === 'Grade 6') return;
    setDraftEditor((current) => ({ ...current, lastGradeLevel: 'Grade 6' }));
  }, [draftEditor.studentType, draftEditor.gradeToEnroll, draftEditor.lastGradeLevel]);

  useEffect(() => {
    const currentGrade = gradeLevelOrder.find((grade) => grade.label === draftEditor.lastGradeLevel);
    const targetGrade = gradeLevelOrder.find((grade) => grade.label === draftEditor.gradeToEnroll);
    const sameSchoolBlocked = draftEditor.learnerCategory === SAME_SCHOOL_LABEL && draftEditor.gradeToEnroll === 'Grade 7';
    const progressionBlocked = currentGrade && targetGrade ? targetGrade.value <= currentGrade.value : false;
    if (sameSchoolBlocked || progressionBlocked) {
      setDraftEditor((current) => ({ ...current, gradeToEnroll: '' }));
    }
  }, [draftEditor.lastGradeLevel, draftEditor.gradeToEnroll, draftEditor.learnerCategory]);

  useEffect(() => {
    if (!isEditorSeniorHighTargetGrade) {
      if (!draftEditor.strand && !draftEditor.semester) return;
      setDraftEditor((current) => ({ ...current, strand: '', semester: '' }));
      return;
    }

    if (!draftEditor.semester) {
      setDraftEditor((current) => ({ ...current, semester: semesterOptions[0] }));
    }
  }, [isEditorSeniorHighTargetGrade, draftEditor.strand, draftEditor.semester]);

  const saveSubmission = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      if (!draftEditor.consent) {
        throw new Error('Please validate the privacy consent before continuing.');
      }
      if (!draftEditor.schoolId.trim()) {
        throw new Error('School ID is required before submitting the enrollment form.');
      }
      const validationError = validatePublicEnrollmentDraft(draftEditor);
      if (validationError) {
        throw new Error(validationError);
      }

      const dbPayload = {
        school_id: draftEditor.schoolId.trim() || null,
        school_year: draftEditor.schoolYear.trim() || null,
        first_name: draftEditor.firstName.trim() || null,
        middle_name: draftEditor.middleName.trim() || null,
        last_name: draftEditor.lastName.trim() || null,
        lrn: draftEditor.lrn.trim() || null,
        grade_to_enroll: draftEditor.gradeToEnroll.trim() || null,
        guardian_contact: draftEditor.guardianContact.trim() || null,
        payload: appendSubmissionAudit(draftEditor, {
          action: editingSubmission ? 'Submission Edited' : 'Submission Created (Admin)',
          detail: editingSubmission
            ? `Record updated by registrar. Target grade: ${draftEditor.gradeToEnroll || 'unspecified'}.`
            : `Submission created by registrar. Target grade: ${draftEditor.gradeToEnroll || 'unspecified'}.`,
        }),
      };

      if (editingSubmission) {
        await updatePublicEnrollmentSubmissionRecord(editingSubmission.id, dbPayload);
      } else {
        await createPublicEnrollmentSubmissionRecord(dbPayload);
      }

      await refresh();
      closeEditor();
    } catch (error: any) {
      setActionError(error?.message || 'Unable to save submission.');
    } finally {
      setIsSaving(false);
    }
  };

  const savePriorLearner = async () => {
    if (!editingPriorLearner?.id) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const { data: existingLearner, error: findError } = await supabase
        .from('registrar_learners')
        .select('id')
        .eq('id', editingPriorLearner.id)
        .maybeSingle();
      if (findError) throw findError;
      if (!existingLearner?.id) throw new Error('Learner record not found.');

      const updatePayload: Record<string, any> = {
        school_id: editingPriorLearner.schoolId || schoolId,
        lrn: draftEditor.lrn.trim() || null,
        first_name: draftEditor.firstName.trim() || null,
        middle_name: draftEditor.middleName.trim() || null,
        last_name: draftEditor.lastName.trim() || null,
        birth_date: draftEditor.birthDate.trim() || null,
        gender: draftEditor.gender.trim() || null,
        address: (draftEditor.currentAddress || draftEditor.permanentAddress).trim() || null,
        contact_number: draftEditor.learnerContact.trim() || null,
        guardian_name: draftEditor.guardianName.trim() || null,
        father_name: draftEditor.fatherName.trim() || null,
        mother_name: draftEditor.motherName.trim() || null,
        email: draftEditor.email.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('registrar_learners')
        .update(updatePayload)
        .eq('id', editingPriorLearner.id);
      if (updateError) throw updateError;

      await insertEnrollmentHistoryRow({
        learnerId: editingPriorLearner.id,
        schoolYear: draftEditor.schoolYear || '',
        gradeLevel: draftEditor.gradeToEnroll || '',
        section: '',
        status: 'Information Updated',
        submissionPayload: draftEditor as unknown as Record<string, any>,
      });

      setTopAlert({
        title: 'Learner Updated',
        message: 'Learner information was updated from previous-year record editor.',
      });
      await refreshData(true);
      closeEditor();
    } catch (error: any) {
      setActionError(error?.message || 'Unable to update learner information.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedPriorLearnerId) return;
    navigate(`/enroll/prior-learner/${selectedPriorLearnerId}/edit`);
  }, [selectedPriorLearnerId, navigate]);

  if (isLoading) {
    return <UsisPageLoader message="Loading enrollment submissions..." />;
  }

  const removeSubmission = async (id: string) => {
    setActionError(null);
    setIsDeletingSubmission(true);
    const visibleInList = submissions.some((entry) => entry.id === id);
    try {
      await deletePublicEnrollmentSubmissionRecord(id);
      await refresh();
      setPendingDeleteSubmissionId(null);
    } catch (error: any) {
      if (error?.code === 'NO_ROWS_DELETED' && visibleInList) {
        setActionError('Delete blocked by database permission policy (RLS). The row is visible but current role is not allowed to delete it.');
        return;
      }
      const diagnostics = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
      setActionError(diagnostics || 'Unable to delete submission.');
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const requestDeleteSubmission = (id: string | null | undefined) => {
    if (!id) {
      setActionError('Delete failed: submission id is missing.');
      return;
    }
    setPendingDeleteSubmissionId(id);
  };

  const deleteSubmissionNow = async (id: string | null | undefined) => {
    if (!id) {
      setActionError('Delete failed: submission id is missing.');
      return;
    }
    await removeSubmission(id);
  };

  const sendConfirmationEmail = async (row: PublicEnrollmentSubmission) => {
    const recipientEmail = String(row.payload?.email || '').trim();
    if (!recipientEmail) {
      setActionError('This submission has no email address. Add learner email first before sending confirmation.');
      return;
    }
    const submissionReferenceId = String(row.submission_reference_id || '').trim();
    if (!submissionReferenceId) {
      setActionError('Submission reference ID is missing.');
      return;
    }
    setSendingEmailSubmissionId(row.id);
    setActionError(null);
    try {
      const response = await fetch('/api/enrollment-email-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: row.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String((result as any)?.error || 'Unable to send enrollment confirmation email.'));
      }
      if (!(result as any)?.queued) {
        const reason = String((result as any)?.reason || 'unknown');
        throw new Error(`Confirmation email not queued (${reason}).`);
      }

      setTopAlert({
        title: 'Confirmation Email',
        message: (result as any)?.sent_immediately
          ? 'Enrollment confirmation email was sent.'
          : 'Enrollment confirmation email was queued for sending.',
      });
    } catch (error: any) {
      setActionError(error?.message || 'Unable to send enrollment confirmation email.');
    } finally {
      setSendingEmailSubmissionId(null);
    }
  };

  const openEnrollModal = async (row: PublicEnrollmentSubmission) => {
    setEnrollError(null);
    setEnrollingSubmission(row);
    setSelectedSectionId('');
    setAvailableSections([]);
    setIsEnrollModalOpen(true);
    try {
      const gradeLevel = row.grade_to_enroll || row.payload?.gradeToEnroll || '';
      if (!gradeLevel) throw new Error('Submission has no Grade Level to Enroll.');
      const { data: activeSchoolYear, error: syError } = await supabase
        .from('registrar_school_years')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (syError || !activeSchoolYear?.id) throw new Error('Active school year not found.');
      const { data: sectionRows, error: sectionError } = await supabase
        .from('registrar_sections')
        .select('id,name')
        .eq('school_year_id', String(activeSchoolYear.id))
        .eq('grade_level', gradeLevel)
        .order('name', { ascending: true });
      if (sectionError) throw sectionError;
      setAvailableSections((sectionRows || []).map((rowData: any) => ({ id: String(rowData.id), name: String(rowData.name || '') })));
    } catch (error: any) {
      setEnrollError(error?.message || 'Unable to load section options.');
    }
  };

  const closeEnrollModal = () => {
    setIsEnrollModalOpen(false);
    setEnrollingSubmission(null);
    setAvailableSections([]);
    setSelectedSectionId('');
    setEnrollError(null);
  };

  const enrollToSchool = async () => {
    if (!enrollingSubmission) return;
    if (!selectedSectionId) {
      setEnrollError('Please select a section.');
      return;
    }
    const payload = enrollingSubmission.payload || ({} as EnrollmentDraft);
    const lrn = (enrollingSubmission.lrn || payload.lrn || '').trim();
    const gradeToEnroll = (enrollingSubmission.grade_to_enroll || payload.gradeToEnroll || '').trim();
    if (!lrn) {
      setEnrollError('LRN is required before enrolling this submission.');
      return;
    }
    if (!gradeToEnroll) {
      setEnrollError('Grade Level to Enroll is required.');
      return;
    }

    setIsEnrolling(true);
    setEnrollError(null);
    try {
      const { data: sectionInfo, error: sectionInfoError } = await supabase
        .from('registrar_sections')
        .select('name,school_year_id')
        .eq('id', selectedSectionId)
        .maybeSingle();
      if (sectionInfoError || !sectionInfo) throw new Error('Selected section is invalid.');

      const { data: schoolYearInfo } = await supabase
        .from('registrar_school_years')
        .select('label')
        .eq('id', String(sectionInfo.school_year_id))
        .maybeSingle();

      const enrolledSchoolYear = String(schoolYearInfo?.label || enrollingSubmission.school_year || payload.schoolYear || '');

      const { data: existingLearner } = await supabase
        .from('registrar_learners')
        .select('id')
        .eq('lrn', lrn)
        .maybeSingle();

      const upsertPayload: Record<string, any> = {
        id: existingLearner?.id || crypto.randomUUID(),
        lrn,
        first_name: (enrollingSubmission.first_name || payload.firstName || '').trim() || null,
        middle_name: (enrollingSubmission.middle_name || payload.middleName || '').trim() || null,
        last_name: (enrollingSubmission.last_name || payload.lastName || '').trim() || null,
        birth_date: (payload.birthDate || '').trim() || null,
        gender: (payload.gender || '').trim() || null,
        address: (payload.currentAddress || payload.permanentAddress || '').trim() || null,
        contact_number: (payload.learnerContact || enrollingSubmission.guardian_contact || payload.guardianContact || '').trim() || null,
        guardian_name: (payload.guardianName || '').trim() || null,
        father_name: (payload.fatherName || '').trim() || null,
        mother_name: (payload.motherName || '').trim() || null,
        status: 'Enrolled',
        section_id: selectedSectionId,
        school_id: (enrollingSubmission.school_id || payload.schoolId || schoolId).trim(),
        email: (payload.email || '').trim() || null,
      };

      const { error: upsertError } = await supabase.from('registrar_learners').upsert(upsertPayload, { onConflict: 'lrn' });
      if (upsertError) throw upsertError;

      const { data: resolvedLearner } = await supabase.from('registrar_learners').select('id').eq('lrn', lrn).maybeSingle();
      const resolvedLearnerId = String((resolvedLearner as any)?.id || existingLearner?.id || '').trim();
      if (!resolvedLearnerId) throw new Error('Unable to resolve learner id for enrollment history insert.');
      await insertEnrollmentHistoryRow({
        learnerId: resolvedLearnerId,
        schoolYear: enrolledSchoolYear,
        gradeLevel: gradeToEnroll,
        section: String(sectionInfo.name || ''),
        status: 'Enrolled',
        submissionPayload: payload as unknown as Record<string, any>,
      });

      await updatePublicEnrollmentSubmissionRecord(enrollingSubmission.id, {
        payload: appendSubmissionAudit(
          {
            ...payload,
            consent: true,
          } as EnrollmentDraft,
          {
            action: existingLearner?.id ? 'Learner Re-enrolled' : 'Learner Enrolled',
            detail: `Assigned to ${String(sectionInfo.name || 'section')} (${gradeToEnroll}) for ${String(schoolYearInfo?.label || enrollingSubmission.school_year || payload.schoolYear || 'active school year')}.`,
          }
        ),
      });

      await refresh();
      closeEnrollModal();
    } catch (error: any) {
      setEnrollError(error?.message || 'Unable to enroll submission to learner records.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const updateLearnerInformation = async (row: PublicEnrollmentSubmission) => {
    const payload = row.payload || ({} as EnrollmentDraft);
    const lrn = (row.lrn || payload.lrn || '').trim();
    if (!lrn) {
      setActionError('LRN is required before updating learner information.');
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const { data: existingLearner, error: findError } = await supabase
        .from('registrar_learners')
        .select('id,lrn')
        .eq('lrn', lrn)
        .maybeSingle();

      if (findError) throw findError;
      if (!existingLearner?.id) throw new Error('Existing learner record not found for this LRN.');

      const updatePayload: Record<string, any> = {
        first_name: (row.first_name || payload.firstName || '').trim() || null,
        middle_name: (row.middle_name || payload.middleName || '').trim() || null,
        last_name: (row.last_name || payload.lastName || '').trim() || null,
        birth_date: (payload.birthDate || '').trim() || null,
        gender: (payload.gender || '').trim() || null,
        address: (payload.currentAddress || payload.permanentAddress || '').trim() || null,
        contact_number: (payload.learnerContact || row.guardian_contact || payload.guardianContact || '').trim() || null,
        guardian_name: (payload.guardianName || '').trim() || null,
        father_name: (payload.fatherName || '').trim() || null,
        mother_name: (payload.motherName || '').trim() || null,
        school_id: (row.school_id || payload.schoolId || schoolId).trim(),
        email: (payload.email || '').trim() || null,
      };

      // Keep the learner's existing LRN intact by updating via row id only.
      const { error: updateError } = await supabase.from('registrar_learners').update(updatePayload).eq('id', existingLearner.id);
      if (updateError) throw updateError;

      await insertEnrollmentHistoryRow({
        learnerId: String(existingLearner.id),
        schoolYear: (row.school_year || payload.schoolYear || '').trim(),
        gradeLevel: (row.grade_to_enroll || payload.gradeToEnroll || '').trim(),
        section: '',
        status: 'Information Updated',
        submissionPayload: payload as unknown as Record<string, any>,
      });

      setTopAlert({
        title: 'Information Updated',
        message: 'Learner information was updated. LRN was kept unchanged.',
      });
      await refreshData(true);
    } catch (error: any) {
      setActionError(error?.message || 'Unable to update learner information.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="portal-panel registrar-public-enrollment-submissions">
      <header className="portal-panel__header">
        <h2>Online Enrollment Submissions</h2>
        <p>Public enrollment form submissions received via the online enrollment page.</p>
      </header>

      <div className="portal-panel__body" style={{ display: 'grid', gap: 16 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'minmax(240px, 1fr) auto auto auto auto', alignItems: 'stretch' }}>
          <label className="floating-field">
            <div className="floating-field__control">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder=" " />
              <span>Search name / LRN / grade</span>
            </div>
          </label>
          <button type="button" className="secondary-button" style={{ minHeight: 56 }} onClick={openKioskWindow}>
            Open Enrollment Kiosk
          </button>
          <button type="button" className="secondary-button" style={{ minHeight: 56 }} onClick={() => void openSectioningAccessModal()}>
            Sectioning Access
          </button>
          <button type="button" className="secondary-button" style={{ minHeight: 56 }} onClick={() => refresh()} disabled={isLoading}>Refresh</button>
          <div className="status-badge status-badge--open" style={{ minHeight: 56, display: 'flex', alignItems: 'center' }} aria-label="Submission count">{filtered.length} shown</div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'minmax(420px, 1fr) minmax(220px, auto)', alignItems: 'stretch' }}>
          <SearchableSelect
            label="Search Learner Records (All School Years)"
            placeholder="Type learner name / LRN"
            floatingLabel
            showLabel={false}
            value={selectedPriorLearnerId}
            onChange={setSelectedPriorLearnerId}
            onQueryChange={setPriorLearnerLookup}
            options={priorYearLearnerOptions}
            requireQueryBeforeOptions
            minQueryLength={1}
            emptyQueryMessage="No previous-year learner matched."
          />
          <div className="status-badge" style={{ minHeight: 56, display: 'flex', alignItems: 'center' }}>
            {selectedPriorLearner
              ? `Kiosk learner: ${selectedPriorLearner.fullName}`
              : `Learner records found: ${priorYearLearners.length}`}
          </div>
        </div>

        {isLoading ? (
          <div className="table-card"><table className="usis-table"><tbody><tr><td>Loading submissions...</td></tr></tbody></table></div>
        ) : groupedByGrade.length ? (
          groupedByGrade.map(([grade, rows]) => (
            <div key={grade} className="table-card">
              <button
                type="button"
                onClick={() => setCollapsedGrades((current) => ({ ...current, [grade]: !current[grade] }))}
                style={{ width: '100%', padding: '10px 14px', fontWeight: 800, color: 'var(--deped-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{grade} ({rows.length})</span>
                <span className="material-symbols-outlined">{collapsedGrades[grade] ? 'expand_more' : 'expand_less'}</span>
              </button>
              {!collapsedGrades[grade] && (
              <table className="usis-table">
                <thead>
                  <tr>
                    <th>Date Received</th>
                    <th>Learner</th>
                    <th>LRN</th>
                    <th>Status</th>
                    <th>Guardian Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const displayName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(', ') || '--';
                    const rowLrn = (row.lrn || row.payload?.lrn || '').trim();
                    const rowSchoolYear = (row.school_year || row.payload?.schoolYear || '').trim();
                    const normalizedRowSchoolYear = normalizeSchoolYear(rowSchoolYear);
                    const isExistingLearner = rowLrn ? existingLearnerLrns.has(rowLrn) : false;
                    const enrolledYears = learnerEnrollmentYearsByLrn[rowLrn] || new Set<string>();
                    const isExistingForSubmissionYear = normalizedRowSchoolYear
                      ? enrolledYears.has(normalizedRowSchoolYear)
                      : false;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/enroll/${row.id}`)}
                        style={{ cursor: 'pointer' }}
                        title="Open submission details"
                      >
                        <td>{formatDate(row.created_at)}</td>
                        <td>{displayName}</td>
                        <td>{row.lrn || '--'}</td>
                        <td>
                          <span className={`status-badge ${isExistingForSubmissionYear ? 'status-badge--open' : ''}`}>
                            {isExistingForSubmissionYear
                              ? `Already in Learners (${rowSchoolYear || 'This S.Y.'})`
                              : isExistingLearner
                                ? `Existing Learner (${Array.from(enrolledYears).join(', ') || 'No S.Y. history'})`
                                : 'New Applicant'}
                          </span>
                        </td>
                        <td>{row.guardian_contact || '--'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(row);
                              }}
                              title="Edit submission"
                              aria-label="Edit submission"
                              style={{ minWidth: 40, width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (isExistingForSubmissionYear) return;
                                void openEnrollModal(row);
                              }}
                              disabled={isExistingForSubmissionYear}
                              title={
                                isExistingForSubmissionYear
                                  ? `Already enrolled for ${rowSchoolYear || 'this school year'}`
                                  : isExistingLearner
                                    ? 'Re-enroll learner'
                                    : 'Enroll to school'
                              }
                              aria-label={
                                isExistingForSubmissionYear
                                  ? 'Already enrolled in learners for this school year'
                                  : isExistingLearner
                                    ? 'Re-enroll learner'
                                    : 'Enroll to school'
                              }
                              style={{ minHeight: 40, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {isExistingForSubmissionYear ? 'check_circle' : 'school'}
                              </span>
                              <span>{isExistingLearner ? 'Re-enroll' : 'Enroll'}</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void sendConfirmationEmail(row);
                              }}
                              disabled={sendingEmailSubmissionId === row.id || !String(row.payload?.email || '').trim()}
                              title={!String(row.payload?.email || '').trim() ? 'No learner email in submission payload' : 'Send enrollment confirmation email'}
                              aria-label="Send enrollment confirmation email"
                              style={{ minWidth: 40, width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {sendingEmailSubmissionId === row.id ? 'hourglass_top' : 'mail'}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                requestDeleteSubmission(row.id);
                              }}
                              title="Delete submission"
                              aria-label="Delete submission"
                              style={{ minWidth: 40, width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          ))
        ) : (
          <div className="table-card"><table className="usis-table"><tbody><tr><td>No submissions found.</td></tr></tbody></table></div>
        )}
      </div>

      {isEditorOpen && (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={closeEditor} />
          <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="public-enrollment-editor-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="public-enrollment-editor-title">
                  {editorMode === 'priorLearner'
                    ? 'Edit Previous-Year Learner Record'
                    : editingSubmission
                      ? 'Edit Submission'
                      : 'Create Submission'}
                </h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={closeEditor} aria-label="Close edit submission">
                <CloseIcon />
              </button>
            </div>

            <div className="modal-dialog__body custom-scrollbar" style={{ paddingRight: 28 }}>
              <div className="grid gap-6">
              <section className="registrar-public-enrollment__section">
                <h3>Enrollment Context</h3>
                <div className="floating-field-grid">
                <InputField label="School ID" value={draftEditor.schoolId} onChange={(value) => updateDraftField('schoolId', value)} readOnly />
                <InputField label="School Year" value={draftEditor.schoolYear} onChange={(value) => updateDraftField('schoolYear', value)} />
                <SelectField label="Learner Type" value={draftEditor.studentType} onChange={(value) => updateDraftField('studentType', value)} options={studentTypeOptions as unknown as string[]} />
                <SelectField label="Learner Category" value={draftEditor.learnerCategory} onChange={(value) => updateDraftField('learnerCategory', value)} options={learnerCategoryOptions as unknown as string[]} />
                <InputField label="School to Enroll" value={draftEditor.schoolToEnroll} onChange={(value) => updateDraftField('schoolToEnroll', value)} />
                <InputField label="Previous School Attended" value={draftEditor.previousSchool} onChange={(value) => updateDraftField('previousSchool', value)} />
                <InputField
                  label="Last S.Y. Attended"
                  value={draftEditor.previousSchoolYear}
                  onChange={(value) => updateDraftField('previousSchoolYear', value)}
                  inputMode="numeric"
                  maxLength={9}
                  pattern="\\d{4}-\\d{4}"
                />
                <SelectField label="Last Grade Level Attended" value={draftEditor.lastGradeLevel} onChange={(value) => updateDraftField('lastGradeLevel', value)} options={gradeLevelOptions as unknown as string[]} />
                <SelectField label="Grade Level to Enroll" value={draftEditor.gradeToEnroll} onChange={(value) => updateDraftField('gradeToEnroll', value)} options={gradeLevelOptions as unknown as string[]} />
                <InputField label="Track" value={draftEditor.track} onChange={(value) => updateDraftField('track', value)} />
                <SelectField
                  label="Preferred Strand"
                  value={draftEditor.strand}
                  onChange={(value) => updateDraftField('strand', value)}
                  options={availableStrands.map((strand) => strand.acronym).filter(Boolean)}
                  disabled={!isEditorSeniorHighTargetGrade}
                />
                <SelectField
                  label="Semester"
                  value={draftEditor.semester}
                  onChange={(value) => updateDraftField('semester', value)}
                  options={semesterOptions as unknown as string[]}
                  disabled={!isEditorSeniorHighTargetGrade || !draftEditor.strand}
                />
              </div>
              </section>

              <section className="registrar-public-enrollment__section">
                <h3>Learner Personal Information</h3>
                <div className="floating-field-grid">
                <InputField label="PSA Birth Certificate No." value={draftEditor.birthCertificateNo} onChange={(value) => updateDraftField('birthCertificateNo', value)} />
                <InputField
                  label="LRN"
                  value={draftEditor.lrn}
                  onChange={(value) => updateDraftField('lrn', value)}
                  inputMode="numeric"
                  maxLength={12}
                  pattern="\\d{12}"
                />
                <InputField label="Email Address" value={draftEditor.email} onChange={(value) => updateDraftField('email', value)} type="email" />
                <InputField label="Last Name" value={draftEditor.lastName} onChange={(value) => updateDraftField('lastName', value)} />
                <InputField label="First Name" value={draftEditor.firstName} onChange={(value) => updateDraftField('firstName', value)} />
                <InputField label="Middle Name" value={draftEditor.middleName} onChange={(value) => updateDraftField('middleName', value)} />
                <InputField label="Extension Name" value={draftEditor.extensionName} onChange={(value) => updateDraftField('extensionName', value)} />
                <InputField label="Date of Birth" value={draftEditor.birthDate} onChange={(value) => updateDraftField('birthDate', value)} type="date" />
                <SelectField label="Gender" value={draftEditor.gender} onChange={(value) => updateDraftField('gender', value)} options={['Male', 'Female']} />
                <InputField label="Place of Birth" value={draftEditor.placeOfBirth} onChange={(value) => updateDraftField('placeOfBirth', value)} />
                <InputField label="Height (cm)" value={draftEditor.height} onChange={(value) => updateDraftField('height', value)} inputMode="decimal" />
                <InputField label="Weight (kg)" value={draftEditor.weight} onChange={(value) => updateDraftField('weight', value)} inputMode="decimal" />
                <InputField label="Learner Contact Number" value={draftEditor.learnerContact} onChange={(value) => updateDraftField('learnerContact', value)} inputMode="tel" maxLength={15} />
                <InputField label="Mother Tongue" value={draftEditor.motherTongue} onChange={(value) => updateDraftField('motherTongue', value)} />
                <SelectField label="Religion" value={draftEditor.religion} onChange={(value) => updateDraftField('religion', value)} options={religionOptions as unknown as string[]} />
                <SelectField label="4Ps Beneficiary" value={draftEditor.is4Ps} onChange={(value) => updateDraftField('is4Ps', value)} options={['Yes', 'No']} />
                <InputField label="4Ps Household ID" value={draftEditor.fourPsHouseholdId} onChange={(value) => updateDraftField('fourPsHouseholdId', value)} />
              </div>
              </section>

              <section className="registrar-public-enrollment__section">
                <h3>Address Information</h3>
                <div className="floating-field-grid">
                <InputField label="Current Address" value={draftEditor.currentAddress} onChange={(value) => updateDraftField('currentAddress', value)} />
                <InputField label="Permanent Address" value={draftEditor.permanentAddress} onChange={(value) => updateDraftField('permanentAddress', value)} />
              </div>
              </section>

              <section className="registrar-public-enrollment__section">
                <h3>Parent, Guardian, and Access</h3>
                <div className="floating-field-grid">
                <InputField label="Father's Full Name" value={draftEditor.fatherName} onChange={(value) => updateDraftField('fatherName', value)} />
                <InputField label="Father's Contact Number" value={draftEditor.fatherContact} onChange={(value) => updateDraftField('fatherContact', value)} inputMode="tel" maxLength={15} />
                <InputField label="Mother's Maiden Name" value={draftEditor.motherName} onChange={(value) => updateDraftField('motherName', value)} />
                <InputField label="Mother's Contact Number" value={draftEditor.motherContact} onChange={(value) => updateDraftField('motherContact', value)} inputMode="tel" maxLength={15} />
                <InputField label="Legal Guardian's Name" value={draftEditor.guardianName} onChange={(value) => updateDraftField('guardianName', value)} />
                <InputField label="Guardian's Contact Number" value={draftEditor.guardianContact} onChange={(value) => updateDraftField('guardianContact', value)} inputMode="tel" maxLength={15} />
                <SelectField label="SPED Need" value={draftEditor.hasSpedNeed} onChange={(value) => updateDraftField('hasSpedNeed', value)} options={['Yes', 'No']} />
                <SelectField label="Preferred Learning Modality" value={draftEditor.preferredModality} onChange={(value) => updateDraftField('preferredModality', value)} options={modalityOptions as unknown as string[]} />
                <SelectField label="Preferred Device" value={draftEditor.deviceAccess} onChange={(value) => updateDraftField('deviceAccess', value)} options={deviceOptions as unknown as string[]} />
                <SelectField label="Internet Access" value={draftEditor.hasInternet} onChange={(value) => updateDraftField('hasInternet', value)} options={['Yes', 'No']} />
              </div>
              </section>
            </div>
            </div>

            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__primary" onClick={closeEditor} disabled={isSaving}>Cancel</button>
              <button
                type="button"
                className="modal-dialog__blue"
                onClick={editorMode === 'priorLearner' ? savePriorLearner : saveSubmission}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editorMode === 'priorLearner' ? 'Save Learner Information' : 'Save Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEnrollModalOpen && enrollingSubmission && (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={closeEnrollModal} />
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="enroll-to-school-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="enroll-to-school-title">Enroll to School</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={closeEnrollModal} disabled={isEnrolling} aria-label="Close enroll modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
              <div className="grid gap-3">
              <InputField label="Learner" value={[enrollingSubmission.last_name, enrollingSubmission.first_name].filter(Boolean).join(', ')} onChange={() => {}} readOnly />
              <InputField label="Grade Level to Enroll" value={enrollingSubmission.grade_to_enroll || ''} onChange={() => {}} readOnly />
              <label className="grid gap-1">
                <span className="text-[11px] font-bold text-outline uppercase tracking-wide">Section (Active School Year)</span>
                <SearchableSelect
                  label="Section (Active School Year)"
                  placeholder="Select section"
                  floatingLabel
                  showLabel={false}
                  value={selectedSectionId}
                  onChange={setSelectedSectionId}
                  options={availableSections.map((sectionRow) => ({ value: sectionRow.id, label: sectionRow.name }))}
                />
              </label>
            </div>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__primary" onClick={closeEnrollModal} disabled={isEnrolling}>Cancel</button>
              <button type="button" className="modal-dialog__blue" onClick={enrollToSchool} disabled={isEnrolling || !availableSections.length}>
                {isEnrolling ? 'Enrolling...' : 'Enroll to Learners'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSectioningAccessModalOpen ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setIsSectioningAccessModalOpen(false)} />
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="sectioning-access-title">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <h3 id="sectioning-access-title">Generate Sectioning Access Codes</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setIsSectioningAccessModalOpen(false)} aria-label="Close sectioning access modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-dialog__body">
              <p style={{ marginTop: 0, marginBottom: 12, color: 'var(--deped-muted)' }}>
                Active School Year: <strong>{activeSchoolYearLabel || '--'}</strong>
              </p>
              <div style={{ display: 'grid', gap: 10 }}>
                {sectioningGradeLevels.length ? sectioningGradeLevels.map((gradeLevel) => {
                  const row = sectioningCodes.find((item) => item.grade_level === gradeLevel);
                  return (
                    <div key={gradeLevel} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(180px, 1fr) auto', gap: 10, alignItems: 'center' }}>
                      <strong>{gradeLevel}</strong>
                      <code style={{ background: '#f1f5ff', border: '1px solid #c9d8f6', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}>
                        {row?.access_code || 'No code yet'}
                      </code>
                      <button type="button" className="secondary-button" onClick={() => void handleGenerateCode(gradeLevel)} disabled={isGeneratingCode === gradeLevel}>
                        {isGeneratingCode === gradeLevel ? 'Generating...' : row?.access_code ? 'Regenerate' : 'Generate'}
                      </button>
                    </div>
                  );
                }) : (
                  <p style={{ margin: 0, color: 'var(--deped-muted)' }}>No active grade levels found from sections.</p>
                )}
              </div>
            </div>
            <div className="modal-dialog__actions">
              <button type="button" className="modal-dialog__primary" onClick={() => setIsSectioningAccessModalOpen(false)}>Close</button>
              <button type="button" className="modal-dialog__blue" onClick={() => window.open('/enroll/sectioning', '_blank')}>Open Sectioning Page</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        isOpen={!!pendingDeleteSubmissionId}
        type="danger"
        title="Delete Submission"
        message="Delete this enrollment submission? This cannot be undone."
        confirmLabel="Delete Submission"
        onConfirm={async () => {
          await deleteSubmissionNow(pendingDeleteSubmissionId);
        }}
        onCancel={() => {
          if (isDeletingSubmission) return;
          setPendingDeleteSubmissionId(null);
        }}
        isLoading={isDeletingSubmission}
      />

      <TopCenterAlert
        open={!!topAlert}
        title={topAlert?.title || 'Notice'}
        message={topAlert?.message || ''}
        type="danger"
        onClose={() => setTopAlert(null)}
      />
    </section>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  inputMode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal';
  maxLength?: number;
  pattern?: string;
};

function InputField({ label, value, onChange, type = 'text', readOnly = false, disabled = false, inputMode, maxLength, pattern }: InputProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          readOnly={readOnly}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
          pattern={pattern}
          placeholder=" "
        />
        <span>{label}</span>
      </div>
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
};

function SelectField({ label, value, onChange, options, disabled = false }: SelectProps) {
  const normalizedOptions = options.map((option) => ({ value: option, label: option }));
  return (
    <SearchableSelect
      label={label}
      placeholder={label}
      floatingLabel
      showLabel={false}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={normalizedOptions}
    />
  );
}
