
import React from 'react';
import { Candidate } from '../types';
import { LEON_NHS_LOGO_URL } from '../constants';

interface CandidateAuditViewProps {
  candidate: Candidate | null;
  onBack: () => void;
}

const CandidateAuditView: React.FC<CandidateAuditViewProps> = ({ candidate, onBack }) => {
  if (!candidate) {
    return (
      <section className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-10">
        <div className="rounded-[12px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <i className="fa-solid fa-user-slash mb-5 text-[24px] text-slate-300"></i>
          <h2 className="text-[24px] font-black uppercase text-slate-900">Invalid Reference</h2>
          <p className="mt-3 text-[16px] leading-[1.5] text-slate-600">
            This candidate profile could not be found in the current database.
          </p>
          <button
            onClick={onBack}
            className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-[#034F8B]"
          >
            Return to Portal
          </button>
        </div>
      </section>
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
    <section className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-10">
      <div className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Candidate Audit
          </p>
          <h2 className="mt-2 text-[24px] font-black uppercase text-[#034F8B]">
            Public Candidate Audit
          </h2>
          <p className="mt-2 text-[16px] leading-[1.5] text-slate-600">
            Biographical data integrity check for the current election cycle.
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="mb-8 flex items-center space-x-6 border-b border-slate-200 pb-6">
            <img 
              src={candidate.imageUrl || LEON_NHS_LOGO_URL} 
              className="h-24 w-24 rounded-[12px] border border-slate-200 bg-slate-50 object-cover p-1" 
              alt={candidate.name} 
              onError={(e) => { (e.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
            />
            <div>
              <h3 className="text-[24px] font-black uppercase leading-none text-slate-900">{candidate.name}</h3>
              <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[#034F8B]">{candidate.position}</p>
              {incompleteCount > 0 ? (
                <div className="mt-3 flex items-center text-[#E11C38]">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i>
                  <span className="text-[13px] font-bold uppercase tracking-[0.12em]">{incompleteCount} Required Fields Missing</span>
                </div>
              ) : (
                <div className="mt-3 flex items-center text-green-600">
                  <i className="fa-solid fa-circle-check mr-2"></i>
                  <span className="text-[13px] font-bold uppercase tracking-[0.12em]">All Data Verified Complete</span>
                </div>
              )}
            </div>
          </div>

          {candidate.remarks && (
            <div className="mb-8 rounded-[12px] border border-amber-200 bg-amber-50 px-5 py-5">
              <h4 className="mb-2 flex items-center text-[13px] font-bold uppercase tracking-[0.12em] text-amber-700">
                <i className="fa-solid fa-comment-dots mr-2"></i>
                Official Encoder Remarks
              </h4>
              <p className="text-[16px] leading-[1.5] text-amber-900">
                {candidate.remarks}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {auditFields.map((f, i) => {
              const hasData = checkField(f.value);
              return (
                <div key={i} className={`flex items-center justify-between rounded-[12px] border px-4 py-4 ${!hasData && f.required ? 'border-red-100 bg-red-50' : 'border-slate-200 bg-white'}`}>
                  <div>
                    <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">{f.label}</p>
                    <p className={`text-[16px] leading-[1.5] ${!hasData ? 'italic text-slate-400' : 'text-slate-900'}`}>
                      {hasData ? f.value : 'No information provided'}
                    </p>
                  </div>
                  <div>
                    {!hasData && f.required ? (
                      <span className="rounded-[12px] bg-red-100 px-3 py-2 text-[13px] font-bold uppercase text-[#E11C38]">Required</span>
                    ) : !hasData ? (
                      <span className="rounded-[12px] bg-slate-100 px-3 py-2 text-[13px] font-bold uppercase text-slate-500">Optional</span>
                    ) : (
                      <i className="fa-solid fa-check text-green-500"></i>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-[12px] border border-blue-100 bg-blue-50 px-5 py-5">
            <p className="text-[13px] leading-[1.5] text-[#034F8B]">
              Candidates with incomplete "Required" fields must contact the LG COMEA to update their digital profile before the election period begins.
            </p>
          </div>
          
          <button 
            onClick={onBack}
            className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-[#034F8B]"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </section>
  );
};

export default CandidateAuditView;
