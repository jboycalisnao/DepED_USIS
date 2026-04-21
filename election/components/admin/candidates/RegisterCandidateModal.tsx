
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Position, SchoolYear, Candidate, GradeLevel } from '../../../types';
import { POSITIONS } from '../../../constants';
import { urlToBase64 } from '../../../utils/imageUtils';
import { useStore } from '../../../supabaseStore';
import UppercaseInput from '../../common/UppercaseInput';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] max-w-5xl w-full max-h-[95vh] overflow-y-auto no-scrollbar border border-white/20 transform animate-in zoom-in-95 duration-300">
        
        <div className={`p-8 md:p-10 text-center text-white relative ${initialData ? 'bg-[#034F8B]' : 'bg-[#E11C38]'}`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center overflow-hidden">
            <span className="text-[200px] font-black uppercase tracking-tighter select-none rotate-12 opacity-10">COC</span>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner relative z-10">
            <i className={`fa-solid ${isPersisting ? 'fa-spinner animate-spin text-white' : (initialData ? 'fa-user-pen' : 'fa-file-signature text-[#fcd116]')}`}></i>
          </div>
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none mb-1 relative z-10">
            {initialData ? 'Update Certificate' : 'Certificate of Candidacy'}
          </h3>
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.3em] relative z-10">Official Learner Government Profile</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-4">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#034F8B] flex items-center justify-center font-black text-xs">I</span>
                <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Learner Profile (Mandatory)</h4>
              </div>
              {duplicateDetected && (
                <div className="flex items-center text-[#E11C38] bg-red-50 px-4 py-2 rounded-xl animate-pulse">
                  <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Duplicate Name Detected</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <UppercaseInput label="Surname / Last Name *" value={lastName} onValueChange={setLastName} placeholder="E.G. DELA CRUZ" required error={duplicateDetected} />
                <UppercaseInput label="Given / First Name *" value={firstName} onValueChange={setFirstName} placeholder="E.G. JUAN" required error={duplicateDetected} />
                <UppercaseInput label="Middle Name" value={middleName} onValueChange={setMiddleName} placeholder="E.G. RAMOS" />
                <UppercaseInput label="Extension (Jr., III...)" value={extensionName} onValueChange={setExtensionName} placeholder="N/A" />
              </div>
              <div className="md:col-span-1 flex flex-col items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ID Portrait (Optional)</label>
                <div className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden relative group">
                  {imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover" alt="Portrait" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                      <i className="fa-solid fa-camera text-2xl mb-2"></i>
                      <span className="text-[8px] font-bold">MISSING PHOTO</span>
                    </div>
                  )}
                  <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="PASTE URL" className="absolute bottom-2 left-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[8px] font-bold outline-none border border-gray-200 focus:border-[#034F8B]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade Level</label>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value as GradeLevel)} className="coc-input w-full">
                  {Object.values(GradeLevel).map(gl => <option key={gl} value={gl}>{gl}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Elective Position Applied</label>
                <select value={position} onChange={e => setPosition(e.target.value as Position)} className="coc-input w-full">
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Party Affiliation</label>
                <select value={party} onChange={e => setParty(e.target.value)} className="coc-input w-full">
                  <option value="Independent">Independent</option>
                  {availablePartylists.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center space-x-4 border-b border-gray-100 pb-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-[#E11C38] flex items-center justify-center font-black text-xs">II</span>
              <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Biographical & Contact Info (Optional)</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="coc-input w-full">
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Age</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="0" className="coc-input w-full" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date of Birth</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="coc-input w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" className="coc-input w-full !pl-12" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile No.</label>
                <div className="relative">
                  <i className="fa-solid fa-mobile-screen absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input type="tel" value={mobileNo} onChange={e => setMobileNo(e.target.value)} placeholder="09XX XXX XXXX" className="coc-input w-full !pl-12" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Landline</label>
                <div className="relative">
                  <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input type="tel" value={landline} onChange={e => setLandline(e.target.value)} placeholder="(033) XXX XXXX" className="coc-input w-full !pl-12" />
                </div>
              </div>
            </div>

            <UppercaseInput label="Home Address" value={homeAddress} onValueChange={setHomeAddress} placeholder="HOUSE NO, BARANGAY, MUNICIPALITY, PROVINCE" className="h-20 pt-3" />
          </div>

          <div className="space-y-8">
            <div className="flex items-center space-x-4 border-b border-gray-100 pb-2">
              <span className="w-8 h-8 rounded-lg bg-yellow-50 text-[#fcd116] flex items-center justify-center font-black text-xs">III</span>
              <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Parental & Audit Info</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <UppercaseInput label="Father's Full Name" value={fatherName} onValueChange={setFatherName} placeholder="SURNAME, GIVEN NAME M.I." />
              <UppercaseInput label="Mother's Full Name" value={motherName} onValueChange={setMotherName} placeholder="SURNAME, GIVEN NAME M.I." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-[#034F8B]">Campaign Platform (Voter-Visible)</label>
                <textarea value={vision} onChange={e => setVision(e.target.value)} placeholder="Outline main platforms..." className="coc-input w-full h-32 resize-none pt-4" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-[#E11C38]">Encoder Remarks (Audit-Visible)</label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Note missing documents, verification status, etc..." className="coc-input w-full h-32 resize-none pt-4 border-red-100 focus:border-red-500" />
              </div>
            </div>
          </div>

          <div className="pt-10 flex flex-col md:flex-row items-center gap-4">
            <button type="button" onClick={onClose} className="w-full md:w-1/3 py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">
              Abort Registration
            </button>
            <button 
              type="submit" 
              disabled={isPersisting || duplicateDetected}
              className={`w-full md:w-2/3 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-4 flex items-center justify-center ${
                duplicateDetected 
                  ? 'bg-gray-400 border-gray-500 cursor-not-allowed text-white/50 shadow-none' 
                  : 'bg-[#034F8B] text-white shadow-blue-900/30 hover:bg-blue-800 border-blue-950'
              }`}
            >
              {isPersisting ? (
                <><i className="fa-solid fa-spinner animate-spin mr-3"></i> Syncing to Cloud...</>
              ) : duplicateDetected ? (
                <><i className="fa-solid fa-ban mr-3"></i> Duplicate Found</>
              ) : (
                <><i className="fa-solid fa-check-double mr-3"></i> Submit Certificate</>
              )}
            </button>
          </div>
        </form>

        <style>{`
          .coc-input {
            background-color: #f9fafb;
            border: 2px solid #f3f4f6;
            border-radius: 1rem;
            padding-left: 1.25rem;
            padding-right: 1.25rem;
            padding-top: 0.85rem;
            padding-bottom: 0.85rem;
            font-weight: 700;
            font-size: 0.75rem;
            text-transform: uppercase;
            outline: none;
            transition: all 0.2s ease-in-out;
            color: #111827;
          }
          .coc-input:focus {
            border-color: #034f8b;
            background-color: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .coc-input::placeholder {
            color: #d1d5db;
            font-weight: 500;
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default RegisterCandidateModal;
