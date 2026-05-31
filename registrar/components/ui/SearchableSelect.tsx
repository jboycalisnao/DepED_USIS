import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  disabled?: boolean;
  emptyQueryMessage?: string;
  floatingLabel?: boolean;
  label: string;
  minQueryLength?: number;
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  requireQueryBeforeOptions?: boolean;
  serverSearch?: boolean;
  showLabel?: boolean;
  value: string;
}

export function SearchableSelect({
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
  showLabel = true,
  value,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) || null;

  const filteredOptions = useMemo(() => {
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

  useEffect(() => {
    if (!isOpen) return;
    setPortalHost(document.body);

    const updatePosition = () => {
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      if (!fieldRect) return;
      setMenuPosition({
        left: fieldRect.left,
        top: fieldRect.bottom + 8,
        width: fieldRect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  const hasValue = Boolean(value?.trim()) || Boolean(selectedOption) || (isOpen && query.trim().length > 0);

  const menuBody = (
    <div
      className="searchable-select__menu"
      ref={menuRef}
      role="listbox"
      onWheel={(event) => {
        event.stopPropagation();
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
      }}
      style={
        !menuPosition
          ? undefined
          : {
              left: `${menuPosition.left}px`,
              top: `${menuPosition.top}px`,
              width: `${menuPosition.width}px`,
              minWidth: `${menuPosition.width}px`,
              maxWidth: `${menuPosition.width}px`,
            }
      }
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <button
            aria-selected={option.value === value}
            className="searchable-select__option"
            key={option.value}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectOption(option.value);
            }}
            onClick={() => selectOption(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))
      ) : (
        <div className="searchable-select__empty">
          {requireQueryBeforeOptions && query.trim().length < minQueryLength
            ? 'Type at least 1 character to search schools'
            : emptyQueryMessage}
        </div>
      )}
    </div>
  );

  return (
    <div className="searchable-select" ref={rootRef}>
      {showLabel && !floatingLabel ? <span className="searchable-select__label">{label}</span> : null}
      <div className={floatingLabel ? 'floating-field searchable-select--floating' : undefined}>
        <div className={floatingLabel ? 'floating-field__control' : 'searchable-select__field'} ref={fieldRef}>
          <input
            aria-label={label}
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              onQueryChange?.(nextQuery);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            placeholder={floatingLabel ? ' ' : selectedOption?.label || placeholder || label}
            type="text"
            value={isOpen ? query : selectedOption?.label || ''}
          />
          <button
            aria-label={`Toggle ${label} options`}
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
          {floatingLabel ? <span>{label}</span> : null}
        </div>
      </div>

      {isOpen && typeof document !== 'undefined' && portalHost && menuPosition
        ? createPortal(menuBody, portalHost)
        : null}
    </div>
  );
}
