import { Student } from '../../../../types';
const USIS_SEAL_SRC = new URL('../../../../../common/assets/USIS_Icon.png', import.meta.url).href;

type PrintPayload = {
  learners: Student[];
  sectionMap: Record<string, string>;
  schoolYearLabel: string;
  gradeLabel: string;
  scopeLabel: string;
  createDefaultPassword: (learner: Student) => string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildPrintHtml = ({
  learners,
  sectionMap,
  schoolYearLabel,
  gradeLabel,
  scopeLabel,
  createDefaultPassword,
}: PrintPayload) => {
  const logoSrc = USIS_SEAL_SRC;
  const grouped: Record<string, Student[]> = {};
  learners.forEach((learner) => {
    const sectionLabel = sectionMap[String(learner.sectionId || '').trim()] || 'Unassigned';
    if (!grouped[sectionLabel]) grouped[sectionLabel] = [];
    grouped[sectionLabel].push(learner);
  });

  const sectionNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  const sectionsHtml = sectionNames
    .sort((a, b) => a.localeCompare(b))
    .map((sectionName, index) => {
      const rows = grouped[sectionName]
        .sort((a, b) => `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`))
        .map((learner) => {
          const username = learner.loginUsername || learner.lrn;
          const password = learner.loginPassword || createDefaultPassword(learner);
          const fullName = `${learner.lastName}, ${learner.firstName}${learner.middleName ? ` ${learner.middleName}` : ''}`;
          return `
            <tr>
              <td>${escapeHtml(String(learner.lrn || ''))}</td>
              <td>${escapeHtml(fullName)}</td>
              <td>${escapeHtml(username)}</td>
              <td>${escapeHtml(password)}</td>
              <td>${escapeHtml(learner.loginStatus || 'Active')}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <article class="sheet">
          <table class="meta-header">
            <tr>
              <td class="logo-cell" rowspan="2">
                <img src="${logoSrc}" alt="USIS Seal" onerror="this.style.display='none';" />
              </td>
              <td class="title-cell" rowspan="2">
                <div class="title-main">LEON NATIONAL HIGH SCHOOL</div>
                <div class="title-sub">USIS CREDENTIALS LIST</div>
              </td>
              <td class="docs-cell" rowspan="2">
                <table class="docs-table">
                  <tr><td>Document No.</td><td>LNHS-REG-USIS-F02</td></tr>
                  <tr><td>Issue No.</td><td>1</td></tr>
                  <tr><td>Revision No.</td><td>1</td></tr>
                  <tr><td>Date of Effectivity</td><td>June 8, 2026</td></tr>
                  <tr><td>Issued by</td><td>Registrar</td></tr>
                  <tr><td>Page No.</td><td>Page ${index + 1} of ${sectionNames.length}</td></tr>
                </table>
              </td>
            </tr>
            <tr></tr>
          </table>

          <div class="sheet-meta">
            <span>School Year: ${escapeHtml(schoolYearLabel)}</span>
            <span>Grade Level: ${escapeHtml(gradeLabel)}</span>
            <span>Section Scope: ${escapeHtml(scopeLabel)}</span>
          </div>

          <section class="block">
            <h3>Credentials List - ${escapeHtml(sectionName)}</h3>
            <table class="data">
              <thead>
                <tr>
                  <th class="col-lrn">LRN</th>
                  <th class="col-name">Learner Name</th>
                  <th class="col-user">Username</th>
                  <th class="col-pass">Password</th>
                  <th class="col-stat">Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>

          <p class="footer-note">Generated: ${escapeHtml(new Date().toLocaleString())} · Learners in section: ${grouped[sectionName].length}</p>
        </article>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Registrar Credentials List</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #fff; }
          .sheet { width: 100%; page-break-after: always; }
          .sheet:last-child { page-break-after: auto; }
          .meta-header { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .meta-header td, .meta-header th { border: 1px solid #111; padding: 4px 6px; }
          .meta-header .logo-cell { width: 95px; text-align: center; }
          .meta-header .logo-cell img { width: 72px; height: 72px; object-fit: contain; }
          .meta-header .title-cell {
            text-align: center;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            padding: 0;
          }
          .meta-header .title-main,
          .meta-header .title-sub {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 46px;
            padding: 4px 8px;
            text-align: center;
            white-space: nowrap;
          }
          .meta-header .title-main { font-size: 14px; font-weight: 700; letter-spacing: 0.3px; border-bottom: 1px solid #111; }
          .meta-header .title-sub { font-size: 14px; font-weight: 700; line-height: 1.1; }
          .meta-header .docs-cell { width: 250px; padding: 0; }
          .docs-table { width: 100%; border-collapse: collapse; }
          .docs-table td {
            border: 1px solid #111;
            padding: 2px 6px;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            font-size: 11px;
            text-align: center;
            white-space: nowrap;
          }
          .docs-table td:first-child { width: 58%; font-weight: 400; }
          .docs-table td:last-child { font-weight: 700; }
          .sheet-meta { margin: 6px 0 10px; font-size: 10.5px; color: #334155; display: flex; justify-content: space-between; gap: 8px; }
          .block { border: 1px solid #111; margin-bottom: 10px; border-radius: 2px; overflow: hidden; }
          .block h3 { margin: 0; padding: 6px 8px; font-size: 11.5px; font-weight: 700; background: #f2f5fa; border-bottom: 1px solid #111; text-transform: uppercase; letter-spacing: 0.03em; }
          table.data { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
          table.data th, table.data td { border: 1px solid #111; padding: 5px 6px; text-align: left; vertical-align: top; word-break: break-word; }
          table.data th { background: #f2f5fa; font-weight: 700; font-size: 10px; }
          table.data tbody tr:nth-child(even) { background: #fafbfc; }
          .col-lrn { width: 16%; }
          .col-name { width: 34%; }
          .col-user { width: 20%; }
          .col-pass { width: 20%; }
          .col-stat { width: 10%; text-align: center; }
          .footer-note { margin-top: 6px; font-size: 10px; color: #4f6380; }
          @media print { .sheet { break-inside: avoid; } }
        </style>
      </head>
      <body>
        ${sectionsHtml}
      </body>
    </html>
  `;
};

export const openCredentialsPrintWindow = (payload: PrintPayload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1100,height=760');
  if (!printWindow) return false;

  const html = buildPrintHtml(payload);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onafterprint = () => {
    printWindow.close();
  };

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return true;
};
