import * as XLSX from 'xlsx';
import type { AdviserSectionGroup } from './adviserLearnerAccess';
import { formatLearnerTags } from '../../../utils/learnerTags';

const sanitizeFilePart = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48) || 'USIS';

const sanitizeSheetName = (value: string) =>
  String(value || 'Section')
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Section';

const buildLearnerRows = (group: AdviserSectionGroup, schoolYearLabel: string) =>
  group.learners.map((learner) => ({
    LRN: String(learner.lrn || ''),
    'First Name': String(learner.firstName || ''),
    'Middle Name': String(learner.middleName || ''),
    'Last Name': String(learner.lastName || ''),
    'Grade Level': String(group.section.gradeLevel || ''),
    Section: String(group.section.name || ''),
    'School Year': String(learner.schoolYear || schoolYearLabel || ''),
    Gender: String(learner.gender || ''),
    'Birth Date': String(learner.birthDate || ''),
    Address: String(learner.address || ''),
    'Contact Number': String(learner.contactNumber || ''),
    Email: String(learner.email || ''),
    'Guardian Name': String(learner.guardian_name || ''),
    'Father Name': String(learner.father_name || ''),
    'Mother Name': String(learner.mother_name || ''),
    'Login Username': String(learner.loginUsername || ''),
    'Login Status': String(learner.loginStatus || ''),
    'Last Login At': String(learner.lastLoginAt || ''),
    'Microsoft UPN': String(learner.microsoftUpn || ''),
    'Microsoft Status': String(learner.microsoftAccountStatus || ''),
    Status: String(learner.status || ''),
    '4Ps': learner.is4Ps ? 'Yes' : '',
    Tags: formatLearnerTags(learner.tags),
  }));

export const downloadAdviserSectionWorkbook = (
  sectionGroups: AdviserSectionGroup[],
  schoolYearLabel: string,
  adviserName: string,
) => {
  const workbook = XLSX.utils.book_new();
  const hasRows = sectionGroups.some((group) => group.learners.length > 0);

  if (!hasRows) return false;

  sectionGroups.forEach((group) => {
    if (!group.learners.length) return;
    const rows = buildLearnerRows(group, schoolYearLabel);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(group.section.name));
  });

  const filename = `USIS_${sanitizeFilePart(adviserName)}_Section_Learners_${sanitizeFilePart(schoolYearLabel)}.xlsx`;
  XLSX.writeFile(workbook, filename);
  return true;
};
