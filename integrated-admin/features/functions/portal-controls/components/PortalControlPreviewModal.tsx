interface PortalControlPreviewModalProps {
  open: boolean;
  iconName: string;
  titleText: string;
  bodyText: string;
  onClose: () => void;
}

export function PortalControlPreviewModal({
  open,
  iconName,
  titleText,
  bodyText,
  onClose,
}: PortalControlPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog ia-portal-controls-preview-modal" role="dialog" aria-modal="true" aria-label="Portal gate preview">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Portal Controls</p>
            <h3>Portal Gate Preview</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="modal-dialog__body">
          <div className="ia-portal-controls-preview">
            <span className="material-symbols-outlined ia-portal-controls-preview__icon" aria-hidden="true">
              {iconName || 'construction'}
            </span>
            <h4>{titleText}</h4>
            <p>{bodyText}</p>
          </div>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__blue" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
