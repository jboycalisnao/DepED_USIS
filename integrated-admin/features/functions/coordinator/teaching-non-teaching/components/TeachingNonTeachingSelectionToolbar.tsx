type Props = {
  selectedCount: number;
  visibleCount: number;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onBulkModuleAccess: () => void;
  onBulkEditDetails: () => void;
};

export function TeachingNonTeachingSelectionToolbar({
  selectedCount,
  visibleCount,
  onSelectVisible,
  onClearSelection,
  onBulkModuleAccess,
  onBulkEditDetails,
}: Props) {
  return (
    <div className="registry-selection-toolbar">
      <div className="registry-selection-toolbar__summary">
        <strong>{selectedCount} selected</strong>
        <span>Use the row checkboxes or the group selectors to stage multiple accounts for one update.</span>
      </div>
      <div className="registry-selection-toolbar__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onSelectVisible}
          disabled={visibleCount === 0}
        >
          Select Visible
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onClearSelection}
          disabled={selectedCount === 0}
        >
          Clear Selection
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onBulkModuleAccess}
          disabled={selectedCount === 0}
        >
          Bulk Module Access
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onBulkEditDetails}
          disabled={selectedCount === 0}
        >
          Bulk Edit Details
        </button>
      </div>
    </div>
  );
}
