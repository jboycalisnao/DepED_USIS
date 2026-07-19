import { useEffect, useRef, useState } from 'react';
import ConfirmationModal from '../../components/ConfirmationModal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { Student } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatLearnerTags, normalizeLearnerTags, parseLearnerTagsInput } from '../../utils/learnerTags';
import {
  deviceOptions,
  gradeLevelOptions,
  learnerCategoryOptions,
  modalityOptions,
  religionOptions,
  semesterOptions,
  studentTypeOptions,
  trackOptions,
} from '../../features/registrar/public-enrollment/data/enrollmentOptions';
import { normalizeLearnerType } from '../../features/registrar/public-enrollment/shared/learnerType';

type LearnerModalDraft = {
  schoolId: string;
  schoolYear: string;
  schoolToEnroll: string;
  studentType: string;
  learnerCategory: string;
  previousSchool: string;
  previousSchoolYear: string;
  lastGradeLevel: string;
  gradeToEnroll: string;
  track: string;
  strand: string;
  semester: string;
  birthCertificateNo: string;
  lrn: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extensionName: string;
  birthDate: string;
  gender: string;
  placeOfBirth: string;
  learnerContact: string;
  motherTongue: string;
  religion: string;
  is4Ps: string;
  tagsText: string;
  fourPsHouseholdId: string;
  currentAddress: string;
  permanentAddress: string;
  fatherName: string;
  fatherContact: string;
  motherName: string;
  motherContact: string;
  guardianName: string;
  guardianContact: string;
  hasSpedNeed: string;
  preferredModality: string;
  deviceAccess: string;
  hasInternet: string;
};

type Props = {
  student: Student | null;
  activeSchoolYearLabel: string;
  strandOptions: string[];
  loading: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess?: (message: string) => void;
  onSubmit: (id: string, updates: Partial<Student> & { schoolYear?: string }) => Promise<{ error?: string }>;
};

const firstNonEmpty = (...values: Array<string | undefined | null>) =>
  values.map((v) => String(v || '').trim()).find(Boolean) || '';

const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Unable to read profile picture.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.readAsDataURL(file);
  });

const readImageFileDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image dimensions.'));
    };
    image.src = objectUrl;
  });

const buildDraft = (student: Student, activeSchoolYearLabel: string, latestSubmissionPayload?: Record<string, any>): LearnerModalDraft => {
  const history = Array.isArray(student.enrollments) ? [...student.enrollments] : [];
  const latestEntry = history[history.length - 1] as any;
  const latestWithPayload = history
    .reverse()
    .find((entry: any) => entry && typeof entry === 'object' && entry.submissionPayload && typeof entry.submissionPayload === 'object') as any;
  const payload = (latestWithPayload?.submissionPayload || {}) as Record<string, any>;
  const submissionPayload = (latestSubmissionPayload && typeof latestSubmissionPayload === 'object' ? latestSubmissionPayload : {}) as Record<string, any>;

  return {
    schoolId: firstNonEmpty(submissionPayload.schoolId, payload.schoolId, '302522'),
    schoolYear: firstNonEmpty(student.schoolYear, submissionPayload.schoolYear, payload.schoolYear, activeSchoolYearLabel),
    schoolToEnroll: firstNonEmpty(submissionPayload.schoolToEnroll, payload.schoolToEnroll),
    studentType: normalizeLearnerType(firstNonEmpty(submissionPayload.studentType, submissionPayload.student_type, payload.studentType, payload.student_type, payload.learnerType, payload.learner_type)) || studentTypeOptions[0],
    learnerCategory: firstNonEmpty(submissionPayload.learnerCategory, payload.learnerCategory, learnerCategoryOptions[0]),
    previousSchool: firstNonEmpty(submissionPayload.previousSchool, payload.previousSchool),
    previousSchoolYear: firstNonEmpty(
      submissionPayload.previousSchoolYear,
      submissionPayload.previous_school_year,
      payload.previousSchoolYear,
      payload.previous_school_year,
      payload.lastSchoolYearAttended,
      payload.last_school_year_attended,
      latestWithPayload?.schoolYear,
      latestEntry?.schoolYear,
    ),
    lastGradeLevel: firstNonEmpty(
      submissionPayload.lastGradeLevel,
      submissionPayload.last_grade_level,
      payload.lastGradeLevel,
      payload.last_grade_level,
      payload.gradeLevel,
      latestWithPayload?.gradeLevel,
      latestEntry?.gradeLevel,
    ),
    gradeToEnroll: firstNonEmpty(
      submissionPayload.gradeToEnroll,
      submissionPayload.grade_to_enroll,
      payload.gradeToEnroll,
      payload.grade_to_enroll,
      payload.targetGradeLevel,
      latestWithPayload?.gradeLevel,
      latestEntry?.gradeLevel,
    ),
    track: firstNonEmpty(submissionPayload.track, payload.track, 'Academic Track'),
    strand: firstNonEmpty(submissionPayload.strand, payload.strand),
    semester: firstNonEmpty(submissionPayload.semester, payload.semester, semesterOptions[0]),
    birthCertificateNo: firstNonEmpty(submissionPayload.birthCertificateNo, payload.birthCertificateNo),
    lrn: firstNonEmpty(student.lrn, submissionPayload.lrn, payload.lrn),
    email: firstNonEmpty(submissionPayload.email, student.email, payload.email),
    lastName: firstNonEmpty(submissionPayload.lastName, student.lastName, payload.lastName),
    firstName: firstNonEmpty(submissionPayload.firstName, student.firstName, payload.firstName),
    middleName: firstNonEmpty(submissionPayload.middleName, student.middleName, payload.middleName),
    extensionName: firstNonEmpty(submissionPayload.extensionName, payload.extensionName),
    birthDate: firstNonEmpty(submissionPayload.birthDate, student.birthDate, payload.birthDate),
    gender: firstNonEmpty(submissionPayload.gender, student.gender, payload.gender, 'Male'),
    placeOfBirth: firstNonEmpty(submissionPayload.placeOfBirth, payload.placeOfBirth),
    learnerContact: firstNonEmpty(submissionPayload.learnerContact, student.contactNumber, payload.learnerContact, payload.guardianContact),
    motherTongue: firstNonEmpty(submissionPayload.motherTongue, payload.motherTongue),
    religion: firstNonEmpty(submissionPayload.religion, payload.religion, religionOptions[0]),
    is4Ps: student.is4Ps ? 'Yes' : firstNonEmpty(submissionPayload.is4Ps, payload.is4Ps, 'No'),
    tagsText: firstNonEmpty(
      submissionPayload.tags,
      payload.tags,
      formatLearnerTags(student.tags),
    ),
    fourPsHouseholdId: firstNonEmpty(submissionPayload.fourPsHouseholdId, payload.fourPsHouseholdId),
    currentAddress: firstNonEmpty(submissionPayload.currentAddress, payload.currentAddress, student.address),
    permanentAddress: firstNonEmpty(submissionPayload.permanentAddress, payload.permanentAddress, student.address),
    fatherName: firstNonEmpty(submissionPayload.fatherName, student.father_name, payload.fatherName),
    fatherContact: firstNonEmpty(submissionPayload.fatherContact, payload.fatherContact),
    motherName: firstNonEmpty(submissionPayload.motherName, student.mother_name, payload.motherName),
    motherContact: firstNonEmpty(submissionPayload.motherContact, payload.motherContact),
    guardianName: firstNonEmpty(submissionPayload.guardianName, student.guardian_name, payload.guardianName),
    guardianContact: firstNonEmpty(submissionPayload.guardianContact, payload.guardianContact, student.contactNumber),
    hasSpedNeed: firstNonEmpty(submissionPayload.hasSpedNeed, payload.hasSpedNeed, 'No'),
    preferredModality: firstNonEmpty(submissionPayload.preferredModality, payload.preferredModality, modalityOptions[0]),
    deviceAccess: firstNonEmpty(submissionPayload.deviceAccess, payload.deviceAccess, deviceOptions[0]),
    hasInternet: firstNonEmpty(submissionPayload.hasInternet, payload.hasInternet, 'Yes'),
  };
};

export default function LearnerEditModal({ student, activeSchoolYearLabel, strandOptions, loading, onClose, onError, onSuccess, onSubmit }: Props) {
  const [draft, setDraft] = useState<LearnerModalDraft | null>(null);
  const draftRef = useRef<LearnerModalDraft | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [availableSchoolYears, setAvailableSchoolYears] = useState<Array<{ id: string; label: string }>>([]);
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string; gradeLevel: string; strand?: string; schoolYearId: string }>>([]);
  const [selectedSchoolYearLabel, setSelectedSchoolYearLabel] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState('');
  const [profilePhotoMeta, setProfilePhotoMeta] = useState({ driveFileId: '', mimeType: '', updatedAt: '' });
  const [profilePhotoLoadFailed, setProfilePhotoLoadFailed] = useState(false);
  const [profilePhotoNotice, setProfilePhotoNotice] = useState('');
  const [isLoadingProfilePhotoPreview, setIsLoadingProfilePhotoPreview] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isDeletingProfilePhoto, setIsDeletingProfilePhoto] = useState(false);
  const [isConfirmingProfilePhotoDelete, setIsConfirmingProfilePhotoDelete] = useState(false);
  const selectedSchoolYearLabelRef = useRef('');
  const selectedSectionIdRef = useRef('');

  const applyDraftChange = (updater: (current: LearnerModalDraft) => LearnerModalDraft) => {
    const current = draftRef.current || draft;
    if (!current) return;
    const next = updater(current);
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!student) {
        setDraft(null);
        draftRef.current = null;
        setProfilePhotoFile(null);
        setProfilePhotoPreviewUrl('');
        setProfilePhotoMeta({ driveFileId: '', mimeType: '', updatedAt: '' });
        setProfilePhotoLoadFailed(false);
        setProfilePhotoNotice('');
        setIsLoadingProfilePhotoPreview(false);
        setIsDeletingProfilePhoto(false);
        setIsConfirmingProfilePhotoDelete(false);
        return;
      }

      setProfilePhotoFile(null);
      setProfilePhotoPreviewUrl('');
      setProfilePhotoLoadFailed(false);
      setProfilePhotoNotice('');
      setIsLoadingProfilePhotoPreview(false);
      setIsDeletingProfilePhoto(false);
      setIsConfirmingProfilePhotoDelete(false);
      setProfilePhotoMeta({
        driveFileId: String(student.profilePhotoDriveFileId || ''),
        mimeType: String(student.profilePhotoMimeType || ''),
        updatedAt: String(student.profilePhotoUpdatedAt || ''),
      });
      // Immediate fallback so modal can render while fetching canonical record.
      const initialDraft = buildDraft(student, activeSchoolYearLabel);
      draftRef.current = initialDraft;
      setDraft(initialDraft);
      setIsLoadingRecord(true);
      try {
        const [{ data, error }, { data: schoolYearRows }, { data: sectionRows }, { data: submissionRows }] = await Promise.all([
          supabase
          .from('registrar_learners')
          .select('*')
          .eq('id', student.id)
          .maybeSingle(),
          supabase.from('registrar_school_years').select('id,label').order('label', { ascending: false }),
          supabase.from('registrar_sections').select('id,name,grade_level,strand,school_year_id').order('name', { ascending: true }),
          supabase
            .from('registrar_public_enrollment_submissions')
            .select('payload,created_at')
            .eq('lrn', String(student.lrn || '').trim())
            .order('created_at', { ascending: false })
            .limit(1),
        ]);
        if (cancelled || error || !data) return;

        const dbStudent: Student = {
          id: String((data as any).id || student.id),
          lrn: String((data as any).lrn || ''),
          firstName: String((data as any).first_name || ''),
          lastName: String((data as any).last_name || ''),
          middleName: String((data as any).middle_name || ''),
          email: String((data as any).email || ''),
          birthDate: String((data as any).birth_date || ''),
          gender: String((data as any).gender || 'Male'),
          address: String((data as any).address || ''),
          contactNumber: String((data as any).contact_number || ''),
          guardian_name: String((data as any).guardian_name || ''),
          father_name: String((data as any).father_name || ''),
          mother_name: String((data as any).mother_name || ''),
          sectionId: String((data as any).section_id || ''),
          schoolYear: String((data as any).school_year || ''),
          enrollments: Array.isArray((data as any).enrollment_history) ? (data as any).enrollment_history : [],
          profilePhotoDriveFileId: String((data as any).profile_photo_drive_file_id || ''),
          profilePhotoMimeType: String((data as any).profile_photo_mime_type || ''),
          profilePhotoUpdatedAt: String((data as any).profile_photo_updated_at || ''),
          status: student.status,
          is4Ps: !!(data as any).is_4ps,
          tags: normalizeLearnerTags([(data as any).tags ?? (data as any).org_affiliations, data]),
        };
        const latestSubmissionPayload = submissionRows?.[0]?.payload && typeof submissionRows[0].payload === 'object'
          ? (submissionRows[0].payload as Record<string, any>)
          : undefined;
        const nextDraft = buildDraft(dbStudent, activeSchoolYearLabel, latestSubmissionPayload);
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        setProfilePhotoMeta({
          driveFileId: String((data as any).profile_photo_drive_file_id || ''),
          mimeType: String((data as any).profile_photo_mime_type || ''),
          updatedAt: String((data as any).profile_photo_updated_at || ''),
        });
        const mappedSchoolYears = (schoolYearRows || []).map((row: any) => ({ id: String(row.id || ''), label: String(row.label || '') })).filter((row) => row.id && row.label);
        const mappedSections = (sectionRows || []).map((row: any) => ({
          id: String(row.id || ''),
          name: String(row.name || ''),
          gradeLevel: String(row.grade_level || ''),
          strand: String(row.strand || ''),
          schoolYearId: String(row.school_year_id || ''),
        })).filter((row) => row.id && row.schoolYearId);
        setAvailableSchoolYears(mappedSchoolYears);
        setAvailableSections(mappedSections);
        setSelectedSchoolYearLabel(nextDraft.schoolYear || activeSchoolYearLabel);
        setSelectedSectionId(String((data as any).section_id || student.sectionId || ''));
        selectedSchoolYearLabelRef.current = nextDraft.schoolYear || activeSchoolYearLabel;
        selectedSectionIdRef.current = String((data as any).section_id || student.sectionId || '');
      } catch {
        // Keep fallback values if fetch fails.
      } finally {
        if (!cancelled) setIsLoadingRecord(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [student, activeSchoolYearLabel]);

  useEffect(() => {
    if (!draft) return;
    const learnerType = String(draft.studentType || '').toLowerCase();
    const isNewLearner = learnerType.includes('new');
    const isIncomingGrade7 = String(draft.gradeToEnroll || '').trim() === 'Grade 7';
    const hasLastGrade = String(draft.lastGradeLevel || '').trim().length > 0;
    if (!isNewLearner || !isIncomingGrade7 || hasLastGrade) return;
    applyDraftChange((current) => ({ ...current, lastGradeLevel: 'Grade 6' }));
  }, [draft]);

  useEffect(() => {
    return () => {
      if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
    };
  }, [profilePhotoPreviewUrl]);

  useEffect(() => {
    let cancelled = false;
    const loadSavedProfilePhoto = async () => {
      const learnerId = String(student?.id || '').trim();
      if (!learnerId || profilePhotoFile) return;

      try {
        setIsLoadingProfilePhotoPreview(true);
        const lrn = String(student?.lrn || draftRef.current?.lrn || '').trim();
        const query = new URLSearchParams({
          learnerId,
          v: String(Date.now()),
        });
        if (lrn) query.set('lrn', lrn);
        const response = await fetch(`/api/learner-profile-photo?${query.toString()}`, {
          cache: 'no-store',
        });
        if (cancelled) return;

        if (response.status === 404) {
          const errorPayload = await response.json().catch(() => ({}));
          setProfilePhotoLoadFailed(false);
          setProfilePhotoNotice(
            errorPayload?.hasLearner
              ? 'No saved profile picture file ID is linked to this learner record yet.'
              : 'The profile picture preview could not find this learner record by ID or LRN.',
          );
          return;
        }

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.details || errorPayload?.error || 'Saved profile picture could not be loaded.');
        }

        const blob = await response.blob();
        if (cancelled) return;
        if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
        setProfilePhotoPreviewUrl(URL.createObjectURL(blob));
        setProfilePhotoLoadFailed(false);
        setProfilePhotoNotice('');
      } catch (error: any) {
        if (cancelled) return;
        setProfilePhotoLoadFailed(true);
        setProfilePhotoNotice(error?.message || 'Saved profile picture could not be loaded.');
      } finally {
        if (!cancelled) setIsLoadingProfilePhotoPreview(false);
      }
    };

    void loadSavedProfilePhoto();
    return () => {
      cancelled = true;
    };
  }, [student?.id, profilePhotoFile]);

  if (!student || !draft) return null;
  draftRef.current = draft;
  const profilePhotoUrl = profilePhotoPreviewUrl;
  const isJuniorHighTargetGrade = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(String(draft.gradeToEnroll || '').trim());
  const lastGradeLevelOptions = ['Grade 6', ...gradeLevelOptions];
  const normalizeSchoolYearValue = (value: string) => String(value || '').trim();
  const resolveSchoolYearLabel = (schoolYearValue: string) => {
    const normalized = normalizeSchoolYearValue(schoolYearValue);
    if (!normalized) return '';
    const match = availableSchoolYears.find((row) => {
      const rowId = normalizeSchoolYearValue(row.id);
      const rowLabel = normalizeSchoolYearValue(row.label);
      return rowId === normalized || rowLabel === normalized;
    });
    if (match) return match.label;
    if (/^sy\d+$/i.test(normalized)) {
      const digits = normalized.replace(/^sy/i, '');
      const inferred = digits.length === 4
        ? `20${digits.slice(0, 2)}-20${digits.slice(2)}`
        : digits;
      const labelMatch = availableSchoolYears.find((row) => normalizeSchoolYearValue(row.label) === inferred);
      if (labelMatch) return labelMatch.label;
      return inferred;
    }
    return normalized;
  };

  const selectedSchoolYearId =
    availableSchoolYears.find((row) => {
      const currentValue = normalizeSchoolYearValue(selectedSchoolYearLabelRef.current || selectedSchoolYearLabel || draft.schoolYear);
      return normalizeSchoolYearValue(row.id) === currentValue || normalizeSchoolYearValue(row.label) === currentValue;
    })?.id || '';
  const sectionOptions = availableSections
    .filter((section) => section.schoolYearId === selectedSchoolYearId)
    .map((section) => ({
      value: section.id,
      label: `${section.name}${section.strand ? ` [${section.strand}]` : ''} - ${section.gradeLevel}`,
    }));

  const deleteProfilePhoto = async () => {
    setIsDeletingProfilePhoto(true);
    try {
      const response = await fetch('/api/learner-profile-photo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: student.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(payload?.details || payload?.error || 'Unable to remove learner profile picture.');
      }
      if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
      setProfilePhotoFile(null);
      setProfilePhotoPreviewUrl('');
      setProfilePhotoMeta({ driveFileId: '', mimeType: '', updatedAt: '' });
      setProfilePhotoLoadFailed(false);
      setProfilePhotoNotice('Profile picture link removed.');
      setIsConfirmingProfilePhotoDelete(false);
      onSuccess?.('Learner profile picture removed successfully.');
    } catch (error: any) {
      onError(error?.message || 'Unable to remove learner profile picture.');
    } finally {
      setIsDeletingProfilePhoto(false);
    }
  };

  return (
    <>
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="edit-learner-info-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <h3 id="edit-learner-info-title">Edit Learner Information</h3>
            <p>{isLoadingRecord ? 'Loading learner record...' : student.lrn}</p>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close edit learner information">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body custom-scrollbar" style={{ paddingRight: 28 }}>
          <div className="grid gap-6">
            <section className="registrar-public-enrollment__section">
              <h3>Learner Profile Picture</h3>
              <div className="learner-profile-photo-uploader">
                <div className="learner-profile-photo-uploader__preview" aria-hidden="true">
                  {isLoadingProfilePhotoPreview ? (
                    <span className="learner-profile-photo-uploader__spinner" />
                  ) : profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt=""
                      onLoad={() => setProfilePhotoLoadFailed(false)}
                      onError={() => setProfilePhotoLoadFailed(true)}
                    />
                  ) : (
                    <span className="material-symbols-outlined">person</span>
                  )}
                </div>
                <div className="learner-profile-photo-uploader__controls">
                  <label className="secondary-button learner-profile-photo-uploader__pick">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (event) => {
                        const input = event.currentTarget;
                        const file = event.target.files?.[0] || null;
                        if (!file) {
                          setProfilePhotoFile(null);
                          setProfilePhotoPreviewUrl('');
                          return;
                        }
                        if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
                          onError('Use a JPG, PNG, or WebP profile picture.');
                          event.target.value = '';
                          return;
                        }
                        if (file.size > MAX_PROFILE_PHOTO_BYTES) {
                          onError('Profile picture must be 2 MB or smaller.');
                          event.target.value = '';
                          return;
                        }
                        try {
                          const dimensions = await readImageFileDimensions(file);
                          if (dimensions.width !== dimensions.height) {
                            onError(`Profile picture must be square. Selected image is ${dimensions.width}x${dimensions.height}.`);
                            input.value = '';
                            return;
                          }
                        } catch (error: any) {
                          onError(error?.message || 'Unable to read image dimensions.');
                          input.value = '';
                          return;
                        }
                        if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
                        setProfilePhotoFile(file);
                        setProfilePhotoPreviewUrl(URL.createObjectURL(file));
                        setProfilePhotoLoadFailed(false);
                        setProfilePhotoNotice('');
                      }}
                    />
                    Choose Picture
                  </label>
                  <button
                    type="button"
                    className="primary-button learner-profile-photo-uploader__button"
                    disabled={!profilePhotoFile || isUploadingProfilePhoto || isLoadingRecord}
                    onClick={async () => {
                      if (!profilePhotoFile) return;
                      setIsUploadingProfilePhoto(true);
                      try {
                        const dataBase64 = await readFileAsBase64(profilePhotoFile);
                        const response = await fetch('/api/learner-profile-photo', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            learnerId: student.id,
                            mimeType: profilePhotoFile.type,
                            dataBase64,
                          }),
                        });
                        const payload = await response.json().catch(() => ({}));
                        if (!response.ok || payload?.error) {
                          throw new Error(payload?.details || payload?.error || 'Unable to upload learner profile picture.');
                        }
                        setProfilePhotoMeta({
                          driveFileId: String(payload.profilePhotoDriveFileId || ''),
                          mimeType: String(payload.profilePhotoMimeType || profilePhotoFile.type),
                          updatedAt: String(payload.profilePhotoUpdatedAt || new Date().toISOString()),
                        });
                        setProfilePhotoLoadFailed(false);
                        setProfilePhotoNotice('');
                        setProfilePhotoFile(null);
                        onSuccess?.('Learner profile picture uploaded successfully.');
                      } catch (error: any) {
                        onError(error?.message || 'Unable to upload learner profile picture.');
                      } finally {
                        setIsUploadingProfilePhoto(false);
                      }
                    }}
                  >
                    {isUploadingProfilePhoto ? 'Uploading...' : 'Upload Picture'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button learner-profile-photo-uploader__delete"
                    aria-label={isDeletingProfilePhoto ? 'Deleting profile picture' : 'Delete profile picture'}
                    title={isDeletingProfilePhoto ? 'Deleting profile picture' : 'Delete profile picture'}
                    disabled={!profilePhotoUrl || isDeletingProfilePhoto || isUploadingProfilePhoto || isLoadingRecord}
                    onClick={() => setIsConfirmingProfilePhotoDelete(true)}
                  >
                    {isDeletingProfilePhoto ? (
                      <span className="learner-profile-photo-uploader__delete-spinner" aria-hidden="true" />
                    ) : (
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                    )}
                  </button>
                  <p>
                    {profilePhotoLoadFailed
                      ? profilePhotoNotice || 'A profile picture may be saved, but the preview could not be loaded.'
                      : profilePhotoNotice || 'Square JPG, PNG, or WebP. Maximum file size is 2 MB.'}
                  </p>
                </div>
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Enrollment Context</h3>
              <div className="floating-field-grid">
                <InputField label="School ID" value={draft.schoolId} onChange={(value) => applyDraftChange((current) => ({ ...current, schoolId: value }))} readOnly />
                <InputField label="School Year" value={draft.schoolYear} onChange={(value) => applyDraftChange((current) => ({ ...current, schoolYear: value }))} />
                <SearchableSelect
                  label="Edit School Year Scope"
                  placeholder="Edit School Year Scope"
                  floatingLabel
                  showLabel={false}
                  value={selectedSchoolYearLabel || draft.schoolYear}
                  onChange={(value) => {
                    selectedSchoolYearLabelRef.current = value;
                    setSelectedSchoolYearLabel(value);
                    applyDraftChange((current) => ({ ...current, schoolYear: value }));
                    setSelectedSectionId('');
                    selectedSectionIdRef.current = '';
                  }}
                  options={availableSchoolYears.map((row) => ({ value: row.label, label: row.label }))}
                />
                <SearchableSelect
                  label="Section (Selected School Year)"
                  placeholder="Section (Selected School Year)"
                  floatingLabel
                  showLabel={false}
                  value={selectedSectionIdRef.current || selectedSectionId}
                  onChange={(value) => {
                    selectedSectionIdRef.current = value;
                    setSelectedSectionId(value);
                    const chosenSection = availableSections.find((section) => section.id === value);
                    if (chosenSection) {
                      const resolvedSchoolYearLabel = resolveSchoolYearLabel(chosenSection.schoolYearId);
                      if (resolvedSchoolYearLabel) {
                        selectedSchoolYearLabelRef.current = resolvedSchoolYearLabel;
                        setSelectedSchoolYearLabel(resolvedSchoolYearLabel);
                        applyDraftChange((current) => ({ ...current, schoolYear: resolvedSchoolYearLabel }));
                      }
                    }
                  }}
                  options={sectionOptions}
                  disabled={!selectedSchoolYearId}
                />
                <SelectField label="Learner Type" value={draft.studentType} onChange={(value) => applyDraftChange((current) => ({ ...current, studentType: value }))} options={studentTypeOptions as unknown as string[]} />
                <SelectField label="Learner Category" value={draft.learnerCategory} onChange={(value) => applyDraftChange((current) => ({ ...current, learnerCategory: value }))} options={learnerCategoryOptions as unknown as string[]} />
                <InputField label="School to Enroll" value={draft.schoolToEnroll} onChange={(value) => applyDraftChange((current) => ({ ...current, schoolToEnroll: value }))} />
                <InputField label="Previous School Attended" value={draft.previousSchool} onChange={(value) => applyDraftChange((current) => ({ ...current, previousSchool: value }))} />
                <InputField label="Last S.Y. Attended" value={draft.previousSchoolYear} onChange={(value) => applyDraftChange((current) => ({ ...current, previousSchoolYear: value }))} inputMode="numeric" maxLength={9} pattern="\\d{4}-\\d{4}" />
                <SelectField label="Last Grade Level Attended" value={draft.lastGradeLevel} onChange={(value) => applyDraftChange((current) => ({ ...current, lastGradeLevel: value }))} options={lastGradeLevelOptions as unknown as string[]} />
                <SelectField label="Grade Level to Enroll" value={draft.gradeToEnroll} onChange={(value) => applyDraftChange((current) => ({ ...current, gradeToEnroll: value }))} options={gradeLevelOptions as unknown as string[]} />
                <SelectField label="Track" value={draft.track} onChange={(value) => applyDraftChange((current) => ({ ...current, track: value }))} options={trackOptions as unknown as string[]} disabled={isJuniorHighTargetGrade} />
                <SelectField label="Preferred Strand" value={draft.strand} onChange={(value) => applyDraftChange((current) => ({ ...current, strand: value }))} options={strandOptions} disabled={isJuniorHighTargetGrade} />
                <SelectField label="Semester" value={draft.semester} onChange={(value) => applyDraftChange((current) => ({ ...current, semester: value }))} options={semesterOptions as unknown as string[]} disabled={isJuniorHighTargetGrade} />
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Learner Personal Information</h3>
              <div className="floating-field-grid">
                <InputField label="PSA Birth Certificate No." value={draft.birthCertificateNo} onChange={(value) => applyDraftChange((current) => ({ ...current, birthCertificateNo: value }))} />
                <InputField label="LRN" value={draft.lrn} onChange={(value) => applyDraftChange((current) => ({ ...current, lrn: value.replace(/\D/g, '').slice(0, 12) }))} inputMode="numeric" maxLength={12} pattern="\\d{12}" />
                <InputField label="Email Address" value={draft.email} onChange={(value) => applyDraftChange((current) => ({ ...current, email: value }))} type="email" />
                <InputField label="Last Name" value={draft.lastName} onChange={(value) => applyDraftChange((current) => ({ ...current, lastName: value }))} />
                <InputField label="First Name" value={draft.firstName} onChange={(value) => applyDraftChange((current) => ({ ...current, firstName: value }))} />
                <InputField label="Middle Name" value={draft.middleName} onChange={(value) => applyDraftChange((current) => ({ ...current, middleName: value }))} />
                <InputField label="Extension Name" value={draft.extensionName} onChange={(value) => applyDraftChange((current) => ({ ...current, extensionName: value }))} />
                <InputField label="Date of Birth" value={draft.birthDate} onChange={(value) => applyDraftChange((current) => ({ ...current, birthDate: value }))} type="date" />
                <SelectField label="Gender" value={draft.gender} onChange={(value) => applyDraftChange((current) => ({ ...current, gender: value }))} options={['Male', 'Female']} />
                <InputField label="Place of Birth" value={draft.placeOfBirth} onChange={(value) => applyDraftChange((current) => ({ ...current, placeOfBirth: value }))} />
                <InputField label="Learner Contact Number" value={draft.learnerContact} onChange={(value) => applyDraftChange((current) => ({ ...current, learnerContact: value.replace(/\D/g, '').slice(0, 11) }))} inputMode="numeric" maxLength={11} />
                <InputField label="Mother Tongue" value={draft.motherTongue} onChange={(value) => applyDraftChange((current) => ({ ...current, motherTongue: value }))} />
                <SelectField label="Religion" value={draft.religion} onChange={(value) => applyDraftChange((current) => ({ ...current, religion: value }))} options={religionOptions as unknown as string[]} />
                <SelectField label="4Ps Beneficiary" value={draft.is4Ps} onChange={(value) => applyDraftChange((current) => ({ ...current, is4Ps: value }))} options={['Yes', 'No']} />
                <InputField label="4Ps Household ID" value={draft.fourPsHouseholdId} onChange={(value) => applyDraftChange((current) => ({ ...current, fourPsHouseholdId: value }))} />
                <InputField label="Learner Tags" value={draft.tagsText} onChange={(value) => applyDraftChange((current) => ({ ...current, tagsText: value }))} />
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Address Information</h3>
              <div className="floating-field-grid">
                <InputField label="Current Address" value={draft.currentAddress} onChange={(value) => applyDraftChange((current) => ({ ...current, currentAddress: value }))} />
                <InputField label="Permanent Address" value={draft.permanentAddress} onChange={(value) => applyDraftChange((current) => ({ ...current, permanentAddress: value }))} />
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Parent, Guardian, and Access</h3>
              <div className="floating-field-grid">
                <InputField label="Father's Full Name" value={draft.fatherName} onChange={(value) => applyDraftChange((current) => ({ ...current, fatherName: value }))} />
                <InputField label="Father's Contact Number" value={draft.fatherContact} onChange={(value) => applyDraftChange((current) => ({ ...current, fatherContact: value.replace(/[^\d+]/g, '').slice(0, 15) }))} inputMode="tel" maxLength={15} />
                <InputField label="Mother's Maiden Name" value={draft.motherName} onChange={(value) => applyDraftChange((current) => ({ ...current, motherName: value }))} />
                <InputField label="Mother's Contact Number" value={draft.motherContact} onChange={(value) => applyDraftChange((current) => ({ ...current, motherContact: value.replace(/[^\d+]/g, '').slice(0, 15) }))} inputMode="tel" maxLength={15} />
                <InputField label="Legal Guardian's Name" value={draft.guardianName} onChange={(value) => applyDraftChange((current) => ({ ...current, guardianName: value }))} />
                <InputField label="Guardian's Contact Number" value={draft.guardianContact} onChange={(value) => applyDraftChange((current) => ({ ...current, guardianContact: value.replace(/[^\d+]/g, '').slice(0, 15) }))} inputMode="tel" maxLength={15} />
                <SelectField label="SPED Need" value={draft.hasSpedNeed} onChange={(value) => applyDraftChange((current) => ({ ...current, hasSpedNeed: value }))} options={['Yes', 'No']} />
                <SelectField label="Preferred Learning Modality" value={draft.preferredModality} onChange={(value) => applyDraftChange((current) => ({ ...current, preferredModality: value }))} options={modalityOptions as unknown as string[]} />
                <SelectField label="Preferred Device" value={draft.deviceAccess} onChange={(value) => applyDraftChange((current) => ({ ...current, deviceAccess: value }))} options={deviceOptions as unknown as string[]} />
                <SelectField label="Internet Access" value={draft.hasInternet} onChange={(value) => applyDraftChange((current) => ({ ...current, hasInternet: value }))} options={['Yes', 'No']} />
              </div>
            </section>
          </div>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__primary" onClick={onClose}>Cancel</button>
            <button
            type="button"
            className="modal-dialog__blue"
            onClick={async () => {
              const latestDraft = draftRef.current || draft;
              if (!latestDraft) return;
              const currentHistory = Array.isArray(student.enrollments) ? [...student.enrollments] : [];
              const selectedSectionIdValue = selectedSectionIdRef.current || selectedSectionId;
              const selectedSchoolYearLabelValue = selectedSchoolYearLabelRef.current || selectedSchoolYearLabel || latestDraft.schoolYear;
              const selectedSection = availableSections.find((section) => section.id === selectedSectionIdValue);
              const scopedSchoolYear =
                resolveSchoolYearLabel(selectedSection?.schoolYearId || '') ||
                selectedSchoolYearLabelValue ||
                latestDraft.schoolYear ||
                activeSchoolYearLabel;
              const submissionPayload = {
                ...latestDraft,
                consent: true,
                tags: parseLearnerTagsInput(latestDraft.tagsText),
              };
              let matched = false;
              const nextHistory = currentHistory.length > 0
                ? currentHistory.map((entry: any) => {
                    if (String(entry?.schoolYear || '').trim() !== String(scopedSchoolYear || '').trim()) return entry;
                    matched = true;
                    return {
                      ...entry,
                      schoolYear: scopedSchoolYear,
                      gradeLevel: selectedSection?.gradeLevel || latestDraft.gradeToEnroll || entry?.gradeLevel || latestDraft.lastGradeLevel || '',
                      section: selectedSection?.name || entry?.section || '',
                      submissionPayload,
                    };
                })
                : [];

              if (!matched) {
                nextHistory.push({
                  id: crypto.randomUUID(),
                  schoolYear: scopedSchoolYear,
                  gradeLevel: selectedSection?.gradeLevel || latestDraft.gradeToEnroll || latestDraft.lastGradeLevel || '',
                  section: selectedSection?.name || '',
                  enrollmentDate: new Date().toISOString(),
                  status: 'Information Updated',
                  submissionPayload,
                });
              }

              const result = await onSubmit(student.id, {
                lrn: latestDraft.lrn.trim(),
                firstName: latestDraft.firstName.trim(),
                lastName: latestDraft.lastName.trim(),
                middleName: latestDraft.middleName.trim(),
                email: latestDraft.email.trim(),
                birthDate: latestDraft.birthDate.trim(),
                gender: latestDraft.gender.trim(),
                address: (latestDraft.currentAddress || latestDraft.permanentAddress || '').trim(),
                contactNumber: latestDraft.learnerContact.trim(),
                guardian_name: latestDraft.guardianName.trim(),
                father_name: latestDraft.fatherName.trim(),
                mother_name: latestDraft.motherName.trim(),
                is4Ps: latestDraft.is4Ps === 'Yes',
                tags: parseLearnerTagsInput(latestDraft.tagsText),
                schoolYear: scopedSchoolYear,
                sectionId: selectedSectionIdValue || undefined,
                enrollments: nextHistory as any,
              });
              if (result?.error) {
                onError(result.error);
                return;
              }
              onSuccess?.('Learner information saved successfully.');
              onClose();
            }}
            disabled={loading || isLoadingRecord}
          >
            Save Learner Information
          </button>
        </div>
      </div>
    </div>
    <ConfirmationModal
      isOpen={isConfirmingProfilePhotoDelete}
      type="danger"
      title="Delete Profile Picture"
      message="Delete this learner profile picture? This action cannot be undone."
      confirmLabel="Delete"
      onConfirm={() => void deleteProfilePhoto()}
      onCancel={() => setIsConfirmingProfilePhotoDelete(false)}
      isLoading={isDeletingProfilePhoto}
    />
    </>
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
