import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Candidate, GradeLevel, Position, SchoolYear, Student } from '../../../types';
import { POSITIONS } from '../../../constants';
import { urlToBase64 } from '../../../utils/imageUtils';
import { useStore } from '../../../supabaseStore';
import SearchableSelect from '../../ui/SearchableSelect';

interface RegisterCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Candidate> & { schoolYearId: string }) => void;
  schoolYears: SchoolYear[];
  initialData?: Candidate;
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
  type?: React.HTMLInputTypeAttribute;
};

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value, type = 'text' }) => (
  <label className="floating-field usis-coc-modal__field">
    <div className="floating-field__control">
      <input
        readOnly
        className="usis-coc-modal__readonly"
        type={type}
        value={value}
        placeholder=" "
        data-has-value={String(Boolean(String(value || '').trim()))}
      />
      <span>{label}</span>
    </div>
  </label>
);

const EditableTextarea: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
}> = ({ label, value, onChange, minHeight = '160px' }) => (
  <label className="floating-field usis-coc-modal__field">
    <div className="floating-field__control">
      <textarea
        style={{ minHeight }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=" "
        data-has-value={String(Boolean(String(value || '').trim()))}
      />
      <span>{label}</span>
    </div>
  </label>
);

const ReadOnlyTextarea: React.FC<{
  label: string;
  value: string;
  minHeight?: string;
}> = ({ label, value, minHeight = '132px' }) => (
  <label className="floating-field usis-coc-modal__field">
    <div className="floating-field__control">
      <textarea
        readOnly
        className="usis-coc-modal__readonly"
        value={value}
        style={{ minHeight }}
        placeholder=" "
        data-has-value={String(Boolean(String(value || '').trim()))}
      />
      <span>{label}</span>
    </div>
  </label>
);

const RegisterCandidateModal: React.FC<RegisterCandidateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schoolYears = [],
  initialData,
}) => {
  const store = useStore();
  const activeSchoolYear = useMemo(
    () => (schoolYears || []).find((sy) => sy.isActive || sy.is_active) || null,
    [schoolYears]
  );

  const [selectedSyId, setSelectedSyId] = useState('');
  const [selectedLearnerLrn, setSelectedLearnerLrn] = useState('');
  const [selectedLearnerSeed, setSelectedLearnerSeed] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [extensionName, setExtensionName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(GradeLevel.GRADE_7);
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [landline, setLandline] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  const [position, setPosition] = useState<Position>((POSITIONS || [])[0]);
  const [party, setParty] = useState('Independent');
  const [vision, setVision] = useState('');
  const [remarks, setRemarks] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [existingCandidates, setExistingCandidates] = useState<Candidate[]>([]);
  const [isPersisting, setIsPersisting] = useState(false);
  const [availablePartylists, setAvailablePartylists] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedSyId && activeSchoolYear?.id) {
      setSelectedSyId(activeSchoolYear.id);
    }
  }, [activeSchoolYear, selectedSyId]);

  useEffect(() => {
    if (!isOpen) return;
    store.fetchCandidates().then((result) => setExistingCandidates(result.candidates || []));
  }, [isOpen]);

  useEffect(() => {
    const loadPartylists = async () => {
      const syId = selectedSyId || activeSchoolYear?.id;
      if (!syId) {
        setAvailablePartylists([]);
        return;
      }

      try {
        const rows = await store.fetchPartylists(syId);
        setAvailablePartylists((rows || []).map((row: any) => String(row.name || '').trim()).filter(Boolean));
      } catch (error) {
        console.error('Failed to load partylists', error);
        setAvailablePartylists([]);
      }
    };

    if (isOpen) {
      loadPartylists();
    }
  }, [isOpen, selectedSyId, activeSchoolYear?.id]);

  const learnerOptions = useMemo(
    () => (store.learners || [])
      .slice()
      .sort((a, b) => {
        const aName = `${a.lastName || ''} ${a.firstName || ''} ${a.middleName || ''}`.trim().toLowerCase();
        const bName = `${b.lastName || ''} ${b.firstName || ''} ${b.middleName || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      })
      .map((learner) => {
        const learnerName = [learner.lastName, learner.firstName, learner.middleName].filter(Boolean).join(', ').trim();
        const section = learner.sectionId ? store.sections.find((entry) => entry.id === learner.sectionId) : null;
        return {
          label: `${learner.lrn}${learnerName ? ` - ${learnerName}` : ''}${section?.name ? ` - ${section.name}` : ''}`,
          value: String(learner.lrn || '').trim(),
        };
      }),
    [store.learners, store.sections]
  );

  const partyOptions = useMemo(
    () => [
      { label: 'Independent', value: 'Independent' },
      ...availablePartylists.map((name) => ({ label: name, value: name })),
    ],
    [availablePartylists]
  );

  const learnerRecord = useMemo(
    () => (store.learners || []).find((learner) => String(learner.lrn || '').trim() === String(selectedLearnerLrn || '').trim()) || null,
    [selectedLearnerLrn, store.learners, selectedLearnerSeed]
  );

  const learnerSection = useMemo(
    () => (learnerRecord?.sectionId ? store.sections.find((section) => section.id === learnerRecord.sectionId) || null : null),
    [learnerRecord, store.sections]
  );

  const candidateFullName = useMemo(
    () => {
      const parts = [lastName, firstName, middleName].filter(Boolean);
      return parts.join(', ').trim();
    },
    [firstName, lastName, middleName]
  );

  const duplicateDetected = useMemo(
    () => {
      if (!firstName || !lastName) return false;
      const current = `${firstName} ${lastName}`.toUpperCase().trim();
      return existingCandidates.some((candidate) => {
        const candidateName = candidate.name.toUpperCase().trim();
        return candidateName === current && candidate.id !== initialData?.id;
      });
    },
    [existingCandidates, firstName, initialData?.id, lastName]
  );

  const resetForm = () => {
    setSelectedLearnerLrn('');
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setExtensionName('');
    setGradeLevel(GradeLevel.GRADE_7);
    setGender('');
    setBirthDate('');
    setAge('');
    setEmail('');
    setMobileNo('');
    setLandline('');
    setHomeAddress('');
    setFatherName('');
    setMotherName('');
    setPosition((POSITIONS || [])[0]);
    setParty('Independent');
    setVision('');
    setRemarks('');
    setImageUrl('');
    setSelectedSyId(activeSchoolYear?.id || '');
  };

  const calculateAge = (value: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const now = new Date();
    let nextAge = now.getFullYear() - parsed.getFullYear();
    const monthDelta = now.getMonth() - parsed.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
      nextAge -= 1;
    }
    return nextAge > 0 ? String(nextAge) : '';
  };

  const applyLearner = (learner: Student | null) => {
    if (!learner) return;
    setFirstName(String(learner.firstName || '').toUpperCase());
    setLastName(String(learner.lastName || '').toUpperCase());
    setMiddleName(String(learner.middleName || '').toUpperCase());
    setExtensionName('');
    setGradeLevel(learnerSection?.gradeLevel || GradeLevel.GRADE_7);
    setGender(String(learner.gender || '').trim());
    setBirthDate(String(learner.birthDate || '').trim());
    setAge(calculateAge(String(learner.birthDate || '').trim()));
    setEmail(String(learner.email || '').trim().toLowerCase());
    setMobileNo(String(learner.contactNumber || '').trim());
    setLandline('');
    setHomeAddress(String(learner.address || '').toUpperCase());
    setFatherName(String(learner.father_name || '').toUpperCase());
    setMotherName(String(learner.mother_name || '').toUpperCase());
  };

  const matchLearnerToCandidate = (candidate: Candidate | null | undefined) => {
    if (!candidate) return null;
    const normalize = (value: string) => value.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const candidateName = normalize([candidate.lastName, candidate.firstName, candidate.middleName].filter(Boolean).join(' '));
    const candidateFirstLast = normalize([candidate.firstName, candidate.lastName].filter(Boolean).join(' '));

    return (store.learners || []).find((learner) => {
      const learnerName = normalize([learner.lastName, learner.firstName, learner.middleName].filter(Boolean).join(' '));
      const learnerFirstLast = normalize([learner.firstName, learner.lastName].filter(Boolean).join(' '));
      return learnerName === candidateName || learnerFirstLast === candidateFirstLast;
    }) || null;
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setSelectedLearnerSeed((seed) => seed + 1);
      setFirstName(String(initialData.firstName || '').toUpperCase());
      setLastName(String(initialData.lastName || '').toUpperCase());
      setMiddleName(String(initialData.middleName || '').toUpperCase());
      setExtensionName(String(initialData.extensionName || '').toUpperCase());
      setGradeLevel(initialData.gradeLevel || GradeLevel.GRADE_7);
      setGender(String(initialData.gender || ''));
      setBirthDate(String(initialData.birthDate || ''));
      setAge(String(initialData.age || ''));
      setEmail(String(initialData.email || '').trim().toLowerCase());
      setMobileNo(String(initialData.mobileNo || '').trim());
      setLandline(String(initialData.landline || '').trim());
      setHomeAddress(String(initialData.homeAddress || '').toUpperCase());
      setFatherName(String(initialData.fatherName || '').toUpperCase());
      setMotherName(String(initialData.motherName || '').toUpperCase());
      setPosition(initialData.position || (POSITIONS || [])[0]);
      setParty(initialData.party || 'Independent');
      setVision(initialData.vision || '');
      setRemarks(initialData.remarks || '');
      setImageUrl(initialData.imageUrl || '');
      setSelectedSyId(activeSchoolYear?.id || initialData.schoolYearId || '');

      const matchedLearner = matchLearnerToCandidate(initialData);
      if (matchedLearner) {
        const learnerLrn = String(matchedLearner.lrn || '').trim();
        setSelectedLearnerLrn(learnerLrn);
        applyLearner(matchedLearner);
      } else {
        setSelectedLearnerLrn('');
      }
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const learner = learnerRecord;
    if (learner) {
      applyLearner(learner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, learnerRecord, learnerSection?.gradeLevel]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSyId || duplicateDetected || (!selectedLearnerLrn && !initialData)) return;

    try {
      setIsPersisting(true);
      let finalImageUrl = imageUrl;
      if (finalImageUrl && !finalImageUrl.startsWith('data:') && finalImageUrl !== initialData?.imageUrl) {
        finalImageUrl = await urlToBase64(finalImageUrl);
      }

      const middleInit = middleName ? ` ${middleName.charAt(0)}.` : '';
      const extension = extensionName ? ` ${extensionName}` : '';
      const displayName = `${firstName}${middleInit} ${lastName}${extension}`.trim().toUpperCase();

      onSave({
        name: displayName,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        middleName: middleName.toUpperCase(),
        extensionName: extensionName.toUpperCase(),
        position,
        gradeLevel,
        party,
        imageUrl: finalImageUrl || '',
        vision: vision || '',
        remarks,
        gender,
        age: Number(age) || 0,
        birthDate,
        email,
        mobileNo,
        landline,
        homeAddress: homeAddress.toUpperCase(),
        fatherName: fatherName.toUpperCase(),
        motherName: motherName.toUpperCase(),
        schoolYearId: selectedSyId,
      });
    } catch (error) {
      console.error('Failed to persist candidate', error);
    } finally {
      setIsPersisting(false);
    }
  };

  const readOnlyBirthDate = birthDate ? new Date(birthDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }) : '';

  const gradeLevelLabel = learnerSection?.gradeLevel || gradeLevel;
  const learnerNameLabel = candidateFullName || 'Select a learner';

  return createPortal(
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-dialog modal-dialog--wide usis-coc-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-modal-title">
        <div className="grid grid-cols-3" aria-hidden="true">
          <span className="h-[4px] bg-[#0038a8]" />
          <span className="h-[4px] bg-[#fcd116]" />
          <span className="h-[4px] bg-[#ce1126]" />
        </div>

        <header className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Election Modal</p>
            <h3 id="candidate-modal-title" className="modal-dialog__header-title">
              {initialData ? 'Update Certificate of Candidacy' : 'Certificate of Candidacy'}
            </h3>
            <p className="modal-dialog__eyebrow">Official Learner Government Profile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="usis-candidate-modal__close"
            aria-label="Close certificate of candidacy modal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-dialog__body usis-coc-modal__content">
          {duplicateDetected ? (
            <div className="notice-box border border-[#fbc4cb] bg-[#fff4f5] text-[#8f1021] text-[13px] font-semibold px-4 py-3 rounded-md">
              Duplicate Name Detected. Please confirm learner identity before saving.
            </div>
          ) : null}

          <section className="usis-coc-modal__section">
            <h4 className="modal-dialog__eyebrow">1. Learner Profile</h4>
            <div className="usis-coc-modal__top-grid">
              <div className="usis-coc-modal__panel">
                <SearchableSelect
                  label="Select Learner"
                  value={selectedLearnerLrn}
                  onChange={setSelectedLearnerLrn}
                  options={learnerOptions}
                  floatingLabel
                  disabled={learnerOptions.length === 0}
                />
                <p className="usis-coc-modal__helper">
                  Select a learner from the cached registrar directory. Learner fields populate automatically from `registrar_learners`.
                </p>

                <div className="usis-coc-modal__summary-grid">
                  <ReadOnlyField label="Learner Name" value={learnerNameLabel} />
                  <ReadOnlyField label="LRN" value={String(learnerRecord?.lrn || '')} />
                  <ReadOnlyField label="Grade Level" value={String(gradeLevelLabel || '')} />
                  <ReadOnlyField label="Section" value={String(learnerSection?.name || '')} />
                  <ReadOnlyField label="Gender" value={gender} />
                  <ReadOnlyField label="Birth Date" value={readOnlyBirthDate} />
                </div>
              </div>

              <div className="usis-coc-modal__panel">
                <label className="floating-field usis-coc-modal__field">
                  <div className="floating-field__control">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder=" "
                      data-has-value={String(Boolean(String(imageUrl || '').trim()))}
                    />
                    <span>Portrait URL</span>
                  </div>
                </label>
                <p className="usis-coc-modal__helper">
                  Optional. Use the learner portrait or an approved candidate photo URL.
                </p>
              </div>
            </div>
          </section>

          <section className="usis-coc-modal__section">
            <h4 className="modal-dialog__eyebrow">2. Candidate Setup</h4>
            <div className="usis-coc-modal__triple-grid">
              <SearchableSelect
                label="Elective Position Applied"
                value={position}
                onChange={(value) => setPosition(value as Position)}
                options={POSITIONS.map((item) => ({ label: item, value: item }))}
                floatingLabel
              />
              <SearchableSelect
                label="Party Affiliation"
                value={party}
                onChange={setParty}
                options={partyOptions}
                floatingLabel
              />
              <ReadOnlyField label="Grade Level" value={String(gradeLevelLabel || '')} />
            </div>

            <div className="usis-coc-modal__double-grid">
              <EditableTextarea
                label="Campaign Platform (Voter-Visible)"
                value={vision}
                onChange={setVision}
                minHeight="170px"
              />
              <EditableTextarea
                label="Encoder Remarks (Audit-Visible)"
                value={remarks}
                onChange={setRemarks}
                minHeight="170px"
              />
            </div>
          </section>

          <section className="usis-coc-modal__section">
            <h4 className="modal-dialog__eyebrow">3. Contact and Family</h4>
            <div className="usis-coc-modal__triple-grid">
              <ReadOnlyField label="Age" value={age} />
              <ReadOnlyField label="Mobile No." value={mobileNo} />
              <ReadOnlyField label="Landline" value={landline} />
            </div>
            <ReadOnlyField label="Email Address" value={email} />
            <ReadOnlyTextarea label="Home Address" value={homeAddress} minHeight="138px" />
            <div className="usis-coc-modal__double-grid">
              <ReadOnlyField label="Father's Full Name" value={fatherName} />
              <ReadOnlyField label="Mother's Full Name" value={motherName} />
            </div>
          </section>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPersisting || duplicateDetected || (!selectedLearnerLrn && !initialData)}
              className={`modal-dialog__blue inline-flex min-h-[44px] items-center justify-center rounded-[4px] px-4 py-2 text-[16px] transition-colors ${
                duplicateDetected ? 'bg-gray-400 cursor-not-allowed text-white/50' : 'bg-[#0038a8] text-white hover:bg-[#002f8a]'
              }`}
            >
              {isPersisting ? 'Syncing to Cloud...' : initialData ? 'Update Candidate' : 'Save Candidate'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
};

export default RegisterCandidateModal;
