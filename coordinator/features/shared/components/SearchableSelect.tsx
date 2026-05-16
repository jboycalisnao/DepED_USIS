import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  options: SearchableSelectOption[];
  value: string;
}

export function SearchableSelect({
  disabled = false,
  isLoading = false,
  label,
  onChange,
  onSearch,
  options,
  value,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find((option) => option.value === value) || safeOptions[0];

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return safeOptions;

    return safeOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [safeOptions, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    // Always collapse the menu after a value commit from parent state.
    setIsOpen(false);
    setQuery('');
  }, [value]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <label className="registry-select">
      <span>{label}</span>
      <div className="searchable-select" ref={rootRef}>
        <div className="searchable-select__field">
          <input
            disabled={disabled}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setIsOpen(true);
              onSearch?.(nextQuery);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            placeholder={selectedOption?.label || 'No options available'}
            type="text"
            value={isOpen ? query : selectedOption?.label || ''}
          />
          <button
            aria-label={`Toggle ${label} options`}
            className="searchable-select__toggle"
            disabled={disabled || safeOptions.length === 0}
            onClick={() => {
              setQuery('');
              setIsOpen((open) => !open);
            }}
            type="button"
          >
            ▾
          </button>
        </div>

        {isOpen ? (
          <div className="searchable-select__menu" role="listbox">
            {isLoading ? (
              <div className="searchable-select__empty">Searching schools...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  aria-selected={option.value === value}
                  className="searchable-select__option"
                  key={option.value}
                  onClick={() => selectOption(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="searchable-select__empty">No matching options</div>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}
