import type { DepedSchoolRecord } from '../services/depedSchoolApi';
import { regionDivisionCatalog } from '../data/regionDivisionCatalog';

/**
 * Maps a region name to its standard code (e.g., "Region I" -> "R1").
 */
export const getRegionCode = (regionName: string): string => {
  const name = regionName.toUpperCase();
  if (name.includes('REGION I') && !name.includes('REGION IX') && !name.includes('REGION X')) return 'R1';
  if (name.includes('REGION II')) return 'R2';
  if (name.includes('REGION III')) return 'R3';
  if (name.includes('REGION IV-A')) return 'R4A';
  if (name.includes('REGION IV-B')) return 'R4B';
  if (name.includes('REGION V') && !name.includes('REGION VI') && !name.includes('REGION VII') && !name.includes('REGION VIII')) return 'R5';
  if (name.includes('REGION VI') && !name.includes('REGION VII') && !name.includes('REGION VIII')) return 'R6';
  if (name.includes('REGION VII') && !name.includes('REGION VIII')) return 'R7';
  if (name.includes('REGION VIII')) return 'R8';
  if (name.includes('REGION IX')) return 'R9';
  if (name.includes('REGION X') && !name.includes('REGION XI') && !name.includes('REGION XII')) return 'R10';
  if (name.includes('REGION XI')) return 'R11';
  if (name.includes('REGION XII')) return 'R12';
  if (name.includes('REGION XIII')) return 'R13';
  if (name.includes('NCR')) return 'NCR';
  if (name.includes('CAR') && !name.includes('NCR')) return 'CAR';
  if (name.includes('BARMM')) return 'BARMM';
  if (name.includes('NIR')) return 'NIR';
  return 'RO'; // Default for other regions
};

/**
 * Generates a non-repeating division code (e.g., "R6-D1") based on its index 
 * in the regionDivisionCatalog.
 */
export const getDivisionCode = (regionName: string, divisionName: string): string => {
  const rCode = getRegionCode(regionName);
  
  // Find all divisions for this region in our catalog
  const regionDivisions = regionDivisionCatalog
    .filter(d => d.region.toUpperCase() === regionName.toUpperCase())
    .map(d => d.divisionOffice.toLowerCase());
  
  const index = regionDivisions.indexOf(divisionName.toLowerCase());
  
  // If found in catalog, use its index (1-based). Otherwise, use a hash or default.
  if (index !== -1) {
    return `${rCode}-D${index + 1}`;
  }

  // Fallback: generate a simple stable code if not in catalog
  return `${rCode}-DX`;
};

/**
 * Utility to parse and normalize DepEd API responses into a consistent format.
 */
export const parseDepedSchoolResponse = (input: any): DepedSchoolRecord => {
  // Handle nested responses or array-wrapped single items
  const data = input?.data || input?.school || input;
  const raw = Array.isArray(data) ? data[0] : data;

  return {
    barangay: String(raw?.barangay || '').trim(),
    division: String(raw?.division || '').trim(),
    municipality: String(raw?.municipality || '').trim(),
    province: String(raw?.province || '').trim(),
    region: String(raw?.region || '').trim(),
    schoolId: String(
      raw?.beis_school_id || 
      raw?.school_id || 
      raw?.school_code || 
      raw?.schoolCode || 
      raw?.id || 
      ''
    ).trim(),
    schoolName: String(raw?.school_name || raw?.schoolName || raw?.name || '').trim(),
    schoolType: String(raw?.school_type || '').trim(),
  };
};

/**
 * Maps a DepEd school record to the local database schema (usis_schools).
 */
export const mapToLocalSchoolSchema = (record: DepedSchoolRecord) => {
  const rCode = getRegionCode(record.region);
  const dCode = getDivisionCode(record.region, record.division);

  const schema: any = {
    school_code: record.schoolId,
    school_name: record.schoolName,
    municipality_city: record.municipality || null,
    province: record.province || null,
    barangay: record.barangay || null,
    school_type: record.schoolType || null,
    region_code: rCode,
    division_code: dCode,
    is_active: true,
  };

  // Only include if not empty to allow DB defaults to kick in
  if (record.region) schema.region = record.region;
  if (record.division) schema.division = record.division;

  return schema;
};
