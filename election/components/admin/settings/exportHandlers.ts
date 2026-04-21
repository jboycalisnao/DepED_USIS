import { Section } from '../../../types';
import { getPrintMasterlistTemplate } from './PrintMasterlistTemplate';

export const handleZipExport = async (
  container: HTMLElement, 
  selectedSectionIds: string[], 
  sections: Section[], 
  schoolYear: string
) => {
  const JSZip = (window as any).JSZip;
  const saveAs = (window as any).saveAs;
  const html2canvas = (window as any).html2canvas;

  const scrollPos = window.scrollY;
  window.scrollTo(0, 0);

  const zip = new JSZip();
  // Main root folder for the entire export
  const rootFolder = zip.folder(`Masterlists_SY_${schoolYear}`);
  const sectionPages = container.querySelectorAll('.section-page');

  try {
    for (let i = 0; i < sectionPages.length; i++) {
      const el = sectionPages[i] as HTMLElement;
      
      // Extract metadata from the element attributes
      const sectionName = el.getAttribute('data-section-name') || 'unknown_section';
      const gradeLevel = el.getAttribute('data-grade-level') || 'unknown_grade';
      const pageIdx = el.getAttribute('data-page-index') || '1';
      
      // Clean names for file system compatibility
      const cleanSectionName = sectionName.replace(/\s+/g, '_');
      const cleanGrade = gradeLevel.replace(/\s+/g, '_');
      
      // Organize into a subfolder per section
      const sectionFolderName = `${cleanGrade}_${cleanSectionName}`;
      const sectionFolder = rootFolder.folder(sectionFolderName);
      
      const fileName = `${cleanGrade}_${cleanSectionName}_Page_${pageIdx}`;

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        width: el.scrollWidth,
        height: el.scrollHeight,
        onclone: (clonedDoc: Document) => {
          const headers = clonedDoc.querySelectorAll('th');
          headers.forEach(h => {
            (h as HTMLElement).style.color = '#000000';
            (h as HTMLElement).style.backgroundColor = '#f3f4f6';
            (h as HTMLElement).style.border = '1px solid #000000';
          });
          
          const clonedEl = clonedDoc.querySelector('.section-page') as HTMLElement;
          if (clonedEl) {
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.margin = '0';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png').split(',')[1];
      // Save the file into the specific section subfolder
      sectionFolder.file(`${fileName}.png`, imgData, { base64: true });
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Leon_NHS_Masterlists_SY_${schoolYear}_Organized.zip`);
  } catch (error) {
    console.error("ZIP Generation failed:", error);
    alert("An error occurred while generating the masterlists.");
  } finally {
    window.scrollTo(0, scrollPos);
  }
};

export const handlePdfPrint = (
  contentHtml: string, 
  schoolYear: string
) => {
  // Removing the window features (width, height, etc.) tells modern browsers to open a new tab instead of a separate window
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert("Action blocked! Please allow redirects or pop-ups to open the official masterlist tab.");
    return;
  }

  const fullHtml = getPrintMasterlistTemplate(contentHtml, schoolYear);

  printWindow.document.write(fullHtml);
  printWindow.document.close();
};