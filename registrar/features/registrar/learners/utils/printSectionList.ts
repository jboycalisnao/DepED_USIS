import { GradeLevel, Section, Student } from '../../../../types';
import { buildLNHSPrintSheetHeader } from '../../shared/printSheetHeader';

type PrintSectionListPayload = {
  gradeLevel: GradeLevel | string;
  learners: Student[];
  schoolYearLabel: string;
  section: Section;
};

type PrintGradeSectionListsPayload = {
  gradeLevel: GradeLevel | string;
  schoolYearLabel: string;
  sections: Array<{
    section: Section;
    learners: Student[];
  }>;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const toText = (value: unknown) => String(value || '').trim();

const normalizeGender = (value: unknown): 'Male' | 'Female' | 'Other' => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return 'Other';
};

const compareName = (left: Student, right: Student) =>
  `${left.lastName}, ${left.firstName}`.toUpperCase().localeCompare(`${right.lastName}, ${right.firstName}`.toUpperCase());

const formatSectionAddress = (value: unknown) => {
  const text = toText(value);
  if (!text) return '';
  return text.replace(/(?:,\s*)?Region\s+[IVXLC0-9]+.*$/i, '').replace(/,\s*$/, '').trim();
};

const buildSectionPage = ({
  gradeLevel,
  learners,
  schoolYearLabel,
  section,
  pageNumber,
  totalPages,
}: PrintSectionListPayload & { pageNumber: number; totalPages: number }) => {
  const grouped = learners.reduce<Record<'Male' | 'Female' | 'Other', Student[]>>(
    (acc, learner) => {
      acc[normalizeGender(learner.gender)].push(learner);
      return acc;
    },
    { Male: [], Female: [], Other: [] },
  );

  const renderRows = (rows: Student[]) => {
    const sorted = [...rows].sort(compareName);
    return sorted.length
      ? sorted
          .map(
            (learner, index) => `
              <tr>
                <td class="col-index">${index + 1}</td>
                <td class="col-lrn">${escapeHtml(toText(learner.lrn))}</td>
                <td class="col-name">${escapeHtml(`${learner.lastName}, ${learner.firstName}${learner.middleName ? ` ${learner.middleName}` : ''}`.trim())}</td>
                <td class="col-address">${escapeHtml(formatSectionAddress(learner.address))}</td>
              </tr>
            `,
          )
          .join('')
      : `<tr><td colspan="4" class="empty-cell">No learners found.</td></tr>`;
  };

  return `
        <section class="sheet">
          ${buildLNHSPrintSheetHeader({ documentNo: 'LNHS-REG-USIS-F03', pageNumber, titleText: 'Section List', totalPages })}
          <div class="sheet-meta">
            <span>School Year: ${escapeHtml(schoolYearLabel)}</span>
            <span>Record Generated: ${escapeHtml(new Date().toLocaleString())}</span>
          </div>
          <section class="block">
            <h3>Section List</h3>
            <div class="summary">
              <div><strong>Section:</strong> ${escapeHtml(section.name)}</div>
              <div><strong>Grade Level:</strong> ${escapeHtml(String(gradeLevel))}</div>
              <div><strong>Total Learners:</strong> ${learners.length}</div>
            </div>
            <div class="gender-block">
              <h4 class="gender-block__title">Male Learners</h4>
              <p class="gender-block__meta">Count: ${grouped.Male.length}</p>
              <table>
                <thead>
                  <tr>
                    <th class="col-index">No.</th>
                    <th class="col-lrn">LRN</th>
                    <th class="col-name">Full Name</th>
                    <th class="col-address">Address</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderRows(grouped.Male)}
                </tbody>
              </table>
            </div>
            <div class="gender-block">
              <h4 class="gender-block__title">Female Learners</h4>
              <p class="gender-block__meta">Count: ${grouped.Female.length}</p>
              <table>
                <thead>
                  <tr>
                    <th class="col-index">No.</th>
                    <th class="col-lrn">LRN</th>
                    <th class="col-name">Full Name</th>
                    <th class="col-address">Address</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderRows(grouped.Female)}
                </tbody>
              </table>
            </div>
            ${grouped.Other.length ? `
              <div class="gender-block">
                <h4 class="gender-block__title">Other / Unspecified</h4>
                <p class="gender-block__meta">Count: ${grouped.Other.length}</p>
                <table>
                  <thead>
                    <tr>
                      <th class="col-index">No.</th>
                      <th class="col-lrn">LRN</th>
                      <th class="col-name">Full Name</th>
                      <th class="col-address">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderRows(grouped.Other)}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </section>
        </section>
  `;
};

const buildPrintHtml = ({ gradeLevel, learners, schoolYearLabel, section }: PrintSectionListPayload) => {
  const pageHtml = buildSectionPage({ gradeLevel, learners, schoolYearLabel, section, pageNumber: 1, totalPages: 1 });

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>LNHS Section List - ${escapeHtml(section.name)}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #fff; }
          .sheet { width: 100%; page-break-after: auto; }
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
            padding: 3px 5px;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            font-size: 10px;
            line-height: 1.15;
            text-align: center;
            white-space: normal;
            word-break: break-word;
          }
          .docs-table td:first-child { width: 58%; font-weight: 400; }
          .docs-table td:last-child { font-weight: 700; }
          .sheet-meta { margin: 6px 0 10px; font-size: 10.5px; color: #334155; display: flex; justify-content: space-between; gap: 8px; }
          .block { border: 1px solid #111; margin-bottom: 10px; border-radius: 2px; overflow: hidden; }
          .block h3 { margin: 0; padding: 6px 8px; font-size: 11.5px; font-weight: 700; background: #f2f5fa; border-bottom: 1px solid #111; text-transform: uppercase; letter-spacing: 0.03em; }
          .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .summary div { border-top: 1px solid #d9dfe8; border-right: 1px solid #d9dfe8; padding: 7px 8px; font-size: 10.5px; }
          .summary div:nth-child(3n) { border-right: 0; }
          .summary strong { display: inline-block; min-width: 118px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
          th, td { border: 1px solid #111; padding: 5px 6px; text-align: left; vertical-align: top; }
          th { background: #f2f5fa; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          tbody tr:nth-child(even) { background: #fafbfc; }
          .col-index { width: 38px; text-align: center; }
          .col-lrn { width: 120px; }
          .col-name { width: auto; }
          .col-address { width: 210px; }
          .empty-cell { text-align: center; padding: 14px 10px; }
          .gender-block { margin-top: 10px; border: 1px solid #111; }
          .gender-block__title {
            margin: 0;
            padding: 5px 8px;
            background: #eef3fb;
            border-bottom: 1px solid #111;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .gender-block__meta {
            margin: 0;
            padding: 5px 8px;
            border-bottom: 1px solid #111;
            font-size: 9.5px;
            background: #fbfcfe;
          }
          .gender-block table { border: 0; }
          @media print { .sheet { break-inside: avoid; } }
        </style>
      </head>
      <body>
        ${pageHtml}
      </body>
    </html>
  `;
};

const buildGradeLevelPrintHtml = ({ gradeLevel, schoolYearLabel, sections }: PrintGradeSectionListsPayload) => {
  const pages = sections.map((entry, index) =>
    buildSectionPage({
      gradeLevel,
      learners: entry.learners,
      schoolYearLabel,
      section: entry.section,
      pageNumber: index + 1,
      totalPages: sections.length,
    }),
  );

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>LNHS Section List - ${escapeHtml(String(gradeLevel))}</title>
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
            padding: 3px 5px;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            font-size: 10px;
            line-height: 1.15;
            text-align: center;
            white-space: normal;
            word-break: break-word;
          }
          .docs-table td:first-child { width: 58%; font-weight: 400; }
          .docs-table td:last-child { font-weight: 700; }
          .sheet-meta { margin: 6px 0 10px; font-size: 10.5px; color: #334155; display: flex; justify-content: space-between; gap: 8px; }
          .block { border: 1px solid #111; margin-bottom: 10px; border-radius: 2px; overflow: hidden; }
          .block h3 { margin: 0; padding: 6px 8px; font-size: 11.5px; font-weight: 700; background: #f2f5fa; border-bottom: 1px solid #111; text-transform: uppercase; letter-spacing: 0.03em; }
          .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .summary div { border-top: 1px solid #d9dfe8; border-right: 1px solid #d9dfe8; padding: 7px 8px; font-size: 10.5px; }
          .summary div:nth-child(3n) { border-right: 0; }
          .summary strong { display: inline-block; min-width: 118px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
          th, td { border: 1px solid #111; padding: 5px 6px; text-align: left; vertical-align: top; }
          th { background: #f2f5fa; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          tbody tr:nth-child(even) { background: #fafbfc; }
          .col-index { width: 38px; text-align: center; }
          .col-lrn { width: 120px; }
          .col-name { width: auto; }
          .col-address { width: 210px; }
          .empty-cell { text-align: center; padding: 14px 10px; }
          .gender-block { margin-top: 10px; border: 1px solid #111; }
          .gender-block__title {
            margin: 0;
            padding: 5px 8px;
            background: #eef3fb;
            border-bottom: 1px solid #111;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .gender-block__meta {
            margin: 0;
            padding: 5px 8px;
            border-bottom: 1px solid #111;
            font-size: 9.5px;
            background: #fbfcfe;
          }
          .gender-block table { border: 0; }
          @media print { .sheet { break-inside: avoid; } }
        </style>
      </head>
      <body>
        ${pages.join('')}
      </body>
    </html>
  `;
};

export const openSectionListPrintWindow = (payload: PrintSectionListPayload): boolean => {
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

export const openGradeLevelSectionListPrintWindow = (payload: PrintGradeSectionListsPayload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1120,height=820');
  if (!printWindow) return false;

  const html = buildGradeLevelPrintHtml(payload);
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
