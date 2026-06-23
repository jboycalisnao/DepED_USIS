export type MerchPaymentReceiptPayload = {
  balanceAfterPayment?: number;
  learnerLrn: string;
  learnerName: string;
  orderAmount?: number;
  paymentAmount: number;
  paymentMethod?: string;
  paymentNotes?: string;
  paymentStatus?: string;
  paidAt?: string;
  postedBy?: string;
  productName: string;
  gradeSection?: string;
  referenceNo: string;
  receiptNo?: string;
  schoolName?: string;
  sourceLabel?: string;
  transactionNo: string;
  outstandingBalance?: number;
  orderLines?: Array<{
    label?: string;
    referenceNo?: string;
    productName?: string;
    amount?: number;
    outstandingBalance?: number;
  }>;
  paymentHistoryRows?: Array<{
    amount?: number;
    date?: string;
    notes?: string;
    postedBy?: string;
    receiptNo?: string;
    referenceNo?: string;
    status?: string;
    transactionNo?: string;
  }>;
  variant?: 'single' | 'consolidated';
};

type PrintReceiptOptions = {
  iconSrc?: string;
  pageSize?: 'A4' | 'A5';
  orientation?: 'portrait' | 'landscape';
  closeOnAfterPrint?: boolean;
  autoPrint?: boolean;
};

const USIS_ICON_SRC = new URL('../assets/USIS_Icon.png', import.meta.url).href;

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapePdfText = (value: string) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const money = (amount: number) =>
  Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizeText = (value: string, fallback = '-') => String(value || '').trim() || fallback;

const getPageDimensions = (pageSize: 'A4' | 'A5', orientation: 'portrait' | 'landscape') => {
  const isA4 = pageSize === 'A4';
  const longSide = isA4 ? '297mm' : '210mm';
  const shortSide = isA4 ? '210mm' : '148mm';
  return orientation === 'landscape'
    ? { height: shortSide, width: longSide }
    : { height: longSide, width: shortSide };
};

const formatStatusLabel = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const sanitizeFilePart = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70) || 'Merch_Receipt';

const formatDateTime = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
};

const formatShortDateTime = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString([], {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getDerivedOutstanding = (payload: MerchPaymentReceiptPayload) =>
  typeof payload.outstandingBalance === 'number'
    ? payload.outstandingBalance
    : Math.max(0, Number(payload.orderAmount || 0) - Number(payload.paymentAmount || 0));

const getDerivedBalanceAfter = (payload: MerchPaymentReceiptPayload) =>
  typeof payload.balanceAfterPayment === 'number' ? payload.balanceAfterPayment : getDerivedOutstanding(payload);

const buildPrintHtml = (payload: MerchPaymentReceiptPayload, options: PrintReceiptOptions = {}) => {
  const gradeSection = normalizeText(payload.gradeSection || '');
  const generatedOn = new Date().toLocaleString();
  const outstanding = getDerivedOutstanding(payload);
  const balanceAfter = getDerivedBalanceAfter(payload);
  const receiptNo = normalizeText(payload.receiptNo || '');
  const sourceLabel = normalizeText(payload.sourceLabel || 'Merch Service');
  const postedBy = normalizeText(payload.postedBy || 'Unknown Actor');
  const printTitleLineOne = 'LEON NATIONAL HIGH SCHOOL';
  const printTitleLineTwo = 'Only the Best Merchandise';
  const iconSrc = options.iconSrc || USIS_ICON_SRC;
  const rows =
    payload.variant === 'consolidated' && Array.isArray(payload.orderLines) && payload.orderLines.length > 0
      ? payload.orderLines
      : [
          {
            amount: payload.orderAmount ?? payload.paymentAmount,
            outstandingBalance: outstanding,
            productName: payload.productName,
            referenceNo: payload.referenceNo,
          },
        ];
  const paymentHistoryRows = Array.isArray(payload.paymentHistoryRows) ? payload.paymentHistoryRows : [];
  const pageSize = options.pageSize || 'A5';
  const orientation = options.orientation || 'landscape';
  const autoPrint = options.autoPrint !== false;
  const { width: pageWidthMm, height: pageHeightMm } = getPageDimensions(pageSize, orientation);

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Merch Payment Receipt</title>
      <style>
        @page { size: ${pageSize} ${orientation}; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #0f172a;
          font-family: "Segoe UI", sans-serif;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          width: ${pageWidthMm};
          height: ${pageHeightMm};
          overflow: hidden;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
        }
        .sheet {
          width: ${pageWidthMm};
          height: ${pageHeightMm};
          border: 1px solid #d7e0ef;
          border-radius: 6px;
          padding: 6mm;
          overflow: hidden;
          margin: 0;
          flex: 0 0 auto;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          padding-bottom: 6px;
          border-bottom: 1px solid #d7e0ef;
          text-align: left;
        }
        .header__icon {
          width: 34px;
          height: 34px;
          object-fit: contain;
          flex: 0 0 auto;
        }
        .header__brand {
          min-width: 0;
          display: grid;
          gap: 1px;
        }
        .header__brand-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .title {
          margin: 0;
          color: #0038a8;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
        }
        .subtitle {
          margin: 0;
          color: #0038a8;
          font-size: 9px;
          line-height: 1.2;
        }
        .body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
          gap: 6px;
          align-items: start;
        }
        .panel {
          border: 1px solid #d7e0ef;
          border-radius: 6px;
          overflow: hidden;
          background: #fff;
        }
        .panel__title {
          margin: 0;
          padding: 5px 8px;
          background: #f7faff;
          border-bottom: 1px solid #d7e0ef;
          color: #0038a8;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .meta-item {
          padding: 5px 8px;
          border-right: 1px solid #edf1f8;
          border-bottom: 1px solid #edf1f8;
          min-width: 0;
        }
        .meta-item:nth-child(2n) {
          border-right: 0;
        }
        .meta-item:nth-last-child(-n + 2) {
          border-bottom: 0;
        }
        .meta-label {
          display: block;
          margin-bottom: 2px;
          color: #667085;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.1;
        }
        .meta-value {
          color: #111827;
          font-size: 9px;
          font-weight: 600;
          line-height: 1.2;
          word-break: break-word;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
          margin-top: 6px;
        }
        .summary__item {
          border: 1px solid #d7e0ef;
          border-radius: 6px;
          background: #f8fbff;
          padding: 6px 8px;
        }
        .summary__label {
          color: #667085;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .summary__value {
          margin-top: 2px;
          color: #0038a8;
          font-size: 10px;
          font-weight: 700;
        }
        .orders {
          display: grid;
          gap: 4px;
        }
        .history-panel {
          margin-top: 6px;
        }
        .history-table {
          width: 100%;
          border-collapse: collapse;
        }
        .history-table th,
        .history-table td {
          border-top: 1px solid #edf1f8;
          padding: 3px 4px;
          font-size: 7.5px;
          line-height: 1.15;
          vertical-align: top;
        }
        .history-table th {
          color: #667085;
          font-weight: 700;
          text-align: left;
          text-transform: uppercase;
          background: #fbfdff;
        }
        .history-table td {
          color: #0f172a;
        }
        .history-table th:nth-child(1),
        .history-table td:nth-child(1) {
          width: 18%;
        }
        .history-table th:nth-child(2),
        .history-table td:nth-child(2) {
          width: 18%;
        }
        .history-table th:nth-child(3),
        .history-table td:nth-child(3) {
          width: 22%;
        }
        .history-table th:nth-child(4),
        .history-table td:nth-child(4) {
          width: 22%;
        }
        .history-table th:nth-child(5),
        .history-table td:nth-child(5) {
          width: 20%;
        }
        .history-table td:last-child,
        .history-table th:last-child {
          text-align: right;
          white-space: nowrap;
        }
        .history-table td:nth-child(2),
        .history-table th:nth-child(2) {
          white-space: nowrap;
        }
        .order-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #fbfdff;
          padding: 6px 8px;
        }
        .order-row__main {
          min-width: 0;
          display: grid;
          gap: 1px;
        }
        .order-row__ref {
          color: #0038a8;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.15;
        }
        .order-row__name {
          color: #0f172a;
          font-size: 8.5px;
          font-weight: 600;
          line-height: 1.2;
          word-break: break-word;
        }
        .order-row__meta {
          color: #667085;
          font-size: 8px;
          line-height: 1.2;
        }
        .order-row__amount {
          text-align: right;
          color: #0038a8;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }
        .order-row__amount small {
          display: block;
          margin-top: 1px;
          color: #667085;
          font-size: 8px;
          font-weight: 400;
        }
        .footer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
          margin-top: 6px;
          font-size: 8px;
          color: #475569;
          align-items: end;
        }
        .notes {
          margin: 0;
          line-height: 1.35;
        }
        .foot-meta {
          display: grid;
          gap: 2px;
          justify-items: end;
          text-align: right;
        }
        .foot-meta strong {
          color: #0f172a;
          font-size: 8.5px;
          font-weight: 700;
        }
      </style>
      ${autoPrint ? `<script>
        window.addEventListener('load', function () {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 120);
        });
        window.addEventListener('afterprint', function () {
          window.close();
        });
      </script>` : ''}
    </head>
    <body>
      <article class="sheet">
        <header class="header">
          <img class="header__icon" src="${escapeHtml(iconSrc)}" alt="USIS" />
          <div class="header__brand">
            <div class="header__brand-row">
              <h1 class="title">${escapeHtml(printTitleLineOne)}</h1>
            </div>
            <p class="subtitle">${escapeHtml(printTitleLineTwo)}</p>
          </div>
        </header>
        <div class="body">
          <section class="panel">
            <h2 class="panel__title">Payment Details</h2>
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Learner</span>
                <span class="meta-value">${escapeHtml(payload.learnerName)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">LRN</span>
                <span class="meta-value">${escapeHtml(payload.learnerLrn)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Grade and Section</span>
                <span class="meta-value">${escapeHtml(gradeSection || '-')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Reference No.</span>
                <span class="meta-value">${escapeHtml(payload.referenceNo || '-')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Transaction No.</span>
                <span class="meta-value">${escapeHtml(payload.transactionNo || receiptNo || '-')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date Posted</span>
                <span class="meta-value">${escapeHtml(formatDateTime(payload.paidAt) || generatedOn)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Posted By</span>
                <span class="meta-value">${escapeHtml(postedBy)}</span>
              </div>
            </div>
            <div class="summary">
              <div class="summary__item">
                <div class="summary__label">Amount Paid</div>
                <div class="summary__value">PHP ${money(payload.paymentAmount)}</div>
              </div>
              <div class="summary__item">
                <div class="summary__label">Balance</div>
                <div class="summary__value">PHP ${money(balanceAfter)}</div>
              </div>
              <div class="summary__item">
                <div class="summary__label">Outstanding</div>
                <div class="summary__value">PHP ${money(outstanding)}</div>
              </div>
            </div>
          </section>
          <section class="panel">
            <h2 class="panel__title">${payload.variant === 'consolidated' ? 'Order List' : 'Order Snapshot'}</h2>
            <div class="orders">
              ${rows
                .map(
                  (row) => `
                    <div class="order-row">
                      <div class="order-row__main">
                        <div class="order-row__ref">${escapeHtml(row.referenceNo || payload.referenceNo || '-')}</div>
                        <div class="order-row__name">${escapeHtml(row.productName || payload.productName || '-')}</div>
                        <div class="order-row__meta">${escapeHtml(row.label || '')}</div>
                      </div>
                      <div class="order-row__amount">
                        PHP ${money(Number((row.amount ?? payload.paymentAmount) || 0))}
                        <small>Outstanding: PHP ${money(Number(row.outstandingBalance ?? outstanding))}</small>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </section>
        </div>
        <section class="panel history-panel">
          <h2 class="panel__title">Payment History</h2>
          <table class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference No.</th>
                <th>Transaction No.</th>
                <th>Posted By</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                paymentHistoryRows.length > 0
                  ? paymentHistoryRows
                      .map(
                        (row) => `
                          <tr>
                            <td>${escapeHtml(formatShortDateTime(row.date))}</td>
                            <td>${escapeHtml(row.referenceNo || '-')}</td>
                            <td>${escapeHtml(row.transactionNo || '-')}</td>
                            <td>${escapeHtml(row.postedBy || 'Unknown Actor')}</td>
                            <td>PHP ${money(Number(row.amount || 0))}</td>
                          </tr>
                        `,
                      )
                      .join('')
                  : '<tr><td colspan="5">No payment history recorded.</td></tr>'
              }
            </tbody>
          </table>
        </section>
        <footer class="footer">
          <p class="notes">${escapeHtml(payload.paymentNotes || 'No remarks recorded.')}</p>
          <div class="foot-meta">
            <strong>Posted By: ${escapeHtml(payload.postedBy || 'Unknown Actor')}</strong>
            <span>Generated on ${escapeHtml(generatedOn)}</span>
          </div>
        </footer>
      </article>
    </body>
  </html>`;
};

const pdfEscape = (value: string) => escapePdfText(value).replace(/[\r\n]+/g, ' ');

const getPdfLines = (text: string, maxChars: number) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const buildPdfBytes = (payload: MerchPaymentReceiptPayload) => {
  const width = 595.28;
  const height = 419.53;
  const margin = 18;
  const contentWidth = width - margin * 2;
  const schoolName = normalizeText(payload.schoolName || 'LEON NATIONAL HIGH SCHOOL', 'LEON NATIONAL HIGH SCHOOL');
  const gradeSection = normalizeText(payload.gradeSection || '');
  const outstanding = getDerivedOutstanding(payload);
  const balanceAfter = getDerivedBalanceAfter(payload);
  const receiptNo = normalizeText(payload.receiptNo || '');
  const sourceLabel = normalizeText(payload.sourceLabel || 'Merch Service');
  const postedBy = normalizeText(payload.postedBy || 'Unknown Actor');
  const generatedOn = new Date().toLocaleString();
  const title = 'LEON NATIONAL HIGH SCHOOL';
  const subtitle = 'Only the Best Merchandise';
  const statusLabel = formatStatusLabel(payload.paymentStatus || 'posted').toUpperCase();
  const notes = String(payload.paymentNotes || 'No remarks recorded.').trim();
  const paymentHistoryRows = Array.isArray(payload.paymentHistoryRows) ? payload.paymentHistoryRows : [];
  const rows =
    payload.variant === 'consolidated' && Array.isArray(payload.orderLines) && payload.orderLines.length > 0
      ? payload.orderLines
      : [
          {
            amount: payload.orderAmount ?? payload.paymentAmount,
            outstandingBalance: outstanding,
            productName: payload.productName,
            referenceNo: payload.referenceNo,
          },
        ];

  const lines: string[] = [];
  const add = (line: string) => lines.push(line);
  const text = (x: number, y: number, size: number, value: string, options?: { bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }) => {
    const escaped = pdfEscape(value);
    const font = options?.bold ? '/F2' : '/F1';
    const color = options?.color || [15, 23, 42];
    add(`BT ${font} ${size} Tf ${color[0] / 255} ${color[1] / 255} ${color[2] / 255} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escaped}) Tj ET`);
  };
  const rect = (x: number, y: number, w: number, h: number, fill: [number, number, number], stroke: [number, number, number], r = 10) => {
    const k = 0.5522847498 * r;
    const right = x + w;
    const top = y + h;
    add('q');
    add(`${fill[0] / 255} ${fill[1] / 255} ${fill[2] / 255} rg`);
    add(`${stroke[0] / 255} ${stroke[1] / 255} ${stroke[2] / 255} RG`);
    add(`${x + r} ${y} m`);
    add(`${right - r} ${y} l`);
    add(`${right - r + k} ${y} ${right} ${y + r - k} ${right} ${y + r} c`);
    add(`${right} ${top - r} l`);
    add(`${right} ${top - r + k} ${right - r + k} ${top} ${right - r} ${top} c`);
    add(`${x + r} ${top} l`);
    add(`${x + r - k} ${top} ${x} ${top - r + k} ${x} ${top - r} c`);
    add(`${x} ${y + r} l`);
    add(`${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y} c`);
    add('h');
    add('B');
    add('Q');
  };

  // Header and summary blocks
  rect(margin, height - margin - 62, contentWidth, 62, [248, 250, 255], [215, 224, 239], 10);
  text(margin + 18, height - margin - 22, 16, title, { bold: true, color: [0, 56, 168] });
  text(margin + 18, height - margin - 34, 9.5, subtitle, { bold: true, color: [0, 56, 168] });
  text(margin + 18, height - margin - 46, 9, `${sourceLabel} receipt`, { color: [71, 85, 105] });
  text(width - margin - 82, height - margin - 22, 11, statusLabel, { bold: true, color: [24, 73, 143] });

  // Summary cards
  const cardY = height - margin - 126;
  const cardW = (contentWidth - 16) / 3;
  const cards = [
    { label: 'Amount Paid', value: `PHP ${money(payload.paymentAmount)}` },
    { label: 'Order Amount', value: `PHP ${money(payload.orderAmount || 0)}` },
    { label: 'Balance After Payment', value: `PHP ${money(balanceAfter)}` },
  ];
  cards.forEach((card, index) => {
    const x = margin + index * (cardW + 8);
    rect(x, cardY, cardW, 42, [248, 251, 255], [216, 224, 239], 10);
    text(x + 10, cardY + 27, 9, card.label, { bold: true, color: [102, 112, 133] });
    text(x + 10, cardY + 12, 12, card.value, { bold: true, color: [0, 56, 168] });
  });

  // Middle panels
  const bodyTop = height - margin - 252;
  const bodyHeight = 118;
  const panelGap = 6;
  const panelWidth = (contentWidth - panelGap) / 2;
  const leftPanelX = margin;
  const rightPanelX = margin + panelWidth + panelGap;
  const headerHeight = 18;
  rect(leftPanelX, bodyTop, panelWidth, bodyHeight, [255, 255, 255], [215, 224, 239], 10);
  rect(leftPanelX, bodyTop + bodyHeight - headerHeight, panelWidth, headerHeight, [247, 250, 255], [215, 224, 239], 10);
  text(leftPanelX + 10, bodyTop + bodyHeight - 6, 10, 'Payment Details', { bold: true, color: [0, 56, 168] });

  rect(rightPanelX, bodyTop, panelWidth, bodyHeight, [255, 255, 255], [215, 224, 239], 10);
  rect(rightPanelX, bodyTop + bodyHeight - headerHeight, panelWidth, headerHeight, [247, 250, 255], [215, 224, 239], 10);
  text(rightPanelX + 10, bodyTop + bodyHeight - 6, 10, payload.variant === 'consolidated' ? 'Order List' : 'Order Snapshot', { bold: true, color: [0, 56, 168] });

  const infoFields = [
    ['Learner', payload.learnerName],
    ['LRN', payload.learnerLrn],
    ['Grade and Section', gradeSection || '-'],
    ['Reference No.', payload.referenceNo || '-'],
    ['Transaction No.', payload.transactionNo || receiptNo || '-'],
    ['Date Posted', formatDateTime(payload.paidAt) || generatedOn],
  ];
  const leftInnerTop = bodyTop + bodyHeight - headerHeight - 14;
  const leftColumnWidth = (panelWidth - 24) / 2;
  infoFields.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = leftPanelX + 10 + col * leftColumnWidth;
    const yy = leftInnerTop - row * 30;
    text(x, yy, 8.2, label, { bold: true, color: [100, 116, 139] });
    text(x, yy - 10, 9.8, value || '-', { bold: true, color: [17, 24, 39] });
  });
  text(leftPanelX + 10, bodyTop + 8, 8.5, `Posted By: ${postedBy}`, { bold: true, color: [24, 73, 143] });

  const orderRows = rows.slice(0, 3);
  if (orderRows.length > 0) {
    orderRows.forEach((row, index) => {
      const rowTop = bodyTop + bodyHeight - headerHeight - 16 - index * 28;
      rect(rightPanelX + 8, rowTop - 20, panelWidth - 16, 24, [251, 253, 255], [230, 236, 246], 6);
      text(rightPanelX + 14, rowTop, 8.6, row.referenceNo || payload.referenceNo || '-', { bold: true, color: [0, 56, 168] });
      text(rightPanelX + 14, rowTop - 10, 8.1, row.productName || payload.productName || '-', { bold: true, color: [17, 24, 39] });
      text(rightPanelX + panelWidth - 92, rowTop, 8.6, `PHP ${money(Number((row.amount ?? payload.paymentAmount) || 0))}`, { bold: true, color: [0, 56, 168] });
      text(rightPanelX + panelWidth - 92, rowTop - 10, 7.5, `Outstanding: PHP ${money(Number(row.outstandingBalance ?? outstanding))}`, { color: [100, 116, 139] });
    });
  } else {
    text(rightPanelX + 10, bodyTop + 46, 10, 'No order details available.', { color: [51, 65, 85] });
  }

  // Payment history
  const notesY = 52;
  rect(margin, notesY, contentWidth, 72, [255, 255, 255], [215, 224, 239], 10);
  text(margin + 10, notesY + 56, 10, 'Payment History', { bold: true, color: [0, 56, 168] });
  const compactHistoryRows = paymentHistoryRows.slice(0, 3);
  if (compactHistoryRows.length > 0) {
    text(margin + 10, notesY + 44, 7.2, 'Date', { bold: true, color: [100, 116, 139] });
    text(margin + 86, notesY + 44, 7.2, 'Reference No.', { bold: true, color: [100, 116, 139] });
    text(margin + 160, notesY + 44, 7.2, 'Transaction No.', { bold: true, color: [100, 116, 139] });
    text(margin + 254, notesY + 44, 7.2, 'Posted By', { bold: true, color: [100, 116, 139] });
    text(margin + 340, notesY + 44, 7.2, 'Amount', { bold: true, color: [100, 116, 139] });
    compactHistoryRows.forEach((row, index) => {
      const rowY = notesY + 32 - index * 12;
      text(margin + 10, rowY, 7.2, formatShortDateTime(row.date), { color: [17, 24, 39] });
      text(margin + 86, rowY, 7.2, row.referenceNo || '-', { color: [17, 24, 39] });
      text(margin + 160, rowY, 7.2, row.transactionNo || '-', { color: [17, 24, 39] });
      text(margin + 254, rowY, 7.2, row.postedBy || 'Unknown Actor', { color: [17, 24, 39] });
      text(margin + 340, rowY, 7.2, `PHP ${money(Number(row.amount || 0))}`, { bold: true, color: [0, 56, 168] });
    });
  } else {
    text(margin + 10, notesY + 34, 10, 'No payment history recorded.', { color: [51, 65, 85] });
  }

  const footerY = 18;
  const footerNotes = getPdfLines(notes || 'No remarks recorded.', 68).slice(0, 2);
  text(margin + 10, footerY + 32, 8.2, footerNotes[0] || 'No remarks recorded.', { color: [71, 85, 105] });
  if (footerNotes[1]) {
    text(margin + 10, footerY + 22, 8.2, footerNotes[1], { color: [71, 85, 105] });
  }
  text(width - margin - 170, footerY + 32, 10, 'Outstanding Balance', { bold: true, color: [71, 85, 105] });
  text(width - margin - 170, footerY + 20, 12, `PHP ${money(outstanding)}`, { bold: true, color: [0, 56, 168] });
  text(width - margin - 170, footerY + 8, 8.5, `Generated on ${generatedOn}`, { color: [100, 116, 139] });

  const content = lines.join('\n');
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);

  const objects: string[] = [];
  const pushObj = (body: string | Uint8Array) => {
    if (typeof body === 'string') {
      objects.push(body);
    } else {
      objects.push(new TextDecoder().decode(body));
    }
  };

  pushObj('<< /Type /Catalog /Pages 2 0 R >>');
  pushObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  pushObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`);
  pushObj(`<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`);
  pushObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pushObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const parts: string[] = ['%PDF-1.4\n'];
  const offsets: number[] = [0];
  let position = parts[0].length;

  objects.forEach((body, index) => {
    const objectNo = index + 1;
    const objectText = `${objectNo} 0 obj\n${body}\nendobj\n`;
    offsets.push(position);
    parts.push(objectText);
    position += objectText.length;
  });

  const xrefStart = position;
  const xrefLines = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
  }
  const trailer = [
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefStart),
    '%%EOF',
  ].join('\n');

  const pdfText = `${parts.join('')}${xrefLines.join('\n')}\n${trailer}`;
  return new TextEncoder().encode(pdfText);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const openMerchPaymentReceiptPrintWindow = (payload: MerchPaymentReceiptPayload, options: PrintReceiptOptions = {}) => {
  if (typeof window === 'undefined') return false;
  const printWindow = window.open('about:blank', '_blank', 'width=1240,height=920');
  if (!printWindow) return false;

  const html = buildPrintHtml(payload, {
    ...options,
    autoPrint: true,
    orientation: 'landscape',
    pageSize: 'A4',
  });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  if (options.closeOnAfterPrint !== false) {
    const closeSafe = () => {
      try {
        printWindow.close();
      } catch {
        // ignore window close failures
      }
    };
    printWindow.onafterprint = closeSafe;
    const mediaQueryList = printWindow.matchMedia?.('print');
    mediaQueryList?.addEventListener?.('change', (event) => {
      if (!event.matches) closeSafe();
    });
  }

  return true;
};

export const downloadMerchPaymentReceiptPdf = async (payload: MerchPaymentReceiptPayload) => {
  if (typeof window === 'undefined') return false;
  const html2canvas = (window as any).html2canvas;
  const jsPDF = (window as any).jspdf?.jsPDF;
  const receiptFile = `USIS_Merch_Receipt_${sanitizeFilePart(payload.referenceNo || payload.transactionNo || payload.receiptNo || payload.learnerName)}.pdf`;

  if (typeof html2canvas !== 'function' || typeof jsPDF !== 'function') {
    const bytes = buildPdfBytes(payload);
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), receiptFile);
    return true;
  }

  const iconSrc = await resolveReceiptIconSrc();
  const html = buildPrintHtml(payload, { pageSize: 'A5', orientation: 'landscape', autoPrint: false, iconSrc });
  await new Promise((resolve) => window.setTimeout(resolve, 300));

  const renderHost = document.createElement('div');
  renderHost.setAttribute('aria-hidden', 'true');
  renderHost.style.position = 'fixed';
  renderHost.style.left = '-100000px';
  renderHost.style.top = '0';
  renderHost.style.width = '1123px';
  renderHost.style.height = '794px';
  renderHost.style.overflow = 'hidden';
  renderHost.style.background = '#ffffff';
  renderHost.style.pointerEvents = 'none';
  renderHost.style.zIndex = '-1';
  const renderFrame = document.createElement('iframe');
  renderFrame.setAttribute('aria-hidden', 'true');
  renderFrame.tabIndex = -1;
  renderFrame.style.display = 'block';
  renderFrame.style.width = '1123px';
  renderFrame.style.height = '794px';
  renderFrame.style.border = '0';
  renderHost.appendChild(renderFrame);
  document.body.appendChild(renderHost);

  const renderDoc = renderFrame.contentDocument;
  if (!renderDoc) {
    renderHost.remove();
    const bytes = buildPdfBytes(payload);
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), receiptFile);
    return true;
  }

  try {
    renderDoc.open();
    renderDoc.write(html);
    renderDoc.close();

    await new Promise((resolve) => window.setTimeout(resolve, 350));
    await (renderDoc.fonts?.ready || Promise.resolve());
    await Promise.all(
      Array.from(renderDoc.images || []).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    );

    const renderTarget = renderDoc.querySelector('.sheet') as HTMLElement | null;
    if (!renderTarget) {
      const bytes = buildPdfBytes(payload);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), receiptFile);
      return true;
    }

    const canvas = await html2canvas(renderTarget, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      width: renderTarget.scrollWidth,
      height: renderTarget.scrollHeight,
      windowWidth: renderTarget.scrollWidth,
      windowHeight: renderTarget.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginMm = 3;
    const contentWidth = pageWidth - marginMm * 2;
    const contentHeight = pageHeight - marginMm * 2;
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    const scale = Math.min(contentWidth / imageWidth, contentHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const offsetX = (pageWidth - drawWidth) / 2;
    const offsetY = (pageHeight - drawHeight) / 2;
    const imageData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imageData, 'PNG', offsetX, offsetY, drawWidth, drawHeight, undefined, 'FAST');
    pdf.save(receiptFile);
    return true;
  } finally {
    renderHost.remove();
  }
};

export const buildMerchReceiptPreviewTitle = (payload: MerchPaymentReceiptPayload) =>
  `${normalizeText(payload.referenceNo || payload.transactionNo || payload.receiptNo || payload.learnerName)}`;

export const buildMerchPaymentReceiptPreviewHtml = (payload: MerchPaymentReceiptPayload, iconSrc?: string) =>
  buildPrintHtml(payload, { pageSize: 'A5', orientation: 'landscape', autoPrint: false, iconSrc });
