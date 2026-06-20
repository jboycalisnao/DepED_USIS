const USIS_SEAL_SRC = new URL('../../../../common/assets/USIS_Icon.png', import.meta.url).href;

type PrintSheetHeaderOptions = {
  documentNo: string;
  pageNumber: number;
  titleText: string;
  titleSuffix?: string;
  totalPages: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const buildLNHSPrintSheetHeader = ({
  documentNo,
  pageNumber,
  titleText,
  titleSuffix = '',
  totalPages,
}: PrintSheetHeaderOptions) => `
  <table class="meta-header">
    <tr>
      <td class="logo-cell" rowspan="2">
        <img
          src="${USIS_SEAL_SRC}"
          alt="USIS Seal"
          onerror="this.style.display='none';"
        />
      </td>
      <td class="title-cell" rowspan="2">
        <div class="title-main">LEON NATIONAL HIGH SCHOOL</div>
        <div class="title-sub">${escapeHtml(titleText)}${escapeHtml(titleSuffix)}</div>
      </td>
      <td class="docs-cell" rowspan="2">
        <table class="docs-table">
          <tr><td>Document No.</td><td style="white-space:nowrap; word-break:normal; overflow-wrap:normal;">${escapeHtml(documentNo)}</td></tr>
          <tr><td>Issue No.</td><td>1</td></tr>
          <tr><td>Revision No.</td><td>1</td></tr>
          <tr><td>Date of Effectivity</td><td>June 8, 2026</td></tr>
          <tr><td>Issued by</td><td>Registrar</td></tr>
          <tr><td>Page No.</td><td>Page ${pageNumber} of ${totalPages}</td></tr>
        </table>
      </td>
    </tr>
    <tr></tr>
  </table>
`;
