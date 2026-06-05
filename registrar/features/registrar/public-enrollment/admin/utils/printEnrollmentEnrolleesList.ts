const USIS_HEADER_IMAGE_SRC = new URL('../../../../../../common/assets/Leon-NHS_USIS-Header-Image.png', import.meta.url).href;

export type EnrollmentEnrolleePrintRow = {
  id: string;
  lrn: string;
  fullName: string;
  section: string;
  gradeLevel: string;
  status: string;
};

type Payload = {
  gradeLevel: string;
  rows: EnrollmentEnrolleePrintRow[];
  schoolYearLabel: string;
  generatedAt?: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildPrintHtml = ({ generatedAt, gradeLevel, rows, schoolYearLabel }: Payload) => {
  const printedAt = escapeHtml(generatedAt || new Date().toLocaleString());
  const tableRows = rows.length
    ? rows
        .map(
          (row, index) => `
            <tr>
              <td class="col-index">${index + 1}</td>
              <td class="col-lrn">${escapeHtml(row.lrn)}</td>
              <td class="col-name">${escapeHtml(row.fullName)}</td>
              <td class="col-section">${escapeHtml(row.section)}</td>
              <td class="col-grade">${escapeHtml(row.gradeLevel)}</td>
              <td class="col-status">${escapeHtml(row.status)}</td>
            </tr>
          `,
        )
        .join('')
    : `<tr><td colspan="6" class="empty-cell">No enrollees found for the selected grade level.</td></tr>`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>USIS Enrollees List - ${escapeHtml(gradeLevel)}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #102b54; background: #fff; }
          .sheet { width: 100%; }
          .header {
            display: grid;
            grid-template-columns: 240px minmax(0, 1fr) 220px;
            align-items: stretch;
            border: 1px solid #9fb6d9;
            border-top: 4px solid #0f4aa8;
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
          }
          .header__brand-column {
            display: grid;
            place-items: center;
            padding: 10px 14px;
            background: #f6f9ff;
            border-right: 1px solid #c7d6ec;
          }
          .header__title {
            padding: 12px 16px;
            display: grid;
            gap: 4px;
            align-content: center;
          }
          .header__brand {
            width: min(100%, 190px);
            max-height: 64px;
            height: auto;
            display: block;
            object-fit: contain;
          }
          .header__title-main {
            margin: 0;
            color: #0f4aa8;
            font-size: 24px;
            font-weight: 700;
            line-height: 1.05;
          }
          .header__title-copy {
            margin: 0;
            color: #102b54;
            font-size: 12px;
            font-weight: 600;
          }
          .header__meta {
            border-left: 1px solid #c7d6ec;
            background: #fbfcff;
            padding: 10px 12px;
            display: grid;
            align-content: center;
            gap: 6px;
          }
          .header__meta-item { display: grid; gap: 2px; }
          .header__meta-label {
            color: #4e6588;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .header__meta-value {
            color: #102b54;
            font-size: 12px;
            font-weight: 700;
          }
          .summary {
            margin: 14px 0 10px;
            padding: 12px 14px;
            border: 1px solid #c7d6ec;
            border-radius: 10px;
            background: #f8fbff;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .summary__item { display: grid; gap: 2px; }
          .summary__label {
            color: #4e6588;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .summary__value {
            color: #102b54;
            font-size: 13px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1px solid #9fb6d9;
            border-radius: 10px;
            overflow: hidden;
          }
          thead th {
            padding: 9px 8px;
            border: 1px solid #9fb6d9;
            background: #0f4aa8;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            text-align: left;
            text-transform: uppercase;
          }
          tbody td {
            padding: 8px;
            border: 1px solid #c7d6ec;
            color: #102b54;
            font-size: 11px;
            line-height: 1.4;
            vertical-align: top;
          }
          tbody tr:nth-child(even) td { background: #f8fbff; }
          .col-index { width: 32px; text-align: center; }
          .col-lrn { width: 120px; }
          .col-name { width: auto; }
          .col-section { width: 120px; }
          .col-grade { width: 86px; }
          .col-status { width: 96px; }
          .empty-cell {
            text-align: center;
            padding: 18px 12px;
            color: #4e6588;
          }
        </style>
      </head>
      <body>
        <section class="sheet">
          <header class="header">
            <div class="header__brand-column">
              <img class="header__brand" src="${USIS_HEADER_IMAGE_SRC}" alt="USIS Header" onerror="this.style.display='none';" />
            </div>
            <div class="header__title">
              <h1 class="header__title-main">Print Enrollees List</h1>
              <p class="header__title-copy">Print Enrollees List | Form No. IN-REG-001</p>
            </div>
            <div class="header__meta">
              <div class="header__meta-item">
                <span class="header__meta-label">School Year</span>
                <span class="header__meta-value">${escapeHtml(schoolYearLabel)}</span>
              </div>
              <div class="header__meta-item">
                <span class="header__meta-label">Printed At</span>
                <span class="header__meta-value">${printedAt}</span>
              </div>
            </div>
          </header>
          <section class="summary">
            <div class="summary__item">
              <span class="summary__label">Grade Level</span>
              <span class="summary__value">${escapeHtml(gradeLevel)}</span>
            </div>
            <div class="summary__item">
              <span class="summary__label">Total Enrollees</span>
              <span class="summary__value">${rows.length}</span>
            </div>
            <div class="summary__item">
              <span class="summary__label">Document</span>
              <span class="summary__value">Enrollment Submission Registry</span>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th class="col-index">#</th>
                <th class="col-lrn">LRN</th>
                <th class="col-name">Full Name (Last, First, Middle)</th>
                <th class="col-section">Section Enrolled</th>
                <th class="col-grade">Grade Level</th>
                <th class="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </section>
      </body>
    </html>
  `;
};

export const openEnrollmentEnrolleesPrintWindow = (payload: Payload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1120,height=820');
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
