import { Section, Student } from '../../../../types';
const USIS_SEAL_SRC = new URL('../../../../../common/assets/USIS_Icon.png', import.meta.url).href;

type PrintLearnerInformationPayload = {
  learners: Student[];
  schoolYearLabel: string;
  sections: Section[];
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

const pickFromSubmissionPayload = (learner: Student, keys: string[]) => {
  const records = Array.isArray(learner.enrollments) ? [...learner.enrollments] : [];
  const snapshotCarrier = records.reverse().find((record: any) => record && typeof record === 'object' && record.submissionPayload);
  const payload = (snapshotCarrier as any)?.submissionPayload as Record<string, unknown> | undefined;
  if (!payload) return '';
  return firstNonEmpty(keys.map((key) => payload[key]));
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

const buildSheetHeader = (logoSrc: string, pageNumber: number, totalPages: number, titleSuffix = '') => `
  <table class="meta-header">
    <tr>
      <td class="logo-cell" rowspan="2">
        <img
          src="${logoSrc}"
          alt="USIS Seal"
          onerror="this.style.display='none';"
        />
      </td>
      <td class="title-cell" rowspan="2">
        <div class="title-main">LEON NATIONAL HIGH SCHOOL</div>
        <div class="title-sub">USIS LEARNER INFORMATION SHEET${titleSuffix}</div>
      </td>
      <td class="docs-cell" rowspan="2">
        <table class="docs-table">
          <tr><td>Document No.</td><td>LNHS-REG-USIS-F01</td></tr>
          <tr><td>Issue No.</td><td>1</td></tr>
          <tr><td>Revision No.</td><td>1</td></tr>
          <tr><td>Date of Effectivity</td><td>June 8, 2026</td></tr>
          <tr><td>Issued by</td><td>Registrar</td></tr>
          <tr><td>Page No.</td><td>Page ${pageNumber} of ${totalPages}</td></tr>
        </table>
      </td>
    </tr>
    <tr></tr>
  </table>
`;

const buildPrintHtml = ({ learners, schoolYearLabel, sections }: PrintLearnerInformationPayload) => {
  const logoSrc = USIS_SEAL_SRC;
  const sorted = [...learners].sort((a, b) =>
    `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase()),
  );

  const pagesHtml = sorted
    .map((learner) => {
      const fullName = `${learner.lastName}, ${learner.firstName}${learner.middleName ? ` ${learner.middleName}` : ''}`.trim();
      const grade = resolveGradeLabel(learner, sections);
      const section = resolveSectionLabel(learner, sections);
      const latestEnrollment = learner.enrollments?.[0];
      const studentType = firstNonEmpty([pickLearnerField(learner, ['studentType', 'student_type']), pickFromSubmissionPayload(learner, ['studentType'])]);
      const learnerCategory = firstNonEmpty([pickLearnerField(learner, ['learnerCategory', 'learner_category']), pickFromSubmissionPayload(learner, ['learnerCategory'])]);
      const schoolToEnroll = firstNonEmpty([pickLearnerField(learner, ['schoolToEnroll', 'school_to_enroll']), pickFromSubmissionPayload(learner, ['schoolToEnroll'])]);
      const schoolId = firstNonEmpty([pickLearnerField(learner, ['schoolId', 'school_id']), pickFromSubmissionPayload(learner, ['schoolId'])]);
      const previousSchool = firstNonEmpty([pickLearnerField(learner, ['previousSchool', 'previous_school']), pickFromSubmissionPayload(learner, ['previousSchool'])]);
      const previousSchoolYear = firstNonEmpty([pickLearnerField(learner, ['previousSchoolYear', 'previous_school_year']), pickFromSubmissionPayload(learner, ['previousSchoolYear'])]);
      const lastGradeLevel = firstNonEmpty([pickLearnerField(learner, ['lastGradeLevel', 'last_grade_level']), pickFromSubmissionPayload(learner, ['lastGradeLevel'])]);
      const strand = firstNonEmpty([pickLearnerField(learner, ['strand']), pickFromSubmissionPayload(learner, ['strand'])]);
      const semester = firstNonEmpty([pickLearnerField(learner, ['semester']), pickFromSubmissionPayload(learner, ['semester'])]);

      const birthCertificateNo = firstNonEmpty([pickLearnerField(learner, ['birthCertificateNo', 'birth_certificate_no']), pickFromSubmissionPayload(learner, ['birthCertificateNo'])]);
      const extensionName = firstNonEmpty([pickLearnerField(learner, ['extensionName', 'extension_name']), pickFromSubmissionPayload(learner, ['extensionName'])]);
      const placeOfBirth = firstNonEmpty([pickLearnerField(learner, ['placeOfBirth', 'place_of_birth']), pickFromSubmissionPayload(learner, ['placeOfBirth'])]);
      const motherTongue = firstNonEmpty([pickLearnerField(learner, ['motherTongue', 'mother_tongue']), pickFromSubmissionPayload(learner, ['motherTongue'])]);
      const religion = firstNonEmpty([pickLearnerField(learner, ['religion']), pickFromSubmissionPayload(learner, ['religion'])]);
      const fourPsHouseholdId = firstNonEmpty([pickLearnerField(learner, ['fourPsHouseholdId', 'four_ps_household_id']), pickFromSubmissionPayload(learner, ['fourPsHouseholdId'])]);

      const permanentAddress = firstNonEmpty([pickLearnerField(learner, ['permanentAddress', 'permanent_address']), pickFromSubmissionPayload(learner, ['permanentAddress'])]);
      const currentAddress = firstNonEmpty([pickLearnerField(learner, ['currentAddress', 'current_address', 'address']), pickFromSubmissionPayload(learner, ['currentAddress'])]);

      const fatherName = firstNonEmpty([pickLearnerField(learner, ['fatherName', 'father_name']), pickFromSubmissionPayload(learner, ['fatherName'])]);
      const fatherContact = firstNonEmpty([pickLearnerField(learner, ['fatherContact', 'father_contact']), pickFromSubmissionPayload(learner, ['fatherContact'])]);
      const motherName = firstNonEmpty([pickLearnerField(learner, ['motherName', 'mother_name']), pickFromSubmissionPayload(learner, ['motherName'])]);
      const motherContact = firstNonEmpty([pickLearnerField(learner, ['motherContact', 'mother_contact']), pickFromSubmissionPayload(learner, ['motherContact'])]);
      const guardianName = firstNonEmpty([pickLearnerField(learner, ['guardianName', 'guardian_name']), pickFromSubmissionPayload(learner, ['guardianName'])]);
      const guardianContact = firstNonEmpty([pickLearnerField(learner, ['guardianContact', 'guardian_contact', 'contactNumber', 'contact_number']), pickFromSubmissionPayload(learner, ['guardianContact'])]);

      const hasSpedNeed = firstNonEmpty([pickLearnerField(learner, ['hasSpedNeed', 'has_sped_need']), pickFromSubmissionPayload(learner, ['hasSpedNeed'])]);
      const preferredModality = firstNonEmpty([pickLearnerField(learner, ['preferredModality', 'preferred_modality']), pickFromSubmissionPayload(learner, ['preferredModality'])]);
      const deviceAccess = firstNonEmpty([pickLearnerField(learner, ['deviceAccess', 'device_access']), pickFromSubmissionPayload(learner, ['deviceAccess'])]);
      const hasInternet = firstNonEmpty([pickLearnerField(learner, ['hasInternet', 'has_internet']), pickFromSubmissionPayload(learner, ['hasInternet'])]);

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

      return `
        <article class="sheet">
          ${buildSheetHeader(logoSrc, 1, 2)}
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
              <p><strong>Student Type:</strong> ${escapeHtml(toOptionalText(studentType))}</p>
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

        </article>

        <article class="sheet">
          ${buildSheetHeader(logoSrc, 2, 2, ' - CONTINUATION')}
          <div class="sheet-meta">
            <span>School Year: ${escapeHtml(schoolYearLabel)}</span>
            <span>Record Generated: ${escapeHtml(new Date().toLocaleString())}</span>
          </div>
          <section class="block">
            <h3>6. Portal Credentials</h3>
            <div class="grid two">
              <p><strong>Username:</strong> ${escapeHtml(toText(learner.loginUsername || learner.lrn))}</p>
              <p><strong>Login Status:</strong> ${escapeHtml(toText(learner.loginStatus || 'Active'))}</p>
            </div>
          </section>
          <section class="block">
            <h3>7. Enrollment History</h3>
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
        </article>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>USIS Learner Information Sheet</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #fff; }
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
            padding: 2px 6px;
            font-family: "Bookman Old Style", "Book Antiqua", serif;
            font-size: 11px;
            text-align: center;
            white-space: nowrap;
          }
          .docs-table td:first-child { width: 58%; font-weight: 400; }
          .docs-table td:last-child { font-weight: 700; }
          .sheet-meta { margin: 6px 0 10px; font-size: 10.5px; color: #334155; display: flex; justify-content: space-between; gap: 8px; }
          .block { border: 1px solid #111; margin-bottom: 10px; border-radius: 2px; overflow: hidden; }
          .block h3 { margin: 0; padding: 6px 8px; font-size: 11.5px; font-weight: 700; background: #f2f5fa; border-bottom: 1px solid #111; text-transform: uppercase; letter-spacing: 0.03em; }
          .grid { display: grid; gap: 0; }
          .grid p { margin: 0; padding: 7px 8px; border-top: 1px solid #d9dfe8; font-size: 10.5px; line-height: 1.35; min-height: 18px; }
          .grid p strong { font-weight: 700; color: #0f172a; display: inline-block; min-width: 138px; }
          .grid.two { grid-template-columns: 1fr 1fr; }
          .grid.three { grid-template-columns: 1fr 1fr 1fr; }
          .grid.two p:nth-child(odd), .grid.three p { border-right: 1px solid #d9dfe8; }
          .grid.three p:nth-child(3n) { border-right: 0; }
          .history { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
          .history th, .history td { border: 1px solid #111; padding: 5px 6px; text-align: left; vertical-align: top; }
          .history th { background: #f2f5fa; font-weight: 700; font-size: 10px; }
          .history tbody tr:nth-child(even) { background: #fafbfc; }
          .history td:last-child, .history th:last-child { text-align: center; width: 80px; }
          @media print { .sheet { break-inside: avoid; } }
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

  const html = buildPrintHtml(payload);
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

  return true;
};
