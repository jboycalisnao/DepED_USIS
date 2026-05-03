
import { Candidate } from '../../../types';
import { getEncodingSlipTemplate } from './EncodingSlipTemplate';
import { DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../../../constants';
import { getElectionAbsoluteUrl } from '../../../utils/navigation';

export const handlePrintEncodingSlip = (
  candidate: Candidate, 
  schoolYear: string
) => {
  // Opening with specific dimensions for A5 landscape aspect ratio
  const printWindow = window.open('', '_blank', 'width=1000,height=700,toolbar=0,scrollbars=0,status=0');
  
  if (!printWindow) {
    alert("Pop-up blocked! Please allow pop-ups to generate the official encoding slip.");
    return;
  }

  // Format: [sy]-[unique id]
  // Extracting only years if SY is "2026-2027"
  const sy = schoolYear; 
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const cocNumber = `${sy}-${uniqueId}`;

  // Public Audit URL
  const qrUrl = getElectionAbsoluteUrl(`/audit/${candidate.id}`);

  const html = getEncodingSlipTemplate(
    candidate, 
    schoolYear, 
    qrUrl, 
    cocNumber,
    DEPED_SEAL_URL,
    LEON_NHS_LOGO_URL
  );

  printWindow.document.write(html);
  printWindow.document.close();
};
