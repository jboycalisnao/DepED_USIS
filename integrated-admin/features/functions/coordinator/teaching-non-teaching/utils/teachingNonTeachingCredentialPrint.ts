import { USIS_HEADER_IMAGE_PATH } from '../../../../../../common/config/usisBranding';
import type { TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';

type PrintScope = 'all' | 'department';

type Payload = {
  departmentLabel?: string;
  generatedAt?: string;
  rows: TeachingNonTeachingCredentialRecord[];
  scope: PrintScope;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const compareLabel = (left: string, right: string) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
const getPersonnelTypeLabel = (value: string) => (value === 'non_teaching' ? 'Non-Teaching' : 'Teaching');

const buildTableRows = (rows: TeachingNonTeachingCredentialRecord[]) =>
  rows.length
    ? rows
        .slice()
        .sort((left, right) => {
          const departmentCompare = compareLabel(left.departmentName || 'Not Set', right.departmentName || 'Not Set');
          if (departmentCompare !== 0) return departmentCompare;
          const personnelCompare = compareLabel(getPersonnelTypeLabel(left.personnelType), getPersonnelTypeLabel(right.personnelType));
          if (personnelCompare !== 0) return personnelCompare;
          return compareLabel(left.name, right.name);
        })
        .map(
          (row, index) => `
            <tr>
              <td class="col-index">${index + 1}</td>
              <td class="col-department">${escapeHtml(row.departmentName || 'Not Set')}</td>
              <td class="col-name">${escapeHtml(row.name)}</td>
              <td class="col-username">${escapeHtml(row.username)}</td>
              <td class="col-password">${escapeHtml(row.password || row.username)}</td>
              <td class="col-personnel">${escapeHtml(getPersonnelTypeLabel(row.personnelType))}</td>
              <td class="col-email">${escapeHtml(row.email)}</td>
              <td class="col-mobile">${escapeHtml(row.mobileNo)}</td>
              <td class="col-status">${row.isActive ? 'Active' : 'Inactive'}</td>
            </tr>
          `,
        )
        .join('')
    : `<tr><td colspan="8" class="empty-cell">No credentials found for the selected scope.</td></tr>`;

const buildPrintHtml = ({ departmentLabel, generatedAt, rows, scope }: Payload) => {
  const printedAt = escapeHtml(generatedAt || new Date().toLocaleString());
  const scopeLabel = scope === 'department' ? `Department: ${departmentLabel || 'Not Set'}` : 'Whole Credential List';
  const departmentBreakdown = new Map<string, number>();
  rows.forEach((row) => {
    const key = row.departmentName || 'Not Set';
    departmentBreakdown.set(key, (departmentBreakdown.get(key) || 0) + 1);
  });

  const summaryItem =
    scope === 'department'
      ? `
        <div class="summary__item">
          <span class="summary__label">Department</span>
          <span class="summary__value">${escapeHtml(departmentLabel || 'Not Set')}</span>
        </div>
      `
      : `
        <div class="summary__item">
          <span class="summary__label">Departments</span>
          <span class="summary__value">${departmentBreakdown.size}</span>
        </div>
      `;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>USIS Teaching and Non-Teaching Credentials</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            color: #102b54;
            background: #fff;
          }
          .sheet { width: 100%; }
          .header {
            display: grid;
            grid-template-columns: 220px minmax(0, 1fr) 220px;
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
          .header__brand {
            width: min(100%, 180px);
            max-height: 64px;
            height: auto;
            display: block;
            object-fit: contain;
          }
          .header__title {
            padding: 12px 16px;
            display: grid;
            gap: 4px;
            align-content: center;
          }
          .header__title-main {
            margin: 0;
            color: #0f4aa8;
            font-size: 22px;
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
            grid-template-columns: repeat(4, minmax(0, 1fr));
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
            word-break: break-word;
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
            word-break: break-word;
          }
          tbody tr:nth-child(even) td { background: #f8fbff; }
          .col-index { width: 32px; text-align: center; }
          .col-department { width: 140px; }
          .col-name { width: 180px; }
          .col-username { width: 120px; }
          .col-password { width: 120px; }
          .col-personnel { width: 110px; }
          .col-email { width: 180px; }
          .col-mobile { width: 120px; }
          .col-status { width: 82px; }
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
              <img class="header__brand" src="${USIS_HEADER_IMAGE_PATH}" alt="USIS Header" onerror="this.style.display='none';" />
            </div>
            <div class="header__title">
              <h1 class="header__title-main">Teaching and Non-Teaching Credentials</h1>
              <p class="header__title-copy">IA Coordinator Credential Registry</p>
            </div>
            <div class="header__meta">
              <div class="header__meta-item">
                <span class="header__meta-label">Printed At</span>
                <span class="header__meta-value">${printedAt}</span>
              </div>
              <div class="header__meta-item">
                <span class="header__meta-label">Scope</span>
                <span class="header__meta-value">${escapeHtml(scopeLabel)}</span>
              </div>
            </div>
          </header>
          <section class="summary">
            <div class="summary__item">
              <span class="summary__label">Total Accounts</span>
              <span class="summary__value">${rows.length}</span>
            </div>
            <div class="summary__item">
              <span class="summary__label">Teaching</span>
              <span class="summary__value">${rows.filter((row) => row.personnelType === 'teaching').length}</span>
            </div>
            <div class="summary__item">
              <span class="summary__label">Non-Teaching</span>
              <span class="summary__value">${rows.filter((row) => row.personnelType === 'non_teaching').length}</span>
            </div>
            ${summaryItem}
          </section>
          <table>
            <thead>
              <tr>
                <th class="col-index">#</th>
                <th class="col-department">Department</th>
                <th class="col-name">Name</th>
                <th class="col-username">Username</th>
                <th class="col-password">Password</th>
                <th class="col-personnel">Type</th>
                <th class="col-email">Email</th>
                <th class="col-mobile">Mobile</th>
                <th class="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              ${buildTableRows(rows)}
            </tbody>
          </table>
        </section>
      </body>
    </html>
  `;
};

export const openTeachingNonTeachingCredentialsPrintWindow = (payload: Payload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1240,height=860');
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
