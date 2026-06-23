import type { MerchOrderControlRecord } from '../../services/merchOrderControlService';
import {
  MERCH_ORDER_STATUS_OPTIONS,
  getMerchOrderStatusLabel,
  normalizeMerchOrderStatus,
  tryNormalizeMerchOrderStatus,
} from './orderStatus';

type MerchOrderWorkbookGroup = {
  gradeLevel: string;
  rows: MerchOrderControlRecord[];
};

export type MerchOrderStatusWorkbookPatch = {
  orderId: string;
  orderStatus: string;
  referenceNo: string;
};

export type MerchOrderWorkbookIssue = {
  message: string;
  rowNumber: number;
  severity: 'warning' | 'error';
  sheetName: string;
};

export type MerchOrderWorkbookReview = {
  changedCount: number;
  fileName: string;
  issueCount: number;
  issues: MerchOrderWorkbookIssue[];
  patches: MerchOrderStatusWorkbookPatch[];
  skippedCount: number;
  totalCount: number;
};

const STATUS_STYLE_MAP: Record<string, { fill: string; font: string }> = {
  pending: { fill: 'FFFCEFC7', font: 'FF7A5B00' },
  confirmed: { fill: 'FFDDEBFF', font: 'FF18498F' },
  released: { fill: 'FFDFF5E4', font: 'FF0B6B3A' },
  refund: { fill: 'FFFEE4E2', font: 'FFB42318' },
};

const sanitizeFilePart = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Merch_Orders';

const sanitizeWorksheetName = (value: string) =>
  String(value || 'Merch Orders')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Merch Orders';

const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

const formatDateTime = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
};

const getStatusStyle = (status: string) => STATUS_STYLE_MAP[normalizeMerchOrderStatus(status)] || STATUS_STYLE_MAP.pending;

const getWorkbookStatusLabel = (status: string) => getMerchOrderStatusLabel(status);

const getWorkbookRowKey = (orderId: string, referenceNo: string) => orderId || referenceNo;

const buildGradeGroups = (records: MerchOrderControlRecord[]) => {
  const map = new Map<string, MerchOrderWorkbookGroup>();
  records.forEach((record) => {
    const key = String(record.gradeLevel || 'Unassigned').trim() || 'Unassigned';
    const current = map.get(key);
    if (current) {
      current.rows.push(record);
      return;
    }
    map.set(key, {
      gradeLevel: key,
      rows: [record],
    });
  });

  return Array.from(map.values()).sort((left, right) => {
    const gradeDiff = parseGradeSortValue(left.gradeLevel) - parseGradeSortValue(right.gradeLevel);
    if (gradeDiff !== 0) return gradeDiff;
    return left.gradeLevel.localeCompare(right.gradeLevel, undefined, { numeric: true });
  });
};

const addSectionHeader = (sheet: any, rowNumber: number, text: string, columnCount: number) => {
  sheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
  const row = sheet.getRow(rowNumber);
  row.height = 20;
  row.getCell(1).value = text;
  row.getCell(1).font = { bold: true, color: { argb: 'FF0038A8' } };
  row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2FF' } };
  row.getCell(1).border = {
    top: { style: 'thin', color: { argb: 'FFB9C9EA' } },
    left: { style: 'thin', color: { argb: 'FFB9C9EA' } },
    bottom: { style: 'thin', color: { argb: 'FFB9C9EA' } },
    right: { style: 'thin', color: { argb: 'FFB9C9EA' } },
  };
};

const styleStatusCell = (cell: any, status: string) => {
  const style = getStatusStyle(status);
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
  cell.font = { bold: true, color: { argb: style.font } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
  };
  cell.dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: [`"${MERCH_ORDER_STATUS_OPTIONS.map((status) => getWorkbookStatusLabel(status)).join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Invalid status',
    error: 'Choose a status from the dropdown list.',
  };
};

const applyStatusConditionalFormatting = (sheet: any, rowNumber: number) => {
  sheet.addConditionalFormatting({
    ref: `A${rowNumber}:L${rowNumber}`,
    rules: MERCH_ORDER_STATUS_OPTIONS.map((status) => {
      const style = getStatusStyle(status);
      return {
        type: 'expression',
        formulae: [`$K${rowNumber}="${getWorkbookStatusLabel(status)}"`],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } },
          font: { color: { argb: style.font } },
        },
      };
    }),
  });
};

export const downloadMerchOrdersWorkbook = async (records: MerchOrderControlRecord[], workbookLabel = 'Merch Orders') => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'DepED USIS';
  workbook.created = new Date();

  const groups = buildGradeGroups(records);
  groups.forEach((group) => {
    const sheet = workbook.addWorksheet(sanitizeWorksheetName(group.gradeLevel));
    const columns = [
      { header: 'Order ID', key: 'orderId', width: 36 },
      { header: 'Reference No.', key: 'referenceNo', width: 16 },
      { header: 'Date', key: 'createdAt', width: 22 },
      { header: 'Learner', key: 'learnerName', width: 30 },
      { header: 'LRN', key: 'learnerLrn', width: 18 },
      { header: 'Product', key: 'productName', width: 24 },
      { header: 'Period', key: 'orderPeriodLabel', width: 18 },
      { header: 'Qty', key: 'quantity', width: 8 },
      { header: 'Size', key: 'selectedSize', width: 12 },
      { header: 'Section', key: 'sectionName', width: 20 },
      { header: 'Status', key: 'orderStatus', width: 14 },
      { header: 'Source', key: 'orderSource', width: 16 },
    ];

    sheet.columns = columns;
    sheet.getColumn(1).hidden = true;
    sheet.views = [{ state: 'frozen', ySplit: 5 }];

    const colCount = columns.length;
    sheet.mergeCells(1, 1, 1, colCount);
    sheet.getCell(1, 1).value = `Merch Orders - ${group.gradeLevel}`;
    sheet.getCell(1, 1).font = { bold: true, size: 14 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(2, 1, 2, colCount);
    sheet.getCell(2, 1).value = `Workbook: ${workbookLabel || '-'}`;
    sheet.getCell(2, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell(2, 1).font = { italic: true };

    sheet.mergeCells(3, 1, 3, colCount);
    sheet.getCell(3, 1).value = 'Edit the Status column only, then upload this workbook to sync changes back to the system.';
    sheet.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    sheet.mergeCells(4, 1, 4, colCount);
    sheet.getCell(4, 1).value = `Total Orders: ${group.rows.length}`;
    sheet.getCell(4, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRow = sheet.getRow(5);
    headerRow.values = columns.map((column) => column.header);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0038A8' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF111111' } },
        left: { style: 'thin', color: { argb: 'FF111111' } },
        bottom: { style: 'thin', color: { argb: 'FF111111' } },
        right: { style: 'thin', color: { argb: 'FF111111' } },
      };
      if (colNumber === 1) {
        cell.value = 'Order ID';
      }
    });

    const sectionMap = new Map<string, MerchOrderControlRecord[]>();
    group.rows.forEach((row) => {
      const key = String(row.sectionName || 'Unassigned').trim() || 'Unassigned';
      const current = sectionMap.get(key);
      if (current) {
        current.push(row);
        return;
      }
      sectionMap.set(key, [row]);
    });

    let currentRow = 6;
    Array.from(sectionMap.entries())
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .forEach(([sectionName, sectionRows]) => {
        addSectionHeader(sheet, currentRow, `Section: ${sectionName}`, colCount);
        currentRow += 1;

        sectionRows.forEach((row) => {
          const normalizedStatus = normalizeMerchOrderStatus(row.orderStatus);
          const excelRow = sheet.getRow(currentRow);
          excelRow.values = [
            row.id,
            row.referenceNo,
            formatDateTime(row.createdAt),
            row.learnerName || '-',
            row.learnerLrn || '-',
            row.productName || '-',
            row.orderPeriodLabel || '-',
            row.quantity,
            row.selectedSize || '-',
            row.sectionName || '-',
            getWorkbookStatusLabel(normalizedStatus),
            row.orderSource === 'integrated_admin'
              ? 'IA Override'
              : row.orderSource === 'learner_portal'
                ? 'Learner Portal'
                : 'Unknown',
          ];
          excelRow.height = 20;
          excelRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
              left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
              bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
              right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
            const style = getStatusStyle(normalizedStatus);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
            if (colNumber === 11) {
              styleStatusCell(cell, normalizedStatus);
            }
          });
          applyStatusConditionalFormatting(sheet, currentRow);
          currentRow += 1;
        });
      });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `USIS_Merch_Orders_${sanitizeFilePart(workbookLabel)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

type MerchOrderWorkbookRow = {
  normalizedStatus: string;
  orderId: string;
  rawStatus: string;
  referenceNo: string;
  rowNumber: number;
  sheetName: string;
  isSectionDivider: boolean;
};

const readMerchOrdersWorkbookRows = async (file: File): Promise<MerchOrderWorkbookRow[]> => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const rows: MerchOrderWorkbookRow[] = [];

  workbook.worksheets.forEach((sheet) => {
    for (let rowIndex = 6; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const row = sheet.getRow(rowIndex);
      const orderId = String(row.getCell(1).value || '').trim();
      const referenceNo = String(row.getCell(2).value || '').trim();
      const rawStatus = String(row.getCell(11).value || '').trim();
      const isSectionDivider = orderId.toLowerCase().startsWith('section:');
      if (isSectionDivider) {
        continue;
      }
      rows.push({
        normalizedStatus: tryNormalizeMerchOrderStatus(rawStatus).normalized,
        orderId,
        rawStatus,
        referenceNo,
        rowNumber: rowIndex,
        sheetName: sheet.name,
        isSectionDivider,
      });
    }
  });

  return rows;
};

export const parseMerchOrdersWorkbook = async (file: File): Promise<MerchOrderStatusWorkbookPatch[]> => {
  const rows = await readMerchOrdersWorkbookRows(file);
  const patchMap = new Map<string, MerchOrderStatusWorkbookPatch>();

  rows.forEach((row) => {
    if (!row.rawStatus || (!row.orderId && !row.referenceNo)) return;
    const key = getWorkbookRowKey(row.orderId, row.referenceNo);
    if (!key) return;
    patchMap.set(key, {
      orderId: row.orderId,
      orderStatus: row.normalizedStatus,
      referenceNo: row.referenceNo,
    });
  });

  return Array.from(patchMap.values());
};

export const reviewMerchOrdersWorkbook = async (
  file: File,
  existingRecords: MerchOrderControlRecord[] = [],
): Promise<MerchOrderWorkbookReview> => {
  const rows = await readMerchOrdersWorkbookRows(file);

  const patchMap = new Map<string, MerchOrderStatusWorkbookPatch>();
  const issues: MerchOrderWorkbookIssue[] = [];
  const recordLookup = new Set(
    existingRecords.flatMap((record) => {
      const id = String(record.id || '').trim();
      const referenceNo = String(record.referenceNo || '').trim();
      const keys: string[] = [];
      if (id) keys.push(`id:${id}`);
      if (referenceNo) keys.push(`ref:${referenceNo}`);
      return keys;
    }),
  );

  rows.forEach((row) => {
    const rowKey = getWorkbookRowKey(row.orderId, row.referenceNo);
    const normalized = tryNormalizeMerchOrderStatus(row.rawStatus);

    const hasKnownRecord = Boolean(row.orderId && recordLookup.has(`id:${row.orderId}`)) || Boolean(row.referenceNo && recordLookup.has(`ref:${row.referenceNo}`));

    if (!rowKey) {
      issues.push({
        message: 'Missing Order ID or Reference No.',
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    if (!row.rawStatus) {
      issues.push({
        message: 'Missing status value in the workbook.',
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    if (!normalized.isRecognized) {
      issues.push({
        message: `Unrecognized status "${row.rawStatus || '-'}". Allowed values are pending, confirmed, released, and refund.`,
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    if (!hasKnownRecord) {
      issues.push({
        message: `Order not found in the currently loaded records.`,
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    const existingPatch = patchMap.get(rowKey);
    if (existingPatch) {
      issues.push({
        message: 'Duplicate order row found in the workbook. The last matching row will be used.',
        rowNumber: row.rowNumber,
        severity: 'warning',
        sheetName: row.sheetName,
      });
    }

    patchMap.set(rowKey, {
      orderId: row.orderId,
      orderStatus: normalized.normalized,
      referenceNo: row.referenceNo,
    });
  });

  const patches = Array.from(patchMap.values());
  const skippedCount = Math.max(0, rows.length - patches.length);

  return {
    changedCount: patches.length,
    fileName: file.name,
    issueCount: issues.length,
    issues,
    patches,
    skippedCount,
    totalCount: rows.length,
  };
};
