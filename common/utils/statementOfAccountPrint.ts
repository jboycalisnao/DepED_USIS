export type SoaFeeRow = {
  name: string;
  assessed: number;
  paid: number;
  balance: number;
};

export type SoaPaymentHistoryRow = {
  date: string;
  referenceNo: string;
  particulars: string;
  amount: number;
};

export type SoaPrintPayload = {
  learnerName: string;
  lrn: string;
  gradeSection: string;
  parentOrGuardian: string;
  schoolName: string;
  schoolYear: string;
  issuedBy?: string;
  generatedOn?: string;
  feeRows: SoaFeeRow[];
  paymentHistoryRows: SoaPaymentHistoryRow[];
  watermarkText?: string;
};

const DEPED_SEAL_SRC = new URL('../assets/USIS_Icon.png', import.meta.url).href;
const PTA_LOGO_SRC = new URL('../assets/PTA LOGO.png', import.meta.url).href;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (amount: number) => amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildPrintHtml = (payload: SoaPrintPayload) => {
  const generatedOn = payload.generatedOn || new Date().toLocaleString();
  const totalAssessed = payload.feeRows.reduce((sum, row) => sum + row.assessed, 0);
  const totalPaid = payload.feeRows.reduce((sum, row) => sum + row.paid, 0);
  const totalBalance = payload.feeRows.reduce((sum, row) => sum + row.balance, 0);
  const watermark = (payload.watermarkText || '').trim();

  const feeRowsHtml =
    payload.feeRows.length === 0
      ? '<tr><td colspan="4" class="empty-row">No applicable fee schedule configured.</td></tr>'
      : payload.feeRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.name)}</td>
                <td class="num">PHP ${money(row.assessed)}</td>
                <td class="num">PHP ${money(row.paid)}</td>
                <td class="num">PHP ${money(row.balance)}</td>
              </tr>
            `,
          )
          .join('');

  const paymentHistoryRowsHtml =
    payload.paymentHistoryRows.length === 0
      ? '<tr><td colspan="4" class="empty-row">No payment history recorded.</td></tr>'
      : payload.paymentHistoryRows
          .map(
            (tx) => `
              <tr>
                <td>${escapeHtml(tx.date || '')}</td>
                <td>${escapeHtml(tx.referenceNo || '-')}</td>
                <td>${escapeHtml(tx.particulars || '-')}</td>
                <td class="num">PHP ${money(Number(tx.amount || 0))}</td>
              </tr>
            `,
          )
          .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>SPTA Statement of Account</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111; background: #fff; }
          .sheet { width: 100%; min-height: calc(297mm - 20mm); position: relative; }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-28deg);
            font-size: 86px;
            font-weight: 700;
            color: rgba(15, 23, 42, 0.07);
            letter-spacing: 2px;
            white-space: nowrap;
            text-transform: uppercase;
            pointer-events: none;
            z-index: 0;
          }
          .layer { position: relative; z-index: 1; }
          .meta-header { width: 100%; border-collapse: collapse; }
          .meta-header td { border: 1px solid #111; padding: 0; }
          .logo-cell { width: 130px; min-width: 130px; }
          .logo-wrap { display: grid; grid-template-columns: 1fr 1fr; align-items: center; justify-items: center; gap: 4px; padding: 6px; }
          .logo-wrap img { width: 52px; height: 52px; object-fit: contain; }
          .title-cell { text-align: center; font-family: "Bookman Old Style", "Book Antiqua", serif; }
          .title-main { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; padding-top: 6px; line-height: 1.2; }
          .title-sub { font-size: 10px; font-weight: 500; line-height: 1.2; padding-bottom: 6px; border-bottom: 1px solid #111; }
          .title-doc { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; padding: 8px 6px; line-height: 1.2; }
          .docs-cell { width: 350px; min-width: 350px; }
          .docs-table { width: 100%; border-collapse: collapse; font-family: "Bookman Old Style", "Book Antiqua", serif; }
          .docs-table td { border: 1px solid #111; font-size: 10px; padding: 3px 8px; text-align: center; white-space: nowrap; }
          .docs-table td:first-child { width: 60%; font-weight: 400; }
          .docs-table td:last-child { font-weight: 700; }
          .content { margin-top: 10px; border: 1px solid #111; padding: 10px; }
          .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .meta-grid td { border: 1px solid #111; padding: 4px 6px; font-size: 11px; vertical-align: top; }
          .meta-grid .label { display: block; font-size: 11px; color: #334155; margin-bottom: 3px; font-weight: 600; text-transform: uppercase; }
          .meta-grid .value { font-size: 11px; font-weight: 700; color: #0f172a; }
          .fees { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .fees th, .fees td { border: 1px solid #111; padding: 4px 6px; font-size: 10px; line-height: 1.15; }
          .fees th { text-align: left; font-weight: 700; }
          .fees .num { text-align: right; white-space: nowrap; }
          .fees .empty-row { text-align: center; font-style: italic; color: #475569; }
          .totals { margin-top: 10px; width: 100%; border-collapse: collapse; }
          .totals td { border: 1px solid #111; padding: 5px 6px; font-size: 10px; }
          .totals .ttl-label { font-weight: 700; text-transform: uppercase; }
          .totals .ttl-val { text-align: right; font-weight: 700; white-space: nowrap; }
          .totals .balance { font-size: 11px; }
          .history-title { margin: 8px 0 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .history { width: 100%; border-collapse: collapse; }
          .history th, .history td { border: 1px solid #111; padding: 4px 6px; font-size: 9px; line-height: 1.15; vertical-align: top; }
          .history th { text-align: left; font-weight: 700; }
          .history .num { text-align: right; white-space: nowrap; }
          .history td:nth-child(3) { word-break: break-word; }
          .footer-note { margin-top: 8px; font-size: 10px; color: #334155; }
        </style>
      </head>
      <body>
        ${watermark ? `<div class="watermark">${escapeHtml(watermark)}</div>` : ''}
        <article class="sheet layer">
          <table class="meta-header">
            <tr>
              <td class="logo-cell">
                <div class="logo-wrap">
                  <img src="${DEPED_SEAL_SRC}" alt="DepEd Seal" onerror="this.style.display='none';" />
                  <img src="${PTA_LOGO_SRC}" alt="PTA Logo" onerror="this.style.display='none';" />
                </div>
              </td>
              <td class="title-cell">
                <div class="title-main">${escapeHtml((payload.schoolName || 'LEON NATIONAL HIGH SCHOOL').toUpperCase())}</div>
                <div class="title-sub">PARENT-TEACHERS ASSOCIATION</div>
                <div class="title-doc">STATEMENT OF ACCOUNT</div>
              </td>
              <td class="docs-cell">
                <table class="docs-table">
                  <tr><td>Document No.</td><td>LNHS-PTA-SOA-F01</td></tr>
                  <tr><td>Issue No.</td><td>1</td></tr>
                  <tr><td>Revision No.</td><td>1</td></tr>
                  <tr><td>Date of Effectivity</td><td>June 8, 2026</td></tr>
                  <tr><td>Issued by</td><td>${escapeHtml(payload.issuedBy || 'SPTA')}</td></tr>
                  <tr><td>Page No.</td><td>Page 1 of 1</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <section class="content">
            <table class="meta-grid">
              <tr>
                <td><span class="label">Learner Name</span><span class="value">${escapeHtml(payload.learnerName)}</span></td>
                <td><span class="label">LRN</span><span class="value">${escapeHtml(payload.lrn)}</span></td>
                <td><span class="label">Grade and Section</span><span class="value">${escapeHtml(payload.gradeSection)}</span></td>
              </tr>
              <tr>
                <td><span class="label">Parent or Guardian</span><span class="value">${escapeHtml(payload.parentOrGuardian || 'N/A')}</span></td>
                <td><span class="label">School Year</span><span class="value">${escapeHtml(payload.schoolYear || 'N/A')}</span></td>
                <td><span class="label">Generated On</span><span class="value">${escapeHtml(generatedOn)}</span></td>
              </tr>
            </table>

            <table class="fees">
              <thead>
                <tr>
                  <th>Fee Description</th>
                  <th class="num">Assessed Amount</th>
                  <th class="num">Total Paid</th>
                  <th class="num">Balance</th>
                </tr>
              </thead>
              <tbody>${feeRowsHtml}</tbody>
            </table>

            <table class="totals">
              <tr>
                <td class="ttl-label">Total Assessed</td>
                <td class="ttl-val">PHP ${money(totalAssessed)}</td>
                <td class="ttl-label">Total Paid</td>
                <td class="ttl-val">PHP ${money(totalPaid)}</td>
              </tr>
              <tr>
                <td colspan="3" class="ttl-label balance">Outstanding Balance</td>
                <td class="ttl-val balance">PHP ${money(totalBalance)}</td>
              </tr>
            </table>

            <p class="history-title">Payment History</p>
            <table class="history">
              <thead>
                <tr>
                  <th style="width: 18%;">Date</th>
                  <th style="width: 20%;">Reference No.</th>
                  <th>Particulars</th>
                  <th style="width: 20%;" class="num">Amount Paid</th>
                </tr>
              </thead>
              <tbody>${paymentHistoryRowsHtml}</tbody>
            </table>
          </section>
          <p class="footer-note">This document is system-generated by the SPTA Portal.</p>
        </article>
      </body>
    </html>
  `;
};

export const openSoaPrintWindow = (payload: SoaPrintPayload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1240,height=920');
  if (!printWindow) return false;

  const html = buildPrintHtml(payload);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const closeWindow = () => {
    if (!printWindow.closed) printWindow.close();
  };

  printWindow.onafterprint = closeWindow;
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return true;
};
