import type { Row, Worksheet } from 'exceljs';
import type { CoordinatorDepartmentRecord, PersonnelType, SaveTeachingNonTeachingCredentialInput } from '../services/teachingNonTeachingCredentialsService';

export type TeachingNonTeachingBulkImportResult = {
  createdCount: number;
  errors: string[];
  skippedCount: number;
};

const TEMPLATE_SHEET_NAME = 'Bulk Import';
const LISTS_SHEET_NAME = 'Lists';
const MAX_TEMPLATE_ROWS = 250;

const templateColumns = [
  { header: 'First Name *', key: 'firstName', width: 18 },
  { header: 'Last Name *', key: 'lastName', width: 18 },
  { header: 'Middle Name', key: 'middleName', width: 18 },
  { header: 'Employee ID', key: 'employeeId', width: 16 },
  { header: 'Department *', key: 'departmentName', width: 24 },
  { header: 'Username *', key: 'username', width: 18 },
  { header: 'Email', key: 'email', width: 24 },
  { header: 'Mobile Number', key: 'mobileNo', width: 18 },
  { header: 'Password *', key: 'password', width: 16 },
  { header: 'Personnel Type *', key: 'personnelType', width: 20 },
  { header: 'Status', key: 'status', width: 14 },
] as const;

const normalizeText = (value: unknown) => String(value ?? '').trim();

const normalizeHeader = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, '');

const normalizePersonnelType = (value: unknown): PersonnelType | null => {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'teaching') return 'teaching';
  if (normalized === 'non_teaching') return 'non_teaching';
  return null;
};

const normalizeStatus = (value: unknown) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return true;
  if (['active', '1', 'true', 'yes', 'y'].includes(normalized)) return true;
  if (['inactive', '0', 'false', 'no', 'n'].includes(normalized)) return false;
  return null;
};

const normalizeForLookup = (value: string) =>
  normalizeText(value).toLowerCase().replace(/[\s_-]+/g, '');

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const styleHeaderRow = (sheet: Worksheet) => {
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0038A8' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    };
  });
};

const applyDataValidation = (sheet: Worksheet, range: string, formula: string) => {
  const [startCell, endCell] = range.split(':');
  const startRow = Number(startCell.replace(/^[A-Z]+/i, ''));
  const endRow = Number(endCell.replace(/^[A-Z]+/i, ''));
  const column = startCell.replace(/\d+/g, '');
  for (let row = startRow; row <= endRow; row += 1) {
    sheet.getCell(`${column}${row}`).dataValidation = {
      allowBlank: false,
      formulae: [formula],
      showErrorMessage: true,
      showInputMessage: true,
      type: 'list',
    };
  }
};

export const downloadTeachingNonTeachingCredentialTemplate = async (departments: CoordinatorDepartmentRecord[]) => {
  if (departments.length === 0) {
    throw new Error('At least one department is required before downloading the bulk import template.');
  }

  const { Workbook } = await import('exceljs');

  const workbook = new Workbook();
  workbook.creator = 'DepED USIS';
  workbook.created = new Date();

  const templateSheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);
  templateSheet.views = [{ state: 'frozen', ySplit: 1 }];
  templateSheet.columns = templateColumns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  templateSheet.autoFilter = `A1:K1`;
  templateSheet.getRow(1).values = templateColumns.map((column) => column.header);
  styleHeaderRow(templateSheet);

  for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
    templateSheet.getRow(row).height = 20;
  }

  const listSheet = workbook.addWorksheet(LISTS_SHEET_NAME);
  listSheet.state = 'hidden';
  listSheet.getCell('A1').value = 'Departments';
  listSheet.getCell('B1').value = 'Personnel Type';
  listSheet.getCell('C1').value = 'Status';
  listSheet.getCell('A1').font = { bold: true };
  listSheet.getCell('B1').font = { bold: true };
  listSheet.getCell('C1').font = { bold: true };

  departments.forEach((department, index) => {
    listSheet.getCell(`A${index + 2}`).value = department.name;
  });

  ['Teaching', 'Non-Teaching'].forEach((label, index) => {
    listSheet.getCell(`B${index + 2}`).value = label;
  });

  ['Active', 'Inactive'].forEach((label, index) => {
    listSheet.getCell(`C${index + 2}`).value = label;
  });

  const departmentRange = `'${LISTS_SHEET_NAME}'!$A$2:$A$${departments.length + 1}`;
  const personnelTypeRange = `'${LISTS_SHEET_NAME}'!$B$2:$B$3`;
  const statusRange = `'${LISTS_SHEET_NAME}'!$C$2:$C$3`;
  applyDataValidation(templateSheet, `E2:E${MAX_TEMPLATE_ROWS}`, departmentRange);
  applyDataValidation(templateSheet, `J2:J${MAX_TEMPLATE_ROWS}`, personnelTypeRange);
  applyDataValidation(templateSheet, `K2:K${MAX_TEMPLATE_ROWS}`, statusRange);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, 'USIS_Teaching_NonTeaching_Bulk_Import_Template.xlsx');
};

const getHeaderMap = (worksheet: Worksheet) => {
  const headerRow = worksheet.getRow(1);
  const map = new Map<string, number>();
  headerRow.eachCell((cell, columnNumber) => {
    const normalized = normalizeHeader(cell.value);
    if (normalized) {
      map.set(normalized, columnNumber);
    }
  });
  return map;
};

const getCellText = (row: Row, column: number) => normalizeText(row.getCell(column).text || row.getCell(column).value);

export const parseTeachingNonTeachingCredentialWorkbook = async (
  file: File,
  departments: CoordinatorDepartmentRecord[],
  schoolCode: string,
): Promise<SaveTeachingNonTeachingCredentialInput[]> => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME) || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The uploaded workbook does not contain a usable sheet.');
  }

  const headerMap = getHeaderMap(worksheet);
  const requiredHeaders = {
    departmentName: ['department'],
    firstName: ['firstname'],
    lastName: ['lastname'],
    password: ['password'],
    personnelType: ['personneltype'],
    username: ['username'],
  } as const;

  const resolveColumn = (keys: readonly string[]) => {
    for (const key of keys) {
      const found = headerMap.get(key);
      if (found) return found;
    }
    return 0;
  };

  const columnLookup = {
    departmentName: resolveColumn(requiredHeaders.departmentName),
    email: resolveColumn(['email']),
    employeeId: resolveColumn(['employeeid']),
    firstName: resolveColumn(requiredHeaders.firstName),
    isActive: resolveColumn(['status']),
    lastName: resolveColumn(requiredHeaders.lastName),
    middleName: resolveColumn(['middlename']),
    mobileNo: resolveColumn(['mobilenumber', 'mobile']),
    password: resolveColumn(requiredHeaders.password),
    personnelType: resolveColumn(requiredHeaders.personnelType),
    username: resolveColumn(requiredHeaders.username),
  };

  const missingColumns = Object.entries(columnLookup)
    .filter(([, column]) => !column)
    .map(([key]) => key);
  if (missingColumns.length > 0) {
    throw new Error(`Missing required column(s): ${missingColumns.join(', ')}.`);
  }

  const departmentMap = new Map(
    departments.map((department) => [normalizeForLookup(department.name), department.id] as const),
  );
  const parsedRows: SaveTeachingNonTeachingCredentialInput[] = [];
  const errors: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = [
      getCellText(row, columnLookup.firstName),
      getCellText(row, columnLookup.lastName),
      getCellText(row, columnLookup.middleName),
      getCellText(row, columnLookup.employeeId),
      getCellText(row, columnLookup.departmentName),
      getCellText(row, columnLookup.username),
      getCellText(row, columnLookup.email),
      getCellText(row, columnLookup.mobileNo),
      getCellText(row, columnLookup.password),
      getCellText(row, columnLookup.personnelType),
      getCellText(row, columnLookup.isActive),
    ];
    if (values.every((value) => !value)) return;

    const firstName = values[0];
    const lastName = values[1];
    const middleName = values[2];
    const employeeId = values[3];
    const departmentName = values[4];
    const username = values[5];
    const email = values[6];
    const mobileNo = values[7];
    const password = values[8];
    const personnelType = normalizePersonnelType(values[9]);
    const isActive = normalizeStatus(values[10]);

    const rowErrors: string[] = [];
    if (!firstName) rowErrors.push('First Name is required.');
    if (!lastName) rowErrors.push('Last Name is required.');
    if (!departmentName) rowErrors.push('Department is required.');
    if (!username) rowErrors.push('Username is required.');
    if (!password) rowErrors.push('Password is required.');
    if (!personnelType) rowErrors.push('Personnel Type must be Teaching or Non-Teaching.');
    if (isActive === null) rowErrors.push('Status must be Active or Inactive.');

    const departmentId = departmentMap.get(normalizeForLookup(departmentName));
    if (!departmentId) {
      rowErrors.push(`Department "${departmentName}" is not recognized.`);
    }

    if (rowErrors.length > 0 || !departmentId || !personnelType || isActive === null) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join(' ')}`);
      return;
    }

    parsedRows.push({
      departmentId,
      email,
      employeeId,
      firstName,
      isActive,
      lastName,
      middleName,
      mobileNo,
      password,
      personnelType,
      schoolCode,
      username,
    });
  });

  if (errors.length > 0) {
    throw new Error(errors.slice(0, 8).join(' '));
  }

  return parsedRows;
};
