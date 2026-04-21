
import React from 'react';
import { Section, GradeLevel } from '../../../types';

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

    gradeLevels.forEach(grade => {
      const gradeSections = sections.filter(s => s.gradeLevel === grade);
      if (gradeSections.length > 0) {
        content += `${grade.toUpperCase()}\n`;
        gradeSections.forEach(sec => {
          content += `  - ${sec.name.padEnd(25)} | Adviser: ${sec.adviserName || 'N/A'}\n`;
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
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 no-print">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#034F8B]">
            <i className="fa-solid fa-file-lines text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sections List Exporter</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generate raw text directory of active sections</p>
          </div>
        </div>

        <button 
          onClick={handleExportText}
          className="bg-gray-50 text-[#034F8B] px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#034F8B] hover:text-white transition-all border border-blue-100 flex items-center shadow-sm"
        >
          <i className="fa-solid fa-download mr-3"></i>
          Export to .TXT File
        </button>
      </div>
    </div>
  );
};

export default SectionListExporter;
