
import * as XLSX from 'xlsx';
import { Student, EnrollmentStatus, GradeLevel } from '../types';
import { extractJHSData } from '../utils/sf1parser/jhsParser';
import { extractSHSData } from '../utils/sf1parser/shsParser';

export interface ParserResult {
    students: Student[];
    error?: string;
}

/**
 * Enhanced SF1 Service
 * Routes data extraction to specialized parsers based on school level
 */
export const parseSF1 = (
    file: File, 
    gradeLevel: GradeLevel, 
    sectionId: string, 
    sectionName: string,
    schoolYear: string,
    isSHS: boolean
): Promise<ParserResult> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
                
                let headerRowIndex = -1;
                const colMap: Record<string, number> = {};

                // Identify Header Row
                for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                    const row = (jsonData[i] || []).map(cell => String(cell || '').toUpperCase().trim());
                    if (row.some(c => c.includes('LRN'))) {
                        headerRowIndex = i;
                        row.forEach((header, index) => {
                            if (header.includes('GUARDIAN')) colMap['guardian'] = index;
                            if (header.includes('CONTACT')) colMap['contact'] = index;
                            if (header.includes('ADDRESS')) colMap['address'] = index;
                        });
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    resolve({ students: [], error: "Invalid SF1 Format: Could not find 'LRN' header row." });
                    return;
                }

                let students: Student[] = [];

                // Extract data using specialized level parsers
                if (!isSHS) {
                    students = extractJHSData(jsonData, headerRowIndex, colMap, sectionId);
                } else {
                    students = extractSHSData(jsonData, headerRowIndex, colMap, sectionId);
                }

                // Append yearly enrollment records for front-end history tracking
                const finalizedStudents = students.map(s => ({
                    ...s,
                    enrollments: [{
                        id: Math.random().toString(36).substr(2, 9),
                        schoolYear: schoolYear,
                        gradeLevel: gradeLevel,
                        section: sectionName, // Store readable name in history
                        enrollmentDate: new Date().toISOString().split('T')[0],
                        status: EnrollmentStatus.ENROLLED
                    }]
                }));

                resolve({ students: finalizedStudents });

            } catch (err: any) {
                console.error("Critical SF1 Parser Exception:", err);
                resolve({ students: [], error: "Spreadsheet Processing Error: " + err.message });
            }
        };

        reader.readAsArrayBuffer(file);
    });
};
