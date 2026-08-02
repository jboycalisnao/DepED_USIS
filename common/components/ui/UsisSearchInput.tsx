import React from 'react';

type Props = {
  ariaLabel: string;
  className?: string;
  clearLabel?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function UsisSearchInput({
  ariaLabel,
  className = '',
  clearLabel = 'Clear search',
  disabled = false,
  label,
  onChange,
  placeholder = ' ',
  value,
}: Props) {
  const hasValue = value.trim().length > 0;
  const rootClassName = ['usis-search-input', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      <label className="floating-field">
        <div
          className="floating-field__control usis-search-input__control"
          data-disabled={disabled ? 'true' : 'false'}
          data-has-value={hasValue ? 'true' : 'false'}
        >
          <input
            aria-label={ariaLabel}
            className="usis-search-input__field"
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            type="text"
            value={value}
          />
          <span className="usis-search-input__label">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <span>{label}</span>
          </span>
          {hasValue ? (
            <button
              type="button"
              className="usis-search-input__clear"
              onClick={() => onChange('')}
              aria-label={clearLabel}
              title="Clear"
              disabled={disabled}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          ) : null}
        </div>
      </label>
    </div>
  );
}
