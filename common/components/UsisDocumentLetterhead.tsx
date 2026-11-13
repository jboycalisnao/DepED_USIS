import React from 'react';
import usisVerticalLogo from '../assets/USIS _ Vertical Logo.png';

export type UsisDocumentMetadataRow = {
  label: string;
  value: React.ReactNode;
};

export type UsisDocumentLetterheadProps = {
  schoolName?: string;
  systemName?: string;
  documentTitle?: string;
  documentNo?: string;
  issueNo?: string | number;
  revisionNo?: string | number;
  dateOfEffectivity?: string;
  issuedBy?: string;
  pageNo?: string;
  extraMetadataRows?: UsisDocumentMetadataRow[];
  footerText?: string;
  logoSrc?: string;
  logoAlt?: string;
  showFrame?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
};

/**
 * Shared institutional portrait letterhead and footer shell for Leon NHS - USIS generated documents.
 */
export function UsisDocumentLetterhead({
  schoolName = 'LEON NATIONAL HIGH SCHOOL',
  systemName = 'UNIFIED SCHOOL INFORMATION SYSTEM',
  documentTitle = 'REQUEST FORM',
  documentNo = 'USIS-REQ-F001',
  issueNo = '1',
  revisionNo = '1',
  dateOfEffectivity = 'June 8, 2026',
  issuedBy = 'ICT',
  pageNo = 'Page 1 of 1',
  extraMetadataRows = [],
  footerText = 'THIS IS A SYSTEM GENERATED DOCUMENT BY THE USIS.',
  logoSrc = usisVerticalLogo,
  logoAlt = 'Leon National High School - USIS Logo',
  showFrame = true,
  className = '',
  bodyClassName = '',
  children,
}: UsisDocumentLetterheadProps) {
  const metadataRows: UsisDocumentMetadataRow[] = [
    { label: 'Document No.', value: documentNo },
    { label: 'Issue No.', value: issueNo },
    { label: 'Revision No.', value: revisionNo },
    { label: 'Date of Effectivity', value: dateOfEffectivity },
    { label: 'Issued by', value: issuedBy },
    { label: 'Page No.', value: pageNo },
    ...extraMetadataRows,
  ];

  const totalRows = metadataRows.length;
  const identityRowSpan = Math.ceil(totalRows / 2);
  const titleRowSpan = Math.max(1, totalRows - identityRowSpan);

  const rootClassName = [
    'usis-doc-sheet',
    showFrame ? 'usis-doc-sheet--framed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClassName = ['usis-doc-sheet__body', bodyClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={rootClassName}>
      <header className="usis-doc-sheet__header">
        <table className="usis-doc-sheet__header-table">
          <colgroup>
            <col className="usis-doc-sheet__col-logo" />
            <col className="usis-doc-sheet__col-identity" />
            <col className="usis-doc-sheet__col-meta-label" />
            <col className="usis-doc-sheet__col-meta-value" />
          </colgroup>
          <tbody>
            {metadataRows.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                {index === 0 ? (
                  <td className="usis-doc-sheet__logo-cell" rowSpan={totalRows}>
                    <img
                      className="usis-doc-sheet__logo"
                      src={logoSrc}
                      alt={logoAlt}
                    />
                  </td>
                ) : null}

                {index === 0 ? (
                  <td
                    className="usis-doc-sheet__identity-cell"
                    rowSpan={identityRowSpan}
                  >
                    <div className="usis-doc-sheet__school-name">
                      {schoolName}
                    </div>
                    <div className="usis-doc-sheet__system-name">
                      {systemName}
                    </div>
                  </td>
                ) : null}

                {index === identityRowSpan ? (
                  <td
                    className="usis-doc-sheet__title-cell"
                    rowSpan={titleRowSpan}
                  >
                    <div className="usis-doc-sheet__title">
                      {documentTitle}
                    </div>
                  </td>
                ) : null}

                <td className="usis-doc-sheet__meta-label">{row.label}</td>
                <td className="usis-doc-sheet__meta-value">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </header>

      <div className={contentClassName}>{children}</div>

      <footer className="usis-doc-sheet__footer">
        <div className="usis-doc-sheet__tricolor-bar" aria-hidden="true">
          <span className="usis-doc-sheet__tricolor-blue" />
          <span className="usis-doc-sheet__tricolor-yellow" />
          <span className="usis-doc-sheet__tricolor-red" />
        </div>
        {footerText ? (
          <p className="usis-doc-sheet__footer-note">{footerText}</p>
        ) : null}
      </footer>
    </article>
  );
}
export default UsisDocumentLetterhead;
