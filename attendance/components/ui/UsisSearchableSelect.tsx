import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface UsisSearchableSelectOption {
  label: string;
  value: string;
}

interface UsisSearchableSelectProps {
  allowCustomValue?: boolean;
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
  forceInlineMenu?: boolean;
  forcePortalMenu?: boolean;
}

export function UsisSearchableSelect({
  allowCustomValue = false,
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
  forceInlineMenu = false,
  forcePortalMenu = false,
}: UsisSearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number }>({
    left: 0,
    top: 0,
    width: 0,
  });
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [renderInlineInModal, setRenderInlineInModal] = useState(false);

  const selected = options.find((option) => option.value === value) || null;

  const filtered = useMemo(() => {
    if (!allowTyping) return options;
    const normalizedQuery = query.trim().toLowerCase();
    if (requireQueryBeforeOptions && normalizedQuery.length < minQueryLength) {
      return [];
    }
    if (!normalizedQuery || serverSearch) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [allowTyping, minQueryLength, options, query, requireQueryBeforeOptions, serverSearch]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const path = (event.composedPath?.() || []) as EventTarget[];
      const clickedInsideRoot = !!rootRef.current && (rootRef.current.contains(target) || path.includes(rootRef.current));
      const clickedInsideMenu = !!menuRef.current && (menuRef.current.contains(target) || path.includes(menuRef.current));
      if (clickedInsideRoot || clickedInsideMenu) return;
      setIsOpen(false);
      setQuery('');
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (forceInlineMenu) {
      setRenderInlineInModal(true);
      setPortalHost(null);
      return;
    }
    if (forcePortalMenu) {
      setRenderInlineInModal(false);
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
    }
    const modalDialogHost = rootRef.current?.closest('.modal-dialog') as HTMLElement | null;
    const shouldRenderInline = Boolean(modalDialogHost);
    setRenderInlineInModal(shouldRenderInline);
    setPortalHost(shouldRenderInline ? null : document.body);
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
  }, [forceInlineMenu, forcePortalMenu, isOpen]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  const normalizedQuery = query.trim();
  const customValueAvailable =
    allowCustomValue &&
    allowTyping &&
    normalizedQuery.length > 0 &&
    !filtered.some((option) => option.label.toLowerCase() === normalizedQuery.toLowerCase());
  const hasValue = Boolean(value?.trim()) || Boolean(selected) || (isOpen && normalizedQuery.length > 0);
  const displayValue = isOpen ? query : selected?.label || (allowCustomValue ? value : '');
  const menuBody = (
    <div
      className={`searchable-select__menu${renderInlineInModal ? ' searchable-select__menu--inline' : ''}`}
      ref={menuRef}
      role="listbox"
      onWheel={(event) => {
        event.stopPropagation();
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
      }}
      style={
        renderInlineInModal
          ? undefined
          : { left: `${menuPosition.left}px`, top: `${menuPosition.top}px`, width: `${menuPosition.width}px` }
      }
    >
      {customValueAvailable ? (
        <button
          type="button"
          className="searchable-select__option searchable-select__option--custom"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            selectValue(normalizedQuery);
          }}
          onClick={() => selectValue(normalizedQuery)}
        >
          Use “{normalizedQuery}”
        </button>
      ) : null}
      {filtered.length > 0 ? (
        filtered.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-selected={option.value === value}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectValue(option.value);
            }}
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
  );

  return (
    <div className={`searchable-select ${!allowTyping ? 'searchable-select--readonly' : ''} ${className}`.trim()} ref={rootRef}>
      {showLabel && !floatingLabel ? <span className="searchable-select__label">{label || ariaLabel}</span> : null}
      <div className={floatingLabel ? 'floating-field searchable-select--floating' : undefined}>
        <div className={floatingLabel ? 'floating-field__control' : 'searchable-select__field'} ref={fieldRef}>
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
            onKeyDown={(event) => {
              if (!allowCustomValue || event.key !== 'Enter') return;
              if (!normalizedQuery) return;
              event.preventDefault();
              selectValue(normalizedQuery);
            }}
            placeholder={floatingLabel ? ' ' : selected?.label || placeholder || label || ariaLabel}
            readOnly={!allowTyping}
            type="text"
            value={displayValue}
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

      {isOpen && renderInlineInModal ? menuBody : null}
      {isOpen && !renderInlineInModal && typeof document !== 'undefined' && portalHost
        ? createPortal(menuBody, portalHost)
        : null}
    </div>
  );
}
