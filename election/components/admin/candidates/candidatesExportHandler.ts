
import { Candidate, ElectionConfig } from '../../../types';
import { POSITIONS } from '../../../constants';
import { getStandardReportStyles, getStandardReportHeaderHTML, getStandardSignatoriesHTML } from '../settings/reportLayoutUtils';

const getNextSchoolYear = (label: string): string => {
  if (!label || label === '----') return label;
  return label.replace(/\d{4}/g, (year) => (parseInt(year) + 1).toString());
};

export const handleCandidatesPrint = (
  candidates: Candidate[],
  config: ElectionConfig,
  schoolYear: string
) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=900,toolbar=0,scrollbars=1,status=0');
  if (!printWindow) {
    alert('Pop-up blocked! Please allow pop-ups to open the candidates list preview.');
    return;
  }

  const schoolName = config.schoolName || 'Leon National High School';
  const electionYear = getNextSchoolYear(schoolYear);
  const timestamp = new Date().toLocaleString('en-PH');
  const sortedPositions = POSITIONS.filter(pos => candidates.some(c => c.position === pos));

  const tableRowsHtml = sortedPositions.map(pos => {
    const posIdx = POSITIONS.indexOf(pos) + 1;
    const posCode = posIdx.toString().padStart(2, '0');
    const posCandidates = candidates.filter(c => c.position === pos).sort((a, b) => a.lastName.localeCompare(b.lastName));

    return `
      <tr style="background-color: #f1f5f9; font-weight: bold; text-transform: uppercase;"><td colspan="3">${pos}</td></tr>
      ${posCandidates.map((c, idx) => `
        <tr>
          <td style="width: 80px; text-align: center; font-family: monospace; font-weight: bold;">${posCode}-${(idx+1).toString().padStart(2, '0')}</td>
          <td style="font-weight: bold; text-transform: uppercase;">${c.lastName}, ${c.firstName} ${c.middleName ? c.middleName.charAt(0) + '.' : ''}</td>
          <td style="text-transform: uppercase;">${c.party}</td>
        </tr>
      `).join('')}
    `;
  }).join('');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Candidates List - SY ${electionYear}</title>
      <style>
        ${getStandardReportStyles()}
        .doc-title { text-align: center; margin-bottom: 20px; }
        .doc-title h3 { text-decoration: underline; text-transform: uppercase; margin: 0; font-size: 14pt; }
        .doc-title p { margin: 2px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      ${getStandardReportHeaderHTML(schoolName)}
      <div class="doc-title">
        <h3>Official List of Candidates</h3>
        <p>School Year ${electionYear}</p>
      </div>

      <table>
        <thead><tr><th>Code</th><th style="text-align: left;">Name of Candidate</th><th style="text-align: left; width: 200px;">Party Affiliation</th></tr></thead>
        <tbody>${tableRowsHtml}</tbody>
      </table>

      <div class="system-footer">SYSTEM GENERATED OFFICIAL DOCUMENT • Generated: ${timestamp}</div>
      ${getStandardSignatoriesHTML()}
      <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
};
