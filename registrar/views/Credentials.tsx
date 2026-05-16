import React, { useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import TopCenterAlert from '../components/TopCenterAlert';
import { GradeLevel, Student } from '../types';
import { useStore } from '../store';
import { openCredentialsPrintWindow } from '../features/registrar/credentials/utils/printCredentials';
import { CredentialsSectionGroup } from './credentials/CredentialsSectionGroup';

const Credentials: React.FC = () => {
  const { learners, sections, activeSchoolYear, gradeLevels, updateLearnerCredentials, updateLearner, loading } = useStore();
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevels[0] || GradeLevel.GRADE_7);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<string>>(new Set());
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());
  const [pendingMicrosoftAccountLearnerId, setPendingMicrosoftAccountLearnerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sectionsForGrade = useMemo(
    () =>
      sections
        .filter((section) => section.gradeLevel === selectedGrade && section.schoolYearId === activeSchoolYear.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sections, selectedGrade, activeSchoolYear.id],
  );

  const sectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    sectionsForGrade.forEach((section) => {
      map[section.id] = `${section.name}${section.strand ? ` (${section.strand})` : ''}`;
    });
    return map;
  }, [sectionsForGrade]);

  const targetLearners = useMemo(() => {
    const activeSectionIds = new Set(sectionsForGrade.map((section) => section.id));
    const scopeFiltered =
      selectedSectionId === 'all'
        ? learners.filter((learner) => activeSectionIds.has(String(learner.sectionId || '').trim()))
        : learners.filter((learner) => String(learner.sectionId || '').trim() === selectedSectionId);
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? scopeFiltered.filter((learner) => {
          const sectionLabel = sectionMap[String(learner.sectionId || '').trim()] || '';
          const searchable = [
            learner.lrn,
            learner.lastName,
            learner.firstName,
            learner.middleName || '',
            learner.loginUsername || '',
            learner.loginStatus || '',
            sectionLabel,
          ]
            .join(' ')
            .toLowerCase();
          return searchable.includes(query);
        })
      : scopeFiltered;
    return filtered.sort((a, b) =>
      `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase()),
    );
  }, [learners, sectionsForGrade, selectedSectionId, searchTerm, sectionMap]);

  useEffect(() => {
    setSelectedLearnerIds((prev) => {
      const valid = new Set(targetLearners.map((learner) => learner.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [targetLearners]);

  const selectedLearners = useMemo(
    () => targetLearners.filter((learner) => selectedLearnerIds.has(learner.id)),
    [targetLearners, selectedLearnerIds],
  );

  const groupedBySection = useMemo(() => {
    const groups: Record<string, { sectionLabel: string; learners: Student[] }> = {};
    targetLearners.forEach((learner) => {
      const sectionId = String(learner.sectionId || '').trim() || 'unassigned';
      const sectionLabel = sectionMap[sectionId] || 'Unassigned';
      if (!groups[sectionId]) groups[sectionId] = { sectionLabel, learners: [] };
      groups[sectionId].learners.push(learner);
    });

    return Object.entries(groups)
      .sort(([, a], [, b]) => a.sectionLabel.localeCompare(b.sectionLabel))
      .map(([sectionId, value]) => ({ sectionId, sectionLabel: value.sectionLabel, learners: value.learners }));
  }, [targetLearners]);

  useEffect(() => {
    setExpandedSectionIds(new Set());
  }, [selectedGrade, selectedSectionId, searchTerm]);

  const isPolicyCompliantPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

  const createPolicyPassword = (learner: Student) => {
    const sanitizedLastName = String(learner.lastName || 'Learner').replace(/[^a-zA-Z]/g, '');
    const firstUpper = (sanitizedLastName.charAt(0) || 'L').toUpperCase();
    const lowerSegment = (sanitizedLastName.slice(1, 4) || 'ear').toLowerCase();
    const digitSegment = String(learner.lrn || '')
      .replace(/\D/g, '')
      .slice(-4)
      .padStart(4, '0');
    const candidate = `${firstUpper}${lowerSegment}${digitSegment}`;
    return candidate.length >= 8 ? candidate : `${candidate}a9`;
  };

  const createUniquePolicyPassword = (learner: Student, used: Set<string>) => {
    const base = createPolicyPassword(learner);
    if (!used.has(base)) {
      used.add(base);
      return base;
    }

    let attempt = 1;
    while (attempt < 10000) {
      const suffix = String(attempt).padStart(2, '0');
      const trimmedBase = base.slice(0, Math.max(0, 8 - suffix.length));
      const candidate = `${trimmedBase}${suffix}`;
      if (isPolicyCompliantPassword(candidate) && !used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
      attempt += 1;
    }

    const fallback = `${base.slice(0, 5)}Aa9${Date.now().toString().slice(-3)}`.slice(0, 11);
    used.add(fallback);
    return fallback;
  };

  const toggleLearner = (id: string) => {
    setSelectedLearnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const listedIds = targetLearners.map((learner) => learner.id);
    setSelectedLearnerIds((prev) => {
      const next = new Set(prev);
      const allSelected = listedIds.length > 0 && listedIds.every((id) => next.has(id));
      if (allSelected) listedIds.forEach((id) => next.delete(id));
      else listedIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const buildMicrosoftUsername = (learner: Student) => {
    const safeCompact = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '');

    const first = safeCompact(learner.firstName || 'learner');
    const last = safeCompact(learner.lastName || 'user');
    return `${first}.${last}@leonnhs.edu.ph`;
  };

  const createMicrosoftAccount = async (learner: Student) => {
    try {
      setPendingMicrosoftAccountLearnerId(learner.id);
      const displayName = `${learner.firstName} ${learner.lastName}`.trim();
      const userPrincipalName = buildMicrosoftUsername(learner);
      const mailNickname = userPrincipalName.split('@')[0].replace(/\./g, '');
      const temporaryPassword = learner.loginPassword || createPolicyPassword(learner);

      const response = await fetch('/api/microsoft-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId: learner.id,
          displayName,
          mailNickname,
          userPrincipalName,
          temporaryPassword,
        }),
      });

      const raw = await response.text();
      const result = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        if (response.status === 409) {
          const linkedUpn = String(result?.userPrincipalName || learner.microsoftUpn || '').trim();
          setFeedback(linkedUpn ? `Learner already linked to Microsoft account: ${linkedUpn}` : 'Learner already has a Microsoft account.');
          return;
        }
        const missingVars = Array.isArray(result?.missing) ? result.missing.join(', ') : '';
        const details = result?.details ? ` (${String(result.details)})` : '';
        const missingText = missingVars ? ` Missing: ${missingVars}.` : '';
        setFeedback(
          result?.error
            ? `Microsoft account creation failed: ${result.error}.${missingText}${details}`.replace('..', '.')
            : 'Microsoft account creation failed.',
        );
        return;
      }

      const createdUserId = String(result?.id || '').trim();
      const resolvedUpn = String(result?.userPrincipalName || userPrincipalName).trim();
      const nowIso = new Date().toISOString();
      const syncResult = await updateLearner(learner.id, {
        microsoftUserId: createdUserId || learner.microsoftUserId || '',
        microsoftUpn: resolvedUpn,
        microsoftMailNickname: mailNickname,
        microsoftAccountStatus: 'Active',
        microsoftLicenseSkuId: String((result?.licenseAssignmentResult?.assignedLicenses?.[0]?.skuId || '')).trim(),
        microsoftCreatedAt: learner.microsoftCreatedAt || nowIso,
        microsoftLastSyncedAt: nowIso,
      });

      if (syncResult?.error) {
        setFeedback(`Microsoft account created (${resolvedUpn}) but failed to save link in learner record: ${syncResult.error}`);
        return;
      }

      setFeedback(`Microsoft account created for ${displayName}: ${userPrincipalName}`);
    } catch (error: any) {
      setFeedback(`Microsoft account creation failed: ${error?.message || 'Unexpected error'}`);
    } finally {
      setPendingMicrosoftAccountLearnerId(null);
    }
  };

  const generateCredentials = async () => {
    if (selectedLearners.length === 0) return setFeedback('Select at least one learner first.');
    const selectedIdSet = new Set(selectedLearners.map((learner) => learner.id));
    const usedPasswords = new Set(
      learners
        .filter((learner) => !selectedIdSet.has(learner.id))
        .map((learner) => String(learner.loginPassword || '').trim())
        .filter((password) => password.length > 0),
    );
    const payload = selectedLearners.map((learner) => ({
      ...(function () {
        const existing = String(learner.loginPassword || '').trim();
        const uniqueExisting = existing && isPolicyCompliantPassword(existing) && !usedPasswords.has(existing);
        const password = uniqueExisting ? existing : createUniquePolicyPassword(learner, usedPasswords);
        if (uniqueExisting) usedPasswords.add(existing);
        return {
          id: learner.id,
          loginUsername: learner.loginUsername?.trim() || learner.lrn,
          loginPassword: password,
          loginStatus: 'Active' as const,
        };
      })(),
    }));
    const result = await updateLearnerCredentials(payload);
    if (result.error) setFeedback(result.error);
    else setFeedback(`Credentials generated for ${payload.length} learner(s).`);
  };

  const resetCredentials = async () => {
    if (selectedLearners.length === 0) return setFeedback('Select at least one learner first.');
    const usedPasswords = new Set(
      learners
        .map((learner) => String(learner.loginPassword || '').trim())
        .filter((password) => password.length > 0),
    );
    const payload = selectedLearners.map((learner) => ({
      id: learner.id,
      loginUsername: learner.lrn,
      loginPassword: createUniquePolicyPassword(learner, usedPasswords),
      loginStatus: 'Active',
    }));
    const result = await updateLearnerCredentials(payload);
    if (result.error) setFeedback(result.error);
    else setFeedback(`Credentials reset for ${payload.length} learner(s).`);
  };

  const openPrintPopup = () => {
    const printableLearners = selectedLearners.length > 0 ? selectedLearners : targetLearners;
    if (printableLearners.length === 0) {
      setFeedback('No learners available to print in the selected scope.');
      return;
    }
    const scopeLabel = selectedSectionId === 'all' ? `All Sections in ${selectedGrade}` : sectionMap[selectedSectionId] || selectedGrade;
    const ok = openCredentialsPrintWindow({
      learners: printableLearners,
      sectionMap,
      schoolYearLabel: activeSchoolYear.label,
      gradeLabel: selectedGrade,
      scopeLabel,
      createDefaultPassword: createPolicyPassword,
    });
    if (!ok) setFeedback('Popup blocked. Allow popups for this site to print credentials.');
  };

  const gradeOptions = gradeLevels.map((grade) => ({ value: grade, label: grade }));
  const sectionOptions = [
    { value: 'all', label: `All Sections in ${selectedGrade}` },
    ...sectionsForGrade.map((section) => ({
      value: section.id,
      label: `${section.name}${section.strand ? ` (${section.strand})` : ''}`,
    })),
  ];

  const allVisibleSelected = targetLearners.length > 0 && targetLearners.every((learner) => selectedLearnerIds.has(learner.id));

  return (
    <div className="registrar-credentials-page">
      <div className="registrar-credentials-page__controls">
        <h3>Student Credentials</h3>
        <div className="registrar-credentials-page__filters">
          <SearchableSelect
            label="Grade Level"
            placeholder="Select Grade Level"
            floatingLabel
            showLabel={false}
            value={selectedGrade}
            onChange={(value) => {
              setSelectedGrade(value as GradeLevel);
              setSelectedSectionId('all');
            }}
            options={gradeOptions}
          />
          <SearchableSelect
            label="Section Scope"
            placeholder="Select Section Scope"
            floatingLabel
            showLabel={false}
            value={selectedSectionId}
            onChange={setSelectedSectionId}
            options={sectionOptions}
          />
        </div>
        <div className="floating-field registrar-floating-search">
          <label className="floating-field__control">
            <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder=" " />
            <span>Search Learner</span>
            {searchTerm.trim() && (
              <button
                type="button"
                className="registrar-floating-search__clear"
                onClick={() => setSearchTerm('')}
                aria-label="Clear learner search"
                title="Clear"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
          </label>
        </div>

        <div className="registrar-credentials-page__actions">
          <button type="button" className="secondary-button" onClick={toggleSelectAll}>
            {allVisibleSelected ? 'Unselect All' : 'Select All'}
          </button>
          <button type="button" className="primary-button" onClick={generateCredentials} disabled={loading || selectedLearners.length === 0}>
            Generate Credentials
          </button>
          <button type="button" className="secondary-button" onClick={resetCredentials} disabled={loading || selectedLearners.length === 0}>
            Reset Credentials
          </button>
          <button type="button" className="secondary-button" onClick={openPrintPopup}>
            Print Credentials List
          </button>
          <span className="registrar-credentials-page__counter">
            {selectedLearners.length} selected / {targetLearners.length} listed
          </span>
        </div>

        <TopCenterAlert open={!!feedback} title="Credentials Notice" message={feedback || ''} type="accent" onClose={() => setFeedback(null)} />
      </div>

      <div className="registrar-credentials-page__table">
        <table className="usis-table">
          <colgroup>
            <col style={{ width: '46px' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '21%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all listed learners" />
              </th>
              <th>Section</th>
              <th>LRN</th>
              <th>Learner Name</th>
              <th>Username</th>
              <th>Password</th>
              <th>Status</th>
              <th>Microsoft</th>
              <th>Microsoft Email</th>
            </tr>
          </thead>
          <tbody>
            {groupedBySection.map((group) => (
              <CredentialsSectionGroup
                key={group.sectionId}
                sectionLabel={group.sectionLabel}
                learners={group.learners}
                isExpanded={expandedSectionIds.has(group.sectionId)}
                onToggle={() => toggleSection(group.sectionId)}
                selectedLearnerIds={selectedLearnerIds}
                toggleLearner={toggleLearner}
                createPolicyPassword={createPolicyPassword}
                pendingMicrosoftAccountLearnerId={pendingMicrosoftAccountLearnerId}
                onCreateMicrosoftAccount={createMicrosoftAccount}
              />
            ))}
            {targetLearners.length === 0 ? (
              <tr>
                <td colSpan={9} className="registrar-credentials-page__empty">No learners found for selected grade and section.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Credentials;
