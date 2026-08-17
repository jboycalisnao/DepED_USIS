import type { MerchOrderControlRecord } from '../../services/merchOrderControlService';

type PrintPayload = {
  generatedAt?: string;
  orderPeriodLabel: string;
  records: MerchOrderControlRecord[];
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseGradeSortValue = (grade: string) => {
  const match = String(grade || '').match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

const sortGradeLabels = (left: string, right: string) => {
  const gradeDiff = parseGradeSortValue(left) - parseGradeSortValue(right);
  if (gradeDiff !== 0) return gradeDiff;
  return left.localeCompare(right, undefined, { numeric: true });
};

const formatMoney = (value: number) => `PHP ${Math.max(0, Number(value || 0)).toFixed(2)}`;

const groupBy = <T,>(rows: T[], getKey: (row: T) => string) =>
  rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = getKey(row) || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

const getQuantity = (row: MerchOrderControlRecord) => Math.max(1, Number(row.quantity || 1));

const sumAmount = (rows: MerchOrderControlRecord[]) =>
  rows.reduce((sum, row) => sum + Number(row.orderAmount || 0), 0);

const sumQuantity = (rows: MerchOrderControlRecord[]) =>
  rows.reduce((sum, row) => sum + getQuantity(row), 0);

const buildRowsHtml = (rows: MerchOrderControlRecord[]) =>
  rows
    .slice()
    .sort((left, right) => {
      const nameDiff = String(left.learnerName || '').localeCompare(String(right.learnerName || ''), undefined, { numeric: true });
      if (nameDiff !== 0) return nameDiff;
      return String(left.referenceNo || '').localeCompare(String(right.referenceNo || ''), undefined, { numeric: true });
    })
    .map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.referenceNo || '-')}</td>
        <td>${escapeHtml(row.learnerName || '-')}</td>
        <td>${escapeHtml(row.learnerLrn || '-')}</td>
        <td>${escapeHtml(row.selectedSize || '-')}</td>
        <td class="number">${getQuantity(row)}</td>
        <td class="number">${formatMoney(Number(row.orderAmount || 0))}</td>
      </tr>
    `)
    .join('');

const buildSectionHtml = (sectionName: string, sectionRows: MerchOrderControlRecord[]) => `
  <section class="section-block">
    <div class="section-head">
      <h5>${escapeHtml(sectionName)}</h5>
      <p>${sectionRows.length} order(s) | ${sumQuantity(sectionRows)} item(s) | ${formatMoney(sumAmount(sectionRows))}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Ref No.</th>
          <th>Learner</th>
          <th>LRN</th>
          <th>Size</th>
          <th class="number">Qty</th>
          <th class="number">Amount</th>
        </tr>
      </thead>
      <tbody>${buildRowsHtml(sectionRows)}</tbody>
    </table>
  </section>
`;

const buildGradeHtml = (gradeName: string, gradeRows: MerchOrderControlRecord[]) => {
  const sections = groupBy(gradeRows, (row) => String(row.sectionName || 'Unassigned').trim() || 'Unassigned');
  return `
    <section class="grade-block">
      <div class="grade-head">
        <h4>${escapeHtml(gradeName)}</h4>
        <p>${gradeRows.length} order(s) | ${sumQuantity(gradeRows)} item(s) | ${formatMoney(sumAmount(gradeRows))}</p>
      </div>
      ${Object.entries(sections)
        .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
        .map(([sectionName, sectionRows]) => buildSectionHtml(sectionName, sectionRows))
        .join('')}
    </section>
  `;
};

const buildProductHtml = (productName: string, productRows: MerchOrderControlRecord[]) => {
  const grades = groupBy(productRows, (row) => String(row.gradeLevel || 'Unassigned').trim() || 'Unassigned');
  return `
    <section class="product-block">
      <div class="product-head">
        <h3>${escapeHtml(productName)}</h3>
        <p>${productRows.length} order(s) | ${sumQuantity(productRows)} item(s) | ${formatMoney(sumAmount(productRows))}</p>
      </div>
      ${Object.entries(grades)
        .sort(([left], [right]) => sortGradeLabels(left, right))
        .map(([gradeName, gradeRows]) => buildGradeHtml(gradeName, gradeRows))
        .join('')}
    </section>
  `;
};

const buildPeriodHtml = (periodName: string, periodRows: MerchOrderControlRecord[]) => {
  const products = groupBy(periodRows, (row) => String(row.productName || 'Unspecified Product').trim() || 'Unspecified Product');
  return `
    <section class="period-block">
      <div class="period-head">
        <h2>${escapeHtml(periodName)}</h2>
        <p>${periodRows.length} order(s) | ${sumQuantity(periodRows)} item(s) | ${formatMoney(sumAmount(periodRows))}</p>
      </div>
      ${Object.entries(products)
        .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
        .map(([productName, productRows]) => buildProductHtml(productName, productRows))
        .join('')}
    </section>
  `;
};

const buildPrintHtml = ({ generatedAt, orderPeriodLabel, records }: PrintPayload) => {
  const periods = groupBy(records, (row) => String(row.orderPeriodLabel || 'No Order Period').trim() || 'No Order Period');
  const printedAt = generatedAt || new Date().toLocaleString();
  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>USIS Merch Order Counts</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #172033;
            font-family: Segoe UI, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.35;
          }
          header {
            border-bottom: 3px solid #0038a8;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .eyebrow {
            margin: 0 0 3px;
            color: #4b5d7a;
            font-size: 10px;
          }
          h1 {
            margin: 0;
            color: #0038a8;
            font-size: 20px;
            line-height: 1.1;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-top: 10px;
          }
          .meta div {
            border: 1px solid #d8e0ef;
            padding: 7px 8px;
            border-radius: 4px;
          }
          .meta span {
            display: block;
            color: #5f6f89;
            font-size: 9px;
          }
          .meta strong {
            display: block;
            margin-top: 2px;
            color: #0038a8;
            font-size: 12px;
          }
          h2, h3, h4, h5, p { margin: 0; }
          .period-block,
          .product-block,
          .grade-block,
          .section-block {
            page-break-inside: avoid;
          }
          .period-head,
          .product-head,
          .grade-head,
          .section-head {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
          }
          .period-head {
            margin: 14px 0 8px;
            border: 1px solid #b8c7df;
            border-left: 4px solid #0038a8;
            background: #f7faff;
            padding: 9px 10px;
          }
          .period-head h2 { color: #0038a8; font-size: 16px; }
          .product-head {
            margin: 10px 0 6px;
            border-bottom: 1px solid #d8e0ef;
            padding-bottom: 5px;
          }
          .product-head h3 { color: #172033; font-size: 14px; }
          .grade-head {
            margin: 8px 0 5px;
            background: #f4f6fa;
            padding: 6px 8px;
          }
          .grade-head h4 { color: #0038a8; font-size: 12px; }
          .section-head {
            margin: 7px 0 4px;
            padding: 0 2px;
          }
          .section-head h5 { color: #172033; font-size: 11px; }
          .period-head p,
          .product-head p,
          .grade-head p,
          .section-head p {
            color: #5f6f89;
            font-size: 10px;
            white-space: nowrap;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          th, td {
            border: 1px solid #d8e0ef;
            padding: 5px 6px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #eef3fb;
            color: #0038a8;
            font-size: 10px;
          }
          .number { text-align: right; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <header>
          <p class="eyebrow">LEON NATIONAL HIGH SCHOOL | DEPED USIS</p>
          <h1>Consolidated Merchandise Order Count List</h1>
          <div class="meta">
            <div><span>Order Period Scope</span><strong>${escapeHtml(orderPeriodLabel)}</strong></div>
            <div><span>Confirmed Orders</span><strong>${records.length}</strong></div>
            <div><span>Printed At</span><strong>${escapeHtml(printedAt)}</strong></div>
          </div>
        </header>
        ${Object.entries(periods)
          .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
          .map(([periodName, periodRows]) => buildPeriodHtml(periodName, periodRows))
          .join('')}
        <script>
          window.addEventListener('load', function () {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>`;
};

export const openMerchOrderCountsPrintWindow = (payload: PrintPayload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1240,height=920');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(buildPrintHtml(payload));
  printWindow.document.close();
  printWindow.onafterprint = () => {
    printWindow.close();
  };
  return true;
};
