
import React, { useMemo } from 'react';
import { Student, EnrollmentRecord } from '../types';

interface LearnerDetailsModalProps {
  student: Student | null;
  history: EnrollmentRecord[];
  onClose: () => void;
}

const LearnerDetailsModal: React.FC<LearnerDetailsModalProps> = ({ student, history, onClose }) => {
  if (!student) return null;

  const initials = useMemo(() => {
    return `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
  }, [student]);

  const profileFlags = [
    { label: 'SSLG Member', value: student.isSSLG, icon: 'military_tech' },
    { label: 'Club Officer', value: student.isClubOfficer, icon: 'workspace_premium' },
    { label: 'Athlete', value: student.isAthlete, icon: 'sports_basketball' },
    { label: 'Artist', value: student.isArtist, icon: 'palette' },
    { label: '4Ps', value: student.is4Ps, icon: 'family_restroom' },
    { label: 'Indigent', value: student.isIndigent, icon: 'volunteer_activism' },
  ].filter(f => f.value);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6">
      {/* Robust Fullscreen Backdrop */}
      <div 
        className="fixed top-0 left-0 w-full h-full bg-primary/20 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      ></div>
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-[48px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-surfaceVariant/50">
        
        {/* Header Section */}
        <div className="bg-primary/5 p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 border-b border-surfaceVariant/30">
          <div className={`w-28 h-28 rounded-[40px] flex items-center justify-center text-white text-4xl font-black shadow-xl shrink-0 ${student.gender === 'Male' ? 'bg-primary' : 'bg-accent'}`}>
            {initials}
          </div>
          
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h3 className="text-3xl sm:text-4xl font-black text-primary uppercase tracking-tighter leading-tight truncate">
              {student.lastName}, {student.firstName} {student.middleName || ''}
            </h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2">
              <p className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">id_card</span> {student.lrn}
              </p>
              <div className="w-1.5 h-1.5 rounded-full bg-surfaceVariant hidden sm:block"></div>
              <p className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">{student.gender === 'Male' ? 'male' : 'female'}</span> {student.gender}
              </p>
              <div className="w-1.5 h-1.5 rounded-full bg-surfaceVariant hidden sm:block"></div>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[9px] font-black uppercase tracking-widest">
                {student.status}
              </span>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="absolute top-8 right-8 w-12 h-12 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center group"
          >
            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">close</span>
          </button>
        </div>

        {/* Content Section - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Left Column: Details */}
            <div className="space-y-10">
              
              {/* Personal Data */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">person</span>
                  <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Personal Record</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-surface rounded-3xl border border-surfaceVariant/30">
                    <span className="block text-[8px] font-black text-outline uppercase tracking-widest mb-1">Birth Date</span>
                    <span className="font-black text-primary text-sm">{student.birthDate || 'Not Provided'}</span>
                  </div>
                  <div className="p-5 bg-surface rounded-3xl border border-surfaceVariant/30">
                    <span className="block text-[8px] font-black text-outline uppercase tracking-widest mb-1">Contact</span>
                    <span className="font-black text-primary text-sm">{student.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="p-5 bg-surface rounded-3xl border border-surfaceVariant/30 col-span-2">
                    <span className="block text-[8px] font-black text-outline uppercase tracking-widest mb-1">Permanent Address</span>
                    <span className="font-black text-primary text-sm">{student.address || 'Local Resident'}</span>
                  </div>
                </div>
              </section>

              {/* Family Background */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">family_restroom</span>
                  <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Family Background</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-5 bg-white border border-surfaceVariant/50 rounded-3xl flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-black text-outline uppercase mb-1">Father</span>
                      <span className="font-bold text-sm text-primary uppercase">{student.father_name || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="p-5 bg-white border border-surfaceVariant/50 rounded-3xl flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-black text-outline uppercase mb-1">Mother</span>
                      <span className="font-bold text-sm text-primary uppercase">{student.mother_name || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="p-5 bg-white border border-surfaceVariant/50 rounded-3xl flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-black text-outline uppercase mb-1">Guardian</span>
                      <span className="font-bold text-sm text-primary uppercase">{student.guardian_name || 'Parent/Guardian'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Institutional Profiling */}
              {profileFlags.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary font-bold">verified_user</span>
                    <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Institutional Profile</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileFlags.map((flag, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
                        <span className="material-symbols-outlined text-[16px]">{flag.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{flag.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: History */}
            <div className="space-y-10">
              <section className="space-y-4 h-full flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">history_edu</span>
                  <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Academic Lifecycle</h4>
                </div>
                <div className="flex-1 bg-surface/50 rounded-[40px] p-8 border border-surfaceVariant/50 relative">
                   {history.length > 0 ? (
                     <div className="space-y-6">
                        {history.map((h, i) => (
                          <div key={i} className="relative pl-8 border-l-2 border-primary/20 pb-4 last:pb-0">
                            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm"></div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-black text-primary uppercase tracking-tight">{h.schoolYear}</span>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${h.status === 'Enrolled' ? 'bg-green-100 text-green-700' : 'bg-surfaceVariant text-outline'}`}>
                                {h.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{h.gradeLevel}</span>
                              <div className="w-1 h-1 rounded-full bg-outline/20"></div>
                              <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{h.section}</span>
                            </div>
                            <p className="text-[9px] text-outline/50 mt-1 uppercase font-bold">Admitted: {h.enrollmentDate}</p>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No historical records found</p>
                     </div>
                   )}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-surface/30 border-t border-surfaceVariant flex justify-end gap-4">
           <button 
             onClick={() => window.print()} 
             className="px-8 py-4 bg-white border border-surfaceVariant rounded-2xl text-outline font-black text-[10px] uppercase tracking-widest hover:text-primary hover:border-primary transition-all flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-[18px]">print</span> Generate Dossier
           </button>
           <button 
             onClick={onClose} 
             className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
           >
             Close Record
           </button>
        </div>
      </div>
    </div>
  );
};

export default LearnerDetailsModal;
