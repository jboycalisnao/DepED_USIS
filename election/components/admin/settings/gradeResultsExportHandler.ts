
import { Student, Section, GradeLevel, Candidate, Position, ElectionConfig } from '../../../types';
import { POSITIONS } from '../../../constants';
import { getStandardReportStyles, getStandardReportHeaderHTML, getStandardSignatoriesHTML } from './reportLayoutUtils';
import { supabase } from '../../../lib/supabase';

/**
 * Determines the program of a learner based on section metadata or naming conventions.
 */
const getLearnerProgram = (learner: Student, sections: Section[]): 'STE' | 'SPA' | 'REGULAR' => {
  const section = sections.find(s => s.id === learner.sectionId);
  if (!section) return 'REGULAR';

  const strand = (section.strand || '').toUpperCase();
  if (strand === 'STE') return 'STE';
  if (strand === 'SPA') return 'SPA';

  const name = section.name.toUpperCase();
  if (name.includes('STE') || name.includes('SCIENCE') || name.includes('EINSTEIN') || name.includes('NEWTON')) return 'STE';
  if (name.includes('SPA') || name.includes('ARTS') || name.includes('LUNA') || name.includes('HIDALGO')) return 'SPA';

  return 'REGULAR';
};

/**
 * Determines which representative positions a specific program/grade combination is eligible for.
 */
const getEligiblePositions = (program: 'STE' | 'SPA' | 'REGULAR', grade?: string): string[] => {
  const base = [
    Position.PRESIDENT,
    Position.VICE_PRESIDENT,
    Position.SECRETARY,
    Position.TREASURER,
    Position.AUDITOR,
    Position.PIO,
    Position.PROTOCOL_OFFICER,
  ];

  if (program === 'STE') {
    base.push(Position.STE_REP);
    return base;
  } 
  
  if (program === 'SPA') {
    base.push(Position.SPA_REP);
    return base;
  }

  // REGULAR PROGRAM (Grade Specific)
  if (grade) {
    const gradeNum = parseInt(grade.replace(/[^0-9]/g, '') || '0');
    if (gradeNum === 11) {
      base.push(Position.GRADE_12_REP);
    } else if (gradeNum < 11 && gradeNum >= 7) {
      const nextGrade = gradeNum + 1;
      base.push(`Grade ${nextGrade} Representative` as Position);
    }
  }

  return base;
};

export const handleGradeResultsPrint = async (
  gradeFilter: string,
  programFilter: 'STE' | 'SPA' | 'REGULAR',
  learnerDatabase: Student[],
  sections: Section[],
  candidates: Candidate[],
  config: ElectionConfig,
  schoolYear: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Action blocked! Please allow pop-ups to view the official report.");
    return;
  }

  const isConsolidated = programFilter !== 'REGULAR';

  // 1. Identification: Get target LRNs for the requested scope
  const targetLearners = learnerDatabase
    .filter(l => {
      const sec = sections.find(s => s.id === l.sectionId);
      const matchesProgram = getLearnerProgram(l, sections) === programFilter;
      
      if (isConsolidated) {
        const gradeNum = parseInt(sec?.gradeLevel.replace(/[^0-9]/g, '') || '0');
        return matchesProgram && gradeNum >= 7 && gradeNum <= 10;
      } else {
        return matchesProgram && sec?.gradeLevel === gradeFilter;
      }
    });

  const targetLrns = targetLearners.map(l => l.lrn);

  if (targetLrns.length === 0) {
    alert(`No ${programFilter} learner records found for ${isConsolidated ? 'Grades 7-10' : gradeFilter}.`);
    printWindow.close();
    return;
  }

  // 2. Fetch scoped votes from the cloud
  const { data: entries, error } = await supabase
    .from('ballot_entries')
    .select('candidate_id, position, voter_lrn')
    .in('voter_lrn', targetLrns);

  if (error) {
    console.error(error);
    alert("Cloud sync failed. Check your internet connection.");
    printWindow.close();
    return;
  }

  // 3. Filter Positions based on eligibility logic
  const eligiblePositions = getEligiblePositions(programFilter, isConsolidated ? undefined : gradeFilter);
  const relevantPositions = POSITIONS.filter(pos => 
    eligiblePositions.includes(pos) && candidates.some(c => c.position === pos)
  );

  // 4. IDEMPOTENT TALLYING: deduplicate votes per learner and position
  const voteCounts: Record<string, number> = {};
  let validBallotCount = 0;
  let excludedProgramMismatch = 0;
  let excludedDuplicateEntries = 0;

  // Tracker for (LRN + Position) unique pairs
  const voterPositionMap = new Set<string>();

  entries?.forEach(e => {
    const pos = e.position as Position;
    const uniqueKey = `${e.voter_lrn}-${pos}`;

    // CHECK 1: Eligibility check for the program/grade
    if (!eligiblePositions.includes(pos)) {
      excludedProgramMismatch++;
      return;
    }

    // CHECK 2: Deduplication check
    if (voterPositionMap.has(uniqueKey)) {
      excludedDuplicateEntries++;
      return;
    }

    // Record valid vote
    voterPositionMap.add(uniqueKey);
    voteCounts[e.candidate_id] = (voteCounts[e.candidate_id] || 0) + 1;
    validBallotCount++;
  });

  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const schoolName = config.schoolName || 'Leon National High School';

  const tableRowsHtml = relevantPositions.map(pos => {
    const posCandidates = candidates
      .filter(c => c.position === pos)
      .map(c => ({ ...c, gradeVotes: voteCounts[c.id] || 0 }))
      .sort((a, b) => b.gradeVotes - a.gradeVotes);

    if (posCandidates.length === 0) return '';

    return `
      <tr style="background-color: #f1f5f9;">
        <td colspan="3" style="font-weight: 900; font-size: 10px; text-transform: uppercase; border-bottom: 1.5px solid #000;">${pos}</td>
      </tr>
      ${posCandidates.map((c, idx) => `
        <tr style="${idx === 0 && c.gradeVotes > 0 ? 'background-color: #fffbeb;' : ''}">
          <td style="font-weight: 700; padding-left: 15px;">
            ${idx === 0 && c.gradeVotes > 0 ? '★ ' : ''}${c.name}
          </td>
          <td style="font-size: 8pt; color: #444;">${c.party}</td>
          <td style="text-align: center; font-weight: 900; font-size: 11pt;">${c.gradeVotes}</td>
        </tr>
      `).join('')}
    `;
  }).join('');

  const programLabel = programFilter === 'STE' ? 'Special Science Program' : 
                       programFilter === 'SPA' ? 'Special Program in the Arts' : 
                       'Regular Program';

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${programFilter} Consolidated Report - ${schoolName}</title>
      <style>
        ${getStandardReportStyles()}
        .doc-title { text-align: center; margin-bottom: 20px; }
        .doc-title h3 { text-decoration: underline; text-transform: uppercase; margin: 0; font-size: 14pt; }
        .doc-title p { margin: 2px 0; font-weight: bold; }
        
        .grade-banner { border: 2.5px solid #000; padding: 15px; margin-bottom: 20px; text-align: center; background: #fafafa; position: relative; }
        .grade-label { font-size: 24pt; font-weight: 900; color: #034F8B; margin: 0; line-height: 1; }
        .grade-sub { font-size: 9pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-top: 5px; letter-spacing: 2px; }
        .program-badge { position: absolute; top: 10px; right: 10px; background: #E11C38; color: white; padding: 4px 10px; font-size: 8pt; font-weight: 900; text-transform: uppercase; border-radius: 4px; }
        
        .audit-box { border: 1.5px dashed #64748b; padding: 15px; margin-top: 30px; font-size: 8pt; color: #475569; background-color: #f8fafc; border-radius: 8px; }
        .audit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      </style>
    </head>
    <body>
      ${getStandardReportHeaderHTML(schoolName)}
      
      <div class="grade-banner">
        <div class="program-badge">${programFilter}</div>
        <p class="grade-label">${isConsolidated ? 'CONSOLIDATED G7-G10' : gradeFilter.toUpperCase()}</p>
        <p class="grade-sub">${programLabel} Official Tally</p>
      </div>

      <div class="doc-title">
        <h3>Statement of Votes (${isConsolidated ? 'Program-Wide' : 'Segmented'})</h3>
        <p>Academic Year ${schoolYear}</p>
      </div>

      <p style="font-size: 8pt; font-style: italic; margin-bottom: 10px; color: #333;">
        This report reflects the distribution of votes strictly from <strong>${isConsolidated ? 'all ' + programFilter : gradeFilter + ' ' + programFilter}</strong> learners. 
        Tally includes a deduplication layer to ensure one vote per learner per position.
      </p>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Name of Candidate</th>
            <th style="text-align: left; width: 200px;">Political Party</th>
            <th style="width: 120px;">Validated Tally</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml || '<tr><td colspan="3" style="text-align:center; padding: 50px;">No ballots recorded for this scope.</td></tr>'}
        </tbody>
      </table>

      <div class="audit-box">
        <strong>DATA INTEGRITY & DEDUPLICATION AUDIT</strong>
        <div class="audit-grid">
          <div>
            Total Scanned Row Entries: ${entries?.length || 0}<br/>
            Unique Voters Scanned: ${targetLrns.length}
          </div>
          <div style="text-align: right;">
            Deduplicated Valid Votes: ${validBallotCount}<br/>
            Redundant Entries Blocked: ${excludedDuplicateEntries}
          </div>
        </div>
      </div>

      <div class="system-footer">
        Generated: ${timestamp} • SY ${schoolYear} • E-Boto Idempotent Tally Engine
      </div>

      ${getStandardSignatoriesHTML()}

      <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
