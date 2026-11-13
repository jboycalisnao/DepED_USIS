import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type EmailTermsAgreementPdfInput = {
  trackingNumber?: string;
  organizationName: string;
  organizationAcronym?: string;
  emailAddress: string;
  requesterName: string;
  requesterPosition?: string;
  adviserName?: string;
  adviserEndorsed?: boolean;
  approvedBy?: string;
  statusLabel?: string;
  issuedDate?: string;
};

type JpegAsset = {
  width: number;
  height: number;
  data: Buffer;
};

const PAGE_WIDTH = 612; // US Letter width (8.5in) in pt
const PAGE_HEIGHT = 792; // US Letter height (11in) in pt
const MARGIN_X = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// Approximate average glyph width factors in points for Helvetica @ 1pt font size.
const WINANSI_MAP: Record<string, number> = {
  '\u2022': 0x95, // bullet
  '\u2013': 0x96, // en dash
  '\u2014': 0x97, // em dash
  '\u2018': 0x91, // left single quote
  '\u2019': 0x92, // right single quote
  '\u201c': 0x93, // left double quote
  '\u201d': 0x94, // right double quote
};

function toWinAnsiBytes(input: string): Buffer {
  const bytes: number[] = [];
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) {
      bytes.push(code);
    } else if (ch in WINANSI_MAP) {
      bytes.push(WINANSI_MAP[ch]);
    } else if (code >= 0xa0 && code <= 0xff) {
      bytes.push(code);
    } else {
      bytes.push(0x2d); // '-'
    }
  }
  return Buffer.from(bytes);
}

function pdfStringHex(text: string): string {
  return `<${toWinAnsiBytes(text).toString('hex')}>`;
}

function estimateCharWidth(ch: string, fontSize: number, bold = false): number {
  const scale = bold ? 1.05 : 1.0;
  if (ch === ' ') return fontSize * 0.28 * scale;
  if ('iIljtf!|.,:;\'"'.includes(ch)) return fontSize * 0.27 * scale;
  if ('mwMW@%'.includes(ch)) return fontSize * 0.78 * scale;
  if (ch >= 'A' && ch <= 'Z') return fontSize * 0.65 * scale;
  if (ch >= '0' && ch <= '9') return fontSize * 0.55 * scale;
  return fontSize * 0.49 * scale;
}

function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  let w = 0;
  for (const ch of text) {
    w += estimateCharWidth(ch, fontSize, bold);
  }
  return w;
}

function wrapText(text: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadUsisLogoJpeg(): JpegAsset | null {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), 'common/assets/Leon-NHS_USIS-Header-Image-email.jpg'),
    path.resolve(process.cwd(), '../common/assets/Leon-NHS_USIS-Header-Image-email.jpg'),
    path.resolve(currentDir, '../../../common/assets/Leon-NHS_USIS-Header-Image-email.jpg'),
    path.resolve(currentDir, '../../common/assets/Leon-NHS_USIS-Header-Image-email.jpg'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const data = fs.readFileSync(candidate);
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) continue;

    let offset = 2;
    while (offset + 8 < data.length) {
      const marker = data.readUInt16BE(offset);
      offset += 2;
      if (marker >= 0xffc0 && marker <= 0xffc3) {
        const height = data.readUInt16BE(offset + 3);
        const width = data.readUInt16BE(offset + 5);
        return { width, height, data };
      }
      if (marker === 0xffd9 || marker === 0xffda) break;
      const segLen = data.readUInt16BE(offset);
      offset += segLen;
    }
  }
  return null;
}

type FontKey = 'F1' | 'F2' | 'F3';

export function buildEmailTermsAgreementPdf(input: EmailTermsAgreementPdfInput): {
  filename: string;
  buffer: Buffer;
} {
  const logo = loadUsisLogoJpeg();
  const ops: string[] = [];

  const cleanText = (val?: string | null) => String(val || '').replace(/\s+/g, ' ').trim();

  const orgDisplay = cleanText(
    input.organizationAcronym
      ? `${input.organizationName} (${input.organizationAcronym})`
      : input.organizationName,
  );
  const emailDisplay = cleanText(input.emailAddress).toLowerCase() || '@leonnhs.edu.ph';
  const requesterDisplay = cleanText(
    input.requesterPosition
      ? `${input.requesterName} (${input.requesterPosition})`
      : input.requesterName,
  );
  const adviserDisplay =
    cleanText(input.adviserName) ||
    (input.adviserEndorsed ? 'Certified Endorsed by Teacher Adviser' : 'Designated Teacher Adviser');
  const approvedByDisplay = cleanText(input.approvedBy) || 'Integrated Admin Coordinator';
  const trackingDisplay = cleanText(input.trackingNumber) || 'SCC-EMAIL';
  const dateDisplay =
    cleanText(input.issuedDate) ||
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const drawText = (
    text: string,
    x: number,
    y: number,
    font: FontKey,
    size: number,
    rgb: [number, number, number] = [0.07, 0.14, 0.24],
  ) => {
    ops.push(
      `BT /${font} ${size} Tf ${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfStringHex(text)} Tj ET`,
    );
  };

  const drawCenteredText = (
    text: string,
    y: number,
    font: FontKey,
    size: number,
    rgb: [number, number, number] = [0.07, 0.14, 0.24],
  ) => {
    const w = estimateTextWidth(text, size, font === 'F2');
    drawText(text, Math.max(MARGIN_X, (PAGE_WIDTH - w) / 2), y, font, size, rgb);
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width = 0.6,
    rgb: [number, number, number] = [0.55, 0.62, 0.72],
  ) => {
    ops.push(
      `q ${width} w ${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`,
    );
  };

  let y = PAGE_HEIGHT - 38;

  // USIS Header Logo centered at top
  if (logo) {
    const drawW = 164;
    const drawH = (drawW * logo.height) / logo.width;
    const imgX = (PAGE_WIDTH - drawW) / 2;
    const imgY = y - drawH;
    ops.push(`q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm /Im1 Do Q`);
    y = imgY - 14;
  } else {
    drawCenteredText('LEON NHS - USIS', y - 10, 'F2', 16, [0, 0.22, 0.66]);
    y -= 28;
  }

  // Document Header
  drawCenteredText('Terms and Agreement for the Use of', y, 'F2', 13, [0.04, 0.08, 0.18]);
  y -= 15;
  drawCenteredText('@leonnhs.edu.ph Institutional Email Accounts', y, 'F2', 13, [0.04, 0.08, 0.18]);
  y -= 13;
  drawCenteredText('Leon National High School', y, 'F1', 9.2, [0.22, 0.28, 0.38]);
  y -= 11;
  drawCenteredText('Leon NHS - USIS (Unified School Information System)', y, 'F1', 8.8, [0.22, 0.28, 0.38]);
  y -= 10.5;
  drawCenteredText('Effective School Year: 2026\u20132027', y, 'F3', 8.2, [0.36, 0.42, 0.51]);
  y -= 9;
  drawLine(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y, 0.8, [0.25, 0.31, 0.4]);
  y -= 13;

  // Sections 1 to 7
  const sections: Array<{
    title: string;
    items: Array<{ prefix: string; text: string; isBullet?: boolean }>;
  }> = [
    {
      title: '1. Purpose and Institutional Ownership',
      items: [
        {
          prefix: '1.1',
          text: 'All @leonnhs.edu.ph email accounts and associated Google Workspace services are official digital assets owned and administered by Leon National High School through Leon NHS - USIS Integrated Admin and the School USIS Coordinator.',
        },
        {
          prefix: '1.2',
          text: 'These accounts are provisioned strictly for official school administration, instruction, academic coordination, and recognized School Coordinating Council (SCC) organization activities.',
        },
      ],
    },
    {
      title: '2. Eligibility and Account Stewardship',
      items: [
        {
          prefix: '2.1',
          text: 'Accounts may be issued to authorized school personnel and recognized student organizations/clubs upon Teacher Adviser endorsement and coordinator approval.',
        },
        {
          prefix: '\u2022',
          text: 'The Club President and designated officers serve as operational custodians during their active term; the Teacher Adviser exercises supervisory oversight.',
          isBullet: true,
        },
        {
          prefix: '\u2022',
          text: 'Organization accounts belong to the organization, not to any individual, and must be turned over cleanly at the end of each school term.',
          isBullet: true,
        },
      ],
    },
    {
      title: '3. Account Security and Credential Management',
      items: [
        {
          prefix: '3.1',
          text: 'Account holders must sign in promptly at https://mail.google.com, change the initial temporary password immediately, and enable Two-Step Verification (2SV).',
        },
        {
          prefix: '3.2',
          text: 'Passwords and authentication codes must never be shared with unauthorized individuals; any suspected compromise must be reported immediately to the Teacher Adviser and USIS Coordinator.',
        },
      ],
    },
    {
      title: '4. Acceptable Use',
      items: [
        {
          prefix: '4.1',
          text: 'Users shall use @leonnhs.edu.ph exclusively for legitimate school operations, DepEd correspondence, and approved club/organization communication while maintaining institutional decorum.',
        },
      ],
    },
    {
      title: '5. Prohibited Activities',
      items: [
        {
          prefix: '\u2022',
          text: 'Commercial solicitation, unauthorized advertising, mass unsolicited messaging (spam), phishing, impersonation, or distribution of malware.',
          isBullet: true,
        },
        {
          prefix: '\u2022',
          text: 'Harassment, cyberbullying, or content violating DepEd Order No. 40, s. 2012 (Child Protection Policy) or RA 10175 (Cybercrime Prevention Act).',
          isBullet: true,
        },
        {
          prefix: '\u2022',
          text: 'Registering personal entertainment, gaming, or unauthorized non-school third-party accounts, or bypassing school security controls.',
          isBullet: true,
        },
      ],
    },
    {
      title: '6. Data Privacy, Confidentiality, and Monitoring',
      items: [
        {
          prefix: '6.1',
          text: 'Users must safeguard learner records, LRNs, contact details, and school documents in strict compliance with the Data Privacy Act of 2012 (RA 10173).',
        },
        {
          prefix: '6.2',
          text: 'Leon National High School reserves the right to audit, reset access, or inspect logs for security incident response, leadership turnover, or regulatory compliance.',
        },
      ],
    },
    {
      title: '7. Suspension, Deactivation, and Deletion',
      items: [
        {
          prefix: '7.1',
          text: 'Inactive, dissolved, or non-compliant accounts may be suspended or permanently deleted in Google Workspace Admin Console and Leon NHS - USIS records upon request deletion or term completion; policy violations may lead to immediate revocation.',
        },
      ],
    },
  ];

  const sectionFontSize = 9.0;
  const bodyFontSize = 7.9;
  const lineLeading = 9.8;

  for (const sec of sections) {
    drawText(sec.title, MARGIN_X, y, 'F2', sectionFontSize, [0.04, 0.08, 0.18]);
    y -= 10.5;

    for (const item of sec.items) {
      const prefixX = item.isBullet ? MARGIN_X + 18 : MARGIN_X + 10;
      const textX = item.isBullet ? MARGIN_X + 27 : MARGIN_X + 28;
      const wrapWidth = PAGE_WIDTH - MARGIN_X - textX;
      const lines = wrapText(item.text, wrapWidth, bodyFontSize);

      drawText(item.prefix, prefixX, y, 'F1', bodyFontSize, [0.15, 0.21, 0.31]);
      for (let idx = 0; idx < lines.length; idx++) {
        drawText(lines[idx], textX, y, 'F1', bodyFontSize, [0.15, 0.21, 0.31]);
        y -= lineLeading;
      }
      y -= 0.5;
    }
    y -= 3.5;
  }

  // Divider before Section 8 Conforme
  y -= 2;
  drawLine(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y, 0.8, [0.25, 0.31, 0.4]);
  y -= 13;

  // Section 8: Prefilled Conforme and Acceptance
  drawText(
    '8. Conforme and Acceptance (For Request / Account Issuance)',
    MARGIN_X,
    y,
    'F2',
    9.2,
    [0.04, 0.08, 0.18],
  );
  y -= 11;

  const introLines = wrapText(
    'By requesting, activating, or signing into the assigned @leonnhs.edu.ph institutional email account, the requester and organization acknowledge and agree to all provisions above.',
    CONTENT_WIDTH,
    7.7,
  );
  for (const line of introLines) {
    drawText(line, MARGIN_X, y, 'F1', 7.7, [0.24, 0.3, 0.4]);
    y -= 9.5;
  }
  y -= 5;

  const drawPrefilledLine = (
    label: string,
    value: string,
    xStart: number,
    yPos: number,
    xEnd: number,
    valueRgb: [number, number, number] = [0.0, 0.22, 0.66],
  ) => {
    const labelW = estimateTextWidth(label, 8.2, false);
    drawText(label, xStart, yPos, 'F1', 8.2, [0.12, 0.17, 0.26]);
    const valX = xStart + labelW + 5;
    drawLine(valX, yPos - 2, xEnd, yPos - 2, 0.55, [0.42, 0.49, 0.59]);
    if (value) {
      const avail = Math.max(40, xEnd - valX - 6);
      let fontSize = 8.1;
      while (fontSize > 6.4 && estimateTextWidth(value, fontSize, true) > avail) {
        fontSize -= 0.4;
      }
      let safeValue = value;
      if (estimateTextWidth(safeValue, fontSize, true) > avail) {
        while (safeValue.length > 3 && estimateTextWidth(`${safeValue}...`, fontSize, true) > avail) {
          safeValue = safeValue.slice(0, -1);
        }
        safeValue = `${safeValue.trimEnd()}...`;
      }
      drawText(safeValue, valX + 3, yPos, 'F2', fontSize, valueRgb);
    }
  };

  // Row 1: Organization + Request Tracking Reference
  drawPrefilledLine('Organization / Unit:', orgDisplay, MARGIN_X, y, 405);
  drawPrefilledLine('Request Ref.:', trackingDisplay, 415, y, PAGE_WIDTH - MARGIN_X);
  y -= 16;

  // Row 2: Requested / Assigned Email + Approval Status
  drawPrefilledLine('Requested / Assigned Email:', emailDisplay, MARGIN_X, y, 375);
  drawPrefilledLine('Status:', cleanText(input.statusLabel) || 'Approved', 385, y, PAGE_WIDTH - MARGIN_X, [0.01, 0.48, 0.28]);
  y -= 16;

  // Row 3: Custodian / Requester Name & Role + Date
  drawPrefilledLine('Requester / Custodian:', requesterDisplay, MARGIN_X, y, 395);
  drawPrefilledLine('Date Issued:', dateDisplay, 405, y, PAGE_WIDTH - MARGIN_X);
  y -= 16;

  // Row 4: Teacher Adviser + Approved By
  drawPrefilledLine('Endorsed By (Adviser):', adviserDisplay, MARGIN_X, y, 355);
  drawPrefilledLine('Approved By:', approvedByDisplay, 365, y, PAGE_WIDTH - MARGIN_X);
  y -= 18;

  // Row 5: Physical Signature lines
  drawPrefilledLine('Custodian Signature:', '', MARGIN_X, y, 295);
  drawPrefilledLine('Adviser Signature:', '', 310, y, PAGE_WIDTH - MARGIN_X);

  const contentStream = Buffer.from(ops.join('\n'), 'latin1');

  // Assemble PDF Objects with exact byte offsets
  const objects: Array<{ id: number; body: Buffer }> = [];

  // 1: Catalog
  objects.push({
    id: 1,
    body: Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'ascii'),
  });
  // 2: Pages
  objects.push({
    id: 2,
    body: Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'ascii'),
  });
  // 3: Page
  const xObjectDict = logo ? '/XObject << /Im1 7 0 R >>' : '';
  objects.push({
    id: 3,
    body: Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> ${xObjectDict} >> /Contents ${logo ? 8 : 7} 0 R >>`,
      'ascii',
    ),
  });
  // 4, 5, 6: Standard Type1 Fonts (WinAnsiEncoding)
  objects.push({
    id: 4,
    body: Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'ascii'),
  });
  objects.push({
    id: 5,
    body: Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>', 'ascii'),
  });
  objects.push({
    id: 6,
    body: Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>', 'ascii'),
  });

  if (logo) {
    const imgHeader = Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n`,
      'ascii',
    );
    const imgFooter = Buffer.from('\nendstream', 'ascii');
    objects.push({
      id: 7,
      body: Buffer.concat([imgHeader, logo.data, imgFooter]),
    });
  }

  const contentId = logo ? 8 : 7;
  const contentHeader = Buffer.from(
    `<< /Length ${contentStream.length} >>\nstream\n`,
    'ascii',
  );
  const contentFooter = Buffer.from('\nendstream', 'ascii');
  objects.push({
    id: contentId,
    body: Buffer.concat([contentHeader, contentStream, contentFooter]),
  });

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', 'latin1')];
  const offsets: number[] = [0];
  let currentOffset = chunks[0].length;

  for (const obj of objects) {
    offsets.push(currentOffset);
    const head = Buffer.from(`${obj.id} 0 obj\n`, 'ascii');
    const tail = Buffer.from('\nendobj\n', 'ascii');
    chunks.push(head, obj.body, tail);
    currentOffset += head.length + obj.body.length + tail.length;
  }

  const xrefOffset = currentOffset;
  const xrefLines = [
    `xref`,
    `0 ${objects.length + 1}`,
    `0000000000 65535 f `,
    ...offsets.slice(1).map((off) => `${String(off).padStart(10, '0')} 00000 n `),
    `trailer`,
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref`,
    `${xrefOffset}`,
    `%%EOF\n`,
  ];
  chunks.push(Buffer.from(xrefLines.join('\n'), 'ascii'));

  const safeRef = (trackingDisplay || 'SCC').replace(/[^A-Za-z0-9_-]+/g, '-');
  return {
    filename: `LeonNHS-Email-Terms-Agreement-${safeRef}.pdf`,
    buffer: Buffer.concat(chunks),
  };
}
