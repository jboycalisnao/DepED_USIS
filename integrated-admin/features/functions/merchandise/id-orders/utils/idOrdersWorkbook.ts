import type { IdOrderRecord } from '../services/idOrdersService';

type IdOrderGroup = {
  gradeLevel: string;
  sectionName: string;
  rows: IdOrderRecord[];
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

const formatName = (row: IdOrderRecord) => {
  const fullName = String(row.learnerName || '').trim();
  if (!fullName) return 'Unnamed Learner';
  const parts = fullName.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return fullName;
  const [last = '', first = '', middle = ''] = parts;
  const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
  return [last, first, middleInitial].filter(Boolean).join(', ').replace(', ,', ',');
};

const formatAddress = (value: string) => {
  const address = String(value || '').trim();
  if (!address || address === '-') return '-';

  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) return address;

  return parts.slice(0, -2).join(', ');
};

const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

const buildGroups = (records: IdOrderRecord[]) => {
  const map = new Map<string, IdOrderGroup>();
  records.forEach((record) => {
    const key = `${record.gradeLevel}||${record.sectionName}`;
    const current = map.get(key);
    if (current) {
      current.rows.push(record);
      return;
    }
    map.set(key, {
      gradeLevel: record.gradeLevel || 'Unassigned',
      sectionName: record.sectionName || 'Unassigned',
      rows: [record],
    });
  });

  return Array.from(map.values()).sort((left, right) => {
    const gradeDiff = parseGradeSortValue(left.gradeLevel) - parseGradeSortValue(right.gradeLevel);
    if (gradeDiff !== 0) return gradeDiff;
    return left.sectionName.localeCompare(right.sectionName, undefined, { numeric: true });
  });
};

export const downloadIdOrdersWorkbook = async (
  records: IdOrderRecord[],
  schoolYearLabel: string,
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

  const groups = buildGroups(records);
  groups.forEach((group) => {
    const sheetName = isWholeOrders
      ? `All Orders - ${group.gradeLevel} - ${group.sectionName}`
      : `${group.gradeLevel} - ${group.sectionName}`;
    const sheet = workbook.addWorksheet(sanitizeWorksheetName(sheetName));
    const orderPeriodLabels = Array.from(new Set(group.rows.map((row) => String(row.orderPeriodLabel || '').trim()).filter(Boolean)));
    const orderPeriodLabel = orderPeriodLabels.length === 1 ? orderPeriodLabels[0] : orderPeriodLabels.join(' / ') || 'ID Request';

    sheet.views = [{ state: 'frozen', ySplit: 5 }];
    sheet.columns = [
      { header: 'LRN', key: 'lrn', width: 18 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Guardians Name', key: 'guardianName', width: 28 },
      { header: 'Guardians Number', key: 'guardianNumber', width: 20 },
      { header: 'Address', key: 'address', width: 42 },
      { header: 'Last Updated', key: 'lastUpdatedAt', width: 24 },
    ];

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `${isWholeOrders ? 'All Orders' : 'ID Orders'} - ${group.gradeLevel} - ${group.sectionName}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `School Year: ${schoolYearLabel || '-'}`;
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A2').font = { italic: true };

    sheet.mergeCells('A3:F3');
    sheet.getCell('A3').value = `Order Period: ${orderPeriodLabel}`;
    sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A4:F4');
    sheet.getCell('A4').value = `Total Requests: ${group.rows.length}`;
    sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRow = sheet.getRow(5);
    headerRow.values = ['LRN', 'Name', 'Guardians Name', 'Guardians Number', 'Address', 'Last Updated'];
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

    group.rows.forEach((row) => {
      const entry = sheet.addRow({
        lrn: row.learnerLrn,
        name: formatName(row),
        guardianName: row.guardianName || '-',
        guardianNumber: row.guardianNumber || '-',
        address: formatAddress(row.address),
        lastUpdatedAt: row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleString() : '-',
      });
      entry.height = 20;
      entry.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
          left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
          bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
          right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
        };
        cell.alignment = { vertical: 'top', wrapText: true };
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
  link.download = `USIS_ID_Orders_${sanitizeFilePart(schoolYearLabel)}${fileNameSuffix ? `_${sanitizeFilePart(fileNameSuffix)}` : ''}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
