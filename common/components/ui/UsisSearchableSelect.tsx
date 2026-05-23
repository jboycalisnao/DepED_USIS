import { useEffect, useMemo, useRef, useState } from 'react';

export interface UsisSearchableSelectOption {
  label: string;
  value: string;
}

interface UsisSearchableSelectProps {
  allowTyping?: boolean;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  emptyQueryMessage?: string;
  floatingLabel?: boolean;
  label?: string;
  minQueryLength?: number;
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  options: UsisSearchableSelectOption[];
  placeholder?: string;
  requireQueryBeforeOptions?: boolean;
  serverSearch?: boolean;
  showLabel?: boolean;
  value: string;
}

export function UsisSearchableSelect({
  allowTyping = true,
  ariaLabel,
  className = '',
  disabled = false,
  emptyQueryMessage = 'No matching options',
  floatingLabel = false,
  label,
  minQueryLength = 0,
  onChange,
  onQueryChange,
  options,
  placeholder,
  requireQueryBeforeOptions = false,
  serverSearch = false,
  showLabel = false,
  value,
}: UsisSearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value) || null;

  const filtered = useMemo(() => {
    if (!allowTyping) return options;
    const normalizedQuery = query.trim().toLowerCase();
    if (requireQueryBeforeOptions && normalizedQuery.length < minQueryLength) {
      return [];
    }
    if (!normalizedQuery || serverSearch) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [minQueryLength, options, query, requireQueryBeforeOptions, serverSearch]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  const hasValue = Boolean(value?.trim()) || Boolean(selected) || (isOpen && query.trim().length > 0);

  return (
    <div className={`searchable-select ${!allowTyping ? 'searchable-select--readonly' : ''} ${className}`.trim()} ref={rootRef}>
      {showLabel && !floatingLabel ? <span className="searchable-select__label">{label || ariaLabel}</span> : null}
      <div className={floatingLabel ? 'floating-field searchable-select--floating' : undefined}>
        <div className={floatingLabel ? 'floating-field__control' : 'searchable-select__field'}>
          <input
            aria-label={ariaLabel}
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            onChange={(event) => {
              if (!allowTyping) return;
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              onQueryChange?.(nextQuery);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            placeholder={floatingLabel ? ' ' : selected?.label || placeholder || label || ariaLabel}
            readOnly={!allowTyping}
            type="text"
            value={isOpen ? query : selected?.label || ''}
          />
          <button
            aria-label={`Toggle ${ariaLabel} options`}
            className="searchable-select__toggle"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setQuery('');
              setIsOpen((open) => !open);
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
              <path
                d="M7 10l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {floatingLabel ? <span>{label || ariaLabel}</span> : null}
        </div>
      </div>

      {isOpen ? (
        <div className="searchable-select__menu" role="listbox">
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-selected={option.value === value}
                onClick={() => selectValue(option.value)}
                className="searchable-select__option"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="searchable-select__empty">
              {requireQueryBeforeOptions && query.trim().length < minQueryLength
                ? 'Type at least 1 character to search options'
                : emptyQueryMessage}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
