type Props = {
  allVisibleSelected: boolean;
  listedCount: number;
  loading: boolean;
  selectedCount: number;
  onGenerate: () => void;
  onPrint: () => void;
  onPrintMicrosoft: () => void;
  onRecheckMicrosoft: () => void;
  onReset: () => void;
  onToggleSelectAll: () => void;
};

export function CredentialsActions({
  allVisibleSelected,
  listedCount,
  loading,
  selectedCount,
  onGenerate,
  onPrint,
  onPrintMicrosoft,
  onRecheckMicrosoft,
  onReset,
  onToggleSelectAll,
}: Props) {
  return (
    <div className="registrar-credentials-page__actions">
      <button type="button" className="secondary-button" onClick={onToggleSelectAll}>
        {allVisibleSelected ? 'Unselect All' : 'Select All'}
      </button>
      <button type="button" className="primary-button" onClick={onGenerate} disabled={loading || selectedCount === 0}>
        Generate Credentials
      </button>
      <button type="button" className="secondary-button" onClick={onReset} disabled={loading || selectedCount === 0}>
        Reset Credentials
      </button>
      <button type="button" className="secondary-button" onClick={onRecheckMicrosoft} disabled={loading || listedCount === 0}>
        Recheck Microsoft Status
      </button>
      <button type="button" className="secondary-button" onClick={onPrint}>
        Print Credentials List
      </button>
      <button type="button" className="secondary-button" onClick={onPrintMicrosoft}>
        Print Microsoft Credentials
      </button>
      <span className="registrar-credentials-page__counter">
        {selectedCount} selected / {listedCount} listed
      </span>
    </div>
  );
}
