
export const getPrintMasterlistTemplate = (contentHtml: string, schoolYear: string) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Master List - SY ${schoolYear}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet">
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', sans-serif;
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        color: #000000;
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

      /* Force LRN color to black even if browser thinks it's a link */
      td { color: #000000 !important; }

      @media print {
        body { margin: 0; }
        .section-page {
          box-shadow: none !important;
          margin: 0 !important;
        }
        .masterlist-container {
          width: 210mm;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-wrapper">
      ${contentHtml}
    </div>
    <script>
      window.onload = () => {
        setTimeout(() => {
          window.print();
        }, 800);
      };
    </script>
  </body>
</html>
`;
