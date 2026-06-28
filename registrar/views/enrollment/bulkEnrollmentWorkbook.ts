import * as XLSX from 'xlsx';
import type { GradeLevel, Section, Student } from '../../types';
import { EnrollmentStatus } from '../../types';

export const BULK_ENROLLMENT_COLUMNS = [
  'LRN',
  'First Name',
  'Middle Name',
  'Last Name',
  'Email Address',
  'Birth Date',
  'Gender',
  'Contact Number',
  'Complete Address',
  "Father's Full Name",
  "Mother's Full Name",
  'Guardian Name',
  'Grade Level',
  'Section',
  'SSLG Member',
  'Club Officer',
  'Student Athlete',
  'School Artist',
  '4Ps Beneficiary',
  'Indigent Status',
] as const;

type EnrollmentSheetRow = Record<(typeof BULK_ENROLLMENT_COLUMNS)[number], string>;

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const toBoolean = (value: unknown) => {
  const normalized = normalize(value);
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'y';
};

const makeBlankRow = (): EnrollmentSheetRow =>
  BULK_ENROLLMENT_COLUMNS.reduce((row, column) => ({ ...row, [column]: '' }), {} as EnrollmentSheetRow);

export const downloadBulkEnrollmentTemplate = (schoolYearLabel: string, selectedGrade: GradeLevel, selectedSectionName: string) => {
  const headerRow = [...BULK_ENROLLMENT_COLUMNS];
  const sampleRow = makeBlankRow();
  sampleRow['Grade Level'] = String(selectedGrade || '').trim();
  sampleRow['Section'] = String(selectedSectionName || '').trim();
  sampleRow['Gender'] = 'Male';
  sampleRow['SSLG Member'] = 'No';
  sampleRow['Club Officer'] = 'No';
  sampleRow['Student Athlete'] = 'No';
  sampleRow['School Artist'] = 'No';
  sampleRow['4Ps Beneficiary'] = 'No';
  sampleRow['Indigent Status'] = 'No';

  const worksheet = XLSX.utils.aoa_to_sheet([
    headerRow,
    BULK_ENROLLMENT_COLUMNS.map((column) => sampleRow[column]),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollment Template');

  const filename = `USIS_Enrollment_Template_${String(schoolYearLabel || 'Active').replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const parseBulkEnrollmentWorkbook = async (
  file: File,
  options: {
    selectedGrade: GradeLevel;
    selectedSectionId: string;
    selectedSectionName: string;
    schoolYearLabel: string;
    sections: Section[];
  },
): Promise<{ students: Student[]; error?: string }> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) return { students: [], error: 'The uploaded workbook does not contain a readable worksheet.' };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  if (!rows.length) return { students: [], error: 'The workbook is empty.' };

  const sectionLookup = new Map(
    options.sections.map((section) => [normalize(section.name), section]),
  );
  const selectedSection = options.sections.find((section) => String(section.id || '').trim() === String(options.selectedSectionId || '').trim()) || null;

  const students: Student[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const lrn = String(row['LRN'] || row['lrn'] || '').trim();
    const firstName = String(row['First Name'] || row['firstName'] || '').trim();
    const lastName = String(row['Last Name'] || row['lastName'] || '').trim();
    const gradeLevel = String(row['Grade Level'] || row['gradeLevel'] || options.selectedGrade || '').trim();
    const sectionName = String(row['Section'] || row['section'] || selectedSection?.name || options.selectedSectionName || '').trim();

    if (!lrn || !firstName || !lastName) {
      errors.push(`Row ${line}: LRN, First Name, and Last Name are required.`);
      return;
    }

    const targetSection = sectionLookup.get(normalize(sectionName)) || selectedSection || null;
    if (!targetSection) {
      errors.push(`Row ${line}: Section "${sectionName || '(blank)'}" was not found in the current school year.`);
      return;
    }

    students.push({
      id: crypto.randomUUID(),
      lrn,
      firstName,
      middleName: String(row['Middle Name'] || row['middleName'] || '').trim(),
      lastName,
      email: String(row['Email Address'] || row['email'] || '').trim(),
      birthDate: String(row['Birth Date'] || row['birthDate'] || '').trim(),
      gender: String(row['Gender'] || row['gender'] || 'Male').trim() || 'Male',
      contactNumber: String(row['Contact Number'] || row['contactNumber'] || '').trim(),
      address: String(row['Complete Address'] || row['address'] || '').trim(),
      guardian_name: String(row['Guardian Name'] || row['guardianName'] || '').trim(),
      father_name: String(row["Father's Full Name"] || row['fatherName'] || '').trim(),
      mother_name: String(row["Mother's Full Name"] || row['motherName'] || '').trim(),
      status: EnrollmentStatus.ENROLLED,
      sectionId: targetSection.id,
      schoolYear: options.schoolYearLabel,
      isSSLG: toBoolean(row['SSLG Member']),
      isClubOfficer: toBoolean(row['Club Officer']),
      isAthlete: toBoolean(row['Student Athlete']),
      isArtist: toBoolean(row['School Artist']),
      is4Ps: toBoolean(row['4Ps Beneficiary']),
      isIndigent: toBoolean(row['Indigent Status']),
      orgAffiliations: [],
      enrollments: [
        {
          id: crypto.randomUUID(),
          schoolYear: options.schoolYearLabel,
          gradeLevel: (gradeLevel || targetSection.gradeLevel) as GradeLevel,
          section: targetSection.name,
          enrollmentDate: new Date().toISOString().split('T')[0],
          status: EnrollmentStatus.ENROLLED,
        },
      ],
    });
  });

  if (errors.length) {
    return { students: [], error: errors.slice(0, 5).join(' ') };
  }

  return { students };
};
