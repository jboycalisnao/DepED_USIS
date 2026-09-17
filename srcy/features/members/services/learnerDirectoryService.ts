import { supabase } from '@deped-usis/shared-supabase';

export type RegistrarLearnerSearchResult = {
  id: string;
  lrn: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  gradeLevel: string;
  section: string;
  birthdate: string;
  address: string;
  contactNo: string;
  email: string;
  emergencyContact: string;
  status: string;
  schoolYear: string;
  isEnrolledInActiveYear: boolean;
  activeSchoolYearLabel?: string;
  ineligibilityReason?: string;
};

const toCleanText = (val: unknown): string => String(val ?? '').trim();

const formatLearnerFullName = (firstName: string, middleName: string, lastName: string): string => {
  const parts: string[] = [];
  if (lastName) parts.push(lastName.toUpperCase() + ',');
  if (firstName) parts.push(firstName);
  if (middleName) parts.push(middleName);
  return parts.filter(Boolean).join(' ').trim() || 'Unnamed Learner';
};

export async function searchRegistrarLearners(query: string): Promise<RegistrarLearnerSearchResult[]> {
  const rawQuery = toCleanText(query);
  if (!rawQuery) return [];

  const digitsOnly = rawQuery.replace(/\D/g, '');
  const isLrnSearch = digitsOnly.length >= 3 && digitsOnly === rawQuery.replace(/[\s-]/g, '');

  let dbQuery = supabase.from('registrar_learners').select('*').limit(30);

  if (isLrnSearch) {
    dbQuery = dbQuery.ilike('lrn', `%${digitsOnly}%`);
  } else {
    const term = rawQuery.replace(/['"%]/g, '');
    dbQuery = dbQuery.or(
      `lrn.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,middle_name.ilike.%${term}%`
    );
  }

  const [learnersResult, activeSyResult] = await Promise.all([
    dbQuery,
    supabase
      .from('registrar_school_years')
      .select('id,label,is_active')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: learnersData, error } = learnersResult;

  if (error || !learnersData) {
    if (error) console.error('[SRCY Learner Directory] Search failed:', error);
    return [];
  }

  const activeSchoolYearId = toCleanText(activeSyResult.data?.id);
  const activeSchoolYearLabel = toCleanText(activeSyResult.data?.label);

  // Extract unique section IDs to resolve grade, section name, and school_year_id
  const sectionIds = Array.from(
    new Set(learnersData.map((item: any) => toCleanText(item.section_id)).filter(Boolean))
  );

  const sectionMap = new Map<string, { name: string; gradeLevel: string; schoolYearId: string }>();

  if (sectionIds.length > 0) {
    const { data: sectionsData } = await supabase
      .from('registrar_sections')
      .select('id,name,grade_level,school_year_id')
      .in('id', sectionIds);

    if (sectionsData) {
      sectionsData.forEach((sec: any) => {
        sectionMap.set(toCleanText(sec.id), {
          name: toCleanText(sec.name),
          gradeLevel: toCleanText(sec.grade_level),
          schoolYearId: toCleanText(sec.school_year_id),
        });
      });
    }
  }

  return learnersData.map((item: any): RegistrarLearnerSearchResult => {
    const secId = toCleanText(item.section_id);
    const secInfo = sectionMap.get(secId);
    const firstName = toCleanText(item.first_name);
    const middleName = toCleanText(item.middle_name);
    const lastName = toCleanText(item.last_name);
    const fullName = formatLearnerFullName(firstName, middleName, lastName);

    const contactNo = toCleanText(item.contact_number || item.mobile || item.guardian_contact);
    const email = toCleanText(item.email);
    const emergencyContact = toCleanText(item.emergency_contact_number || item.guardian_contact || item.guardian_name);

    const learnerStatus = toCleanText(item.status || 'Enrolled');
    const statusLower = learnerStatus.toLowerCase();
    const isStatusEnrolled = statusLower === 'enrolled' || statusLower === 'active';

    const learnerSchoolYear = toCleanText(item.school_year);
    const sectionSchoolYearId = toCleanText(secInfo?.schoolYearId);

    const embeddedHistory = Array.isArray(item.enrollment_history) ? item.enrollment_history : [];
    const hasActiveHistory = embeddedHistory.some((hist: any) => {
      const sy = toCleanText(hist.school_year || hist.schoolYear);
      const st = toCleanText(hist.status).toLowerCase();
      const isEnr = st === 'enrolled' || st === 'active';
      return isEnr && (sy === activeSchoolYearLabel || sy === activeSchoolYearId);
    });

    const matchesActiveYear = Boolean(
      (activeSchoolYearLabel && learnerSchoolYear.toLowerCase() === activeSchoolYearLabel.toLowerCase()) ||
      (activeSchoolYearId && learnerSchoolYear.toLowerCase() === activeSchoolYearId.toLowerCase()) ||
      (activeSchoolYearId && sectionSchoolYearId === activeSchoolYearId) ||
      hasActiveHistory
    );

    const hasActiveSyFilter = Boolean(activeSchoolYearLabel || activeSchoolYearId);
    const isEnrolledInActiveYear = Boolean(isStatusEnrolled && (!hasActiveSyFilter || matchesActiveYear));

    let ineligibilityReason = '';
    if (!isEnrolledInActiveYear) {
      if (!isStatusEnrolled) {
        ineligibilityReason = `Status: ${learnerStatus}`;
      } else if (learnerSchoolYear && activeSchoolYearLabel) {
        ineligibilityReason = `Enrolled in S.Y. ${learnerSchoolYear} (Active: ${activeSchoolYearLabel})`;
      } else if (activeSchoolYearLabel) {
        ineligibilityReason = `Not enrolled in S.Y. ${activeSchoolYearLabel}`;
      } else {
        ineligibilityReason = 'Not actively enrolled';
      }
    }

    return {
      id: toCleanText(item.id),
      lrn: toCleanText(item.lrn),
      fullName,
      firstName,
      lastName,
      middleName,
      gradeLevel: secInfo?.gradeLevel || toCleanText(item.grade_level || item.school_year),
      section: secInfo?.name || toCleanText(item.section || item.track_strand),
      birthdate: toCleanText(item.birth_date || item.birthdate || item.birthDate),
      address: toCleanText(item.address),
      contactNo,
      email,
      emergencyContact,
      status: learnerStatus,
      schoolYear: learnerSchoolYear,
      isEnrolledInActiveYear,
      activeSchoolYearLabel: activeSchoolYearLabel || undefined,
      ineligibilityReason: ineligibilityReason || undefined,
    };
  });
}

export async function lookupLearnerByLrn(lrn: string): Promise<RegistrarLearnerSearchResult | null> {
  const cleanLrn = toCleanText(lrn).replace(/\D/g, '');
  if (!cleanLrn) return null;

  const results = await searchRegistrarLearners(cleanLrn);
  return results.find((r) => r.lrn === cleanLrn) || results[0] || null;
}
