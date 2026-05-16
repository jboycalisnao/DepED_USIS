import { useMemo, useState } from 'react';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { fetchDepedSchools, fetchDepedSchoolById, type DepedSchoolRecord } from '../services/depedSchoolApi';
import {
  fetchPsgcBarangaysByCityMunicipality,
  fetchPsgcCitiesMunicipalitiesByRegion,
  namesMatch,
  type PsgcBarangay,
  type PsgcCityMunicipality,
} from '../services/psgcApi';
import { regionDivisionCatalog, regionOptions } from '../data/regionDivisionCatalog';
import { getRegionCode, getDivisionCode } from '../utils/depedSchoolParser';

interface SchoolHierarchy {
  [province: string]: {
    [municipality: string]: {
      [barangay: string]: DepedSchoolRecord[];
    };
  };
}

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const containsName = (source: string, target: string) => {
  const a = normalize(source);
  const b = normalize(target);
  return a.includes(b) || b.includes(a);
};

export function SchoolsDirectoryPage() {
  const [region, setRegion] = useState('');
  const [division, setDivision] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [schools, setSchools] = useState<DepedSchoolRecord[]>([]);
  const [psgcCities, setPsgcCities] = useState<PsgcCityMunicipality[]>([]);
  const [psgcBarangaysByCity, setPsgcBarangaysByCity] = useState<Record<string, PsgcBarangay[]>>({});

  const divisionEntries = useMemo(
    () => (region ? regionDivisionCatalog.filter((entry) => entry.region === region) : []),
    [region],
  );
  const divisionOptions = useMemo(
    () =>
      divisionEntries.map((entry) => ({
        label: `[${getDivisionCode(entry.region, entry.divisionOffice)}] ${entry.divisionOffice} (${entry.localType}: ${entry.provinceOrCity})`,
        value: entry.divisionOffice,
      })),
    [divisionEntries],
  );
  const selectedDivisionEntry = useMemo(
    () => divisionEntries.find((entry) => entry.divisionOffice === division),
    [division, divisionEntries],
  );

  const loadSchools = async () => {
    setIsLoading(true);
    setError('');
    try {
      const query = search.trim();
      let depedRecords: DepedSchoolRecord[] = [];

      // If query looks like a BEIS School ID (6 digits), try direct lookup first
      if (/^\d{6}$/.test(query)) {
        const exactMatch = await fetchDepedSchoolById(query);
        if (exactMatch) {
          depedRecords = [exactMatch];
        }
      }

      // If no exact match found or query is not an ID, use fuzzy search
      if (depedRecords.length === 0) {
        depedRecords = await fetchDepedSchools({
          division: division || undefined,
          limit: 400,
          region: region || undefined,
          search: query || undefined,
        });
      }

      const narrowedRecords = depedRecords.filter((entry) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          entry.schoolName.toLowerCase().includes(query) ||
          entry.schoolId.toLowerCase().includes(query)
        );
      });

      if (!region) {
        setSchools(narrowedRecords);
        setPsgcCities([]);
        setPsgcBarangaysByCity({});
        return;
      }

      const psgcCityList = await fetchPsgcCitiesMunicipalitiesByRegion(region);

      const filteredCities = selectedDivisionEntry?.localType === 'Province'
        ? psgcCityList.filter((entry) => namesMatch(entry.province, selectedDivisionEntry.provinceOrCity))
        : selectedDivisionEntry
          ? psgcCityList.filter((entry) =>
              namesMatch(entry.name, selectedDivisionEntry.provinceOrCity || selectedDivisionEntry.divisionOffice || ''),
            )
          : psgcCityList;

      const relevantMunicipalities = new Set(
        narrowedRecords
          .map((entry) => entry.municipality)
          .filter((value) =>
            filteredCities.some((city) => namesMatch(city.name, value)),
          ),
      );

      const barangayPairs = await Promise.all(
        Array.from(relevantMunicipalities).map(async (municipalityName) => {
          try {
            const rows = await fetchPsgcBarangaysByCityMunicipality(municipalityName);
            return [municipalityName, rows] as const;
          } catch {
            return [municipalityName, []] as const;
          }
        }),
      );

      setSchools(narrowedRecords);
      setPsgcCities(filteredCities);
      setPsgcBarangaysByCity(Object.fromEntries(barangayPairs));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load schools from APIs.');
      setSchools([]);
      setPsgcCities([]);
      setPsgcBarangaysByCity({});
    } finally {
      setIsLoading(false);
    }
  };

  const hierarchy = useMemo<SchoolHierarchy>(() => {
    const rows = schools.filter((school) => {
      if (!region || !selectedDivisionEntry) return true;
      if (selectedDivisionEntry.localType === 'Province') {
        if (!psgcCities.length) {
          return (
            containsName(school.province, selectedDivisionEntry.provinceOrCity) ||
            containsName(school.division, selectedDivisionEntry.divisionOffice) ||
            containsName(school.municipality, selectedDivisionEntry.provinceOrCity)
          );
        }
        return psgcCities.some((city) => namesMatch(city.name, school.municipality));
      }
      return (
        namesMatch(school.municipality, selectedDivisionEntry.provinceOrCity) ||
        containsName(school.division, selectedDivisionEntry.divisionOffice) ||
        containsName(school.municipality, selectedDivisionEntry.divisionOffice)
      );
    });

    const query = resultSearch.trim().toLowerCase();
    const filteredRows = !query
      ? rows
      : rows.filter((school) =>
          [
            school.schoolName,
            school.schoolId,
            school.province,
            school.municipality,
            school.barangay,
            school.division,
          ]
            .join(' ')
            .toLowerCase()
            .includes(query),
        );

    return filteredRows.reduce<SchoolHierarchy>((acc, school) => {
      const matchedCity = psgcCities.find((entry) => namesMatch(entry.name, school.municipality));
      const province =
        matchedCity?.province ||
        school.province ||
        selectedDivisionEntry?.provinceOrCity ||
        'Unmapped Province';
      const municipality = school.municipality || matchedCity?.name || school.division || 'Unmapped Municipality';

      const barangayCandidates = psgcBarangaysByCity[municipality] || [];
      const matchedBarangay = barangayCandidates.find((entry) => namesMatch(entry.name, school.barangay));
      const barangay = matchedBarangay?.name || school.barangay || 'Unmapped Barangay';

      if (!acc[province]) acc[province] = {};
      if (!acc[province][municipality]) acc[province][municipality] = {};
      if (!acc[province][municipality][barangay]) acc[province][municipality][barangay] = [];
      acc[province][municipality][barangay].push(school);
      return acc;
    }, {});
  }, [psgcBarangaysByCity, psgcCities, region, resultSearch, schools, selectedDivisionEntry]);

  return (
    <div className="admin-panel school-directory-compact">
      <article className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <p className="section-card__eyebrow">School API Checker</p>
          <h3>DepEd + PSGC Hierarchy Classifier</h3>
          <p className="registry-copy">
            Leave region and division empty for nationwide checking. Search accepts school name and school ID.
          </p>

          <div className="registry-form">
            <div className="registry-form__split">
              <SearchableSelect
                label="Region"
                onChange={(value) => {
                  setRegion(value);
                  setDivision('');
                }}
                options={[
                  { label: 'All Regions (Nationwide)', value: '' }, 
                  ...regionOptions.map((value) => ({ 
                    label: `[${getRegionCode(value)}] ${value}`, 
                    value 
                  }))
                ]}
                value={region}
              />
              <SearchableSelect
                disabled={!region}
                label="Division Office"
                onChange={setDivision}
                options={
                  !region
                    ? [{ label: 'All Divisions (Nationwide)', value: '' }]
                    : divisionOptions.length
                      ? [{ label: 'All Divisions', value: '' }, ...divisionOptions]
                      : [{ label: 'No mapped divisions for selected region', value: '' }]
                }
                value={division}
              />
            </div>

            <FloatingField
              id="schools-search"
              label="Search School Name or School ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="registry-form__actions">
              <button className="login-card__submit" type="button" onClick={loadSchools} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load and Classify'}
              </button>
            </div>
          </div>

          {error ? <p className="login-card__error registry-feedback">{error}</p> : null}

          <div className="registry-summary">
            <p><strong>DepEd schools loaded:</strong> {schools.length}</p>
          </div>
          <div className="registry-form__split" style={{ marginTop: '12px' }}>
            <FloatingField
              id="result-search"
              label="Search Loaded Results"
              value={resultSearch}
              onChange={(event) => setResultSearch(event.target.value)}
            />
          </div>

          <div className="registry-tree">
            {!Object.keys(hierarchy).length ? (
              <p className="registry-copy">No hierarchy rows found for the selected filters.</p>
            ) : null}
            {Object.entries(hierarchy).map(([province, municipalities]) => (
              <details key={province} className="registry-tree__level" open>
                <summary className="registry-tree__summary">
                  <span className="registry-tree__label">Province</span>
                  <strong>{province}</strong>
                </summary>
                <div className="registry-tree__children">
                  {Object.entries(municipalities).map(([municipality, barangays]) => (
                    <details key={`${province}-${municipality}`} className="registry-tree__level">
                      <summary className="registry-tree__summary">
                        <span className="registry-tree__label">Municipality/City</span>
                        <strong>{municipality}</strong>
                      </summary>
                      <div className="registry-tree__children">
                        {Object.entries(barangays).map(([barangay, schoolRows]) => (
                          <details key={`${province}-${municipality}-${barangay}`} className="registry-tree__level">
                            <summary className="registry-tree__summary">
                              <span className="registry-tree__label">Barangay</span>
                              <strong>{barangay}</strong>
                              <span className="registry-tree__meta">{schoolRows.length} school(s)</span>
                            </summary>
                            <div className="registry-tree__accounts">
                              {schoolRows.map((school) => (
                                <article key={`${school.schoolId}-${school.schoolName}`} className="registry-list__item">
                                  <strong>{school.schoolName}</strong>
                                  <span>School ID: {school.schoolId}</span>
                                  <span>Division: {school.division || 'N/A'}</span>
                                  <details className="school-detail-view">
                                    <summary>View Details</summary>
                                    <div className="school-detail-view__grid">
                                      <span><strong>School Name:</strong> {school.schoolName || 'N/A'}</span>
                                      <span><strong>School ID:</strong> {school.schoolId || 'N/A'}</span>
                                      <span><strong>Region:</strong> {school.region || region || 'N/A'}</span>
                                      <span><strong>Division:</strong> {school.division || 'N/A'}</span>
                                      <span><strong>Province:</strong> {school.province || province || 'N/A'}</span>
                                      <span><strong>Municipality/City:</strong> {school.municipality || municipality || 'N/A'}</span>
                                      <span><strong>Barangay:</strong> {school.barangay || barangay || 'N/A'}</span>
                                      <span><strong>School Type:</strong> {school.schoolType || 'N/A'}</span>
                                    </div>
                                  </details>
                                </article>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
