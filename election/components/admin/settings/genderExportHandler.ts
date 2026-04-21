
import { Student, User, Section, GradeLevel } from '../../../types';
import { getStandardReportStyles, getStandardReportHeaderHTML, getStandardSignatoriesHTML } from './reportLayoutUtils';

export const handleGenderTurnoutPrint = (
  learnerDatabase: Student[],
  voters: User[],
  sections: Section[],
  schoolYear: string,
  schoolName: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Action blocked! Please allow pop-ups to view the official report.");
    return;
  }

  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

  const getGenderChar = (s: Student) => {
    const g = (s.gender || (s as any).GENDER || '').toUpperCase();
    if (g.startsWith('M')) return 'M';
    if (g.startsWith('F')) return 'F';
    return 'U';
  };

  const votedLrnSet = new Set(voters.filter(v => v.hasVoted).map(v => v.studentId));
  const eligibleGradeLevels = Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12);

  let grandTotalM = 0, grandTotalF = 0, grandTotalU = 0;
  let grandVotedM = 0, grandVotedF = 0, grandVotedU = 0;

  const rowsHtml = eligibleGradeLevels.map(grade => {
    const gradeSections = sections.filter(s => s.gradeLevel === grade);
    if (gradeSections.length === 0) return '';

    let gradeTotalM = 0, gradeTotalF = 0, gradeTotalU = 0;
    let gradeVotedM = 0, gradeVotedF = 0, gradeVotedU = 0;

    const sectionRows = gradeSections.map(sec => {
      const secLearners = learnerDatabase.filter(l => l.sectionId === sec.id);
      const mPop = secLearners.filter(l => getGenderChar(l) === 'M').length;
      const fPop = secLearners.filter(l => getGenderChar(l) === 'F').length;
      const uPop = secLearners.filter(l => getGenderChar(l) === 'U').length;
      const mVoted = secLearners.filter(l => getGenderChar(l) === 'M' && votedLrnSet.has(l.lrn)).length;
      const fVoted = secLearners.filter(l => getGenderChar(l) === 'F' && votedLrnSet.has(l.lrn)).length;
      const uVoted = secLearners.filter(l => getGenderChar(l) === 'U' && votedLrnSet.has(l.lrn)).length;

      gradeTotalM += mPop; gradeTotalF += fPop; gradeTotalU += uPop;
      gradeVotedM += mVoted; gradeVotedF += fVoted; gradeVotedU += uVoted;

      const totalPop = mPop + fPop + uPop;
      const totalVoted = mVoted + fVoted + uVoted;
      const overallPercent = totalPop > 0 ? ((totalVoted / totalPop) * 100).toFixed(1) : "0.0";

      return `
        <tr>
          <td>${sec.name}</td>
          <td style="text-align: center;">${mVoted}/${mPop}</td>
          <td style="text-align: center;">${fVoted}/${fPop}</td>
          <td style="text-align: center;">${uVoted}/${uPop}</td>
          <td style="text-align: center; font-weight: 900; background-color: #f8fafc;">${overallPercent}%</td>
        </tr>
      `;
    }).join('');

    grandTotalM += gradeTotalM; grandTotalF += gradeTotalF; grandTotalU += gradeTotalU;
    grandVotedM += gradeVotedM; grandVotedF += gradeVotedF; grandVotedU += gradeVotedU;

    const gOverallPop = gradeTotalM + gradeTotalF + gradeTotalU;
    const gOverallVoted = gradeVotedM + gradeVotedF + gradeVotedU;
    const gOverallPercent = gOverallPop > 0 ? ((gOverallVoted / gOverallPop) * 100).toFixed(1) : "0.0";

    return `
      <tr style="background-color: #f1f5f9; font-weight: 900;"><td colspan="5">${grade}</td></tr>
      ${sectionRows}
      <tr style="background-color: #f8fafc; font-weight: 900;">
        <td style="text-align: right;">${grade} SUB-TOTAL:</td>
        <td style="text-align: center;">${gradeVotedM}/${gradeTotalM}</td>
        <td style="text-align: center;">${gradeVotedF}/${gradeTotalF}</td>
        <td style="text-align: center;">${gradeVotedU}/${gradeTotalU}</td>
        <td style="text-align: center; color: #E11C38;">${gOverallPercent}%</td>
      </tr>
    `;
  }).join('');

  const totalPopCombined = grandTotalM + grandTotalF + grandTotalU;
  const totalVotedCombined = grandVotedM + grandVotedF + grandVotedU;
  const finalOverallPercent = totalPopCombined > 0 ? ((totalVotedCombined / totalPopCombined) * 100).toFixed(1) : "0.0";

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gender Audit - ${schoolName}</title>
      <style>
        ${getStandardReportStyles()}
        .doc-title { text-align: center; margin-bottom: 20px; }
        .doc-title h3 { text-decoration: underline; text-transform: uppercase; margin: 0; font-size: 14pt; }
        .doc-title p { margin: 2px 0; font-weight: bold; }
        .summary-box { border: 2px solid #000; padding: 12px; margin-top: 15px; display: flex; justify-content: space-around; background: #fafafa; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 7pt; font-weight: 900; text-transform: uppercase; color: #555; }
        .summary-val { font-size: 11pt; font-weight: 900; color: #034F8B; }
      </style>
    </head>
    <body>
      ${getStandardReportHeaderHTML(schoolName)}
      <div class="doc-title">
        <h3>Gender-Based Voter Turnout Audit</h3>
        <p>Academic Year ${schoolYear}</p>
      </div>

      <div class="summary-box">
        <div class="summary-item"><div class="summary-label">Male Participation</div><div class="summary-val">${grandVotedM} / ${grandTotalM} (${grandTotalM > 0 ? ((grandVotedM/grandTotalM)*100).toFixed(1) : 0}%)</div></div>
        <div class="summary-item"><div class="summary-label">Female Participation</div><div class="summary-val">${grandVotedF} / ${grandTotalF} (${grandTotalF > 0 ? ((grandVotedF/grandTotalF)*100).toFixed(1) : 0}%)</div></div>
        <div class="summary-item"><div class="summary-label">Grand Turnout</div><div class="summary-val" style="color: #E11C38;">${finalOverallPercent}%</div></div>
      </div>

      <table>
        <thead><tr><th style="text-align: left; width: 30%;">Section Name</th><th>Male (Cast/Pop)</th><th>Female (Cast/Pop)</th><th>Unclass.</th><th>Turnout</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="system-footer">Generated on: ${timestamp} • Database State Verified</div>
      ${getStandardSignatoriesHTML()}
      <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
