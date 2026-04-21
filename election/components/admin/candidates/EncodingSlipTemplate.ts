
export const getEncodingSlipTemplate = (
  candidate: any, 
  schoolYear: string, 
  qrUrl: string,
  cocNumber: string,
  depedSeal: string,
  schoolLogo: string
) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OFFICIAL COC SLIP - ${candidate.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:slnt,wght@-10..0,100..900&display=swap" rel="stylesheet">
    <style>
        /* A5 Landscape: 210mm x 148mm. 
           With 10mm margins, the printable area is 190mm x 128mm. */
        @page { 
            size: A5 landscape; 
            margin: 10mm; 
        }
        
        * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
        }
        
        body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #000; 
            background: #fff; 
            overflow: hidden;
            width: 190mm;
            height: 128mm;
        }

        .document-container {
            width: 190mm;
            height: 128mm;
            border: 2px solid #000;
            padding: 1.5mm;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            page-break-inside: avoid;
        }

        .inner-content {
            border: 0.5px solid #000;
            height: 100%;
            padding: 6mm 8mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #000;
            padding-bottom: 3mm;
        }

        .logo {
            height: 18mm;
            width: auto;
        }

        .header-text {
            text-align: center;
            flex: 1;
            padding: 0 4mm;
        }

        .header-text p {
            margin: 0;
            font-size: 7.5pt;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
        }

        .header-text h2 {
            margin: 0.5mm 0;
            font-size: 10pt;
            font-weight: 900;
            text-transform: uppercase;
        }

        .title-block {
            text-align: center;
            margin: 4mm 0;
        }

        .main-title {
            font-size: 18pt;
            font-weight: 900;
            text-transform: uppercase;
            display: block;
            margin-bottom: 1mm;
            letter-spacing: -0.5pt;
        }

        .sub-title {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2pt;
            color: #333;
            border-top: 1px solid #eee;
            display: inline-block;
            padding-top: 0.5mm;
        }

        .info-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-grow: 1;
            padding: 2mm 0;
        }

        .details {
            flex: 1;
        }

        .data-group {
            margin-bottom: 6mm;
        }

        .label {
            font-size: 8pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 1.5mm;
        }

        .value-name {
            font-size: 22pt;
            font-weight: 900;
            text-transform: uppercase;
            line-height: 1;
        }

        .value-ref {
            font-family: monospace;
            font-size: 14pt;
            font-weight: 800;
            background: #f4f4f4;
            padding: 2mm 4mm;
            border: 1px solid #000;
            display: inline-block;
        }

        .qr-section {
            text-align: center;
            margin-left: 10mm;
        }

        .qr-wrapper {
            border: 1px solid #000;
            padding: 1.5mm;
            display: inline-block;
            background: #fff;
        }

        .qr-code {
            width: 30mm;
            height: 30mm;
            display: block;
        }

        .qr-note {
            font-size: 6pt;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 1.5mm;
            max-width: 30mm;
            line-height: 1.1;
        }

        .footer {
            border-top: 1px solid #000;
            padding-top: 2.5mm;
            display: flex;
            justify-content: space-between;
            font-size: 6.5pt;
            font-weight: 700;
            text-transform: uppercase;
        }

        .official-seal {
            position: absolute;
            bottom: 18mm;
            right: 55mm;
            width: 22mm;
            height: 22mm;
            border: 1px dashed rgba(0,0,0,0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 5pt;
            font-weight: 900;
            color: rgba(0,0,0,0.1);
            transform: rotate(-15deg);
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="document-container">
        <div class="inner-content">
            <div class="header">
                <img src="${depedSeal}" class="logo" alt="DepEd Seal" />
                <div class="header-text">
                    <p>Republic of the Philippines</p>
                    <h2>Department of Education</h2>
                    <p>Schools Division of Iloilo | Leon National High School</p>
                </div>
                <img src="${schoolLogo}" class="logo" alt="School Logo" />
            </div>

            <div class="title-block">
                <span class="main-title">Learner Government (LG) Elections</span>
                <span class="sub-title">Official COC Encoding Slip</span>
            </div>

            <div class="info-grid">
                <div class="details">
                    <div class="data-group">
                        <div class="label">Full Legal Name of Candidate</div>
                        <div class="value-name">${candidate.name}</div>
                    </div>
                    
                    <div class="data-group">
                        <div class="label">COC Reference Number</div>
                        <div class="value-ref">${cocNumber}</div>
                    </div>
                </div>

                <div class="qr-section">
                    <div class="qr-wrapper">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" class="qr-code" />
                    </div>
                    <div class="qr-note">Scan for Election Data Integrity Audit</div>
                </div>
            </div>

            <div class="official-seal">Electronic<br>Verification<br>Required</div>

            <div class="footer">
                <div>E-Boto System Generated Slip • SY ${schoolYear}</div>
                <div>Issued On: ${new Date().toLocaleString()}</div>
            </div>
        </div>
    </div>

    <script>
        window.onload = () => {
            setTimeout(() => {
                window.print();
            }, 500);
        };
        
        window.onafterprint = () => {
            window.close();
        };

        // Fallback close logic
        setTimeout(() => {
            window.addEventListener('focus', () => {
                setTimeout(() => window.close(), 500);
            }, { once: true });
        }, 1500);
    </script>
</body>
</html>
`;
