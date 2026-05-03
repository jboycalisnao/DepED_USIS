
import { Student, User, Section, GradeLevel, Candidate, Position } from '../../../types';
import { POSITIONS } from '../../../constants';
import { getStandardReportStyles, getStandardReportHeaderHTML } from './reportLayoutUtils';
import { supabase } from '../../../lib/supabase';

export const generateReportHTML = (
  type: 'results' | 'participation' | 'grade_results',
  gradeFilter: string,
  learnerDatabase: Student[],
  voters: User[],
  sections: Section[],
  candidates: Candidate[],
  schoolName: string,
  schoolYear: string,
  timestamp: string,
  gradeSpecificVotes?: Record<string, number>
): string => {
  const votedLrnSet = new Set(voters.filter(v => v.hasVoted).map(v => v.studentId));
  let canvasHtml = '';

  if (type === 'participation') {
    if (gradeFilter === 'ALL') {
      const eligibleGradeLevels = Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12);
      const gradeTurnoutHtml = eligibleGradeLevels.map(grade => {
        const gradeLearners = learnerDatabase.filter(l => sections.find(s => s.id === l.sectionId)?.gradeLevel === grade);
        const gradeVoted = gradeLearners.filter(l => votedLrnSet.has(l.lrn)).length;
        const gradeTurnout = gradeLearners.length > 0 ? ((gradeVoted / gradeLearners.length) * 100).toFixed(1) : "0.0";
        return `
          <div style="border: 4px solid #034F8B; border-radius: 40px; padding: 40px; background: #fff; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <div style="font-size: 24pt; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 15px;">${grade}</div>
            <div style="font-size: 70pt; font-weight: 900; color: #034F8B; line-height: 1;">${gradeTurnout}%</div>
            <div style="font-size: 14pt; font-weight: 700; color: #94a3b8; margin-top: 20px;">${gradeVoted.toLocaleString()} / ${gradeLearners.length.toLocaleString()} BALLOTS</div>
          </div>
        `;
      }).join('');

      canvasHtml = `
        <div style="padding: 60px; background: white; width: 100%;">
          <div style="text-align: center; margin-bottom: 60px;">
             <h1 style="font-size: 60pt; font-weight: 900; text-transform: uppercase; color: #034F8B; margin: 0; letter-spacing: -2px;">GLOBAL VOTER TURNOUT</h1>
             <p style="font-size: 24pt; font-weight: 700; color: #E11C38; margin-top: 5px;">Official Election Participation • SY ${schoolYear}</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
            ${gradeTurnoutHtml}
          </div>
        </div>
      `;
    } else {
      const gradeLearners = learnerDatabase.filter(l => sections.find(s => s.id === l.sectionId)?.gradeLevel === gradeFilter);
      const gradeVotedCount = gradeLearners.filter(l => votedLrnSet.has(l.lrn)).length;
      const gradeTurnout = gradeLearners.length > 0 ? ((gradeVotedCount / gradeLearners.length) * 100).toFixed(1) : "0.0";
      
      const gradeSections = sections.filter(s => s.gradeLevel === gradeFilter);
      const sectionRowsHtml = gradeSections.map(sec => {
        const secLearners = learnerDatabase.filter(l => l.sectionId === sec.id);
        const secVoted = secLearners.filter(l => votedLrnSet.has(l.lrn)).length;
        const secTurnout = secLearners.length > 0 ? ((secVoted / secLearners.length) * 100).toFixed(1) : "0.0";
        return `
          <div style="background: white; border: 2px solid #e2e8f0; border-radius: 20px; padding: 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="min-width: 0;">
              <div style="font-size: 18pt; font-weight: 900; color: #034F8B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sec.name}</div>
              <div style="font-size: 10pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px;">Adviser: ${sec.adviserName || 'N/A'}</div>
            </div>
            <div style="text-align: right; margin-left: 20px;">
              <div style="font-size: 28pt; font-weight: 900; color: #E11C38;">${secTurnout}%</div>
              <div style="font-size: 9pt; font-weight: 700; color: #cbd5e1;">${secVoted}/${secLearners.length}</div>
            </div>
          </div>
        `;
      }).join('');

      canvasHtml = `
        <div style="padding: 60px; background: white; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px; border-bottom: 8px solid #034F8B; padding-bottom: 30px;">
            <div>
              <h1 style="font-size: 70pt; font-weight: 900; color: #034F8B; margin: 0; line-height: 1;">${gradeFilter.toUpperCase()}</h1>
              <p style="font-size: 20pt; font-weight: 800; color: #64748b; margin-top: 10px; letter-spacing: 0.1em;">PARTICIPATION ANALYTICS</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 50pt; font-weight: 900; color: #E11C38;">${gradeTurnout}%</div>
              <div style="font-size: 12pt; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Overall Grade Turnout</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            ${sectionRowsHtml}
          </div>
        </div>
      `;
    }
  } else {
    // Both 'results' (overall) and 'grade_results' use this grid layout
    const targetVotes = type === 'grade_results' && gradeSpecificVotes ? gradeSpecificVotes : null;
    const isFiltered = type === 'grade_results';

    const resultsHtml = POSITIONS.filter(pos => candidates.some(c => c.position === pos)).map(pos => {
      const posCandidates = candidates
        .filter(c => c.position === pos)
        .map(c => ({
          ...c,
          displayVotes: targetVotes ? (targetVotes[c.id] || 0) : (c.votes || 0)
        }))
        .sort((a, b) => b.displayVotes - a.displayVotes);

      return `
        <div style="border: 4px solid #034F8B; border-radius: 30px; overflow: hidden; background: #fff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); height: 100%; display: flex; flex-direction: column;">
          <div style="background: #034F8B; padding: 20px 25px; font-weight: 900; font-size: 16pt; color: #fff; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: space-between;">
             <span>${pos}</span>
             <i style="opacity: 0.5; font-size: 12pt;">📊</i>
          </div>
          <div style="padding: 20px; flex-grow: 1;">
            ${posCandidates.map((c, idx) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: ${idx === posCandidates.length - 1 ? 'none' : '1px solid #f1f5f9'};">
                <div style="min-width: 0; padding-right: 15px;">
                  <div style="font-size: 14pt; font-weight: ${idx === 0 && c.displayVotes > 0 ? '900' : '600'}; color: ${idx === 0 && c.displayVotes > 0 ? '#E11C38' : '#334155'}; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${idx === 0 && c.displayVotes > 0 ? '<span style="color: #fcd116;">★</span> ' : ''}${c.name}
                  </div>
                  <div style="font-size: 9pt; font-weight: 700; color: #94a3b8; text-transform: uppercase;">${c.party}</div>
                </div>
                <div style="font-size: 20pt; font-weight: 900; color: #1e293b; background: #f8fafc; padding: 5px 15px; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center;">${c.displayVotes}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    const title = isFiltered ? `OFFICIAL TALLY: ${gradeFilter.toUpperCase()}` : `OFFICIAL ELECTION TALLY`;
    const subtitle = isFiltered ? `Candidate performance among ${gradeFilter} learners` : `Consolidated results across all grade levels`;

    canvasHtml = `
      <div style="padding: 60px; background: white; width: 100%;">
        <div style="text-align: center; margin-bottom: 60px;">
          <h1 style="font-size: 65pt; font-weight: 900; text-transform: uppercase; color: #034F8B; margin: 0; letter-spacing: -3px; line-height: 0.9;">${title}</h1>
          <div style="display: inline-block; background: #E11C38; color: white; padding: 8px 30px; border-radius: 50px; font-size: 18pt; font-weight: 900; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.2em;">${subtitle} • SY ${schoolYear}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; align-items: stretch;">
          ${resultsHtml}
        </div>
      </div>
    `;
  }

  return `
    <div style="padding: 80px; position: relative; overflow: hidden; background: white; width: 1920px; font-family: 'Inter', sans-serif;">
      <!-- Subtle Watermark Background -->
      <div style="position: absolute; top: -100px; right: -100px; opacity: 0.03; width: 800px; transform: rotate(15deg); pointer-events: none;">
        <img src="https://ik.imagekit.io/astrasolutions/Leon%20NHS/leon%20nhs%20marks%20-%20upscaled/Leon%20NHS%20-%20Seal(Blue).png" style="width: 100%;" />
      </div>

      ${getStandardReportHeaderHTML(schoolName)}
      ${canvasHtml}
      
      <div style="margin-top: 80px; padding-top: 40px; border-top: 6px dashed #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center;">
             <div style="width: 10px; height: 40px; background: #034F8B; border-radius: 5px; margin-right: 15px;"></div>
             <div>
                <p style="font-size: 16pt; color: #034F8B; font-weight: 900; text-transform: uppercase; margin: 0;">Verified Election Data</p>
                <p style="font-size: 10pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 0.1em;">Generated on ${timestamp} • E-Boto Cloud Analytics Engine</p>
             </div>
          </div>
          <div style="text-align: right;">
             <p style="font-size: 12pt; color: #E11C38; font-weight: 900; text-transform: uppercase; margin: 0;">Leon National High School</p>
             <p style="font-size: 9pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin: 0;">LG COMEA Official Release</p>
          </div>
      </div>
    </div>
  `;
};

export const handleReportImageExport = async (
  type: 'results' | 'participation' | 'grade_results',
  gradeFilter: string,
  learnerDatabase: Student[],
  voters: User[],
  sections: Section[],
  candidates: Candidate[],
  schoolName: string,
  schoolYear: string
) => {
  const html2canvas = (window as any).html2canvas;
  const saveAs = (window as any).saveAs;

  if (!html2canvas || !saveAs) {
    alert("Required libraries (html2canvas, FileSaver) not found in the global scope.");
    return;
  }

  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  
  let gradeSpecificVotes: Record<string, number> = {};
  if (gradeFilter !== 'ALL' && (type === 'participation' || type === 'grade_results')) {
    const gradeLearnersLrns = learnerDatabase
      .filter(l => sections.find(s => s.id === l.sectionId)?.gradeLevel === gradeFilter)
      .map(l => l.lrn);

    if (gradeLearnersLrns.length > 0) {
      const { data: entries, error } = await supabase
        .from('election_ballot_entries')
        .select('candidate_id')
        .in('voter_lrn', gradeLearnersLrns);
      
      if (!error && entries) {
        entries.forEach(entry => {
          gradeSpecificVotes[entry.candidate_id] = (gradeSpecificVotes[entry.candidate_id] || 0) + 1;
        });
      }
    }
  }

  const reportHtml = generateReportHTML(
    type, 
    gradeFilter, 
    learnerDatabase, 
    voters, 
    sections, 
    candidates, 
    schoolName, 
    schoolYear, 
    timestamp,
    gradeSpecificVotes
  );

  const hiddenDiv = document.createElement('div');
  hiddenDiv.style.position = 'fixed';
  hiddenDiv.style.left = '-9999px';
  hiddenDiv.style.top = '0';
  hiddenDiv.style.width = '1920px';
  hiddenDiv.innerHTML = `
    <style>
      ${getStandardReportStyles()}
      .report-header { margin-bottom: 40px !important; }
      .header-logo-img { height: 100px !important; }
      .header-p-old-english { font-size: 14pt !important; }
      .header-p-trajan { font-size: 11pt !important; }
      .header-p-bookman { font-size: 22pt !important; }
    </style>
    ${reportHtml}
  `;

  document.body.appendChild(hiddenDiv);

  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    const canvas = await html2canvas(hiddenDiv, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const filename = `EBOTO_${type.toUpperCase()}_${gradeFilter.replace(/\s+/g, '_')}_${schoolYear.replace(/\s+/g, '_')}.png`;
    canvas.toBlob((blob: Blob) => {
      if (blob) saveAs(blob, filename);
    }, 'image/png', 0.95);
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    document.body.removeChild(hiddenDiv);
  }
};
