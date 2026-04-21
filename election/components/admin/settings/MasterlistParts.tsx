
import React from 'react';
import { Section } from '../../../types';
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../../../constants';

interface PartProps {
  section: Section;
  schoolYear: string;
}

export const MasterlistHeader: React.FC<PartProps & { schoolName: string }> = ({ schoolName }) => (
  <div style={{ width: '100%', marginBottom: '20px' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
      <tbody>
        <tr>
          <td style={{ width: '80px', border: 'none', verticalAlign: 'middle', padding: 0 }}>
            <img src={DEPED_SEAL_URL} style={{ height: '70px', width: 'auto', display: 'block', margin: '0 auto' }} alt="DepEd Seal" />
          </td>
          <td style={{ border: 'none', textAlign: 'center', verticalAlign: 'middle', padding: '0 10px' }}>
            <p style={{ margin: 0, fontSize: '9pt', fontFamily: "serif" }}>Republic of the Philippines</p>
            <p style={{ margin: '1px 0', fontSize: '11pt', fontWeight: 'bold', fontFamily: "serif" }}>Department of Education</p>
            <p style={{ margin: 0, fontSize: '7.5pt', letterSpacing: '0.5pt', textTransform: 'uppercase', fontWeight: 500 }}>REGION VI – WESTERN VISAYAS</p>
            <p style={{ margin: 0, fontSize: '7.5pt', letterSpacing: '0.5pt', textTransform: 'uppercase', fontWeight: 500 }}>SCHOOLS DIVISION OF ILOILO</p>
            <p style={{ margin: '1px 0', fontSize: '8.5pt', fontWeight: 900, textTransform: 'uppercase' }}>{schoolName}</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', color: '#034F8B' }}>LEARNER GOVERNMENT (LG) COMEA</p>
          </td>
          <td style={{ width: '80px', border: 'none', verticalAlign: 'middle', padding: 0 }}>
            <img src={LEON_NHS_LOGO_URL} style={{ height: '70px', width: 'auto', display: 'block', margin: '0 auto' }} alt="School Logo" />
          </td>
        </tr>
      </tbody>
    </table>
    <div style={{ borderTop: '2px solid #000', marginTop: '12px', width: '100%' }}></div>
  </div>
);

export const MasterlistSubHeader: React.FC<PartProps & { pageIdx: number, totalPages: number }> = ({ schoolYear, pageIdx, totalPages }) => (
  <div style={{ borderBottom: '1.5px solid #000', paddingBottom: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
     <span style={{ fontSize: '9px', fontWeight: 900 }}>OFFICIAL MASTER LIST OF LEARNER-VOTERS</span>
     <span style={{ fontSize: '9px', fontWeight: 900 }}>SY {schoolYear} | Page {pageIdx + 1} of {totalPages}</span>
  </div>
);

export const MasterlistMetaInfo: React.FC<PartProps> = ({ section }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '10px', color: '#000', borderBottom: '0.5px solid #ccc', paddingBottom: '4px' }}>
    <p style={{ margin: 0 }}><strong>GRADE & SECTION:</strong> {section.gradeLevel} - {section.name}</p>
    <p style={{ margin: 0 }}><strong>ADVISER:</strong> {section.adviserName || 'N/A'}</p>
  </div>
);

export const MasterlistFooter: React.FC<PartProps> = ({ schoolYear }) => (
  <div style={{ position: 'absolute', bottom: '10mm', left: '15mm', right: '15mm', backgroundColor: 'white', color: '#000', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', paddingBottom: '10px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '30px 0 0 0', borderTop: '1.5px solid #000', paddingTop: '4px', fontSize: '10pt', fontWeight: 900, textTransform: 'uppercase' }}>MARIA TERESITA C. TALITE</p>
        <p style={{ margin: 0, fontSize: '8pt', fontWeight: 700 }}>Commissioner on Election</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '30px 0 0 0', borderTop: '1.5px solid #000', paddingTop: '4px', fontSize: '10pt', fontWeight: 900, textTransform: 'uppercase' }}>NELSON C. CANDOLESAS</p>
        <p style={{ margin: 0, fontSize: '8pt', fontWeight: 700 }}>Chief Commissioner / School Principal II</p>
      </div>
    </div>
    <div style={{ borderTop: '1px solid #000', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase' }}>
      <span>*** SYSTEM GENERATED OFFICIAL DOCUMENT • SY {schoolYear} ***</span>
      <span>Generated: {new Date().toLocaleString()} • Leon NHS E-Boto</span>
    </div>
  </div>
);

export const MasterlistTableHead = () => (
  <thead>
    <tr style={{ backgroundColor: '#f3f4f6' }}>
      <th style={{ border: '1.2px solid #000', padding: '4px 2px', width: '30px', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', color: '#000' }}>No.</th>
      <th style={{ border: '1.2px solid #000', padding: '4px 2px', width: '100px', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', color: '#000' }}>LRN</th>
      <th style={{ border: '1.2px solid #000', padding: '4px 8px', textAlign: 'left', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', color: '#000' }}>Full Name (Last Name, First Name, M.I.)</th>
      <th style={{ border: '1.2px solid #000', padding: '4px 2px', width: '30px', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', color: '#000' }}>Sex</th>
      <th style={{ border: '1.2px solid #000', padding: '4px 2px', width: '120px', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', color: '#000' }}>Signature</th>
      <th style={{ border: '1.2px solid #000', padding: '4px 2px', width: '70px', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', color: '#000' }}>Thumbmark</th>
    </tr>
  </thead>
);
