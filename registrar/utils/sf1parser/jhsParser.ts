
import { Learner, LearnerStatus } from '../../types';
import { cleanLRN, parseName, cleanParent, formatAddress, formatJSDate } from './parserUtils';

/**
 * Logic specific to Junior High School (JHS) SF1 Layout
 * Updated indices based on user specification:
 * LRN: A(0), Name: C(2), Sex: G(6), Birthdate: H(7)
 * Barangay: R(17), Municipality/City: U(20), Province: W(22)
 * Father: AB(27), Mother: AF(31)
 */
export const extractJHSData = (jsonData: any[][], headerRowIndex: number, colMap: Record<string, number>, sectionId: string): Learner[] => {
    const learners: Learner[] = [];
    
    // Explicit Indices from User Instructions
    const lrnCol = 0;      // A
    const nameCol = 2;     // C
    const sexCol = 6;      // G
    const birthCol = 7;    // H
    
    // Address columns specifically targeted
    const brgyCol = 17;    // R
    const munCol = 20;     // U
    const provCol = 22;    // W

    const fCol = 27;       // AB
    const mCol = 31;       // AF
    
    // Guardian and Contact indices
    const gCol = colMap['guardian'] ?? 34; 
    const contactCol = colMap['contact'] ?? 36;

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;

        // 1. Clean LRN
        const lrn = cleanLRN(row[lrnCol]);
        if (!lrn || lrn.length < 6) continue;

        // 2. Name Extraction (Handles Middle Names via updated parseName)
        const rawName = String(row[nameCol] || '').trim();
        if (!rawName || rawName.toUpperCase().includes('TOTAL') || rawName.toUpperCase().includes('MALE') || rawName.toUpperCase().includes('FEMALE')) continue;

        const { lastName, firstName, middleName } = parseName(rawName);

        // 3. Profiling Data
        const gender: 'Male' | 'Female' = (String(row[sexCol] || '').toUpperCase().startsWith('M')) ? 'Male' : 'Female';
        const fatherName = cleanParent(row[fCol]);
        const motherName = cleanParent(row[mCol]);
        const guardianName = cleanParent(row[gCol]) || fatherName || motherName || 'Parent/Guardian';
        
        // 4. Address Assembly
        const address = formatAddress(row[brgyCol], row[munCol], row[provCol], row[colMap['address']]);

        // 5. Birthdate Parsing
        let bDate = new Date().toISOString().split('T')[0];
        const rawDate = row[birthCol];
        
        if (rawDate) {
            if (rawDate instanceof Date) {
                bDate = formatJSDate(rawDate);
            } else if (!isNaN(Number(rawDate))) {
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
