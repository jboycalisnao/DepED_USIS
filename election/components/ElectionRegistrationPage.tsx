import React, { useMemo, useState } from 'react';
import { ElectionRegistrationRecord } from '../types';
import { FloatingField } from './ui/FloatingField';
import {
  clearElectionRegistrationAccess,
  generateElectionCode,
  getStoredElectionRegistration,
  getStoredElectionRegistrationAccess,
  resolveElectionRegistrationAccess,
  storeElectionRegistration,
  storeElectionRegistrationAccess,
  TEMP_ELECTION_REGISTRATION_CREDENTIALS,
} from '../utils/electionRegistration';
import { navigateToElectionPath } from '../utils/navigation';

const DEFAULT_SCHOOL_DIVISION = 'Schools Division of Iloilo';
const DEFAULT_SCHOOL_REGION = 'Region VI - Western Visayas';

interface ElectionRegistrationPageProps {
  adminWorkspace?: React.ReactNode;
  onRegistrationGenerated: (record: ElectionRegistrationRecord) => void;
  onStepChange: (step: 'access' | 'setup') => void;
  schoolName: string;
  schoolYearLabel: string;
  step: 'access' | 'setup';
}

const ElectionRegistrationPage: React.FC<ElectionRegistrationPageProps> = ({
  adminWorkspace,
  onRegistrationGenerated,
  onStepChange,
  schoolName,
  schoolYearLabel,
  step,
}) => {
  const [accessForm, setAccessForm] = useState({
    password: TEMP_ELECTION_REGISTRATION_CREDENTIALS.password,
    schoolId: TEMP_ELECTION_REGISTRATION_CREDENTIALS.schoolId,
    username: TEMP_ELECTION_REGISTRATION_CREDENTIALS.username,
  });
  const [accessError, setAccessError] = useState('');
  const [isAccessSubmitting, setIsAccessSubmitting] = useState(false);
  const [accessProfile, setAccessProfile] = useState<null | {
    coordinatorName: string;
    coordinatorRole: string;
    coordinatorSchoolAffiliation: string;
    schoolAddress: string;
    schoolDivision?: string;
    schoolId: string;
    schoolName: string;
    schoolRegion?: string;
  }>(() => getStoredElectionRegistrationAccess());
  const [registrationForm, setRegistrationForm] = useState({
    electionName: 'Learner Government Election',
    electionScope: 'Schoolwide',
    electionType: 'Learner Government',
    filingEndDate: '',
    filingStartDate: '',
    notes: '',
    schoolYearLabel,
    votingDate: '',
  });
  const [generatedRecord, setGeneratedRecord] = useState<ElectionRegistrationRecord | null>(
    () => getStoredElectionRegistration(),
  );

  const currentRecord = useMemo(
    () => generatedRecord || getStoredElectionRegistration(),
    [generatedRecord],
  );

  const handleLogout = () => {
    clearElectionRegistrationAccess();
    setAccessProfile(null);
    setGeneratedRecord(null);
    setAccessError('');
    setAccessForm({
      password: TEMP_ELECTION_REGISTRATION_CREDENTIALS.password,
      schoolId: TEMP_ELECTION_REGISTRATION_CREDENTIALS.schoolId,
      username: TEMP_ELECTION_REGISTRATION_CREDENTIALS.username,
    });
    onStepChange('access');
    navigateToElectionPath('/election-registration');
  };

  const handleAccessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsAccessSubmitting(true);
    try {
      const result = await resolveElectionRegistrationAccess(
        accessForm.schoolId,
        accessForm.username,
        accessForm.password,
        schoolName,
      );

      if (result.error || !result.record) {
        setAccessError(result.error || 'Unable to validate access.');
        return;
      }

      storeElectionRegistrationAccess(result.record);
      setAccessProfile(result.record);
      setAccessError('');
      onStepChange('setup');
      navigateToElectionPath('/election-registration/setup');
    } finally {
      setIsAccessSubmitting(false);
    }
  };

  const handleGenerateCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessProfile) return;

    const code = generateElectionCode(registrationForm.schoolYearLabel || schoolYearLabel);
    const record: ElectionRegistrationRecord = {
      coordinatorName: accessProfile.coordinatorName,
      coordinatorRole: accessProfile.coordinatorRole,
      coordinatorSchoolAffiliation: accessProfile.coordinatorSchoolAffiliation,
      electionCode: code,
      electionName: registrationForm.electionName,
      electionScope: registrationForm.electionScope,
      electionType: registrationForm.electionType,
      filingEndDate: registrationForm.filingEndDate,
      filingStartDate: registrationForm.filingStartDate,
      generatedAt: new Date().toISOString(),
      id: `ereg-${Date.now()}`,
      notes: registrationForm.notes,
      schoolAddress: accessProfile.schoolAddress,
      schoolDivision: accessProfile.schoolDivision || DEFAULT_SCHOOL_DIVISION,
      schoolId: accessProfile.schoolId,
      schoolName: accessProfile.schoolName,
      schoolRegion: accessProfile.schoolRegion || DEFAULT_SCHOOL_REGION,
      schoolYearLabel: registrationForm.schoolYearLabel,
      votingDate: registrationForm.votingDate,
    };

    storeElectionRegistration(record);
    setGeneratedRecord(record);
    onRegistrationGenerated(record);
  };

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-10">
      {step === 'access' && (
        <>
          <div className="max-w-[860px]">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Coordinator Access
            </p>
            <h2 className="mt-0 text-[24px] font-black uppercase tracking-[-0.03em] text-[#0038a8]">
              Election Registration Login
            </h2>
          </div>
          <form className="mt-[22px] grid gap-5" onSubmit={handleAccessSubmit}>
            <FloatingField
              id="school-id"
              label="School ID"
              onChange={(event) => setAccessForm({ ...accessForm, schoolId: event.target.value })}
              required
              value={accessForm.schoolId}
            />
            <FloatingField
              id="coordinator-username"
              label="Username"
              onChange={(event) => setAccessForm({ ...accessForm, username: event.target.value })}
              required
              value={accessForm.username}
            />
            <FloatingField
              id="coordinator-password"
              label="Password"
              onChange={(event) => setAccessForm({ ...accessForm, password: event.target.value })}
              required
              type="password"
              value={accessForm.password}
            />
            {accessError && <p className="m-0 text-[13px] font-bold text-[#E11C38]">{accessError}</p>}
            <div className="flex justify-end border-t border-slate-200 pt-5">
              <button
                disabled={isAccessSubmitting}
                className="min-w-[156px] rounded-[4px] bg-[#0038a8] px-[22px] py-[14px] text-[13px] font-bold uppercase tracking-[0.08em] text-white"
                type="submit"
              >
                {isAccessSubmitting ? 'Checking Registry...' : 'Continue'}
              </button>
            </div>
          </form>
        </>
      )}

      {step === 'setup' && (
        <>
          <div className="flex flex-col gap-4 border-b border-[rgba(18,35,61,0.12)] pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Coordinator Workspace
              </p>
              <h1 className="mt-2 text-[24px] font-black uppercase text-[#034F8B]">
                Election Setup and Administration
              </h1>
              <p className="mt-2 text-[16px] leading-[1.5] text-slate-600">
                Generate the active election code, confirm registration details, and manage election operations from one page.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 self-start rounded-[4px] border border-slate-200 bg-white px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-50"
            >
              <i className="fa-solid fa-right-from-bracket text-[13px]"></i>
              <span>Logout</span>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-[24px] font-black uppercase text-[#034F8B]">Registration Context</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">School Information</p>
                  <p className="mt-2 text-[16px] leading-[1.5] text-slate-900">{accessProfile?.schoolId || 'Pending access login'}</p>
                  <p className="text-[16px] leading-[1.5] text-slate-900">{accessProfile?.schoolName || schoolName}</p>
                  <p className="text-[16px] leading-[1.5] text-slate-600">
                    {accessProfile?.schoolAddress || 'School address will appear after coordinator access validation.'}
                  </p>
                </div>
                <div>
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">User Information</p>
                  <p className="mt-2 text-[16px] leading-[1.5] text-slate-900">{accessProfile?.coordinatorName || 'Pending access login'}</p>
                  <p className="text-[16px] leading-[1.5] text-slate-900">{accessProfile?.coordinatorRole || 'Election Coordinator'}</p>
                  <p className="text-[16px] leading-[1.5] text-slate-600">{accessProfile?.coordinatorSchoolAffiliation || schoolName}</p>
                </div>
              </div>
            </div>

            <form
              className="rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm"
              onSubmit={handleGenerateCode}
            >
              <h2 className="text-[24px] font-black uppercase text-[#034F8B]">Election Form</h2>
              <div className="mt-5 grid grid-cols-1 gap-4">
                <FloatingField
                  id="election-name"
                  label="Election Name"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, electionName: event.target.value })
                  }
                  required
                  value={registrationForm.electionName}
                />
                <FloatingField
                  id="election-type"
                  label="Election Type"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, electionType: event.target.value })
                  }
                  required
                  value={registrationForm.electionType}
                />
                <FloatingField
                  id="election-scope"
                  label="Election Scope"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, electionScope: event.target.value })
                  }
                  required
                  value={registrationForm.electionScope}
                />
                <FloatingField
                  id="election-school-year"
                  label="School Year"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, schoolYearLabel: event.target.value })
                  }
                  required
                  value={registrationForm.schoolYearLabel}
                />
                <FloatingField
                  id="filing-start-date"
                  label="Filing Start Date"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, filingStartDate: event.target.value })
                  }
                  required
                  type="date"
                  value={registrationForm.filingStartDate}
                />
                <FloatingField
                  id="filing-end-date"
                  label="Filing End Date"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, filingEndDate: event.target.value })
                  }
                  required
                  type="date"
                  value={registrationForm.filingEndDate}
                />
                <FloatingField
                  id="voting-date"
                  label="Voting Date"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, votingDate: event.target.value })
                  }
                  required
                  type="date"
                  value={registrationForm.votingDate}
                />
                <FloatingField
                  as="textarea"
                  id="election-notes"
                  label="Notes"
                  onChange={(event) =>
                    setRegistrationForm({ ...registrationForm, notes: event.target.value })
                  }
                  value={registrationForm.notes}
                />
              </div>
              <div className="mt-5 border-t border-slate-200 pt-4 text-right">
                <button
                  className="rounded-[4px] bg-[#0038a8] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white"
                  type="submit"
                >
                  Generate Election Code
                </button>
              </div>
            </form>
          </div>

          {currentRecord && (
            <div className="mt-6 rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Active Election Code
              </p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[24px] font-black uppercase text-[#034F8B]">
                    {currentRecord.electionCode}
                  </h2>
                  <p className="mt-2 text-[16px] leading-[1.5] text-slate-600">
                    {currentRecord.electionName} • {currentRecord.schoolYearLabel}
                  </p>
                </div>
                <p className="text-[13px] leading-[1.5] text-slate-500">
                  Generated {new Date(currentRecord.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {adminWorkspace ? (
            <div className="mt-6 rounded-[12px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <div className="border-b border-[rgba(18,35,61,0.12)] pb-4">
                <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Election Services
                </p>
                <h2 className="mt-2 text-[24px] font-black uppercase text-[#034F8B]">
                  Administration Workspace
                </h2>
              </div>
              <div className="mt-5">{adminWorkspace}</div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};

export default ElectionRegistrationPage;
