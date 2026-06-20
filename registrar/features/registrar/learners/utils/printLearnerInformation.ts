import { Section, Student } from '../../../../types';
import { supabase } from '../../../../lib/supabase';
import { buildLNHSPrintSheetHeader } from '../../shared/printSheetHeader';

type PrintLearnerInformationPayload = {
  learners: Student[];
  schoolYearLabel: string;
  sections: Section[];
};

type VerificationCardData = {
  documentNo: string;
  verificationUrl: string;
  qrDataUrl: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const toText = (value: unknown) => String(value || '').trim();
const toOptionalText = (value: unknown) => {
  const text = toText(value);
  return text || 'N/A';
};

const firstNonEmpty = (sources: unknown[]) => {
  for (const source of sources) {
    const text = toText(source);
    if (text) return text;
  }
  return '';
};

const pickLearnerField = (learner: Student, keys: string[]) => {
  const row = learner as unknown as Record<string, unknown>;
  return firstNonEmpty(keys.map((key) => row[key]));
};

const fetchLatestSubmissionPayloadFromHistory = async (learner: Student) => {
  const learnerId = toText(learner.id);
  if (!learnerId) return null;

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('enrollment_history,enrollments')
    .eq('id', learnerId)
    .maybeSingle();

  if (error || !data) return null;

  const historySources = [
    ...(Array.isArray((data as any).enrollment_history) ? (data as any).enrollment_history : []),
    ...(Array.isArray((data as any).enrollments) ? (data as any).enrollments : []),
  ];

  const latestWithPayload = historySources
    .slice()
    .reverse()
    .find((entry: any) => entry && typeof entry === 'object' && (entry.submissionPayload || entry.submission_payload));

  return (latestWithPayload?.submissionPayload || latestWithPayload?.submission_payload || null) as
    | Record<string, unknown>
    | null;
};

const fetchLatestSubmissionPayloadByLrn = async (lrn: string) => {
  const trimmedLrn = toText(lrn);
  if (!trimmedLrn) return null;

  const [directRowsResult, payloadRowsResult] = await Promise.all([
    supabase
      .from('registrar_public_enrollment_submissions')
      .select('id,created_at,payload')
      .eq('lrn', trimmedLrn)
      .order('created_at', { ascending: false }),
    supabase
      .from('registrar_public_enrollment_submissions')
      .select('id,created_at,payload')
      .filter('payload->>lrn', 'eq', trimmedLrn)
      .order('created_at', { ascending: false }),
  ]);

  if (directRowsResult.error && payloadRowsResult.error) return null;

  const combinedRows = [
    ...((directRowsResult.data as Array<Record<string, unknown>> | null | undefined) || []),
    ...((payloadRowsResult.data as Array<Record<string, unknown>> | null | undefined) || []),
  ];

  const dedupedRows = Array.from(
    combinedRows.reduce((acc, entry) => {
      const key = toText(entry.id) || `${toText(entry.created_at)}::${JSON.stringify(entry.payload || {})}`;
      if (!acc.has(key)) acc.set(key, entry);
      return acc;
    }, new Map<string, Record<string, unknown>>()).values(),
  );

  const latestRow = dedupedRows.sort(
    (left, right) => new Date(toText(right.created_at)).getTime() - new Date(toText(left.created_at)).getTime(),
  )[0];

  return (latestRow?.payload && typeof latestRow.payload === 'object' ? latestRow.payload : null) as
    | Record<string, unknown>
    | null;
};

const fetchLatestSubmissionPayload = async (learner: Student) => {
  const latestFromHistory = await fetchLatestSubmissionPayloadFromHistory(learner);
  if (latestFromHistory) return latestFromHistory;

  return await fetchLatestSubmissionPayloadByLrn(learner.lrn);
};

const resolveSectionLabel = (learner: Student, sections: Section[]) => {
  const sectionId = toText(learner.sectionId);
  const section = sections.find((item) => toText(item.id) === sectionId);
  if (!section) return 'Unassigned';
  return `${section.name}${section.strand ? ` (${section.strand})` : ''}`;
};

const resolveGradeLabel = (learner: Student, sections: Section[]) => {
  const sectionId = toText(learner.sectionId);
  const section = sections.find((item) => toText(item.id) === sectionId);
  if (section) return section.gradeLevel;
  return learner.enrollments?.[0]?.gradeLevel || 'Unassigned';
};

const yesNo = (value?: boolean) => (value ? 'Yes' : 'No');
const yesNoText = (value: unknown) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'yes' || raw === 'true' || raw === '1') return 'Yes';
  if (raw === 'no' || raw === 'false' || raw === '0') return 'No';
  return 'N/A';
};

const buildVerificationUrl = (learner: Student) => {
  const url = new URL('/verify-document', window.location.origin);
  url.searchParams.set('doc', 'LNHS-REG-USIS-F01');
  url.searchParams.set('learnerId', learner.id);
  url.searchParams.set('lrn', learner.lrn);
  return url.toString();
};

const buildVerificationCard = async (learner: Student): Promise<VerificationCardData> => {
  const { default: QRCode } = await import('qrcode');
  const verificationUrl = buildVerificationUrl(learner);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
  });
  return {
    documentNo: 'LNHS-REG-USIS-F01',
    qrDataUrl,
    verificationUrl,
  };
};

const buildPrintHtml = async ({ learners, schoolYearLabel, sections }: PrintLearnerInformationPayload) => {
  const sorted = [...learners].sort((a, b) =>
    `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase()),
  );

  const pagesHtml = (await Promise.all(sorted.map(async (learner) => {
      const latestSubmissionPayload = await fetchLatestSubmissionPayload(learner);
      const fullName = `${learner.lastName}, ${learner.firstName}${learner.middleName ? ` ${learner.middleName}` : ''}`.trim();
      const grade = resolveGradeLabel(learner, sections);
      const section = resolveSectionLabel(learner, sections);
      const latestEnrollment = learner.enrollments?.[0];
      const studentType = firstNonEmpty([pickLearnerField(learner, ['studentType', 'student_type']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.studentType, latestSubmissionPayload.student_type])]);
      const learnerCategory = firstNonEmpty([pickLearnerField(learner, ['learnerCategory', 'learner_category']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.learnerCategory, latestSubmissionPayload.learner_category])]);
      const schoolToEnroll = firstNonEmpty([pickLearnerField(learner, ['schoolToEnroll', 'school_to_enroll']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.schoolToEnroll, latestSubmissionPayload.school_to_enroll])]);
      const schoolId = firstNonEmpty([pickLearnerField(learner, ['schoolId', 'school_id']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.schoolId, latestSubmissionPayload.school_id])]);
      const previousSchool = firstNonEmpty([pickLearnerField(learner, ['previousSchool', 'previous_school']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.previousSchool, latestSubmissionPayload.previous_school])]);
      const previousSchoolYear = firstNonEmpty([pickLearnerField(learner, ['previousSchoolYear', 'previous_school_year']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.previousSchoolYear, latestSubmissionPayload.previous_school_year])]);
      const lastGradeLevel = firstNonEmpty([pickLearnerField(learner, ['lastGradeLevel', 'last_grade_level']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.lastGradeLevel, latestSubmissionPayload.last_grade_level])]);
      const strand = firstNonEmpty([pickLearnerField(learner, ['strand']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.strand])]);
      const semester = firstNonEmpty([pickLearnerField(learner, ['semester']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.semester])]);

      const birthCertificateNo = firstNonEmpty([pickLearnerField(learner, ['birthCertificateNo', 'birth_certificate_no']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.birthCertificateNo])]);
      const extensionName = firstNonEmpty([pickLearnerField(learner, ['extensionName', 'extension_name']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.extensionName])]);
      const placeOfBirth = firstNonEmpty([pickLearnerField(learner, ['placeOfBirth', 'place_of_birth']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.placeOfBirth])]);
      const motherTongue = firstNonEmpty([pickLearnerField(learner, ['motherTongue', 'mother_tongue']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.motherTongue])]);
      const religion = firstNonEmpty([pickLearnerField(learner, ['religion']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.religion])]);
      const fourPsHouseholdId = firstNonEmpty([pickLearnerField(learner, ['fourPsHouseholdId', 'four_ps_household_id']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.fourPsHouseholdId])]);

      const permanentAddress = firstNonEmpty([pickLearnerField(learner, ['permanentAddress', 'permanent_address']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.permanentAddress])]);
      const currentAddress = firstNonEmpty([pickLearnerField(learner, ['currentAddress', 'current_address', 'address']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.currentAddress, latestSubmissionPayload.address])]);

      const fatherName = firstNonEmpty([pickLearnerField(learner, ['fatherName', 'father_name']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.fatherName, latestSubmissionPayload.father_name])]);
      const fatherContact = firstNonEmpty([pickLearnerField(learner, ['fatherContact', 'father_contact']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.fatherContact, latestSubmissionPayload.father_contact])]);
      const motherName = firstNonEmpty([pickLearnerField(learner, ['motherName', 'mother_name']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.motherName, latestSubmissionPayload.mother_name])]);
      const motherContact = firstNonEmpty([pickLearnerField(learner, ['motherContact', 'mother_contact']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.motherContact, latestSubmissionPayload.mother_contact])]);
      const guardianName = firstNonEmpty([pickLearnerField(learner, ['guardianName', 'guardian_name']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.guardianName, latestSubmissionPayload.guardian_name])]);
      const guardianContact = firstNonEmpty([pickLearnerField(learner, ['guardianContact', 'guardian_contact', 'contactNumber', 'contact_number']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.guardianContact, latestSubmissionPayload.guardian_contact])]);

      const hasSpedNeed = firstNonEmpty([pickLearnerField(learner, ['hasSpedNeed', 'has_sped_need']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.hasSpedNeed, latestSubmissionPayload.has_sped_need])]);
      const preferredModality = firstNonEmpty([pickLearnerField(learner, ['preferredModality', 'preferred_modality']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.preferredModality, latestSubmissionPayload.preferred_modality])]);
      const deviceAccess = firstNonEmpty([pickLearnerField(learner, ['deviceAccess', 'device_access']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.deviceAccess, latestSubmissionPayload.device_access])]);
      const hasInternet = firstNonEmpty([pickLearnerField(learner, ['hasInternet', 'has_internet']), latestSubmissionPayload && firstNonEmpty([latestSubmissionPayload.hasInternet, latestSubmissionPayload.has_internet])]);
      const verificationCard = await buildVerificationCard(learner);

      const enrollmentHistoryRows = (learner.enrollments || [])
        .map(
          (record) => `
            <tr>
              <td>${escapeHtml(toText(record.schoolYear))}</td>
              <td>${escapeHtml(toText(record.gradeLevel))}</td>
              <td>${escapeHtml(toText(record.section))}</td>
              <td>${escapeHtml(toText(record.enrollmentDate))}</td>
              <td>${escapeHtml(toText(record.status))}</td>
            </tr>
          `,
        )
        .join('');
      const latestEnrollmentSnapshot = latestEnrollment
        ? `
          <section class="block">
            <h3>7. Latest Enrollment Snapshot</h3>
            <div class="grid two">
              <p><strong>School Year:</strong> ${escapeHtml(toOptionalText(latestEnrollment.schoolYear))}</p>
              <p><strong>Grade Level:</strong> ${escapeHtml(toOptionalText(latestEnrollment.gradeLevel))}</p>
              <p><strong>Section:</strong> ${escapeHtml(toOptionalText(latestEnrollment.section))}</p>
              <p><strong>Enrollment Date:</strong> ${escapeHtml(toOptionalText(latestEnrollment.enrollmentDate))}</p>
              <p><strong>Status:</strong> ${escapeHtml(toOptionalText(latestEnrollment.status))}</p>
            </div>
          </section>
        `
        : '';

      return `
        <article class="sheet">
          ${buildLNHSPrintSheetHeader({ documentNo: 'LNHS-REG-USIS-F01', pageNumber: 1, titleText: 'USIS Learner Information Sheet', totalPages: 2 })}
          <div class="sheet-meta">
            <span>School Year: ${escapeHtml(schoolYearLabel)}</span>
            <span>Record Generated: ${escapeHtml(new Date().toLocaleString())}</span>
          </div>

          <section class="block">
            <h3>1. Learner Identity</h3>
            <div class="grid two">
              <p><strong>LRN:</strong> ${escapeHtml(toText(learner.lrn))}</p>
              <p><strong>Learner Name:</strong> ${escapeHtml(fullName)}</p>
              <p><strong>Gender:</strong> ${escapeHtml(toText(learner.gender))}</p>
              <p><strong>Birth Date:</strong> ${escapeHtml(toText(learner.birthDate))}</p>
              <p><strong>Email:</strong> ${escapeHtml(toText(learner.email))}</p>
              <p><strong>Status:</strong> ${escapeHtml(toText(learner.status))}</p>
              <p><strong>Extension Name:</strong> ${escapeHtml(toOptionalText(extensionName))}</p>
              <p><strong>Birth Certificate No.:</strong> ${escapeHtml(toOptionalText(birthCertificateNo))}</p>
              <p><strong>Place of Birth:</strong> ${escapeHtml(toOptionalText(placeOfBirth))}</p>
              <p><strong>Mother Tongue:</strong> ${escapeHtml(toOptionalText(motherTongue))}</p>
              <p><strong>Religion:</strong> ${escapeHtml(toOptionalText(religion))}</p>
            </div>
          </section>

          <section class="block">
            <h3>2. Enrollment Context</h3>
            <div class="grid two">
              <p><strong>School to Enroll:</strong> ${escapeHtml(toOptionalText(`${schoolToEnroll}${schoolId ? ` (${schoolId})` : ''}`.trim()))}</p>
              <p><strong>Learner Type:</strong> ${escapeHtml(toOptionalText(studentType))}</p>
              <p><strong>Learner Category:</strong> ${escapeHtml(toOptionalText(learnerCategory))}</p>
              <p><strong>Previous School:</strong> ${escapeHtml(toOptionalText(previousSchool))}</p>
              <p><strong>Last School Year Attended:</strong> ${escapeHtml(toOptionalText(previousSchoolYear))}</p>
              <p><strong>Last Grade Level Attended:</strong> ${escapeHtml(toOptionalText(lastGradeLevel))}</p>
              <p><strong>Current Grade Level:</strong> ${escapeHtml(toText(grade))}</p>
              <p><strong>Current Section:</strong> ${escapeHtml(toText(section))}</p>
              <p><strong>Enrollment Date:</strong> ${escapeHtml(toText(latestEnrollment?.enrollmentDate))}</p>
              <p><strong>Enrollment Status:</strong> ${escapeHtml(toText(latestEnrollment?.status || learner.status))}</p>
              <p><strong>Preferred Strand:</strong> ${escapeHtml(toOptionalText(strand))}</p>
              <p><strong>Semester:</strong> ${escapeHtml(toOptionalText(semester))}</p>
            </div>
          </section>

          <section class="block">
            <h3>3. Contact and Address</h3>
            <div class="grid two">
              <p><strong>Permanent Address:</strong> ${escapeHtml(toOptionalText(permanentAddress))}</p>
              <p><strong>Current Address:</strong> ${escapeHtml(toOptionalText(currentAddress))}</p>
              <p><strong>Learner Contact Number:</strong> ${escapeHtml(toOptionalText(pickLearnerField(learner, ['contactNumber', 'contact_number'])))}</p>
              <p><strong>4Ps Household ID:</strong> ${escapeHtml(toOptionalText(fourPsHouseholdId))}</p>
            </div>
          </section>

          <section class="block">
            <h3>4. Parent/Guardian Details</h3>
            <div class="grid two">
              <p><strong>Father Name:</strong> ${escapeHtml(toOptionalText(fatherName))}</p>
              <p><strong>Father Contact:</strong> ${escapeHtml(toOptionalText(fatherContact))}</p>
              <p><strong>Mother Name:</strong> ${escapeHtml(toOptionalText(motherName))}</p>
              <p><strong>Mother Contact:</strong> ${escapeHtml(toOptionalText(motherContact))}</p>
              <p><strong>Guardian Name:</strong> ${escapeHtml(toOptionalText(guardianName))}</p>
              <p><strong>Guardian Contact:</strong> ${escapeHtml(toOptionalText(guardianContact))}</p>
            </div>
          </section>

          <section class="block">
            <h3>5. Learner Category and Modality</h3>
            <div class="grid three">
              <p><strong>4Ps Beneficiary:</strong> ${yesNo(learner.is4Ps)}</p>
              <p><strong>SSLG Member:</strong> ${yesNo(learner.isSSLG)}</p>
              <p><strong>Club Officer:</strong> ${yesNo(learner.isClubOfficer)}</p>
              <p><strong>Athlete:</strong> ${yesNo(learner.isAthlete)}</p>
              <p><strong>Artist:</strong> ${yesNo(learner.isArtist)}</p>
              <p><strong>Indigent:</strong> ${yesNo(learner.isIndigent)}</p>
              <p><strong>SPED Need:</strong> ${yesNoText(hasSpedNeed)}</p>
              <p><strong>Preferred Modality:</strong> ${escapeHtml(toOptionalText(preferredModality))}</p>
              <p><strong>Preferred Device:</strong> ${escapeHtml(toOptionalText(deviceAccess))}</p>
              <p><strong>Internet Access:</strong> ${yesNoText(hasInternet)}</p>
            </div>
          </section>

          <section class="block">
            <h3>6. Portal Credentials</h3>
            <div class="grid two">
              <p><strong>Username:</strong> ${escapeHtml(toText(learner.loginUsername || learner.lrn))}</p>
              <p><strong>Login Status:</strong> ${escapeHtml(toText(learner.loginStatus || 'Active'))}</p>
            </div>
          </section>

          ${latestEnrollmentSnapshot}

        </article>

        <article class="sheet">
          ${buildLNHSPrintSheetHeader({ documentNo: 'LNHS-REG-USIS-F01', pageNumber: 2, titleText: 'USIS Learner Information Sheet', titleSuffix: ' - CONTINUATION', totalPages: 2 })}
          <div class="sheet-meta">
            <span>School Year: ${escapeHtml(schoolYearLabel)}</span>
            <span>Record Generated: ${escapeHtml(new Date().toLocaleString())}</span>
          </div>
          <section class="block">
            <h3>9. Enrollment History</h3>
            <table class="history">
              <thead>
                <tr>
                  <th>School Year</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Enrollment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${enrollmentHistoryRows || '<tr><td colspan="5">No enrollment history recorded.</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="verification-card">
            <div class="verification-card__copy">
              <h3>10. Document Verification</h3>
              <p>This QR code opens the public verification page for this learner information sheet.</p>
              <div class="verification-card__meta">
                <div><strong>Document No.:</strong> ${escapeHtml(verificationCard.documentNo)}</div>
                <div><strong>LRN:</strong> ${escapeHtml(toText(learner.lrn))}</div>
                <div><strong>Current Section:</strong> ${escapeHtml(toText(section))}</div>
              </div>
              <p class="verification-card__url">${escapeHtml(verificationCard.verificationUrl)}</p>
            </div>
            <div class="verification-card__qr">
              <img src="${verificationCard.qrDataUrl}" alt="Verification QR Code" />
              <span>Scan to verify</span>
            </div>
          </section>

        </article>
      `;
    }))).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>USIS Learner Information Sheet</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #fff; font-size: 9.5px; line-height: 1.3; }
          .sheet { width: 100%; page-break-after: always; }
          .sheet:last-child { page-break-after: auto; }
          .meta-header { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .meta-header td, .meta-header th { border: 1px solid #111; padding: 4px 6px; }
          .meta-header .logo-cell { width: 95px; text-align: center; }
          .meta-header .logo-cell img { width: 72px; height: 72px; object-fit: contain; }
          .meta-header .title-cell {
            text-align: center;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            padding: 0;
          }
          .meta-header .title-main,
          .meta-header .title-sub {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 46px;
            padding: 4px 8px;
            text-align: center;
            white-space: nowrap;
          }
          .meta-header .title-main { font-size: 14px; font-weight: 700; letter-spacing: 0.3px; border-bottom: 1px solid #111; }
          .meta-header .title-sub { font-size: 14px; font-weight: 700; line-height: 1.1; }
          .meta-header .docs-cell { width: 250px; padding: 0; }
          .docs-table { width: 100%; border-collapse: collapse; }
          .docs-table td {
            border: 1px solid #111;
            padding: 3px 5px;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            font-size: 10px;
            line-height: 1.15;
            text-align: center;
            white-space: normal;
            word-break: break-word;
          }
          .docs-table td:first-child { width: 58%; font-weight: 400; }
          .docs-table td:last-child { font-weight: 700; }
          .sheet-meta { margin: 6px 0 8px; font-size: 9.25px; color: #334155; display: flex; justify-content: space-between; gap: 8px; }
          .block { border: 1px solid #111; margin-bottom: 8px; border-radius: 2px; overflow: hidden; }
          .block h3 { margin: 0; padding: 5px 7px; font-size: 10.25px; font-weight: 700; background: #f2f5fa; border-bottom: 1px solid #111; text-transform: uppercase; letter-spacing: 0.02em; }
          .grid { display: grid; gap: 0; }
          .grid p { margin: 0; padding: 6px 7px; border-top: 1px solid #d9dfe8; font-size: 9.25px; line-height: 1.28; min-height: 18px; }
          .grid p strong { font-weight: 700; color: #0f172a; display: inline-block; min-width: 118px; }
          .grid.two { grid-template-columns: 1fr 1fr; }
          .grid.three { grid-template-columns: 1fr 1fr 1fr; }
          .grid.two p:nth-child(odd), .grid.three p { border-right: 1px solid #d9dfe8; }
          .grid.three p:nth-child(3n) { border-right: 0; }
          .history { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.25px; }
          .history th, .history td { border: 1px solid #111; padding: 6px 6px; text-align: left; vertical-align: top; }
          .history th { background: #f2f5fa; font-weight: 700; font-size: 9.25px; }
          .history tbody tr:nth-child(even) { background: #fafbfc; }
          .history td:last-child, .history th:last-child { text-align: center; width: 80px; }
          .verification-card {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 132px;
            gap: 10px;
            align-items: center;
            margin-top: 8px;
            padding: 10px 12px;
            border: 1px solid #111;
            border-radius: 2px;
            break-inside: avoid;
          }
          .verification-card h3 {
            margin: 0 0 7px;
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .verification-card p {
            margin: 0 0 9px;
            font-size: 9px;
            line-height: 1.4;
          }
          .verification-card__meta {
            display: grid;
            gap: 5px;
            margin-top: 7px;
            font-size: 9px;
          }
          .verification-card__url {
            margin-top: 9px;
            font-size: 8px;
            word-break: break-all;
          }
          .verification-card__qr {
            display: grid;
            justify-items: center;
            gap: 7px;
            padding: 9px;
            border: 1px solid #111;
          }
          .verification-card__qr img {
            width: 120px;
            height: 120px;
            object-fit: contain;
          }
          .verification-card__qr span {
            font-size: 9px;
            font-weight: 700;
          }
          @media print {
            .sheet { break-inside: avoid; }
            .block { break-inside: avoid; }
            .verification-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;
};

export const openLearnerInformationPrintWindow = (payload: PrintLearnerInformationPayload): boolean => {
  const printWindow = window.open('about:blank', '_blank', 'width=1280,height=860');
  if (!printWindow) return false;

  void (async () => {
    const html = await buildPrintHtml(payload);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onafterprint = () => {
      printWindow.close();
    };

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  })();

  return true;
};
