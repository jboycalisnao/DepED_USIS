import React from 'react';
import { GradeLevel, Section } from '../../../types';

interface SectionListExporterProps {
  sections: Section[];
  schoolYear: string;
}

const SectionListExporter: React.FC<SectionListExporterProps> = ({ sections, schoolYear }) => {
  const handleExportText = () => {
    const timestamp = new Date().toLocaleString();
    let content = 'OFFICIAL SCHOOL SECTIONS LIST\n';
    content += `School Year: ${schoolYear}\n`;
    content += `Generated on: ${timestamp}\n`;
    content += '--------------------------------------------------\n\n';

    Object.values(GradeLevel).forEach((grade) => {
      const gradeSections = sections.filter((section) => section.gradeLevel === grade);
      if (gradeSections.length > 0) {
        content += `${grade.toUpperCase()}\n`;
        gradeSections.forEach((section) => {
          content += `  - ${section.name.padEnd(25)} | Adviser: ${section.adviserName || 'N/A'}\n`;
        });
        content += '\n';
      }
    });

    content += '--------------------------------------------------\n';
    content += 'End of Report - Leon NHS E-Boto System\n';

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leon_NHS_Sections_SY_${schoolYear.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="election-page__control-card election-settings__export-card">
      <div className="election-settings__section-header">
        <div className="election-settings__section-copy">
          <p className="election-settings__section-kicker">Sections List Exporter</p>
          <h3 className="election-settings__section-title">Generate raw text directory of active sections</h3>
        </div>
        <span className="election-settings__section-note">SY {schoolYear}</span>
      </div>

      <button type="button" onClick={handleExportText} className="election-settings__primary-action">
        <span className="material-symbols-outlined" aria-hidden="true">
          download
        </span>
        Export to TXT
      </button>
    </section>
  );
};

export default SectionListExporter;
