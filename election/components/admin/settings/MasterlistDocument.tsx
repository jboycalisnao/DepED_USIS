import React from 'react';
import { Student, Section } from '../../../types';
import { 
  MasterlistHeader, 
  MasterlistSubHeader, 
  MasterlistMetaInfo, 
  MasterlistFooter, 
  MasterlistTableHead 
} from './MasterlistParts';

interface MasterlistDocumentProps {
  section: Section;
  students: Student[];
  schoolYear: string;
  schoolName: string;
}

interface RowItem {
  type: 'header' | 'student' | 'summary';
  data?: Student;
  label?: string;
  value?: number;
  genderIdx?: number;
  genderType?: 'M' | 'F' | 'U';
}

const MasterlistDocument: React.FC<MasterlistDocumentProps> = ({ section, students, schoolYear, schoolName }) => {
  // Safe accessor for learner data
  const getGenderChar = (s: Student) => {
    const g = (s.gender || (s as any).GENDER || '').toUpperCase();
    if (g.startsWith('M')) return 'M';
    if (g.startsWith('F')) return 'F';
    return 'U'; // Uncategorized
  };

  const getSortName = (s: Student) => `${s.lastName || ''} ${s.firstName || ''}`.trim().toUpperCase();

  // 1. Group and Sort
  const males = students
    .filter(s => getGenderChar(s) === 'M')
    .sort((a, b) => getSortName(a).localeCompare(getSortName(b)));

  const females = students
    .filter(s => getGenderChar(s) === 'F')
    .sort((a, b) => getSortName(a).localeCompare(getSortName(b)));

  const others = students
    .filter(s => getGenderChar(s) === 'U')
    .sort((a, b) => getSortName(a).localeCompare(getSortName(b)));

  const allRows: RowItem[] = [];
  
  if (males.length > 0) {
    allRows.push({ type: 'header', label: `MALE (${males.length})`, genderType: 'M' });
    males.forEach((s, i) => allRows.push({ type: 'student', data: s, genderIdx: i, genderType: 'M' }));
  }
  
  if (females.length > 0) {
    allRows.push({ type: 'header', label: `FEMALE (${females.length})`, genderType: 'F' });
    females.forEach((s, i) => allRows.push({ type: 'student', data: s, genderIdx: i, genderType: 'F' }));
  }

  if (others.length > 0) {
    allRows.push({ type: 'header', label: `UNCATEGORIZED / OTHERS (${others.length})`, genderType: 'U' });
    others.forEach((s, i) => allRows.push({ type: 'student', data: s, genderIdx: i, genderType: 'U' }));
  }

  allRows.push({ type: 'header', label: 'SUMMARY OF VOTERS' });
  allRows.push({ type: 'summary', label: 'TOTAL MALE', value: males.length });
  allRows.push({ type: 'summary', label: 'TOTAL FEMALE', value: females.length });
  if (others.length > 0) {
    allRows.push({ type: 'summary', label: 'TOTAL OTHERS', value: others.length });
  }
  allRows.push({ type: 'summary', label: 'GRAND TOTAL', value: students.length });

  // Pagination Constants
  const ROWS_PER_PAGE_FIRST = 19;
  const ROWS_PER_PAGE_SUBSEQUENT = 24;

  const pages: RowItem[][] = [];
  let currentRows: RowItem[] = [];
  let isFirstPage = true;

  allRows.forEach((row, index) => {
    const limit = isFirstPage ? ROWS_PER_PAGE_FIRST : ROWS_PER_PAGE_SUBSEQUENT;
    currentRows.push(row);
    
    if (currentRows.length >= limit || index === allRows.length - 1) {
      pages.push([...currentRows]);
      currentRows = [];
      isFirstPage = false;
    }
  });

  return (
    <div className="masterlist-container" style={{ color: '#000' }}>
      {pages.map((pageRows, pageIdx) => {
        const firstRow = pageRows[0];
        const showContinuedHeader = pageIdx > 0 && firstRow.type === 'student';
        const activeGenderLabel = firstRow.genderType === 'M' ? 'MALE' : (firstRow.genderType === 'F' ? 'FEMALE' : 'UNCATEGORIZED');

        return (
          <div 
            key={pageIdx}
            className="section-page"
            data-section-name={section.name}
            data-grade-level={section.gradeLevel}
            data-page-index={pageIdx + 1}
            style={{ 
              width: '210mm', 
              height: '297mm', 
              padding: '10mm 15mm 15mm 15mm', 
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              fontFamily: "'Inter', sans-serif",
              color: '#000000',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              pageBreakAfter: pageIdx === pages.length - 1 ? 'auto' : 'always',
              breakAfter: pageIdx === pages.length - 1 ? 'auto' : 'page',
              margin: '0 auto',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            {pageIdx === 0 ? (
              <MasterlistHeader section={section} schoolYear={schoolYear} schoolName={schoolName} />
            ) : (
              <MasterlistSubHeader 
                section={section} 
                schoolYear={schoolYear} 
                pageIdx={pageIdx} 
                totalPages={pages.length} 
              />
            )}

            {/* Document Specific Title */}
            {pageIdx === 0 && (
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div style={{ textTransform: 'uppercase', textDecoration: 'underline', fontWeight: 900, fontSize: '13pt' }}>
                  Master List of Learner-Voters
                </div>
                <div style={{ fontWeight: 800, fontSize: '11pt', marginTop: '2px' }}>
                  School Year {schoolYear}
                </div>
              </div>
            )}

            <MasterlistMetaInfo section={section} schoolYear={schoolYear} />

            {/* Table Area */}
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', color: '#000' }}>
                <MasterlistTableHead />
                <tbody>
                  {showContinuedHeader && (
                    <tr style={{ backgroundColor: '#f3f4f6', height: '24px' }}>
                      <td colSpan={6} style={{ border: '1.2px solid #000', padding: '2px 8px', fontWeight: 900, fontSize: '8px', color: '#000', fontStyle: 'italic' }}>
                        {activeGenderLabel} (CONTINUED)
                      </td>
                    </tr>
                  )}

                  {pageRows.map((row, rIdx) => {
                    if (row.type === 'header') {
                      return (
                        <tr key={`h-${pageIdx}-${rIdx}`} style={{ backgroundColor: '#f3f4f6', height: '24px' }}>
                          <td colSpan={6} style={{ border: '1.2px solid #000', padding: '2px 8px', fontWeight: 900, fontSize: '8px', color: '#000' }}>
                            {row.label}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === 'summary') {
                      const isGrand = row.label === 'GRAND TOTAL';
                      return (
                        <tr key={`s-${pageIdx}-${rIdx}`} style={{ height: '32px', backgroundColor: isGrand ? '#f3f4f6' : 'white' }}>
                          <td colSpan={3} style={{ border: '1.2px solid #000', textAlign: 'right', paddingRight: '12px', fontWeight: 900, fontSize: '9px' }}>
                            {row.label}
                          </td>
                          <td style={{ border: '1.2px solid #000', textAlign: 'center', fontWeight: 900, fontSize: '10px' }}>
                            {row.value}
                          </td>
                          <td colSpan={2} style={{ border: '1.2px solid #000' }}></td>
                        </tr>
                      );
                    }
                    
                    const s = row.data!;
                    return (
                      <tr key={`${s.id || s.lrn}-${pageIdx}-${rIdx}`} style={{ height: '38px' }}>
                        <td style={{ border: '1.2px solid #000', textAlign: 'center', color: '#000', fontWeight: 600 }}>{row.genderIdx! + 1}</td>
                        <td style={{ border: '1.2px solid #000', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000' }}>
                          {s.lrn || 'N/A'}
                        </td>
                        <td style={{ border: '1.2px solid #000', padding: '0 8px', textTransform: 'uppercase', color: '#000', fontWeight: 600 }}>
                          {s.lastName || 'Unknown'}, {s.firstName || 'Unknown'} {s.middleName ? s.middleName.charAt(0) + '.' : ''}
                        </td>
                        <td style={{ border: '1.2px solid #000', textAlign: 'center', color: '#000', fontWeight: 600 }}>
                          {getGenderChar(s)}
                        </td>
                        <td style={{ border: '1.2px solid #000' }}></td>
                        <td style={{ border: '1.2px solid #000' }}>
                          <div style={{ width: '22px', height: '22px', border: '0.5px solid #000', margin: '0 auto', opacity: 0.1 }}></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <MasterlistFooter section={section} schoolYear={schoolYear} showSignatories={pageIdx === pages.length - 1} />
          </div>
        );
      })}
    </div>
  );
};

export default MasterlistDocument;
