
import { Student, User, Section, GradeLevel, ElectionConfig } from '../../../types';
import { getStandardReportStyles, getStandardReportHeaderHTML, getStandardSignatoriesHTML } from './reportLayoutUtils';

export const handleNonVotersPrint = (
  learnerDatabase: Student[],
  voters: User[],
  sections: Section[],
  config: ElectionConfig,
  schoolYear: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Action blocked! Please allow pop-ups to view the non-voters report.");
    return;
  }

  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const schoolName = config.schoolName || 'Leon National High School';
  const votedLrnSet = new Set(voters.filter(v => v.hasVoted).map(v => v.studentId));
  const eligibleGradeLevels = Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12);

  const rowsHtml = eligibleGradeLevels.map(grade => {
    const gradeSections = sections.filter(s => s.gradeLevel === grade);
    if (gradeSections.length === 0) return '';

    const sectionBlocks = gradeSections.map(sec => {
      const nonVoters = learnerDatabase.filter(l => l.sectionId === sec.id && !votedLrnSet.has(l.lrn))
        .sort((a, b) => a.lastName.localeCompare(b.lastName));

      if (nonVoters.length === 0) return '';

      return `
        <tr style="background-color: #f8fafc;"><td colspan="3" style="font-weight: 900; color: #034F8B;">SECTION: ${sec.name} <span style="font-weight: 500; color: #64748b; margin-left: 10px;">(Adviser: ${sec.adviserName || 'N/A'})</span></td></tr>
        ${nonVoters.map((l, idx) => `
          <tr><td style="text-align: center; width: 40px;">${idx + 1}</td><td style="font-family: monospace; width: 120px;">${l.lrn}</td><td style="text-transform: uppercase; font-weight: 600;">${l.lastName}, ${l.firstName}</td></tr>
        `).join('')}
      `;
    }).join('');

    if (!sectionBlocks) return '';

    return `
      <tr style="background-color: #034F8B; color: white; font-weight: 900;"><td colspan="3">${grade}</td></tr>
      ${sectionBlocks}
    `;
  }).join('');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Non-Voters Registry - ${schoolName}</title>
      <style>
        ${getStandardReportStyles()}
        .doc-title { text-align: center; margin-bottom: 20px; }
        .doc-title h3 { text-decoration: underline; text-transform: uppercase; margin: 0; font-size: 14pt; }
        .doc-title p { margin: 2px 0; font-weight: bold; }
        .notice-banner { background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px; margin-bottom: 20px; color: #991b1b; font-size: 9pt; }
      </style>
    </head>
    <body>
      ${getStandardReportHeaderHTML(schoolName)}
      <div class="doc-title">
        <h3>Official Non-Voters Registry</h3>
        <p>Academic Year ${schoolYear}</p>
      </div>

      <div class="notice-banner">
        <strong>Final Participation Audit:</strong> These learners are permanently recorded as non-voters for this cycle.
      </div>

      <table>
        <thead><tr><th style="width: 40px;">#</th><th style="text-align: left;">LRN</th><th style="text-align: left;">Learner Full Name</th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="3" style="text-align: center; padding: 40px; font-weight: 900; color: #059669;">COMPLETE PARTICIPATION ACHIEVED</td></tr>'}</tbody>
      </table>

      <div class="system-footer">Generated on: ${timestamp} • E-Boto Participation Analytics</div>
      ${getStandardSignatoriesHTML()}
      <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
