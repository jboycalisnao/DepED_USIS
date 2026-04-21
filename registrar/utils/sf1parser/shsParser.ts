import { Learner, LearnerStatus } from '../../types';
import { cleanLRN, parseName, cleanParent, formatAddress, formatJSDate } from './parserUtils';

/**
 * Logic specific to Senior High School (SHS) SF1 Layout
 * Updated indices based on user specification:
 * LRN: A(0) [Assumed standard]
 * Name: C(2)
 * Sex: K(10)
 * Birthdate: L(11)
 * Barangay: Z(25)
 * Municipality/City: AE(30)
 * Province: AG(32)
 * Father: AK(36)
 * Mother: AP(41)
 */
export const extractSHSData = (jsonData: any[][], headerRowIndex: number, colMap: Record<string, number>, sectionId: string): Learner[] => {
    const learners: Learner[] = [];
    
    // Explicit Indices from User Instructions
    const lrnCol = 0;      // A
    const nameCol = 2;     // C
    const sexCol = 10;     // K
    const birthCol = 11;   // L
    
    const brgyCol = 25;    // Z
    const munCol = 30;     // AE
    const provCol = 32;    // AG

    const fCol = 36;       // AK
    const mCol = 41;       // AP
    
    // Guardian and Contact usually follow Mother's details in SHS
    const gCol = colMap['guardian'] ?? 44; 
    const contactCol = colMap['contact'] ?? 46;

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;

        // Clean LRN - Skip rows without valid digit strings
        const lrn = cleanLRN(row[lrnCol]);
        if (!lrn || lrn.length < 6) continue;

        const rawName = String(row[nameCol] || '').trim();
        // Skip totals or headers in the data body
        if (!rawName || rawName.toUpperCase().includes('TOTAL') || rawName.toUpperCase().includes('MALE') || rawName.toUpperCase().includes('FEMALE')) continue;

        const { lastName, firstName, middleName } = parseName(rawName);
        const gender: 'Male' | 'Female' = (String(row[sexCol] || '').toUpperCase().startsWith('M')) ? 'Male' : 'Female';

        const fatherName = cleanParent(row[fCol]);
        const motherName = cleanParent(row[mCol]);
        const guardianName = cleanParent(row[gCol]) || fatherName || motherName || 'Parent';
        
        // Combine Address into standard format
        const address = formatAddress(row[brgyCol], row[munCol], row[provCol], row[colMap['address']]);

        // Birthdate Processing (Col L)
        let bDate = new Date().toISOString().split('T')[0];
        const rawDate = row[birthCol];
        
        if (rawDate) {
            if (rawDate instanceof Date) {
                bDate = formatJSDate(rawDate);
            } else if (!isNaN(Number(rawDate))) {
                // Fallback for Excel Serial Dates if cellDates:true wasn't enough
                const dateObj = new Date((Number(rawDate) - 25569) * 86400 * 1000);
                bDate = formatJSDate(dateObj);
            } else {
                const dateObj = new Date(rawDate);
                bDate = formatJSDate(dateObj);
            }
        }

        learners.push({
            id: Math.random().toString(36).substr(2, 9),
            lrn,
            firstName,
            lastName,
            middleName,
            gender,
            status: LearnerStatus.ENROLLED,
            address,
            guardian_name: guardianName,
            father_name: fatherName,
            mother_name: motherName,
            contactNumber: String(row[contactCol] || 'N/A').trim(),
            sectionId,
            birthDate: bDate
        });
    }
    return learners;
};