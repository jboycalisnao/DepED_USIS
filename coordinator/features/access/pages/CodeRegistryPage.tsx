import { useEffect, useMemo, useState } from 'react';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import { useCodeRegistry } from '../hooks/useCodeRegistry';

export function CodeRegistryPage() {
  const {
    canManageDivisionCodes,
    canManageElectionCodes,
    canManageRegionCodes,
    error,
    isLoading,
    isSubmittingDivision,
    isSubmittingRegistration,
    isSubmittingRegion,
    notice,
    snapshot,
    submitDivisionCode,
    submitRegistrationCode,
    submitRegionCode,
  } = useCodeRegistry();

  const regionOptions = useMemo(
    () =>
      (snapshot?.regionEntries || []).map((entry) => ({
        label: `${entry.region} (${entry.regionCode})`,
        value: entry.region,
      })),
    [snapshot?.regionEntries],
  );

  const divisionOptions = useMemo(
    () =>
      (snapshot?.divisionEntries || []).map((entry) => ({
        label: `${entry.division} - ${entry.region} (${entry.divisionCode})`,
        value: `${entry.region}::${entry.division}`,
      })),
    [snapshot?.divisionEntries],
  );

  const registrationOptions = useMemo(
    () =>
      (snapshot?.registrationEntries || []).map((entry) => ({
        label: `${entry.registrationCode} - ${entry.registrationTargetLabel} | ${entry.schoolCode}`,
        value: entry.registrationTargetId,
      })),
    [snapshot?.registrationEntries],
  );

  const [selectedRegion, setSelectedRegion] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [divisionCode, setDivisionCode] = useState('');
  const [selectedRegistrationTargetId, setSelectedRegistrationTargetId] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');

  useEffect(() => {
    const firstRegion = snapshot?.regionEntries[0];
    if (firstRegion) {
      setSelectedRegion((current) => current || firstRegion.region);
      setRegionCode((current) => current || firstRegion.regionCode);
    }

    const firstDivision = snapshot?.divisionEntries[0];
    if (firstDivision) {
      setSelectedDivision((current) => current || `${firstDivision.region}::${firstDivision.division}`);
      setDivisionCode((current) => current || firstDivision.divisionCode);
    }

    const firstRegistrationEntry = snapshot?.registrationEntries[0];
    if (firstRegistrationEntry) {
      setSelectedRegistrationTargetId((current) => current || firstRegistrationEntry.registrationTargetId);
      setRegistrationCode((current) => current || firstRegistrationEntry.registrationCode);
    }
  }, [snapshot]);

  const selectedDivisionEntry = useMemo(
    () => snapshot?.divisionEntries.find((entry) => `${entry.region}::${entry.division}` === selectedDivision),
    [selectedDivision, snapshot?.divisionEntries],
  );

  const selectedRegistrationEntry = useMemo(
    () => snapshot?.registrationEntries.find((entry) => entry.registrationTargetId === selectedRegistrationTargetId),
    [selectedRegistrationTargetId, snapshot?.registrationEntries],
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel__summary">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Registry Scope</p>
            <div className="registry-summary">
              <p><strong>Regions:</strong> {snapshot?.regionEntries.length || 0}</p>
              <p><strong>Divisions:</strong> {snapshot?.divisionEntries.length || 0}</p>
              <p><strong>Registration Codes:</strong> {snapshot?.registrationEntries.length || 0}</p>
            </div>
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Permissions</p>
            <div className="registry-summary">
              <p><strong>Region Codes:</strong> {canManageRegionCodes ? 'Allowed' : 'View only'}</p>
              <p><strong>Division Codes:</strong> {canManageDivisionCodes ? 'Allowed' : 'View only'}</p>
              <p><strong>Registration Codes:</strong> {canManageElectionCodes ? 'Allowed' : 'View only'}</p>
            </div>
          </div>
        </article>
      </div>

      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      {notice ? <p className="registry-success">{notice}</p> : null}

      <div className="registry-layout registry-layout--forms">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Regional Codes</p>
            <h3>Region Registry</h3>
            {isLoading ? (
              <p className="registry-copy">Loading region codes.</p>
            ) : canManageRegionCodes ? (
              <form
                className="registry-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await submitRegionCode(selectedRegion, regionCode);
                }}
              >
                <SearchableSelect
                  label="Region"
                  onChange={(value) => {
                    setSelectedRegion(value);
                    const match = snapshot?.regionEntries.find((entry) => entry.region === value);
                    setRegionCode(match?.regionCode || '');
                  }}
                  options={regionOptions}
                  value={selectedRegion}
                />
                <FloatingField
                  id="region-code"
                  label="Region Code"
                  value={regionCode}
                  onChange={(event) => setRegionCode(event.target.value.toUpperCase())}
                  required
                />
                <div className="registry-form__actions">
                  <button className="login-card__submit" disabled={isSubmittingRegion || !selectedRegion} type="submit">
                    {isSubmittingRegion ? 'Saving...' : 'Save Region Code'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="registry-list">
                {(snapshot?.regionEntries || []).map((entry) => (
                  <div key={`${entry.region}-${entry.regionCode}`} className="registry-list__item">
                    <strong>{entry.region}</strong>
                    <span>{entry.regionCode}</span>
                    <span>{entry.schoolCount} schools</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Division Codes</p>
            <h3>Division Registry</h3>
            {isLoading ? (
              <p className="registry-copy">Loading division codes.</p>
            ) : canManageDivisionCodes ? (
              <form
                className="registry-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!selectedDivisionEntry) return;
                  await submitDivisionCode(selectedDivisionEntry.division, divisionCode, selectedDivisionEntry.region);
                }}
              >
                <SearchableSelect
                  label="Division"
                  onChange={(value) => {
                    setSelectedDivision(value);
                    const match = snapshot?.divisionEntries.find((entry) => `${entry.region}::${entry.division}` === value);
                    setDivisionCode(match?.divisionCode || '');
                  }}
                  options={divisionOptions}
                  value={selectedDivision}
                />
                <FloatingField
                  id="division-code"
                  label="Division Code"
                  value={divisionCode}
                  onChange={(event) => setDivisionCode(event.target.value.toUpperCase())}
                  required
                />
                <div className="registry-form__actions">
                  <button className="login-card__submit" disabled={isSubmittingDivision || !selectedDivisionEntry} type="submit">
                    {isSubmittingDivision ? 'Saving...' : 'Save Division Code'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="registry-list">
                {(snapshot?.divisionEntries || []).map((entry) => (
                  <div key={`${entry.region}-${entry.division}-${entry.divisionCode}`} className="registry-list__item">
                    <strong>{entry.division}</strong>
                    <span>{entry.divisionCode}</span>
                    <span>{entry.region}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Registration Codes</p>
            <h3>Credentials Registration Code Registry</h3>
            {isLoading ? (
              <p className="registry-copy">Loading registration codes.</p>
            ) : !canManageElectionCodes ? (
              <div className="registry-list">
                {(snapshot?.registrationEntries || []).map((entry) => (
                  <div key={entry.registrationTargetId} className="registry-list__item">
                    <strong>{entry.registrationTargetLabel}</strong>
                    <span>{entry.registrationCode}</span>
                    <span>{entry.schoolCode} - {entry.schoolName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <form
                className="registry-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await submitRegistrationCode(selectedRegistrationTargetId, registrationCode);
                }}
              >
                <SearchableSelect
                  label="Credentials Registration"
                  onChange={(value) => {
                    setSelectedRegistrationTargetId(value);
                    const match = snapshot?.registrationEntries.find((entry) => entry.registrationTargetId === value);
                    setRegistrationCode(match?.registrationCode || '');
                  }}
                  options={registrationOptions}
                  value={selectedRegistrationTargetId}
                />
                <FloatingField
                  id="registration-code"
                  label="Registration Code"
                  value={registrationCode}
                  onChange={(event) => setRegistrationCode(event.target.value.toUpperCase())}
                  required
                />
                {selectedRegistrationEntry ? (
                  <div className="registry-summary">
                    <p><strong>School:</strong> {selectedRegistrationEntry.schoolCode} - {selectedRegistrationEntry.schoolName}</p>
                    <p><strong>Status:</strong> {selectedRegistrationEntry.status}</p>
                  </div>
                ) : null}
                <div className="registry-form__actions">
                  <button className="login-card__submit" disabled={isSubmittingRegistration || !selectedRegistrationTargetId} type="submit">
                    {isSubmittingRegistration ? 'Saving...' : 'Save Registration Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
