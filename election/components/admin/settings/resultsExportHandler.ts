
import { Candidate, ElectionConfig } from '../../../types';
import { POSITIONS } from '../../../constants';
import { getStandardReportStyles, getStandardReportHeaderHTML, getStandardSignatoriesHTML } from './reportLayoutUtils';
import { getWinnerSlotsForPosition, isRegularGradeRepresentativePosition } from '../../../utils/electionRules';

export const handleResultsPrint = (
  candidates: Candidate[], 
  config: ElectionConfig,
  schoolYear: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Action blocked! Please allow pop-ups/redirects to view the official results tab.");
    return;
  }

  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const schoolName = config.schoolName || 'Leon National High School';
  
  const sortedPositions = POSITIONS.filter(pos => 
    candidates.some(c => c.position === pos)
  );

  const tableRowsHtml = sortedPositions.map(pos => {
    const posCandidates = candidates
      .filter(c => c.position === pos)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));

    if (posCandidates.length === 0) return '';

    const isMultiSeatRep = isRegularGradeRepresentativePosition(pos);
    const winnerSlots = getWinnerSlotsForPosition(pos);

    return `
      <tr style="background-color: #f8fafc;">
        <td colspan="3" style="font-weight: 900; font-size: 10px; text-transform: uppercase; background-color: #e2e8f0; padding: 10px;">
          ${pos} ${isMultiSeatRep ? `(TOP ${winnerSlots} WINNERS)` : ''}
        </td>
      </tr>
      ${posCandidates.map((c, idx) => {
        const isWinner = idx < winnerSlots;
        const hasVotes = (c.votes || 0) > 0;
        const highlightStyle = (isWinner && hasVotes) ? 'background-color: #fffbeb;' : '';
        
        return `
          <tr style="${highlightStyle}">
            <td style="font-weight: ${isWinner && hasVotes ? '900' : '400'};">
              ${(isWinner && hasVotes) ? '<span style="color: #f59e0b;">★</span> ' : ''}${c.name}
            </td>
            <td>${c.party}</td>
            <td style="text-align: center; font-weight: 900;">${c.votes || 0}</td>
          </tr>
        `;
      }).join('')}
    `;
  }).join('');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Election Tally - ${schoolName}</title>
      <style>
        ${getStandardReportStyles()}
        .doc-title { text-align: center; margin-bottom: 20px; }
        .doc-title h3 { text-decoration: underline; text-transform: uppercase; margin: 0; font-size: 14pt; }
        .doc-title p { margin: 2px 0; font-weight: bold; }
        .stats-box { background-color: #f8fafc; border: 1px solid #000; padding: 10px; margin-bottom: 20px; display: flex; justify-content: space-around; }
        .stat-item { text-align: center; }
        .stat-label { font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; }
        .stat-value { font-size: 11pt; font-weight: 900; }
      </style>
    </head>
    <body>
      ${getStandardReportHeaderHTML(schoolName)}
      
      <div class="doc-title">
        <h3>Official Election Tally Report</h3>
        <p>Academic Year ${schoolYear}</p>
      </div>

      <div class="stats-box">
        <div class="stat-item"><div class="stat-label">Report Type</div><div class="stat-value">Final Results</div></div>
        <div class="stat-item"><div class="stat-label">System Time</div><div class="stat-value">${timestamp.split(',')[1]}</div></div>
        <div class="stat-item"><div class="stat-label">Tally Status</div><div class="stat-value" style="color: #059669;">VERIFIED</div></div>
      </div>

      <p style="font-size: 8pt; margin-bottom: 10px; color: #475569; font-style: italic;">
        * Note: Regular Grade Representative positions recognize the top 2 candidates as confirmed winners. Specialized positions (STE/SPA) follow the plurality-single-winner rule.
      </p>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Official Candidate Name</th>
            <th style="text-align: left; width: 180px;">Political Affiliation</th>
            <th style="width: 100px;">Total Votes</th>
          </tr>
        </thead>
        <tbody>${tableRowsHtml}</tbody>
      </table>

      <div class="system-footer">
        This document serves as the official and final record of votes for the SY ${schoolYear} elections.
        ★ Indicates confirmed winner(s) based on plurality of votes.
        <br/>Tracking ID: ${Math.random().toString(36).substring(2, 12).toUpperCase()}
      </div>

      ${getStandardSignatoriesHTML()}

      <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
