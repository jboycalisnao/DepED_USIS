
import { Student, User, Section, GradeLevel, ElectionConfig } from '../../../types';
import { getStandardReportStyles, getStandardReportHeaderHTML, getStandardSignatoriesHTML } from './reportLayoutUtils';

export const handleParticipationPrint = (
  learnerDatabase: Student[],
  voters: User[],
  sections: Section[],
  config: ElectionConfig,
  schoolYear: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Action blocked! Please allow pop-ups/redirects to view the official participation tab.");
    return;
  }

  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const schoolName = config.schoolName || 'Leon National High School';
  const votedLrnSet = new Set(voters.filter(v => v.hasVoted).map(v => v.studentId));
  const eligibleGradeLevels = Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12);
  
  const eligibleLearners = learnerDatabase.filter(l => {
    const section = sections.find(s => s.id === l.sectionId);
    return section && eligibleGradeLevels.includes(section.gradeLevel);
  });

  const totalRegistered = eligibleLearners.length;
  const totalVoted = eligibleLearners.filter(l => votedLrnSet.has(l.lrn)).length;
  const globalTurnout = totalRegistered > 0 ? ((totalVoted / totalRegistered) * 100).toFixed(2) : "0.00";

  const rowsHtml = eligibleGradeLevels.map(grade => {
    const gradeSections = sections.filter(s => s.gradeLevel === grade);
    if (gradeSections.length === 0) return '';

    const sectionRows = gradeSections.map(sec => {
      const secLearners = learnerDatabase.filter(l => l.sectionId === sec.id);
      const secVoted = secLearners.filter(l => votedLrnSet.has(l.lrn)).length;
      const secTurnout = secLearners.length > 0 ? ((secVoted / secLearners.length) * 100).toFixed(2) : "0.00";

      return `
        <tr>
          <td>${sec.name}</td>
          <td style="text-align: center; font-weight: 700;">${secLearners.length}</td>
          <td style="text-align: center; font-weight: 700;">${secVoted}</td>
          <td style="text-align: center; font-weight: 900; color: #034F8B;">${secTurnout}%</td>
        </tr>
      `;
    }).join('');

    const gradeLearners = eligibleLearners.filter(l => sections.find(s => s.id === l.sectionId)?.gradeLevel === grade);
    const gradeVoted = gradeLearners.filter(l => votedLrnSet.has(l.lrn)).length;
    const gradeTurnout = gradeLearners.length > 0 ? ((gradeVoted / gradeLearners.length) * 100).toFixed(2) : "0.00";

    return `
      <tr style="background-color: #e2e8f0; font-weight: 900;">
        <td colspan="4">${grade}</td>
      </tr>
      ${sectionRows}
      <tr style="background-color: #f8fafc; font-weight: 800;">
        <td style="text-align: right;">${grade} Subtotal:</td>
        <td style="text-align: center;">${gradeLearners.length}</td>
        <td style="text-align: center;">${gradeVoted}</td>
        <td style="text-align: center; color: #E11C38;">${gradeTurnout}%</td>
      </tr>
    `;
  }).join('');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Participation Audit - ${schoolName}</title>
      <style>
        ${getStandardReportStyles()}
        .doc-title { text-align: center; margin-bottom: 20px; }
        .doc-title h3 { text-decoration: underline; text-transform: uppercase; margin: 0; font-size: 14pt; }
        .doc-title p { margin: 2px 0; font-weight: bold; }
        .summary-banner { background-color: #034F8B; color: white; border-radius: 10px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .summary-title { font-size: 8pt; font-weight: 900; text-transform: uppercase; opacity: 0.8; }
        .summary-val { font-size: 20pt; font-weight: 900; }
      </style>
    </head>
    <body>
      ${getStandardReportHeaderHTML(schoolName)}
      
      <div class="doc-title">
        <h3>Learner Participation Audit Report</h3>
        <p>Academic Year ${schoolYear}</p>
      </div>

      <div class="summary-banner">
        <div><div class="summary-title">Official Voter Turnout</div><div class="summary-val">${globalTurnout}%</div></div>
        <div style="text-align: right;"><div class="summary-title">Total Ballots Cast</div><div class="summary-val">${totalVoted} / ${totalRegistered}</div></div>
      </div>

      <p style="font-size: 7.5pt; font-style: italic; color: #64748b; margin-bottom: 10px;">* Report excludes Grade 12 students (Ineligible Batch).</p>

      <table>
        <thead>
          <tr><th style="text-align: left;">Grade Level / Section Name</th><th style="width: 100px;">Population</th><th style="width: 100px;">Ballots Cast</th><th style="width: 100px;">Turnout %</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="system-footer">Generated on: ${timestamp} • E-Boto Participation Analytics System</div>
      ${getStandardSignatoriesHTML()}

      <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
