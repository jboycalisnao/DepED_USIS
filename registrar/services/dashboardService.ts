
import { Student, Section, SchoolYear, EnrollmentStatus, GradeLevel } from '../types';

const normalizeSchoolYear = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^sy\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
};

export const getActiveLearnersForYear = (
  learners: Student[],
  sections: Section[],
  activeSchoolYear: SchoolYear
) => {
  const activeSectionIds = new Set(
    sections
      .filter(s => s.schoolYearId === activeSchoolYear.id)
      .map(s => s.id)
  );

  return learners.filter(l => {
    const studentSid = String(l.sectionId || '').trim();
    const hasActiveSection = studentSid && activeSectionIds.has(studentSid);
    const hasMatchingEnrollment = l.enrollments?.some((e) => normalizeSchoolYear(e.schoolYear) === normalizeSchoolYear(activeSchoolYear.label));
    
    return hasActiveSection || hasMatchingEnrollment;
  });
};

export const calculateEnrollmentComposition = (
  activeLearners: Student[],
  sections: Section[],
  activeSchoolYear: SchoolYear
) => {
  const levels: Record<string, number> = {
    'Primary (K-6)': 0,
    'Junior High (7-10)': 0,
    'Senior High (11-12)': 0
  };

  activeLearners.forEach(l => {
    const studentSid = String(l.sectionId || '').trim();
    const section = sections.find(s => s.id === studentSid);
    const g = section?.gradeLevel || l.enrollments?.find((e) => normalizeSchoolYear(e.schoolYear) === normalizeSchoolYear(activeSchoolYear.label))?.gradeLevel;
    if (!g) return;
    
    const jhs = [GradeLevel.GRADE_7, GradeLevel.GRADE_8, GradeLevel.GRADE_9, GradeLevel.GRADE_10];
    const shs = [GradeLevel.GRADE_11, GradeLevel.GRADE_12];
    
    if (shs.includes(g as GradeLevel)) levels['Senior High (11-12)']++;
    else if (jhs.includes(g as GradeLevel)) levels['Junior High (7-10)']++;
    else levels['Primary (K-6)']++;
  });

  return Object.entries(levels).map(([name, count]) => ({ name, count }));
};

export const calculateGenderDemographics = (activeLearners: Student[]) => {
  const counts = { Male: 0, Female: 0, Other: 0 };
  activeLearners.forEach(l => {
    const g = (l.gender || 'Other') as keyof typeof counts;
    if (counts[g] !== undefined) counts[g]++;
    else counts.Other++;
  });
  return Object.entries(counts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
};
