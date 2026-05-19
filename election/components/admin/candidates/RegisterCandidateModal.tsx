
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Position, SchoolYear, Candidate, GradeLevel } from '../../../types';
import { POSITIONS } from '../../../constants';
import { urlToBase64 } from '../../../utils/imageUtils';
import { useStore } from '../../../supabaseStore';
import UppercaseInput from '../../common/UppercaseInput';
import SearchableSelect from '../../ui/SearchableSelect';

interface RegisterCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Candidate> & { schoolYearId: string }) => void;
  schoolYears: SchoolYear[];
  initialData?: Candidate;
}

const RegisterCandidateModal: React.FC<RegisterCandidateModalProps> = ({ isOpen, onClose, onSave, schoolYears = [], initialData }) => {
  const store = useStore();
  const activeSy = (schoolYears || []).find(sy => sy.isActive || sy.is_active);
  
  // COC Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [extensionName, setExtensionName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(GradeLevel.GRADE_7);
  const [position, setPosition] = useState<Position>((POSITIONS || [])[0]);
  const [party, setParty] = useState('Independent');
  const [vision, setVision] = useState('');
  const [remarks, setRemarks] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedSyId, setSelectedSyId] = useState('');
  
  // New COC Fields
  const [gender, setGender] = useState('');
  const [age, setAge] = useState<number | string>('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [landline, setLandline] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  const [isPersisting, setIsPersisting] = useState(false);
  const [availablePartylists, setAvailablePartylists] = useState<string[]>([]);
  const [existingCandidates, setExistingCandidates] = useState<Candidate[]>([]);
  const gradeLevelOptions = useMemo(
    () => Object.values(GradeLevel).map((gl) => ({ label: gl, value: gl })),
    []
  );
  const positionOptions = useMemo(
    () => POSITIONS.map((p) => ({ label: p, value: p })),
    []
  );
  const partyOptions = useMemo(
    () => [{ label: 'Independent', value: 'Independent' }, ...availablePartylists.map((p) => ({ label: p, value: p }))],
    [availablePartylists]
  );
  const genderOptions = useMemo(
    () => [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
      { label: 'Non-Binary', value: 'Non-Binary' }
    ],
    []
  );

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setExtensionName('');
    setGradeLevel(GradeLevel.GRADE_7);
    setPosition((POSITIONS || [])[0]);
    setParty('Independent');
    setVision('');
    setRemarks('');
    setImageUrl('');
    setSelectedSyId(activeSy?.id || '');
    setGender('');
    setAge('');
    setBirthDate('');
    setEmail('');
    setMobileNo('');
    setLandline('');
    setHomeAddress('');
    setFatherName('');
    setMotherName('');
  };

  const duplicateDetected = useMemo(() => {
    if (!firstName || !lastName) return false;
    const inputName = `${firstName} ${lastName}`.toUpperCase().trim();
    return existingCandidates.some(c => {
      const existingName = c.name.toUpperCase().trim();
      return existingName === inputName && c.id !== initialData?.id;
    });
  }, [firstName, lastName, existingCandidates, initialData]);

  useEffect(() => {
    if (isOpen) {
      // Fix: store.fetchCandidates() returns { candidates, turnoutByPosition }, so we extract candidates to avoid type mismatch with existingCandidates state
      store.fetchCandidates().then(res => setExistingCandidates(res.candidates));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedSyId && activeSy?.id) {
      setSelectedSyId(activeSy.id);
    }
  }, [activeSy, selectedSyId]);

  useEffect(() => {
    const loadPartylists = async () => {
      const syId = selectedSyId || activeSy?.id;
      if (syId) {
        try {
          const lists = await store.fetchPartylists(syId);
          setAvailablePartylists((lists || []).map((l: any) => l.name));
        } catch (err) {
          console.error("Failed to load partylists", err);
          setAvailablePartylists([]);
        }
      }
    };
    if (isOpen) {
      loadPartylists();
    }
  }, [isOpen, selectedSyId, activeSy]);

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setMiddleName(initialData.middleName || '');
      setExtensionName(initialData.extensionName || '');
      setGradeLevel(initialData.gradeLevel);
      setPosition(initialData.position);
      setParty(initialData.party);
      setVision(initialData.vision);
      setRemarks(initialData.remarks || '');
      setImageUrl(initialData.imageUrl);
      setGender(initialData.gender);
      setAge(initialData.age);
      setBirthDate(initialData.birthDate);
      setEmail(initialData.email);
      setMobileNo(initialData.mobileNo);
      setLandline(initialData.landline || '');
      setHomeAddress(initialData.homeAddress);
      setFatherName(initialData.fatherName || '');
      setMotherName(initialData.motherName || '');
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !selectedSyId || duplicateDetected) return;

    try {
      setIsPersisting(true);
      let finalImageUrl = imageUrl;
      if (imageUrl && !imageUrl.startsWith('data:') && imageUrl !== initialData?.imageUrl) {
        finalImageUrl = await urlToBase64(imageUrl);
      }
      
      const middleInit = middleName ? ` ${middleName.charAt(0)}.` : '';
      const ext = extensionName ? ` ${extensionName}` : '';
      const fullName = `${firstName}${middleInit} ${lastName}${ext}`.toUpperCase();

      onSave({ 
        name: fullName,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        middleName: middleName.toUpperCase(),
        extensionName: extensionName.toUpperCase(),
        gradeLevel,
        position, 
        party, 
        vision: vision || "", 
        remarks,
        imageUrl: finalImageUrl || '',
        gender,
        age: Number(age) || 0,
        birthDate,
        email,
        mobileNo,
        landline,
        homeAddress: homeAddress.toUpperCase(),
        fatherName: fatherName.toUpperCase(),
        motherName: motherName.toUpperCase(),
        schoolYearId: selectedSyId
      });
    } catch (error) {
      console.error("Failed to persist image:", error);
    } finally {
      setIsPersisting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-[rgba(18,35,61,0.22)]">
      <div className="usis-candidate-modal bg-white rounded-[12px] shadow-[0_18px_36px_rgba(18,35,61,0.18)] max-w-6xl w-full max-h-[95vh] overflow-y-auto no-scrollbar border border-[rgba(18,35,61,0.14)]">
        <div className="grid grid-cols-3" aria-hidden="true">
          <span className="h-[4px] bg-[#0038a8]" />
          <span className="h-[4px] bg-[#fcd116]" />
          <span className="h-[4px] bg-[#ce1126]" />
        </div>

        <header className="px-6 md:px-8 py-5 border-b border-[rgba(18,35,61,0.08)] bg-[#f8fbff] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[24px] font-bold leading-[1.05] text-[#0038a8]">
              {initialData ? 'Update Certificate' : 'Certificate of Candidacy'}
            </h3>
            <p className="text-[13px] font-semibold text-[#68758d] mt-1">Official Learner Government Profile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="usis-candidate-modal__close"
            aria-label="Close update certificate modal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5">
          {duplicateDetected ? (
            <div className="notice-box border border-[#fbc4cb] bg-[#fff4f5] text-[#8f1021] text-[13px] font-semibold px-4 py-3 rounded-[12px]">
              Duplicate Name Detected. Please confirm learner identity before saving.
            </div>
          ) : null}

          <section className="space-y-3">
            <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0038a8]">1. Learner Profile</h4>
            <div className="floating-field-grid grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UppercaseInput label="Surname / Last Name *" value={lastName} onValueChange={setLastName} placeholder=" " required error={duplicateDetected} />
                <UppercaseInput label="Given / First Name *" value={firstName} onValueChange={setFirstName} placeholder=" " required error={duplicateDetected} />
                <UppercaseInput label="Middle Name" value={middleName} onValueChange={setMiddleName} placeholder=" " />
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input type="text" value={extensionName} onChange={(e) => setExtensionName(e.target.value.toUpperCase())} data-has-value={String(!!extensionName)} placeholder=" " className="coc-input w-full" />
                    <span>Extension Name</span>
                  </div>
                </label>
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[13px] font-semibold text-[#68758d]">Portrait URL</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste URL" className="coc-input w-full !h-[64px] !min-h-[64px] !pt-[20px]" />
              </div>
            </div>

            <div className="floating-field-grid grid grid-cols-1 md:grid-cols-4 gap-3">
              <SearchableSelect label="Grade Level" value={gradeLevel} onChange={(value) => setGradeLevel(value as GradeLevel)} options={gradeLevelOptions} floatingLabel />
              <div className="md:col-span-2">
                <SearchableSelect label="Elective Position Applied" value={position} onChange={(value) => setPosition(value as Position)} options={positionOptions} floatingLabel />
              </div>
              <SearchableSelect label="Party Affiliation" value={party} onChange={setParty} options={partyOptions} floatingLabel />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0038a8]">2. Biographical and Contact</h4>
            <div className="floating-field-grid grid grid-cols-1 md:grid-cols-4 gap-3">
              <SearchableSelect label="Gender" value={gender} onChange={setGender} options={genderOptions} floatingLabel />
              <label className="floating-field"><div className="floating-field__control"><input type="number" value={age} onChange={(e) => setAge(e.target.value)} data-has-value={String(age !== '' && age !== null)} placeholder=" " className="coc-input w-full" /><span>Age</span></div></label>
              <div className="md:col-span-2">
                <label className="floating-field"><div className="floating-field__control"><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} data-has-value={String(!!birthDate)} placeholder=" " className="coc-input w-full" /><span>Date of Birth</span></div></label>
              </div>
            </div>

            <div className="floating-field-grid grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="floating-field"><div className="floating-field__control"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-has-value={String(!!email)} placeholder=" " className="coc-input w-full" /><span>Email Address</span></div></label>
              <label className="floating-field"><div className="floating-field__control"><input type="tel" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} data-has-value={String(!!mobileNo)} placeholder=" " className="coc-input w-full" /><span>Mobile No.</span></div></label>
              <label className="floating-field"><div className="floating-field__control"><input type="tel" value={landline} onChange={(e) => setLandline(e.target.value)} data-has-value={String(!!landline)} placeholder=" " className="coc-input w-full" /><span>Landline</span></div></label>
            </div>

            <UppercaseInput label="Home Address" value={homeAddress} onValueChange={setHomeAddress} placeholder=" " className="h-20 pt-3" />
          </section>

          <section className="space-y-3">
            <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0038a8]">3. Parental and Audit</h4>
            <div className="floating-field-grid grid grid-cols-1 md:grid-cols-2 gap-3">
              <UppercaseInput label="Father's Full Name" value={fatherName} onValueChange={setFatherName} placeholder=" " />
              <UppercaseInput label="Mother's Full Name" value={motherName} onValueChange={setMotherName} placeholder=" " />
            </div>
            <div className="floating-field-grid grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="floating-field"><div className="floating-field__control"><textarea value={vision} onChange={(e) => setVision(e.target.value)} data-has-value={String(!!vision)} placeholder=" " className="coc-input w-full h-28 resize-none pt-7" /><span>Campaign Platform (Voter-Visible)</span></div></label>
              <label className="floating-field"><div className="floating-field__control"><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} data-has-value={String(!!remarks)} placeholder=" " className="coc-input w-full h-28 resize-none pt-7 border-red-100 focus:border-red-500" /><span>Encoder Remarks (Audit-Visible)</span></div></label>
            </div>
          </section>

          <div className="pt-2 flex flex-col md:flex-row items-center gap-3">
            <button type="button" onClick={onClose} className="w-full md:w-1/3 min-h-[44px] px-4 py-2 rounded-[4px] border border-[rgba(18,35,61,0.14)] bg-white font-bold text-[#68758d] text-[13px] hover:text-[#ce1126] hover:border-[#ce1126]/20 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPersisting || duplicateDetected}
              className={`w-full md:w-2/3 min-h-[44px] px-4 py-2 rounded-[4px] font-bold text-[16px] transition-colors flex items-center justify-center ${
                duplicateDetected ? 'bg-gray-400 cursor-not-allowed text-white/50' : 'bg-[#0038a8] text-white hover:bg-[#002f8a]'
              }`}
            >
              {isPersisting ? 'Syncing to Cloud...' : duplicateDetected ? 'Duplicate Found' : 'Save Certificate'}
            </button>
          </div>
        </form>

        <style>{`
          .usis-candidate-modal .floating-field__control > span {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            line-height: 1.2 !important;
            font-size: 13px !important;
            letter-spacing: 0 !important;
            text-transform: none !important;
            font-weight: 400 !important;
            pointer-events: none;
            transition: top 180ms ease, transform 180ms ease, color 180ms ease, font-size 180ms ease;
          }
          .usis-candidate-modal .floating-field__control input:focus + span,
          .usis-candidate-modal .floating-field__control textarea:focus + span,
          .usis-candidate-modal .floating-field__control input[data-has-value="true"] + span,
          .usis-candidate-modal .floating-field__control textarea[data-has-value="true"] + span,
          .usis-candidate-modal .floating-field__control input[data-has-value="true"] ~ span,
          .usis-candidate-modal .floating-field__control input:not(:placeholder-shown) + span,
          .usis-candidate-modal .floating-field__control textarea:not(:placeholder-shown) + span {
            top: 11px;
            transform: none;
            color: #0038a8;
          }
          .usis-candidate-modal .coc-input {
            display: block;
            min-height: 64px;
            height: 64px;
            border: 1px solid rgba(18, 35, 61, 0.14);
            border-radius: 12px;
            background: #fbfcff;
            color: #12233d;
            padding: 24px 16px 10px;
            font-size: 16px;
            line-height: 1.5;
            font-weight: 400;
            outline: none;
            transition: border-color 180ms ease, box-shadow 180ms ease;
          }
          .usis-candidate-modal .coc-input:focus {
            border-color: rgba(0, 56, 168, 0.44);
            box-shadow: 0 0 0 4px rgba(0, 56, 168, 0.08);
            background: #fff;
          }
          .usis-candidate-modal .searchable-select--floating .floating-field__control {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .usis-candidate-modal .searchable-select--floating .floating-field__control input {
            min-height: 64px;
            height: 64px;
            border-right: 0;
            border-radius: 12px 0 0 12px;
            padding-right: 16px;
          }
          .usis-candidate-modal .searchable-select--floating .searchable-select__toggle {
            position: static;
            top: auto;
            right: auto;
            transform: none;
            align-self: stretch;
            width: 56px;
            min-width: 56px;
            height: 64px;
            min-height: 64px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(18, 35, 61, 0.14);
            border-left: 0;
            border-radius: 0 12px 12px 0;
            background: #fbfcff;
            color: #0038a8;
          }
          .usis-candidate-modal__close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border: 1px solid rgba(18, 35, 61, 0.14);
            border-radius: 999px;
            background: #ffffff;
            color: #68758d;
            cursor: pointer;
          }
          .usis-candidate-modal__close:hover {
            background: #eef4ff;
            color: #0038a8;
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default RegisterCandidateModal;
