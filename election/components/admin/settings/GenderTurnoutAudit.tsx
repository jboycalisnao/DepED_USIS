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
  schoolName,
}) => {
  const handleExport = () => {
    handleGenderTurnoutPrint(learnerDatabase, voters, sections, schoolYear, schoolName);
  };

  return (
    <button type="button" onClick={handleExport} className="election-page__utility-tile">
      <div className="election-page__utility-tile-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          diversity_3
        </span>
      </div>
      <span className="election-page__utility-tile-label">Gender Audit</span>
      <span className="election-page__utility-tile-copy">Export gender turnout analysis</span>
    </button>
  );
};

export default GenderTurnoutAudit;
