import type { IdOrderRecord } from '../services/idOrdersService';

type IdOrderGroup = {
  gradeLevel: string;
  rows: IdOrderRecord[];
};

export type IdOrderWorkbookPatch = {
  orderId: string;
  orderStatus: string;
  referenceNo: string;
};

export type IdOrderWorkbookIssue = {
  message: string;
  rowNumber: number;
  severity: 'warning' | 'error';
  sheetName: string;
};

export type IdOrderWorkbookReview = {
  changedCount: number;
  fileName: string;
  issueCount: number;
  issues: IdOrderWorkbookIssue[];
  patches: IdOrderWorkbookPatch[];
  skippedCount: number;
  totalCount: number;
};

const STATUS_OPTIONS = ['pending', 'done', 'released', 'for correction'];

const STATUS_STYLE_MAP: Record<string, { fill: string; font: string }> = {
  pending: { fill: 'FFFCEFC7', font: 'FF7A5B00' },
  done: { fill: 'FFDDEBFF', font: 'FF18498F' },
  released: { fill: 'FFDFF5E4', font: 'FF0B6B3A' },
  'for correction': { fill: 'FFFEE4E2', font: 'FFB42318' },
};

const sanitizeFilePart = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'ID_Orders';

const sanitizeWorksheetName = (value: string) =>
  String(value || 'ID Orders')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'ID Orders';

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

const parseName = (row: IdOrderRecord) => {
  const fullName = String(row.learnerName || '').trim();
  if (!fullName) return 'Unnamed Learner';
  const parts = fullName.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return fullName;
  const [last = '', first = '', middle = ''] = parts;
  const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
  return [last, first, middleInitial].filter(Boolean).join(', ').replace(', ,', ',');
};

const getStatusStyle = (status: string) => STATUS_STYLE_MAP[status] || STATUS_STYLE_MAP.pending;

const getWorkbookStatusLabel = (value: string) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'for correction') return 'For Correction';
  if (normalized === 'released') return 'Released';
  if (normalized === 'done') return 'Done';
  return 'Pending';
};

const tryNormalizeIdOrderStatus = (value: unknown) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return { isRecognized: false, normalized: '' };
  }
  if (normalized === 'for correction' || normalized === 'for-correction' || normalized === 'for_correction') {
    return { isRecognized: true, normalized: 'for correction' };
  }
  if (STATUS_OPTIONS.includes(normalized)) {
    return { isRecognized: true, normalized };
  }
  return { isRecognized: false, normalized };
};

const buildGradeGroups = (records: IdOrderRecord[]) => {
  const map = new Map<string, IdOrderGroup>();
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
    const gradeDiff = normalizeGradeSortValue(left.gradeLevel) - normalizeGradeSortValue(right.gradeLevel);
    if (gradeDiff !== 0) return gradeDiff;
    return left.gradeLevel.localeCompare(right.gradeLevel, undefined, { numeric: true });
  });
};

const buildSectionGroups = (records: IdOrderRecord[]) => {
  const map = new Map<string, IdOrderRecord[]>();
  records.forEach((record) => {
    const key = String(record.sectionName || 'Unassigned').trim() || 'Unassigned';
    const current = map.get(key);
    if (current) {
      current.push(record);
      return;
    }
    map.set(key, [record]);
  });

  return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
};

const styleStatusCell = (cell: any, status: string) => {
  const normalized = tryNormalizeIdOrderStatus(status).normalized || 'pending';
  const style = getStatusStyle(normalized);
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
    formulae: [`"${STATUS_OPTIONS.map((option) => getWorkbookStatusLabel(option)).join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Invalid status',
    error: 'Choose a status from the dropdown list.',
  };
};

const buildRecordLookup = (records: IdOrderRecord[]) => {
  const byId = new Map<string, IdOrderRecord>();
  const byReference = new Map<string, IdOrderRecord>();

  records.forEach((record) => {
    const id = normalizeText(record.id);
    const referenceNo = normalizeText(record.referenceNo);
    if (id) byId.set(id, record);
    if (referenceNo) byReference.set(referenceNo, record);
  });

  return { byId, byReference };
};

const addSectionHeaderRow = (sheet: any, rowNumber: number, text: string, columnCount: number) => {
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

const addTableHeaderRow = (sheet: any, rowNumber: number) => {
  const headerRow = sheet.getRow(rowNumber);
  headerRow.values = ['Order ID', 'Reference No.', 'Date', 'Learner', 'LRN', 'Guardians Name', 'Guardians Number', 'Address', 'Order Period', 'Status', 'Last Updated'];
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0038A8' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF111111' } },
      left: { style: 'thin', color: { argb: 'FF111111' } },
      bottom: { style: 'thin', color: { argb: 'FF111111' } },
      right: { style: 'thin', color: { argb: 'FF111111' } },
    };
  });
};

const appendOrderRow = (sheet: any, rowNumber: number, row: IdOrderRecord) => {
  const entry = sheet.getRow(rowNumber);
  entry.values = [
    row.id,
    row.referenceNo || '-',
    row.createdAt ? new Date(row.createdAt).toLocaleString() : '-',
    parseName(row),
    row.learnerLrn || '-',
    row.guardianName || '-',
    row.guardianNumber || '-',
    row.address || '-',
    row.orderPeriodLabel || '-',
    getWorkbookStatusLabel(row.orderStatus),
    row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleString() : '-',
  ];
  entry.height = 20;
  entry.eachCell((cell, colNumber) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    };
    cell.alignment = { vertical: 'top', wrapText: true };
    if (colNumber === 10) {
      styleStatusCell(cell, row.orderStatus);
    }
  });
};

const normalizeWorkbookOrderPeriodLabel = (value: string) => {
  const labels = String(value || '')
    .split(' / ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (labels.length === 0) return 'Order Period';
  if (labels.length === 1) return labels[0];
  return labels.join(' / ');
};

export const downloadIdOrdersWorkbook = async (
  records: IdOrderRecord[],
  orderPeriodLabel: string,
  options?: {
    fileNameSuffix?: string;
    isWholeOrders?: boolean;
  },
) => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'DepED USIS';
  workbook.created = new Date();
  const isWholeOrders = Boolean(options?.isWholeOrders);
  const fileNameSuffix = String(options?.fileNameSuffix || '').trim();
  const normalizedOrderPeriodLabel = normalizeWorkbookOrderPeriodLabel(orderPeriodLabel);

  const groups = buildGradeGroups(records);
  groups.forEach((group) => {
    const sheet = workbook.addWorksheet(sanitizeWorksheetName(group.gradeLevel));
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    sheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 36 },
      { header: 'Reference No.', key: 'referenceNo', width: 18 },
      { header: 'Date', key: 'createdAt', width: 22 },
      { header: 'Learner', key: 'learnerName', width: 30 },
      { header: 'LRN', key: 'learnerLrn', width: 18 },
      { header: 'Guardians Name', key: 'guardianName', width: 28 },
      { header: 'Guardians Number', key: 'guardianNumber', width: 20 },
      { header: 'Address', key: 'address', width: 42 },
      { header: 'Order Period', key: 'orderPeriodLabel', width: 18 },
      { header: 'Status', key: 'orderStatus', width: 14 },
      { header: 'Last Updated', key: 'lastUpdatedAt', width: 24 },
    ];
    sheet.getColumn(1).hidden = true;

    const colCount = 11;
    sheet.mergeCells(1, 1, 1, colCount);
    sheet.getCell(1, 1).value = `${isWholeOrders ? 'All Orders' : 'ID Orders'} - ${group.gradeLevel}`;
    sheet.getCell(1, 1).font = { bold: true, size: 14 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(2, 1, 2, colCount);
    sheet.getCell(2, 1).value = `Order Period: ${normalizedOrderPeriodLabel || '-'}`;
    sheet.getCell(2, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell(2, 1).font = { italic: true };

    sheet.mergeCells(3, 1, 3, colCount);
    sheet.getCell(3, 1).value = 'Edit the Status column only, then upload this workbook to sync changes back to the system.';
    sheet.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    let currentRow = 5;
    const sections = buildSectionGroups(group.rows);
    sections.forEach(([sectionName, sectionRows], sectionIndex) => {
      if (sectionIndex > 0) {
        currentRow += 1;
      }
      addSectionHeaderRow(sheet, currentRow, `Section: ${sectionName}`, colCount);
      currentRow += 1;
      addTableHeaderRow(sheet, currentRow);
      currentRow += 1;
      sectionRows.forEach((row) => {
        appendOrderRow(sheet, currentRow, row);
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
  link.download = `USIS_ID_Orders_${sanitizeFilePart(normalizedOrderPeriodLabel)}${fileNameSuffix ? `_${sanitizeFilePart(fileNameSuffix)}` : ''}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

type IdOrderWorkbookRow = {
  normalizedStatus: string;
  orderId: string;
  rawStatus: string;
  referenceNo: string;
  rowNumber: number;
  sheetName: string;
};

const isSectionDividerRow = (row: any) => {
  const value = normalizeText(row.getCell(1).value).toLowerCase();
  return value.startsWith('section:');
};

const isHeaderRow = (row: any) => {
  const first = normalizeText(row.getCell(1).value).toLowerCase();
  const status = normalizeText(row.getCell(10).value).toLowerCase();
  return first === 'order id' || (first === 'reference no.' && status === 'status');
};

const readIdOrdersWorkbookRows = async (file: File): Promise<IdOrderWorkbookRow[]> => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const rows: IdOrderWorkbookRow[] = [];
  workbook.worksheets.forEach((sheet) => {
    for (let rowIndex = 4; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const row = sheet.getRow(rowIndex);
      if (isSectionDividerRow(row) || isHeaderRow(row)) {
        continue;
      }

      const orderId = normalizeText(row.getCell(1).value);
      const referenceNo = normalizeText(row.getCell(2).value);
      const rawStatus = normalizeText(row.getCell(10).value);
      if (!orderId && !referenceNo && !rawStatus) {
        continue;
      }

      rows.push({
        normalizedStatus: tryNormalizeIdOrderStatus(rawStatus).normalized,
        orderId,
        rawStatus,
        referenceNo,
        rowNumber: rowIndex,
        sheetName: sheet.name,
      });
    }
  });

  return rows;
};

export const reviewIdOrdersWorkbook = async (
  file: File,
  existingRecords: IdOrderRecord[] = [],
): Promise<IdOrderWorkbookReview> => {
  const rows = await readIdOrdersWorkbookRows(file);
  const patchMap = new Map<string, IdOrderWorkbookPatch>();
  const issues: IdOrderWorkbookIssue[] = [];
  const { byId, byReference } = buildRecordLookup(existingRecords);

  rows.forEach((row) => {
    if (!row.rawStatus) {
      issues.push({
        message: 'Missing status value in the workbook.',
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    const normalized = tryNormalizeIdOrderStatus(row.rawStatus);
    if (!normalized.isRecognized) {
      issues.push({
        message: `Unrecognized status "${row.rawStatus || '-'}". Allowed values are pending, done, released, and for correction.`,
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    const directMatch = row.orderId ? byId.get(row.orderId) : null;
    const referenceMatch = row.referenceNo ? byReference.get(row.referenceNo) : null;
    const matchedRecord = directMatch || referenceMatch;

    if (!matchedRecord) {
      issues.push({
        message: 'Order not found in the currently loaded records.',
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    const key = normalizeText(matchedRecord.id);
    if (!key) {
      issues.push({
        message: 'Unable to resolve a valid order ID for this row.',
        rowNumber: row.rowNumber,
        severity: 'error',
        sheetName: row.sheetName,
      });
      return;
    }

    const existingPatch = patchMap.get(key);
    if (existingPatch) {
      issues.push({
        message: 'Duplicate order row found in the workbook. The last matching row will be used.',
        rowNumber: row.rowNumber,
        severity: 'warning',
        sheetName: row.sheetName,
      });
    }

    patchMap.set(key, {
      orderId: key,
      orderStatus: normalized.normalized,
      referenceNo: row.referenceNo || normalizeText(matchedRecord.referenceNo),
    });
  });

  const patches = Array.from(patchMap.values());

  return {
    changedCount: patches.length,
    fileName: file.name,
    issueCount: issues.length,
    issues,
    patches,
    skippedCount: Math.max(0, rows.length - patches.length),
    totalCount: rows.length,
  };
};
