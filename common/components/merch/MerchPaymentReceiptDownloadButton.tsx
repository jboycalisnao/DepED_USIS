import { useMemo, useState } from 'react';
import {
  buildMerchPaymentReceiptPreviewHtml,
  downloadMerchPaymentReceiptPdf,
  openMerchPaymentReceiptPrintWindow,
  type MerchPaymentReceiptPayload,
} from '../../utils/merchPaymentReceipt';
import usisIconUrl from '../../assets/USIS_Icon.png';

type ReceiptMode = 'print' | 'pdf';

type Props = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  payload: MerchPaymentReceiptPayload;
  mode?: ReceiptMode;
  showLabel?: boolean;
  title?: string;
};

export function MerchPaymentReceiptDownloadButton({
  ariaLabel,
  className,
  disabled,
  mode = 'pdf',
  payload,
  showLabel = true,
  title,
}: Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const previewHtml = useMemo(
    () => buildMerchPaymentReceiptPreviewHtml(payload, usisIconUrl),
    [payload],
  );

  const handleClick = async () => {
    if (disabled || isDownloading) return;
    if (mode === 'print') {
      openMerchPaymentReceiptPrintWindow(payload, { orientation: 'landscape', pageSize: 'A5' });
      return;
    }
    setIsPreviewOpen(true);
  };

  const handleDownload = async () => {
    if (disabled || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadMerchPaymentReceiptPdf(payload);
    } finally {
      setIsDownloading(false);
    }
  };

  const icon = mode === 'print' ? 'print' : 'receipt_long';
  const label = title || (mode === 'print' ? 'Print receipt' : 'View receipt');

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={disabled || isDownloading}
        aria-label={ariaLabel || label}
        title={label}
      >
        <div className="merch-receipt-action__content">
          <span className="material-symbols-outlined" aria-hidden="true">
            {icon}
          </span>
          {showLabel ? <span className="merch-receipt-action__label">{label}</span> : null}
        </div>
      </button>

      {isPreviewOpen ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setIsPreviewOpen(false)} />
          <div className="modal-dialog modal-dialog--wide learner-merch-receipt-preview-modal" role="dialog" aria-modal="true" aria-label="Receipt preview">
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Receipt Preview</p>
                <h3>{payload.learnerName || payload.referenceNo || payload.transactionNo || 'Merch Receipt'}</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => setIsPreviewOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="modal-dialog__body learner-merch-receipt-preview-modal__body">
              <iframe
                title="Receipt preview"
                className="learner-merch-receipt-preview-modal__frame"
                srcDoc={previewHtml}
              />
            </div>
            <div className="modal-dialog__actions learner-merch-receipt-preview-modal__actions">
              <button type="button" className="modal-dialog__ghost" onClick={() => setIsPreviewOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="modal-dialog__blue"
                onClick={handleDownload}
                disabled={disabled || isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
