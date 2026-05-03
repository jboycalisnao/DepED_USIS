import React from 'react';
import { GradeLevel, Section } from '../../../types';

interface SectionListExporterProps {
  sections: Section[];
  schoolYear: string;
}

const SectionListExporter: React.FC<SectionListExporterProps> = ({ sections, schoolYear }) => {
  const handleExportText = () => {
    const timestamp = new Date().toLocaleString();
    let content = `OFFICIAL SCHOOL SECTIONS LIST\n`;
    content += `School Year: ${schoolYear}\n`;
    content += `Generated on: ${timestamp}\n`;
    content += `--------------------------------------------------\n\n`;

    const gradeLevels = Object.values(GradeLevel);

    gradeLevels.forEach((grade) => {
      const gradeSections = sections.filter((section) => section.gradeLevel === grade);
      if (gradeSections.length > 0) {
        content += `${grade.toUpperCase()}\n`;
        gradeSections.forEach((section) => {
          content += `  - ${section.name.padEnd(25)} | Adviser: ${section.adviserName || 'N/A'}\n`;
        });
        content += `\n`;
      }
    });

    content += `--------------------------------------------------\n`;
    content += `End of Report - Leon NHS E-Boto System\n`;

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
    <div className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-6 shadow-sm no-print">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-blue-50 text-[#034F8B]">
            <i className="fa-solid fa-file-lines text-[16px]"></i>
          </div>
          <div>
            <h3 className="text-[16px] font-bold uppercase tracking-tight text-gray-900">
              Sections List Exporter
            </h3>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Generate raw text directory of active sections
            </p>
          </div>
        </div>

        <button
          onClick={handleExportText}
          className="flex items-center rounded-[12px] border border-blue-100 bg-blue-50 px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#034F8B] transition-colors hover:bg-[#034F8B] hover:text-white"
        >
          <i className="fa-solid fa-download mr-3"></i>
          Export to .TXT File
        </button>
      </div>
    </div>
  );
};

export default SectionListExporter;
