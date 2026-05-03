import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  value: string;
}

export function SearchableSelect({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

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
              setQuery(event.target.value);
              setIsOpen(true);
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
            disabled={disabled || options.length === 0}
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
            {filteredOptions.length > 0 ? (
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
