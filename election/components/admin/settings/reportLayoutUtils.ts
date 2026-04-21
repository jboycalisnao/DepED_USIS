
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../../../constants';

export const getStandardReportStyles = () => `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: 'Inter', sans-serif; color: #000; margin: 0; padding: 0; line-height: 1.2; }
  
  /* Robust Header Layout */
  .report-header { 
    display: table; 
    width: 100%; 
    border-collapse: collapse; 
    margin-bottom: 25px;
  }
  
  .header-left, .header-right { 
    display: table-cell; 
    vertical-align: middle; 
    width: 80px; 
  }
  
  .header-center { 
    display: table-cell; 
    vertical-align: middle; 
    text-align: center; 
    padding: 0 15px;
  }

  .header-logo-img { 
    height: 75px; 
    width: auto; 
    display: block; 
    margin: 0 auto;
  }
  
  .header-p-base { 
    margin: 0; 
    color: #000; 
    text-transform: uppercase;
  }

  .header-p-country { font-size: 9pt; font-family: 'Old English Text MT', serif; text-transform: none; }
  .header-p-dept { font-size: 11pt; font-weight: bold; font-family: 'Old English Text MT', serif; text-transform: none; margin-bottom: 2px; }
  .header-p-region { font-size: 8pt; letter-spacing: 1pt; font-family: 'Inter', sans-serif; font-weight: 500; }
  .header-p-division { font-size: 8pt; letter-spacing: 1pt; font-family: 'Inter', sans-serif; font-weight: 500; }
  .header-p-school { font-size: 9pt; font-weight: 900; letter-spacing: 0.5pt; margin-top: 2px; }
  .header-p-office { 
    font-size: 15pt; 
    font-weight: 900; 
    margin-top: 10px; 
    color: #034F8B;
    letter-spacing: -0.5pt;
  }

  .header-hr { 
    border: none; 
    border-top: 2px solid #000; 
    margin-top: 8px; 
    width: 100%; 
  }

  /* Table Styles */
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { border: 1.5px solid #000; padding: 8px; font-size: 9pt; background-color: #f1f5f9; text-transform: uppercase; font-weight: 900; }
  td { border: 1px solid #000; padding: 6px 10px; font-size: 8.5pt; }

  /* Footer / Signatory Styles */
  .report-footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; page-break-inside: avoid; }
  .sign-area { text-align: center; }
  .sign-line { border-top: 1.5px solid #000; margin-top: 40px; padding-top: 6px; }
  .sign-name { font-size: 10.5pt; font-weight: 900; text-transform: uppercase; margin: 0; }
  .sign-title { font-size: 8.5pt; font-weight: 700; color: #333; margin-top: 2px; }
  
  .system-footer { margin-top: 30px; font-size: 7.5pt; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-weight: 600; text-transform: uppercase; }
`;

export const getStandardReportHeaderHTML = (schoolName: string) => `
  <div class="report-header">
    <div class="header-left">
      <img src="${DEPED_SEAL_URL}" class="header-logo-img" alt="DepEd Seal" />
    </div>
    <div class="header-center">
      <p class="header-p-base header-p-country">Republic of the Philippines</p>
      <p class="header-p-base header-p-dept">Department of Education</p>
      <p class="header-p-base header-p-region">REGION VI – WESTERN VISAYAS</p>
      <p class="header-p-base header-p-division">SCHOOLS DIVISION OF ILOILO</p>
      <p class="header-p-base header-p-school">${schoolName.toUpperCase()}</p>
      <p class="header-p-base header-p-office">LEARNER GOVERNMENT (LG) COMEA</p>
    </div>
    <div class="header-right">
      <img src="${LEON_NHS_LOGO_URL}" class="header-logo-img" alt="School Logo" />
    </div>
  </div>
  <div class="header-hr"></div>
`;

export const getStandardSignatoriesHTML = () => `
  <div class="report-footer">
    <div class="sign-area">
      <div class="sign-line">
        <p class="sign-name">MARIA TERESITA C. TALITE</p>
        <p class="sign-title">Commissioner on Election</p>
      </div>
    </div>
    <div class="sign-area">
      <div class="sign-line">
        <p class="sign-name">NELSON C. CANDOLESAS</p>
        <p class="sign-title">Chief Commissioner / School Principal II</p>
      </div>
    </div>
  </div>
`;
