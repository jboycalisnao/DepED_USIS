import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../common/components/ui/UsisGradeSectionList';
import TopCenterAlert from '../components/TopCenterAlert';
import { GradeLevel, Student } from '../types';
import { useStore } from '../store';
import { openCredentialsPrintWindow, openMicrosoftCredentialsPrintWindow } from '../features/registrar/credentials/utils/printCredentials';
import { CredentialsActions } from './credentials/CredentialsActions';
import { CredentialsFilters } from './credentials/CredentialsFilters';
import { CredentialsSectionTable } from './credentials/CredentialsSectionTable';
import { buildMicrosoftUsername, createPolicyPassword, createUniquePolicyPassword } from './credentials/credentialsHelpers';

const Credentials: React.FC = () => {
  const navigate = useNavigate();
  const { learners, sections, activeSchoolYear, gradeLevels, updateLearnerCredentials, updateLearner, loading } = useStore();
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevels[0] || GradeLevel.GRADE_7);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<string>>(new Set());
  const [pendingMicrosoftAccountLearnerId, setPendingMicrosoftAccountLearnerId] = useState<string | null>(null);
  const [pendingStatusToggleLearnerId, setPendingStatusToggleLearnerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sectionsForGrade = useMemo(
    () =>
      sections
        .filter((section) =>
          section.gradeLevel === selectedGrade &&
          String(section.schoolYearId || '').trim() === String(activeSchoolYear.id || '').trim(),
        )
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
    const hasEnrollmentInActiveSchoolYear = (learner: Student) =>
      (Array.isArray(learner.enrollments) ? learner.enrollments : []).some((entry) => String(entry?.schoolYear || '').trim() === activeSchoolYear.label);

    const activeSectionIds = new Set(sectionsForGrade.map((section) => section.id));
    const scopeFiltered = selectedSectionId === 'all'
      ? learners.filter((learner) => activeSectionIds.has(String(learner.sectionId || '').trim()))
      : learners.filter((learner) => String(learner.sectionId || '').trim() === selectedSectionId);
    const historyFiltered = scopeFiltered.filter(hasEnrollmentInActiveSchoolYear);
    const query = searchTerm.trim().toLowerCase();

    const filtered = query
      ? historyFiltered.filter((learner) =>
          [
            learner.lrn,
            learner.lastName,
            learner.firstName,
            learner.middleName || '',
            learner.loginUsername || '',
            learner.loginStatus || '',
            sectionMap[String(learner.sectionId || '').trim()] || '',
          ].join(' ').toLowerCase().includes(query))
      : historyFiltered;

    return filtered.sort((a, b) =>
      `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase()),
    );
  }, [learners, sectionsForGrade, selectedSectionId, searchTerm, sectionMap, activeSchoolYear.label]);

  useEffect(() => {
    setSelectedLearnerIds((prev) => {
      const valid = new Set(targetLearners.map((learner) => learner.id));
      const next = new Set<string>();
      prev.forEach((id) => { if (valid.has(id)) next.add(id); });
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
  }, [targetLearners, sectionMap]);

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

  const copyCellValue = async (value: string, label: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) return setFeedback(`No ${label} available to copy.`);
    try {
      await navigator.clipboard.writeText(normalized);
      setFeedback(`${label} copied.`);
    } catch {
      setFeedback(`Unable to copy ${label}. Check clipboard permissions.`);
    }
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
        body: JSON.stringify({ learnerId: learner.id, displayName, mailNickname, userPrincipalName, temporaryPassword }),
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
        setFeedback(result?.error ? `Microsoft account creation failed: ${result.error}.${missingText}${details}`.replace('..', '.') : 'Microsoft account creation failed.');
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
      if (syncResult?.error) return setFeedback(`Microsoft account created (${resolvedUpn}) but failed to save link in learner record: ${syncResult.error}`);
      setFeedback(`Microsoft account created for ${displayName}: ${userPrincipalName}`);
    } catch (error: any) {
      setFeedback(`Microsoft account creation failed: ${error?.message || 'Unexpected error'}`);
    } finally {
      setPendingMicrosoftAccountLearnerId(null);
    }
  };

  const toggleLearnerStatus = async (learner: Student) => {
    const currentStatus = String(learner.loginStatus || 'Active').trim().toLowerCase();
    const nextStatus = currentStatus === 'active' ? 'Inactive' : 'Active';
    setPendingStatusToggleLearnerId(learner.id);
    try {
      const result = await updateLearner(learner.id, { loginStatus: nextStatus });
      if (result?.error) return setFeedback(`Failed to update login status: ${result.error}`);
      setFeedback(`Login status updated to ${nextStatus} for ${learner.lastName}, ${learner.firstName}.`);
    } catch {
      setFeedback('Unable to update login status right now.');
    } finally {
      setPendingStatusToggleLearnerId(null);
    }
  };

  const recheckMicrosoftStatus = async () => {
    const scopeLearners = selectedLearners.length > 0 ? selectedLearners : targetLearners;
    if (scopeLearners.length === 0) return setFeedback('No learners available for Microsoft status recheck.');
    let synced = 0; let active = 0; let deleted = 0; let notLinked = 0; let failed = 0;
    for (const learner of scopeLearners) {
      try {
        const response = await fetch(`/api/microsoft-users?learnerId=${encodeURIComponent(learner.id)}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { failed += 1; continue; }
        const nextStatus = String(result?.microsoftAccountStatus || '').trim() || 'Not Linked';
        if (nextStatus === 'Active') active += 1; else if (nextStatus === 'Deleted') deleted += 1; else notLinked += 1;
        const syncResult = await updateLearner(learner.id, {
          microsoftUserId: String(result?.microsoftUserId || '').trim(),
          microsoftUpn: String(result?.userPrincipalName || '').trim(),
          microsoftMailNickname: String(result?.microsoftMailNickname || learner.microsoftMailNickname || '').trim(),
          microsoftAccountStatus: nextStatus,
          microsoftCreatedAt: String(result?.microsoftCreatedAt || learner.microsoftCreatedAt || '').trim(),
          microsoftLastSyncedAt: String(result?.microsoftLastSyncedAt || new Date().toISOString()).trim(),
        });
        if (syncResult?.error) { failed += 1; continue; }
        synced += 1;
      } catch {
        failed += 1;
      }
    }
    setFeedback(`Microsoft status recheck completed: ${synced}/${scopeLearners.length} synced (${active} active, ${deleted} deleted, ${notLinked} not linked, ${failed} failed).`);
  };

  const generateCredentials = async () => {
    if (selectedLearners.length === 0) return setFeedback('Select at least one learner first.');
    const selectedIdSet = new Set(selectedLearners.map((learner) => learner.id));
    const usedPasswords = new Set(
      learners.filter((learner) => !selectedIdSet.has(learner.id)).map((learner) => String(learner.loginPassword || '').trim()).filter(Boolean),
    );
    const payload = selectedLearners.map((learner) => {
      const existing = String(learner.loginPassword || '').trim();
      const password = existing && !usedPasswords.has(existing) ? (usedPasswords.add(existing), existing) : createUniquePolicyPassword(learner, usedPasswords);
      return { id: learner.id, loginUsername: learner.loginUsername?.trim() || learner.lrn, loginPassword: password, loginStatus: 'Active' as const };
    });
    const result = await updateLearnerCredentials(payload);
    if (result.error) setFeedback(result.error);
    else setFeedback(`Credentials generated for ${payload.length} learner(s).`);
  };

  const resetCredentials = async () => {
    if (selectedLearners.length === 0) return setFeedback('Select at least one learner first.');
    const usedPasswords = new Set(learners.map((learner) => String(learner.loginPassword || '').trim()).filter(Boolean));
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
    if (printableLearners.length === 0) return setFeedback('No learners available to print in the selected scope.');
    const scopeLabel = selectedSectionId === 'all' ? `All Sections in ${selectedGrade}` : sectionMap[selectedSectionId] || selectedGrade;
    const ok = openCredentialsPrintWindow({ learners: printableLearners, sectionMap, schoolYearLabel: activeSchoolYear.label, gradeLabel: selectedGrade, scopeLabel, createDefaultPassword: createPolicyPassword });
    if (!ok) setFeedback('Popup blocked. Allow popups for this site to print credentials.');
  };

  const openMicrosoftPrintPopup = () => {
    const printableLearners = selectedLearners.length > 0 ? selectedLearners : targetLearners;
    if (printableLearners.length === 0) return setFeedback('No learners available to print in the selected scope.');
    const scopeLabel = selectedSectionId === 'all' ? `All Sections in ${selectedGrade}` : sectionMap[selectedSectionId] || selectedGrade;
    const ok = openMicrosoftCredentialsPrintWindow({ learners: printableLearners, sectionMap, schoolYearLabel: activeSchoolYear.label, gradeLabel: selectedGrade, scopeLabel, createDefaultPassword: createPolicyPassword });
    if (!ok) setFeedback('Popup blocked. Allow popups for this site to print Microsoft credentials.');
  };

  const gradeOptions = gradeLevels.map((grade) => ({ value: grade, label: grade }));
  const sectionOptions = [{ value: 'all', label: `All Sections in ${selectedGrade}` }, ...sectionsForGrade.map((section) => ({ value: section.id, label: `${section.name}${section.strand ? ` (${section.strand})` : ''}` }))];
  const allVisibleSelected = targetLearners.length > 0 && targetLearners.every((learner) => selectedLearnerIds.has(learner.id));
  const autoExpandSectionKey = selectedSectionId === 'all' ? undefined : selectedSectionId;

  const sectionListData = useMemo<UsisGradeSectionListGrade[]>(() => {
    if (groupedBySection.length === 0) return [];
    return [{
      countLabel: `${groupedBySection.length} Active Sections`,
      key: selectedGrade,
      label: selectedGrade,
      sections: groupedBySection.map((group) => ({
        key: group.sectionId,
        label: group.sectionLabel,
        count: group.learners.length,
        content: (
          <CredentialsSectionTable
            allVisibleSelected={allVisibleSelected}
            copyCellValue={copyCellValue}
            groupedBySection={[group]}
            pendingMicrosoftAccountLearnerId={pendingMicrosoftAccountLearnerId}
            pendingStatusToggleLearnerId={pendingStatusToggleLearnerId}
            selectedLearnerIds={selectedLearnerIds}
            onCreateMicrosoftAccount={createMicrosoftAccount}
            onToggleLearner={toggleLearner}
            onToggleLearnerStatus={toggleLearnerStatus}
            onToggleSelectAll={toggleSelectAll}
            onViewLearner={(learnerId) => navigate(`/credentials/${learnerId}`)}
          />
        ),
      })),
    }];
  }, [allVisibleSelected, groupedBySection, pendingMicrosoftAccountLearnerId, pendingStatusToggleLearnerId, selectedGrade, selectedLearnerIds]);

  return (
    <div className="registrar-credentials-page">
      <div className="registrar-credentials-page__controls">
        <h3>Student Credentials</h3>
        <CredentialsFilters
          gradeOptions={gradeOptions}
          searchTerm={searchTerm}
          sectionOptions={sectionOptions}
          selectedGrade={selectedGrade}
          selectedSectionId={selectedSectionId}
          setSearchTerm={setSearchTerm}
          onChangeGrade={(grade) => { setSelectedGrade(grade); setSelectedSectionId('all'); }}
          onChangeSection={setSelectedSectionId}
        />
        <CredentialsActions
          allVisibleSelected={allVisibleSelected}
          listedCount={targetLearners.length}
          loading={loading}
          selectedCount={selectedLearners.length}
          onGenerate={generateCredentials}
          onPrint={openPrintPopup}
          onPrintMicrosoft={openMicrosoftPrintPopup}
          onRecheckMicrosoft={recheckMicrosoftStatus}
          onReset={resetCredentials}
          onToggleSelectAll={toggleSelectAll}
        />
        <TopCenterAlert open={!!feedback} title="Credentials Notice" message={feedback || ''} type="accent" onClose={() => setFeedback(null)} />
      </div>

      <UsisGradeSectionList
        className="registrar-credentials-page__section-list"
        autoExpandGradeKey={selectedGrade}
        autoExpandSectionKey={autoExpandSectionKey}
        emptyMessage="No learners found for selected grade and section."
        grades={sectionListData}
      />
    </div>
  );
};

export default Credentials;
