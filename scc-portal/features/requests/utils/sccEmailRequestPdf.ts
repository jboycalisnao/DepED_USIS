import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { SccServiceRequest } from '../../../types';
import { SccEmailRequestDocument } from '../components/SccEmailRequestDocument';

export interface SccEmailRequestPdfOptions {
  adviserName?: string;
  schoolId?: string;
  schoolName?: string;
}

const sanitizeFilePart = (value?: string): string => {
  const cleaned = (value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Request';
};

const waitForImages = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        }),
    ),
  );
};

/**
 * Generates and downloads a portrait US-Letter PDF of the auto-filled
 * Institutional Email Account Request Form wrapped in the USIS letterhead.
 */
export async function downloadSccEmailRequestPdf(
  request: SccServiceRequest,
  options: SccEmailRequestPdfOptions = {},
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF generation is only available in the browser.');
  }

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '816px';
  host.style.background = '#ffffff';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(
      React.createElement(SccEmailRequestDocument, {
        request,
        adviserName: options.adviserName,
        schoolId: options.schoolId,
        schoolName: options.schoolName,
        showFrame: false,
      }),
    );

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
    await (document.fonts?.ready || Promise.resolve());
    await waitForImages(host);

    const sheetElements = Array.from(
      host.querySelectorAll('.usis-doc-sheet'),
    ) as HTMLElement[];
    const targets = sheetElements.length > 0 ? sheetElements : [host];

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < targets.length; i++) {
      const sheetEl = targets[i];
      const canvas = await html2canvas(sheetEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: sheetEl.scrollWidth,
        height: sheetEl.scrollHeight,
        windowWidth: sheetEl.scrollWidth,
        windowHeight: sheetEl.scrollHeight,
      });

      if (i > 0) {
        pdf.addPage('letter', 'portrait');
      }

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const fitScale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const drawWidth = imgWidth * fitScale;
      const drawHeight = imgHeight * fitScale;
      const offsetX = (pageWidth - drawWidth) / 2;

      const imageData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imageData, 'PNG', offsetX, 0, drawWidth, drawHeight, undefined, 'FAST');
    }

    const filename = `USIS_Email_Request_${sanitizeFilePart(request.trackingNumber || request.organizationAcronym)}.pdf`;
    pdf.save(filename);
    return filename;
  } finally {
    root.unmount();
    host.remove();
  }
}
