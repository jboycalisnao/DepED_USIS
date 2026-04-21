
import React from 'react';
import { Student, User, Section } from '../../../types';
import { handleGenderTurnoutPrint } from './genderExportHandler';

interface GenderTurnoutAuditProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
  schoolYear: string;
  schoolName: string;
}

const GenderTurnoutAudit: React.FC<GenderTurnoutAuditProps> = ({ 
  learnerDatabase, 
  voters, 
  sections, 
  schoolYear, 
  schoolName 
}) => {
  const handleExport = () => {
    // Generates the PDF using current registry (learnerDatabase) and ballots (voters)
    handleGenderTurnoutPrint(learnerDatabase, voters, sections, schoolYear, schoolName);
  };

  return (
    <button 
      onClick={handleExport}
      className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group shadow-sm"
    >
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
        <i className="fa-solid fa-venus-mars"></i>
      </div>
      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Gender Audit</span>
      <span className="text-xs font-bold text-gray-900 text-center">Export Gender Tally (PDF)</span>
    </button>
  );
};

export default GenderTurnoutAudit;
