import { regionDivisionCatalog } from '@/features/schools/data/regionDivisionCatalog';

export interface RegionCodeEntry {
  code: string;
  regionName: string;
  shortName: string;
}

export interface DivisionOption {
  divisionCode: string;
  divisionOffice: string;
  localType: 'City' | 'Province';
  provinceOrCity: string;
}

const REGION_CODE_ENTRIES: RegionCodeEntry[] = [
  { code: '000100', regionName: 'Ilocos Region', shortName: 'Region I' },
  { code: '000200', regionName: 'Cagayan Valley', shortName: 'Region II' },
  { code: '000300', regionName: 'Central Luzon', shortName: 'Region III' },
  { code: '000400', regionName: 'CALABARZON', shortName: 'Region IV-A' },
  { code: '000500', regionName: 'MIMAROPA', shortName: 'Region IV-B' },
  { code: '000600', regionName: 'Bicol Region', shortName: 'Region V' },
  { code: '000700', regionName: 'Western Visayas', shortName: 'Region VI' },
  { code: '000800', regionName: 'Central Visayas', shortName: 'Region VII' },
  { code: '000900', regionName: 'Eastern Visayas', shortName: 'Region VIII' },
  { code: '001000', regionName: 'Zamboanga Peninsula', shortName: 'Region IX' },
  { code: '001100', regionName: 'Northern Mindanao', shortName: 'Region X' },
  { code: '001200', regionName: 'Davao Region', shortName: 'Region XI' },
  { code: '001300', regionName: 'SOCCSKSARGEN', shortName: 'Region XII' },
  { code: '001400', regionName: 'Caraga', shortName: 'Region XIII' },
  { code: '001500', regionName: 'National Capital Region', shortName: 'NCR' },
  { code: '001600', regionName: 'Cordillera Administrative Region', shortName: 'CAR' },
  { code: '001700', regionName: 'Bangsamoro Autonomous Region in Muslim Mindanao', shortName: 'BARMM' },
  { code: '001800', regionName: 'Negros Island Region', shortName: 'NIR' },
];

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const REGION_ALIASES = new Map<string, string>();

for (const entry of REGION_CODE_ENTRIES) {
  REGION_ALIASES.set(normalize(entry.shortName), entry.shortName);
  REGION_ALIASES.set(normalize(entry.regionName), entry.shortName);
}

for (const entry of regionDivisionCatalog) {
  REGION_ALIASES.set(normalize(entry.region), entry.region);
}

const resolveRegionShortName = (value?: string | null) => {
  if (!value) return '';
  const normalized = normalize(value);
  const direct = REGION_ALIASES.get(normalized);
  if (direct) return direct;

  const matchedEntry = REGION_CODE_ENTRIES.find(
    (entry) =>
      normalized.includes(normalize(entry.shortName)) ||
      normalized.includes(normalize(entry.regionName)),
  );
  if (matchedEntry) return matchedEntry.shortName;

  const matchedCatalog = regionDivisionCatalog.find(
    (entry) => normalized.includes(normalize(entry.region)),
  );
  return matchedCatalog?.region || '';
};

export const regionCodeEntries = REGION_CODE_ENTRIES;

export const buildRegionOptions = () =>
  REGION_CODE_ENTRIES.map((entry) => ({
    label: `${entry.shortName} - ${entry.regionName} (${entry.code.slice(0, 4)})`,
    value: entry.shortName,
  }));

export const getRegionCodeByShortName = (shortName: string) =>
  REGION_CODE_ENTRIES.find((entry) => entry.shortName === shortName)?.code || '';

export const getRegionNameByShortName = (shortName: string) =>
  REGION_CODE_ENTRIES.find((entry) => entry.shortName === shortName)?.regionName || shortName;

export const getRegionPrefix = (shortName: string) => getRegionCodeByShortName(shortName).slice(0, 4);

export const getDivisionOptionsByRegion = (regionShortName: string): DivisionOption[] => {
  const resolvedRegion = resolveActorRegionShortName(regionShortName) || regionShortName;
  const divisionRows = regionDivisionCatalog.filter((entry) => entry.region === resolvedRegion);

  return divisionRows.map((entry, index) => ({
    divisionCode: String(index + 1).padStart(2, '0'),
    divisionOffice: entry.divisionOffice,
    localType: entry.localType,
    provinceOrCity: entry.provinceOrCity,
  }));
};

export const getDivisionOption = (regionShortName: string, divisionCode: string) =>
  getDivisionOptionsByRegion(regionShortName).find((entry) => entry.divisionCode === divisionCode);

export const resolveActorRegionShortName = (value?: string | null) => {
  const shortName = resolveRegionShortName(value);
  if (!shortName) return '';

  const directShortName = REGION_CODE_ENTRIES.find((entry) => entry.shortName === shortName)?.shortName;
  if (directShortName) return directShortName;

  const matched = REGION_CODE_ENTRIES.find(
    (entry) =>
      normalize(entry.shortName) === normalize(shortName) ||
      normalize(entry.regionName) === normalize(shortName),
  );
  return matched?.shortName || '';
};

export const buildRegionalSchoolId = (regionShortName: string) => `${getRegionPrefix(regionShortName)}00`;

export const buildDivisionSchoolId = (regionShortName: string, divisionCode: string) =>
  `${getRegionPrefix(regionShortName)}${divisionCode}`;
