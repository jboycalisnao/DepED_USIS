const getEmptyMasterlistMarkup = (schoolYear: string) => `
  <div class="masterlist-empty-state">
    <p class="masterlist-empty-state__eyebrow">Official Master List of Learner-Voters</p>
    <h1 class="masterlist-empty-state__title">No learner sections selected</h1>
    <p class="masterlist-empty-state__body">School Year ${schoolYear}</p>
    <p class="masterlist-empty-state__body">Select at least one section before printing.</p>
  </div>
`;

export const getPrintMasterlistTemplate = (contentHtml: string, schoolYear: string) => {
  const safeContent = String(contentHtml || '').trim() || getEmptyMasterlistMarkup(schoolYear);

  return `
    <div class="print-wrapper">
      ${safeContent}
    </div>
  `;
};

export const getPrintMasterlistStyles = () => `
  @page {
    size: A4 portrait;
    margin: 0;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    background-color: #ffffff;
    color: #000000;
    font-family: 'Segoe UI', sans-serif;
  }

  body {
    overflow: auto;
  }

  .print-wrapper {
    width: 100%;
  }

  .section-page {
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    page-break-after: always;
    position: relative;
    overflow: hidden;
    background: white;
  }

  .masterlist-empty-state {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 24mm;
    gap: 8px;
  }

  .masterlist-empty-state__eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4b5563;
  }

  .masterlist-empty-state__title {
    font-size: 22px;
    font-weight: 700;
    color: #12233d;
  }

  .masterlist-empty-state__body {
    font-size: 14px;
    font-weight: 400;
    color: #4b5563;
  }

  td {
    color: #000000 !important;
  }

  @media print {
    body {
      margin: 0;
    }

    .section-page {
      box-shadow: none !important;
      margin: 0 !important;
    }

    .masterlist-container {
      width: 210mm;
    }
  }
`;
