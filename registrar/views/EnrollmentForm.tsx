
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GradeLevel, EnrollmentStatus, Student } from '../types';
import { useStore } from '../store';
import ConfirmationModal from '../components/ConfirmationModal';

const EnrollmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { addLearner, updateLearner, gradeLevels, sections, learners, activeSchoolYear, loading } = useStore();
  
  const isLocked = activeSchoolYear.isLocked;

  const [formData, setFormData] = useState<Partial<Student>>({
    lrn: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    birthDate: '',
    gender: 'Male',
    contactNumber: '',
    address: '',
    guardian_name: '',
    father_name: '',
    mother_name: '',
    status: EnrollmentStatus.ENROLLED,
    sectionId: '',
    isSSLG: false,
    isClubOfficer: false,
    isAthlete: false,
    isArtist: false,
    is4Ps: false,
    isIndigent: false,
    orgAffiliations: [],
    enrollments: []
  });

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevels[0] || GradeLevel.GRADE_7);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateStudent, setDuplicateStudent] = useState<Student | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const learnerCountBySection = useMemo(() => {
    const counts = new Map<string, number>();
    learners.forEach((learner) => {
      const key = String(learner.sectionId || '').trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [learners]);

  const availableSections = useMemo(() => {
    return sections
      .filter(s => s.gradeLevel === selectedGrade && s.schoolYearId === activeSchoolYear.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(s => {
        const count = learnerCountBySection.get(String(s.id).trim()) || 0;
        return { ...s, learnerCount: count };
      });
  }, [sections, selectedGrade, activeSchoolYear.id, learnerCountBySection]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setValidationError("Action Blocked: You cannot enroll students into an archived/locked school year.");
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.lrn) {
      setValidationError("LRN and Full Name are strictly required to maintain database integrity and prevent duplicate records.");
      return;
    }

    // Duplicate Check Engine
    const existing = learners.find(l => String(l.lrn || '').trim() === String(formData.lrn || '').trim());
    if (existing) {
      setDuplicateStudent(existing);
      setShowDuplicateModal(true);
      return;
    }

    setShowCommitModal(true);
  };

  const executeCommit = async (isUpdate: boolean = false) => {
    const studentToSync = isUpdate && duplicateStudent ? duplicateStudent : null;
    
    const newEnrollment = {
      id: Math.random().toString(36).substr(2, 9),
      schoolYear: activeSchoolYear.label,
      gradeLevel: selectedGrade,
      section: sections.find(s => s.id === formData.sectionId)?.name || 'Unassigned',
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: EnrollmentStatus.ENROLLED
    };

    let res;
    if (isUpdate && studentToSync) {
      // Merge with existing history
      const updatedHistory = [...(studentToSync.enrollments || [])];
      const hasCurrentYear = updatedHistory.some(e => e.schoolYear === activeSchoolYear.label);
      if (!hasCurrentYear) updatedHistory.push(newEnrollment);

      res = await updateLearner(studentToSync.id, {
        ...formData,
        enrollments: updatedHistory
      });
    } else {
      const newStudent: Student = {
        ...formData as Student,
        id: Math.random().toString(36).substr(2, 9),
        enrollments: [newEnrollment] 
      };
      res = await addLearner(newStudent);
    }

    if (res?.error) {
      setValidationError(res.error);
    } else {
      setShowCommitModal(false);
      setShowDuplicateModal(false);
      navigate('/learners');
    }
  };

  const flags = [
    { name: 'isSSLG', label: 'SSLG Member' },
    { name: 'isClubOfficer', label: 'Club Officer' },
    { name: 'isAthlete', label: 'Student Athlete' },
    { name: 'isArtist', label: 'School Artist' },
    { name: 'is4Ps', label: '4Ps Beneficiary' },
    { name: 'isIndigent', label: 'Indigent Status' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      {isLocked && (
        <div className="bg-amber-100 border-l-8 border-amber-500 p-8 rounded-[40px] flex items-center gap-6 shadow-lg shadow-amber-200/50">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0">
             <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <div>
            <h3 className="text-xl font-black text-amber-900 uppercase tracking-tighter">Registration Desk Locked</h3>
            <p className="text-sm font-medium text-amber-800">You are viewing historical data for SY {activeSchoolYear.label}. Institutional records for this period have been finalized and cannot be modified.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${isLocked ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}`}>
        
        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <span className="material-symbols-outlined text-white text-2xl">how_to_reg</span>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight uppercase">Registration Desk</h3>
                <p className="text-white/70 text-xs font-medium leading-relaxed">
                  Enroll a new learner into the database. Ensure LRN accuracy for unique student identification.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/50 ml-2">Grade Level</label>
                  <select 
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold outline-none focus:bg-white/20"
                  >
                    {gradeLevels.map(g => <option key={g} value={g} className="text-primary">{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/50 ml-2">Class Section</label>
                  <select 
                    name="sectionId"
                    value={formData.sectionId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold outline-none focus:bg-white/20"
                  >
                    <option value="">Select Section</option>
                    {availableSections.map(s => (
                      <option key={s.id} value={s.id} className="text-primary">
                        {s.name} ({s.learnerCount} Learners)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-surfaceVariant shadow-m3-1">
             <h4 className="font-black text-primary uppercase tracking-widest text-[10px] mb-6 border-b pb-2">Institutional Profiling</h4>
             <div className="grid grid-cols-2 gap-4">
               {flags.map(flag => (
                 <label key={flag.name} className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-surfaceVariant hover:border-primary/30 cursor-pointer transition-all">
                   <input 
                     type="checkbox"
                     name={flag.name}
                     checked={!!(formData as any)[flag.name]}
                     onChange={handleChange}
                     className="w-5 h-5 rounded-lg accent-primary"
                   />
                   <span className="text-xs font-bold text-onSurface">{flag.label}</span>
                 </label>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[48px] shadow-m3-2 border border-surfaceVariant">
            <h4 className="font-black text-primary uppercase tracking-tighter text-xl mb-8">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Learner Reference Number (LRN)</label>
                <input 
                  type="text" 
                  name="lrn"
                  placeholder="12-digit LRN"
                  value={formData.lrn}
                  onChange={handleChange}
                  required
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div />
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Middle Name</label>
                <input 
                  type="text" 
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Gender</label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Birth Date</label>
                <input 
                  type="date" 
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Contact Number</label>
                <input 
                  type="text" 
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Complete Address</label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
            </div>

            <h4 className="font-black text-primary uppercase tracking-tighter text-xl mb-8 mt-12">Family Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Father's Full Name</label>
                <input 
                  type="text" 
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Mother's Full Name</label>
                <input 
                  type="text" 
                  name="mother_name"
                  value={formData.mother_name}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-outline uppercase ml-3">Guardian Name</label>
                <input 
                  type="text" 
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl bg-surface border-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                />
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button 
                type="submit"
                disabled={loading || isLocked}
                className={`px-12 py-5 bg-primary text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50`}
              >
                <span className="material-symbols-outlined">{isLocked ? 'lock' : 'save'}</span>
                {isLocked ? 'Record Locked' : 'Commit Registration'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Standard Confirmation */}
      <ConfirmationModal
        isOpen={showCommitModal}
        title="Commit Enrollment"
        message={`Are you sure you want to enroll ${formData.firstName} ${formData.lastName} into ${selectedGrade}?`}
        onConfirm={() => executeCommit(false)}
        onCancel={() => setShowCommitModal(false)}
        confirmLabel="Confirm Enrollment"
        isLoading={loading}
      />

      {/* Duplicate Resolution Modal */}
      <ConfirmationModal
        isOpen={showDuplicateModal}
        type="accent"
        title="Duplicate Found"
        message={`A profile with LRN ${formData.lrn} already exists (${duplicateStudent?.firstName} ${duplicateStudent?.lastName}). Would you like to update the existing record with this new information?`}
        confirmLabel="Update Profile"
        cancelLabel="Cancel"
        onConfirm={() => executeCommit(true)}
        onCancel={() => setShowDuplicateModal(false)}
        isLoading={loading}
      />

      <ConfirmationModal
        isOpen={!!validationError}
        type="accent"
        title="Data Requirement"
        message={validationError || ''}
        confirmLabel="Understood"
        hideCancel={true}
        onConfirm={() => setValidationError(null)}
      />
    </div>
  );
};

export default EnrollmentForm;
