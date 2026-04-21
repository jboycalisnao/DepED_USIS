
/**
 * Common utilities for SF1 Excel Parsing
 */

export const cleanLRN = (val: any): string => {
  return String(val || '').replace(/[^0-9]/g, '').trim();
};

/**
 * Standard name parser for student identities
 * Optimized for: "SURNAME, FIRST NAME, MIDDLE NAME" (JHS SF1 Format)
 */
export const parseName = (rawName: string): { lastName: string, firstName: string, middleName: string } => {
  let lastName = 'Unknown', firstName = 'Unknown', middleName = '';
  
  // Normalize string: remove extra spaces and trailing/leading commas
  const cleanRaw = String(rawName || '')
    .replace(/\s+/g, ' ')
    .replace(/^,|,$/g, '')
    .trim();

  if (cleanRaw.includes(',')) {
    // Split by comma
    const parts = cleanRaw.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      // JHS Format Example: AMOLAR, FELIX SHERWIN, MARAMARA
      lastName = parts[0];
      firstName = parts[1];
      middleName = parts[2];
    } else if (parts.length === 2) {
      // Classic DepEd: SURNAME, FIRST NAME MIDDLE NAME
      lastName = parts[0];
      const subParts = parts[1].split(/\s+/).filter(p => p.length > 0);
      
      if (subParts.length > 1) {
        // Last word is usually the middle name if only one comma exists
        middleName = subParts[subParts.length - 1];
        firstName = subParts.slice(0, subParts.length - 1).join(' ');
      } else {
        firstName = subParts[0];
        middleName = '';
      }
    }
  } else {
    // Fallback: No comma (e.g. "FELIX SHERWIN MARAMARA AMOLAR")
    const parts = cleanRaw.split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 3) {
      lastName = parts[parts.length - 1];
      middleName = parts[parts.length - 2];
      firstName = parts.slice(0, parts.length - 2).join(' ');
    } else if (parts.length === 2) {
      firstName = parts[0];
      lastName = parts[1];
      middleName = '';
    } else {
      lastName = parts[0] || 'Unknown';
    }
  }
  
  return { 
    lastName: lastName.toUpperCase(), 
    firstName: firstName.toUpperCase(), 
    middleName: middleName.toUpperCase() 
  };
};

/**
 * Sanitizes parent/guardian names to "Last Name, First Name Middle Name" format
 */
export const cleanParent = (val: any): string => {
  const raw = String(val || '').trim();
  if (!raw || raw === '.' || raw.toUpperCase() === 'N/A' || raw === '0' || raw.toUpperCase() === 'NONE') return '';

  let sanitized = raw
    .replace(/,+/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .replace(/^,|,$/g, '')
    .trim();

  const { lastName, firstName, middleName } = parseName(sanitized);

  if (lastName === 'UNKNOWN' && (!firstName || firstName === 'UNKNOWN')) return sanitized;
  
  const finalName = `${lastName}, ${firstName} ${middleName}`.trim();
  
  return finalName
    .replace(/,+/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/,$/, '')
    .trim();
};

export const formatAddress = (brgy: any, mun: any, prov: any, fallback: any): string => {
  const b = String(brgy || '').trim();
  const m = String(mun || '').trim();
  const p = String(prov || '').trim();
  
  if (b || m || p) {
    return [b, m, p].filter(x => !!x && x !== '.').join(', ');
  }
  return String(fallback || 'Local Resident').trim();
};

export const formatJSDate = (date: Date): string => {
  try {
    if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};
