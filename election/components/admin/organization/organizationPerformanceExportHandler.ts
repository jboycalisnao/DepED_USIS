import { GradeLevel, Section, Student, User } from '../../../types';
import { USIS_HEADER_IMAGE_PATH } from '../../../../common/config/usisBranding';

export type OrganizationPrintScope = 'overall' | 'grade' | 'section';

interface OrganizationPerformancePrintParams {
  sections: Section[];
  learnerDatabase: Student[];
  voters: User[];
  schoolName: string;
  electionName: string;
  schoolYearLabel: string;
  scope: OrganizationPrintScope;
  gradeLevel?: GradeLevel;
  sectionId?: string;
}

const gradeOrder = Object.values(GradeLevel);

const normalizeName = (value: string) => String(value || '').trim();

const normalizeGender = (value: string) => {
  const gender = normalizeName(value).toLowerCase();

  if (gender.startsWith('m')) return 'Male';
  if (gender.startsWith('f')) return 'Female';
  if (gender) return 'Other';
  return 'Unspecified';
};

const getSectionVoters = (sectionId: string, learnerDatabase: Student[], voters: User[]) => {
  const students = learnerDatabase.filter((learner) => learner.sectionId === sectionId);
  const votedLearners = students.filter((learner) => voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted);
  const votedCount = votedLearners.length;
  const total = students.length;
  const percentage = total > 0 ? Math.round((votedCount / total) * 100) : 0;
  const maleVoted = votedLearners.filter((learner) => normalizeGender(learner.gender) === 'Male').length;
  const femaleVoted = votedLearners.filter((learner) => normalizeGender(learner.gender) === 'Female').length;
  const otherVoted = votedCount - maleVoted - femaleVoted;

  return { votedCount, total, percentage, maleVoted, femaleVoted, otherVoted };
};

const buildStyles = () => `
  @page {
    size: A4 portrait;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    background: #ffffff;
    color: #12233d;
    font-family: 'Segoe UI', sans-serif;
  }

  body {
    overflow: auto;
  }

  .org-print {
    width: 210mm;
    margin: 0 auto;
    padding: 12mm 12mm 16mm;
  }

  .org-print__header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: stretch;
    min-height: 26mm;
    padding-bottom: 10px;
    margin-bottom: 12px;
    border-bottom: 2px solid #f2c500;
  }

  .org-print__header-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .org-print__header-logo {
    width: 185px;
    height: 44px;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .org-print__header-divider {
    width: 2px;
    height: 42px;
    background: #f2c500;
    flex: 0 0 auto;
  }

  .org-print__header-copy {
    min-width: 0;
  }

  .org-print__header-school {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f3d91;
    line-height: 1.1;
  }

  .org-print__header-election {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #d1142c;
    line-height: 1.05;
    text-transform: uppercase;
  }

  .org-print__header-report {
    min-width: 240px;
    padding: 16px 18px 14px;
    border-radius: 18px;
    background: #cfe0f3;
    text-align: right;
  }

  .org-print__header-report-title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #0f3d91;
    line-height: 0.95;
    text-transform: uppercase;
  }

  .org-print__header-report-subtitle {
    margin: 8px 0 0;
    font-size: 12px;
    font-style: italic;
    color: #12233d;
  }

  .org-print__banner {
    display: none;
  }

  .org-print__title {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
  }

  .org-print__subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: #4b5563;
  }

  .org-print__pill {
    min-width: 100px;
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: #0038a8;
    background: #f8fbff;
  }

  .org-print__empty {
    margin-top: 18px;
    padding: 20px;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
  }

  .org-print__grade {
    margin-top: 12px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .org-print__grade-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    background: #f8fbff;
    border-bottom: 1px solid #e2e8f0;
  }

  .org-print__grade-name {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .org-print__grade-stats {
    margin: 0;
    font-size: 12px;
    color: #475569;
  }

  .org-print__cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 12px;
  }

  .org-print__card {
    border: 1px solid #e5eaf2;
    border-radius: 12px;
    padding: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .org-print__card-top {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: flex-start;
  }

  .org-print__section-name {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
  }

  .org-print__adviser {
    margin: 4px 0 0;
    font-size: 11px;
    color: #64748b;
  }

  .org-print__section-percentage {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0038a8;
  }

  .org-print__vote-summary {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }

  .org-print__gender-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
  }

  .org-print__gender-chip {
    padding: 8px 10px;
    border-radius: 10px;
    background: #f8fbff;
    border: 1px solid #e2e8f0;
  }

  .org-print__gender-label {
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }

  .org-print__gender-value {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 700;
    color: #12233d;
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    html, body {
      min-height: auto;
      height: auto;
      overflow: visible;
    }

    .org-print {
      box-shadow: none;
      width: auto;
      padding: 0;
    }

    .org-print__header {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

const buildSectionCard = (section: Section, learnerDatabase: Student[], voters: User[]) => {
  const { votedCount, total, percentage, maleVoted, femaleVoted, otherVoted } = getSectionVoters(section.id, learnerDatabase, voters);

  return `
    <article class="org-print__card">
      <div class="org-print__card-top">
        <div>
          <h3 class="org-print__section-name">${section.name}</h3>
          <p class="org-print__adviser">${normalizeName(section.adviserName) || 'No adviser'}</p>
        </div>
        <p class="org-print__section-percentage">${percentage}%</p>
      </div>
      <div class="org-print__vote-summary">
        <span>Voters</span>
        <span>${votedCount.toLocaleString()} / ${total.toLocaleString()}</span>
      </div>
      <div class="org-print__gender-grid">
        <div class="org-print__gender-chip">
          <p class="org-print__gender-label">Male</p>
          <p class="org-print__gender-value">${maleVoted.toLocaleString()}</p>
        </div>
        <div class="org-print__gender-chip">
          <p class="org-print__gender-label">Female</p>
          <p class="org-print__gender-value">${femaleVoted.toLocaleString()}</p>
        </div>
        <div class="org-print__gender-chip">
          <p class="org-print__gender-label">Other</p>
          <p class="org-print__gender-value">${otherVoted.toLocaleString()}</p>
        </div>
      </div>
    </article>
  `;
};

const buildHeaderMarkup = (schoolName: string, electionName: string, schoolYearLabel: string, scopeLabel: string) => `
  <header class="org-print__header">
    <div class="org-print__header-brand">
      <img class="org-print__header-logo" src="${USIS_HEADER_IMAGE_PATH}" alt="USIS header" />
      <div class="org-print__header-copy">
        <p class="org-print__header-school">${schoolName}</p>
        <p class="org-print__header-election">ELECTION PORTAL</p>
      </div>
    </div>
    <div class="org-print__header-report">
      <p class="org-print__header-report-title">Performance Report</p>
      <p class="org-print__header-report-subtitle">${electionName || 'Learner Government Election'} | SY ${schoolYearLabel}</p>
    </div>
  </header>
`;

const buildReportMarkup = (params: OrganizationPerformancePrintParams) => {
  const { sections, learnerDatabase, voters, schoolName, electionName, schoolYearLabel, scope, gradeLevel, sectionId } = params;
  const selectedGrade = gradeLevel || gradeOrder[0];
  const scopeLabel = scope === 'overall' ? 'Overall' : scope === 'grade' ? `Grade ${normalizeName(selectedGrade)}` : 'Section';

  const filteredSections =
    scope === 'overall'
      ? sections
      : scope === 'grade'
        ? sections.filter((section) => section.gradeLevel === selectedGrade)
        : sections.filter((section) => section.id === sectionId);

  const gradeGroups =
    scope === 'overall'
      ? gradeOrder
          .map((grade) => ({
            grade,
            items: sections.filter((section) => section.gradeLevel === grade),
          }))
          .filter((group) => group.items.length > 0)
      : scope === 'grade'
        ? [
            {
              grade: selectedGrade,
              items: filteredSections,
            },
          ]
        : [
            {
              grade: filteredSections[0]?.gradeLevel || selectedGrade,
              items: filteredSections,
            },
          ];

  const overallLearners = learnerDatabase.length;
  const overallVoted = learnerDatabase.filter((learner) => voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted).length;
  const overallPercentage = overallLearners > 0 ? Math.round((overallVoted / overallLearners) * 100) : 0;

  return `
    <div class="org-print">
      ${buildHeaderMarkup(schoolName, electionName, schoolYearLabel, scopeLabel)}
      <div class="org-print__banner">
        <div>
          <h1 class="org-print__title">${schoolName}</h1>
          <p class="org-print__subtitle">Organization performance report</p>
          <p class="org-print__subtitle">School Year ${schoolYearLabel} • Scope: ${scopeLabel}</p>
        </div>
        <div class="org-print__pill">${overallPercentage}% overall</div>
      </div>

      ${filteredSections.length === 0 ? '<div class="org-print__empty">No sections available for the selected scope.</div>' : ''}

      ${gradeGroups
        .map((group) => {
          const learnersInGrade = learnerDatabase.filter((learner) => {
            const section = sections.find((entry) => entry.id === learner.sectionId);
            return section?.gradeLevel === group.grade;
          });
          const votedInGrade = learnersInGrade.filter((learner) => voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted).length;
          const gradePercent = learnersInGrade.length > 0 ? Math.round((votedInGrade / learnersInGrade.length) * 100) : 0;

          return `
            <section class="org-print__grade">
              <div class="org-print__grade-header">
                <div>
                  <p class="org-print__grade-name">${group.grade}</p>
                  <p class="org-print__grade-stats">${votedInGrade.toLocaleString()} / ${learnersInGrade.length.toLocaleString()} voters</p>
                </div>
                <div class="org-print__pill">${gradePercent}%</div>
              </div>
              <div class="org-print__cards">
                ${group.items.map((section) => buildSectionCard(section, learnerDatabase, voters)).join('')}
              </div>
            </section>
          `;
        })
        .join('')}
    </div>
  `;
};

const injectPopupConsoleLog = (popupWindow: Window, message: string) => {
  const script = popupWindow.document.createElement('script');
  script.textContent = `console.log(${JSON.stringify(message)});`;
  popupWindow.document.body.appendChild(script);
  script.remove();
};

export const handleOrganizationPerformancePrint = (params: OrganizationPerformancePrintParams) => {
  const popupFeatures = 'popup=yes,width=1120,height=900,resizable=yes,scrollbars=yes';
  const printWindow = window.open('about:blank', '_blank', popupFeatures);

  if (!printWindow) {
    alert('Action blocked! Please allow pop-ups so the organization performance report can open.');
    return;
  }

  console.log('[OrganizationPrint] Popup opened', {
    schoolYearLabel: params.schoolYearLabel,
    scope: params.scope,
    sectionId: params.sectionId || null,
    gradeLevel: params.gradeLevel || null,
  });

  const doc = printWindow.document;
  let hasRendered = false;
  const shellHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Preparing Organization Report...</title>
  </head>
  <body>
    <div id="org-print-shell" style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Segoe UI,sans-serif;color:#12233d;background:#fff;">
      <div style="text-align:center;max-width:560px;padding:32px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4b5563;">Organization Print Debug</div>
        <div style="font-size:24px;font-weight:700;margin-top:12px;">Loading organization report...</div>
        <div style="font-size:14px;margin-top:8px;color:#4b5563;">If this shell remains visible, the popup body was created and the report render step did not complete.</div>
      </div>
    </div>
  </body>
</html>`;

  doc.open();
  doc.write(shellHtml);
  doc.close();

  const applyStyles = () => {
    if (!doc.head.querySelector('style[data-usis-organization-print]')) {
      const styleTag = doc.createElement('style');
      styleTag.setAttribute('data-usis-organization-print', 'true');
      styleTag.textContent = buildStyles();
      doc.head.appendChild(styleTag);
    }
  };

  const renderReport = () => {
    if (hasRendered) return;
    hasRendered = true;
    applyStyles();
    const markup = buildReportMarkup(params);
    doc.title = `${params.schoolName} - Organization Report`;
    doc.body.innerHTML = markup;
    printWindow.focus();

    setTimeout(() => {
      console.log('[OrganizationPrint] Triggering print dialog');
      printWindow.print();
    }, 250);
  };

  printWindow.addEventListener('afterprint', () => {
    console.log('[OrganizationPrint] Print dialog closed');
    try {
      printWindow.close();
    } catch (error) {
      console.warn('[OrganizationPrint] Popup close failed', error);
    }
  });

  printWindow.addEventListener(
    'load',
    () => {
      console.log('[OrganizationPrint] Popup load event fired');
      renderReport();
    },
    { once: true },
  );

  setTimeout(() => {
    if (doc.body) renderReport();
  }, 100);
};
