import { Section } from '../../../types';
import { getPrintMasterlistStyles, getPrintMasterlistTemplate } from './PrintMasterlistTemplate';

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
  const popupFeatures = 'popup=yes,width=1120,height=900,resizable=yes,scrollbars=yes';
  const printWindow = window.open('about:blank', '_blank', popupFeatures);
  
  if (!printWindow) {
    alert("Action blocked! Please allow redirects or pop-ups to open the official masterlist tab.");
    return;
  }

  console.log('[MasterlistPrint] Popup opened', {
    schoolYear,
    contentLength: String(contentHtml || '').length,
  });

  const doc = printWindow.document;
  const safeTemplate = getPrintMasterlistTemplate(contentHtml, schoolYear);
  const styles = getPrintMasterlistStyles();
  let hasRendered = false;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Preparing Masterlist...</title>
  </head>
  <body>
    <div id="usis-print-shell" style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Segoe UI,sans-serif;color:#12233d;background:#fff;">
      <div style="text-align:center;max-width:560px;padding:32px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4b5563;">Masterlist Print Debug</div>
        <div style="font-size:24px;font-weight:700;margin-top:12px;">Loading print content...</div>
        <div style="font-size:14px;margin-top:8px;color:#4b5563;">If this screen remains visible, the popup body was created successfully and the next render step did not run.</div>
      </div>
    </div>
  </body>
</html>`);
  doc.close();

  const applyStyle = () => {
    if (!doc.head.querySelector('style[data-usis-masterlist-print]')) {
      const styleTag = doc.createElement('style');
      styleTag.setAttribute('data-usis-masterlist-print', 'true');
      styleTag.textContent = styles;
      doc.head.appendChild(styleTag);
    }
  };

  const logToPopup = (message: string) => {
    const existing = doc.getElementById('usis-print-log');
    const node = doc.createElement('script');
    node.textContent = `console.log(${JSON.stringify(message)});`;
    doc.body.appendChild(node);
    node.remove();
    if (existing) {
      existing.textContent = message;
    }
  };

  const renderContent = () => {
    if (hasRendered) return;
    hasRendered = true;
    applyStyle();
    doc.title = `Master List - SY ${schoolYear}`;
    doc.body.innerHTML = `
      <div id="usis-print-log" style="position:sticky;top:0;z-index:5;padding:10px 14px;background:#eff6ff;border-bottom:1px solid #bfdbfe;color:#1d4ed8;font:700 12px Segoe UI,sans-serif;">
        Masterlist print body rendered. Preparing report...
      </div>
      ${safeTemplate}
    `;
    logToPopup(`[MasterlistPrint] Report body rendered for SY ${schoolYear}.`);
    printWindow.focus();
    setTimeout(() => {
      console.log('[MasterlistPrint] Triggering print dialog');
      logToPopup('[MasterlistPrint] Triggering print dialog.');
      printWindow.print();
    }, 250);
  };

  printWindow.addEventListener('afterprint', () => {
    console.log('[MasterlistPrint] Print dialog closed');
    try {
      printWindow.close();
    } catch (error) {
      console.warn('[MasterlistPrint] Popup close failed', error);
    }
  });

  printWindow.addEventListener('load', () => {
    console.log('[MasterlistPrint] Popup load event fired');
    renderContent();
  }, { once: true });

  setTimeout(() => {
    if (doc.body && !doc.getElementById('usis-print-log')) {
      console.log('[MasterlistPrint] Fallback render executed');
      renderContent();
    }
  }, 100);
};
