
import React from 'react';
import { Candidate } from '../../../types';

interface CandidateRemarksProps {
  candidate: Candidate;
}

const CandidateRemarks: React.FC<CandidateRemarksProps> = ({ candidate }) => {
  const missingFields: string[] = [];
  const criticalMissing: string[] = [];

  // Critical Fields (System Requirements)
  if (!candidate.firstName) criticalMissing.push("First Name");
  if (!candidate.lastName) criticalMissing.push("Last Name");
  
  // Biographical (Mandatory for COC but allowed for draft)
  if (!candidate.imageUrl || candidate.imageUrl.includes('placeholder')) missingFields.push("Portrait");
  if (!candidate.birthDate) missingFields.push("Birth Date");
  if (!candidate.gender) missingFields.push("Sex/Gender");
  if (!candidate.age || candidate.age === 0) missingFields.push("Age");
  if (!candidate.homeAddress) missingFields.push("Address");
  
  // Contacts
  if (!candidate.email) missingFields.push("Email");
  if (!candidate.mobileNo) missingFields.push("Mobile");

  const isFullyComplete = criticalMissing.length === 0 && missingFields.length === 0 && !candidate.remarks;

  if (isFullyComplete) {
    return (
      <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
        <i className="fa-solid fa-circle-check text-[10px]"></i>
        <span className="text-[8px] font-black uppercase tracking-tighter">Verified Complete</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {/* Manual Remarks from Encoder */}
      {candidate.remarks && (
        <span className="bg-[#E11C38] text-white px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex items-center shadow-sm">
          <i className="fa-solid fa-comment-dots mr-1"></i>
          NOTE: {candidate.remarks}
        </span>
      )}
      
      {/* Critical Missing Fields */}
      {criticalMissing.map(field => (
        <span key={field} className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex items-center">
          <i className="fa-solid fa-triangle-exclamation mr-1"></i>
          ERR: {field}
        </span>
      ))}
      
      {/* Minor Missing Fields */}
      {missingFields.map(field => (
        <span key={field} className="bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex items-center">
          <i className="fa-solid fa-circle-info mr-1"></i>
          MISSING: {field}
        </span>
      ))}
    </div>
  );
};

export default CandidateRemarks;
