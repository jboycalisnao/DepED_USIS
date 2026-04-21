
import React from 'react';
import { Candidate } from '../types';
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../constants';

interface CandidateAuditViewProps {
  candidate: Candidate | null;
  onBack: () => void;
}

const CandidateAuditView: React.FC<CandidateAuditViewProps> = ({ candidate, onBack }) => {
  if (!candidate) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-sm">
          <i className="fa-solid fa-user-slash text-6xl text-gray-200 mb-6"></i>
          <h2 className="text-2xl font-black text-gray-900 uppercase">Invalid Reference</h2>
          <p className="text-gray-500 text-sm mt-2">This candidate profile could not be found in our current database.</p>
          <button onClick={onBack} className="mt-8 text-[#034F8B] font-black uppercase text-xs tracking-widest">Return to Portal</button>
        </div>
      </div>
    );
  }

  const checkField = (val: any) => {
    return !!val && val.toString().trim() !== '';
  };

  const auditFields = [
    { label: 'Full Legal Name', value: candidate.name, required: true },
    { label: 'Position', value: candidate.position, required: true },
    { label: 'Grade Level', value: candidate.gradeLevel, required: true },
    { label: 'Party Affiliation', value: candidate.party, required: true },
    { label: 'Date of Birth', value: candidate.birthDate, required: true },
    { label: 'Age', value: candidate.age, required: true },
    { label: 'Email Address', value: candidate.email, required: true },
    { label: 'Mobile Number', value: candidate.mobileNo, required: true },
    { label: 'Home Address', value: candidate.homeAddress, required: true },
    { label: 'Father\'s Name', value: candidate.fatherName, required: false },
    { label: 'Mother\'s Name', value: candidate.motherName, required: false },
    { label: 'Vision/Platform', value: candidate.vision, required: true },
  ];

  const incompleteCount = auditFields.filter(f => f.required && !checkField(f.value)).length;

  return (
    <div className="flex-grow overflow-y-auto bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#034F8B] p-8 text-center text-white relative">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <img src={DEPED_SEAL_URL} className="h-12" alt="DepEd" />
            <img src={LEON_NHS_LOGO_URL} className="h-12" alt="LNHS" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Public Candidate Audit</h2>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Biographical Data Integrity Check</p>
        </div>

        <div className="p-8">
          <div className="flex items-center space-x-6 mb-10 pb-8 border-b border-gray-100">
            <img 
              src={candidate.imageUrl || LEON_NHS_LOGO_URL} 
              className="w-24 h-24 rounded-2xl object-cover shadow-lg bg-gray-50 p-1" 
              alt={candidate.name} 
              onError={(e) => { (e.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
            />
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase leading-none">{candidate.name}</h3>
              <p className="text-[#034F8B] font-bold uppercase text-xs mt-1">{candidate.position}</p>
              {incompleteCount > 0 ? (
                <div className="mt-3 flex items-center text-red-600">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">{incompleteCount} Required Fields Missing</span>
                </div>
              ) : (
                <div className="mt-3 flex items-center text-green-600">
                  <i className="fa-solid fa-circle-check mr-2"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">All Data Verified Complete</span>
                </div>
              )}
            </div>
          </div>

          {/* New Encoder Remarks Section */}
          {candidate.remarks && (
            <div className="mb-8 p-6 bg-amber-50 rounded-2xl border-l-4 border-amber-400">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center">
                <i className="fa-solid fa-comment-dots mr-2"></i>
                Official Encoder Remarks
              </h4>
              <p className="text-xs font-bold text-amber-900 leading-relaxed uppercase">
                {candidate.remarks}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {auditFields.map((f, i) => {
              const hasData = checkField(f.value);
              return (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${!hasData && f.required ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                    <p className={`text-xs font-bold ${!hasData ? 'italic text-gray-300' : 'text-gray-900'}`}>
                      {hasData ? f.value : 'No information provided'}
                    </p>
                  </div>
                  <div>
                    {!hasData && f.required ? (
                      <span className="text-[8px] font-black text-red-600 bg-red-100 px-3 py-1 rounded-full uppercase">REQUIRED</span>
                    ) : !hasData ? (
                      <span className="text-[8px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase">OPTIONAL</span>
                    ) : (
                      <i className="fa-solid fa-check text-green-500"></i>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase italic">
              Candidates with incomplete "Required" fields must contact the LG COMEA to update their digital profile before the election period begins.
            </p>
          </div>
          
          <button 
            onClick={onBack}
            className="w-full mt-8 py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest hover:text-gray-900 transition-colors"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateAuditView;
