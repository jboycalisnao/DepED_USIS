import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface UsisDateTimePickerProps {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  max?: string;
  min?: string;
  mode?: 'date' | 'time' | 'datetime-local';
  onChange: (value: string) => void;
  required?: boolean;
  helperText?: string;
  showLabel?: boolean;
  step?: number;
  value: string;
}

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarIcon = () => (
  <svg className="usis-date-time-picker__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 8H5v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10Zm-2 2v8H7v-8h10Zm-6 2H9v2h2v-2Z"
      fill="currentColor"
    />
  </svg>
);

const TimeIcon = () => (
  <svg className="usis-date-time-picker__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.2l4 2.4-1 1.6-5-3V7Z"
      fill="currentColor"
    />
  </svg>
);

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) return '';
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
};

const formatGuidedDateInput = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  const parts: string[] = [];
  if (digits.length <= 2) {
    parts.push(digits);
  } else if (digits.length <= 4) {
    parts.push(digits.slice(0, 2), digits.slice(2));
  } else {
    parts.push(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4));
  }
  return parts.join('/');
};

const parseGuidedDateValue = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (!month || !day || !year) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const parseDateValue = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export function UsisDateTimePicker({
  ariaLabel,
  className = '',
  disabled = false,
  label,
  max,
  min,
  mode = 'date',
  onChange,
  required = false,
  helperText,
  showLabel = false,
  step,
  value,
}: UsisDateTimePickerProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const monthYearPanelRef = useRef<HTMLDivElement>(null);
  const fieldLabel = label || ariaLabel;
  const useCustomCalendar = mode === 'date';
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [guidedInputValue, setGuidedInputValue] = useState(() => (useCustomCalendar ? formatDateDisplay(value) : value));

  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const displayValue = useMemo(
    () => (useCustomCalendar ? guidedInputValue : value),
    [guidedInputValue, useCustomCalendar, value]
  );
  const hasValue = Boolean(String(displayValue || '').trim());

  useEffect(() => {
    if (!useCustomCalendar) return;
    setGuidedInputValue(formatDateDisplay(value));
  }, [useCustomCalendar, value]);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const path = (event.composedPath?.() || []) as EventTarget[];
      const insideRoot = !!rootRef.current && (rootRef.current.contains(target) || path.includes(rootRef.current));
      const insidePopover = !!popoverRef.current && (popoverRef.current.contains(target) || path.includes(popoverRef.current));
      if (!insideRoot && !insidePopover) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  const minDate = min ? parseDateValue(min) : null;
  const maxDate = max ? parseDateValue(max) : null;
  const minYear = minDate?.getFullYear() ?? 1990;
  const maxYear = maxDate?.getFullYear() ?? 2100;
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const isDisabledDate = (date: Date) => {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const minMonthStart = minDate ? monthStart(minDate) : null;
  const maxMonthEnd = maxDate ? monthEnd(maxDate) : null;

  const clampViewDate = (date: Date) => {
    if (minMonthStart && monthEnd(date) < minMonthStart) return minMonthStart;
    if (maxMonthEnd && monthStart(date) > monthStart(maxMonthEnd)) return monthStart(maxMonthEnd);
    return date;
  };

  const canGoPrev = !minMonthStart || monthStart(viewDate) > minMonthStart;
  const canGoNext = !maxMonthEnd || monthStart(viewDate) < monthStart(maxMonthEnd);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: Array<{ date: Date; day: number; outside: boolean }> = [];

    for (let i = 0; i < firstDay; i += 1) {
      const date = new Date(year, month, i - firstDay + 1);
      items.push({ date, day: date.getDate(), outside: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ date: new Date(year, month, day), day, outside: false });
    }
    while (items.length % 7 !== 0) {
      const last = items[items.length - 1].date;
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      items.push({ date: next, day: next.getDate(), outside: true });
    }
    return items;
  }, [viewDate]);

  const today = new Date();
  const todayValue = formatDateValue(today);
  const activeMonthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const openPicker = () => {
    if (disabled) return;
    if (useCustomCalendar) {
      const baseline = selectedDate || today;
      setViewDate(clampViewDate(new Date(baseline.getFullYear(), baseline.getMonth(), 1)));
      setIsOpen(true);
      setIsMonthPickerOpen(false);
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === 'function') input.showPicker();
  };

  useEffect(() => {
    if (!useCustomCalendar || !isOpen) return;
    const updatePosition = () => {
      const controlRect = controlRef.current?.getBoundingClientRect();
      if (!controlRect) return;
      const popoverWidth = 292;
      const viewportPadding = 8;
      const maxLeft = Math.max(viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
      const desiredLeft = Math.min(controlRect.right - popoverWidth, maxLeft);
      const left = Math.max(viewportPadding, desiredLeft);
      const top = controlRect.bottom + 8;
      setPopoverPosition({ left, top });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, useCustomCalendar]);

  const selectDate = (date: Date) => {
    if (isDisabledDate(date)) return;
    onChange(formatDateValue(date));
    setGuidedInputValue(formatDateDisplay(formatDateValue(date)));
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const panel = monthYearPanelRef.current;
    if (!panel) return;
    const activeYearNode = panel.querySelector<HTMLElement>(`[data-year="${viewDate.getFullYear()}"]`);
    if (!activeYearNode) return;
    panel.scrollTo({ top: Math.max(0, activeYearNode.offsetTop - 12), behavior: 'auto' });
  }, [isMonthPickerOpen, viewDate]);

  return (
    <div className={`usis-date-time-picker ${className}`.trim()} ref={rootRef}>
      {showLabel ? <span className="usis-date-time-picker__label">{fieldLabel}</span> : null}
      <label className="floating-field">
        <div className="floating-field__control usis-date-time-picker__control" ref={controlRef}>
          <input
            aria-label={ariaLabel}
            aria-required={required || undefined}
            aria-describedby={helperText ? `${inputId}-helper` : undefined}
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            max={max}
            min={min}
            required={required}
            onChange={(event) => {
              if (useCustomCalendar) {
                const nextValue = formatGuidedDateInput(event.target.value);
                setGuidedInputValue(nextValue);
                if (!nextValue) {
                  onChange('');
                  return;
                }
                const parsed = parseGuidedDateValue(nextValue);
                if (parsed && !isDisabledDate(parsed)) {
                  onChange(formatDateValue(parsed));
                }
                return;
              }
              onChange(event.target.value);
            }}
            onFocus={() => {
              if (useCustomCalendar && !disabled) {
                const baseline = selectedDate || today;
                setViewDate(clampViewDate(new Date(baseline.getFullYear(), baseline.getMonth(), 1)));
                setIsOpen(true);
              }
            }}
            onClick={() => {
              if (useCustomCalendar && !disabled) openPicker();
            }}
            placeholder=" "
            ref={inputRef}
            readOnly={false}
            inputMode={useCustomCalendar ? 'numeric' : undefined}
            pattern={useCustomCalendar ? '\\d{2}/\\d{2}/\\d{4}' : undefined}
            step={step}
            type={useCustomCalendar ? 'text' : mode}
            value={displayValue}
          />
          <label className="usis-date-time-picker__floating-label">{fieldLabel}</label>
          <button
            type="button"
            className="usis-date-time-picker__trigger"
            onClick={openPicker}
            aria-label={`Open ${fieldLabel}`}
            disabled={disabled}
          >
            {mode === 'time' ? <TimeIcon /> : <CalendarIcon />}
          </button>

          {useCustomCalendar && isOpen && typeof document !== 'undefined'
            ? createPortal(
            <div
              ref={popoverRef}
              className="usis-calendar-popover usis-calendar-popover--portal"
              role="dialog"
              aria-label={`${fieldLabel} calendar`}
              style={{ left: `${popoverPosition.left}px`, top: `${popoverPosition.top}px` }}
            >
              <div className="usis-calendar-popover__header">
                <button
                  type="button"
                  className="usis-calendar-popover__nav"
                  onClick={() => setViewDate((prev) => clampViewDate(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))}
                  aria-label="Previous month"
                  disabled={!canGoPrev}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="usis-calendar-popover__month-toggle"
                  onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                >
                  {activeMonthLabel}
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    {isMonthPickerOpen ? (
                      <path d="M7 14l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                </button>
                <button
                  type="button"
                  className="usis-calendar-popover__nav"
                  onClick={() => setViewDate((prev) => clampViewDate(new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))}
                  aria-label="Next month"
                  disabled={!canGoNext}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {isMonthPickerOpen ? (
                <div className="usis-calendar-popover__month-year-panel" ref={monthYearPanelRef}>
                  {yearOptions.map((year) => (
                    <div key={year} className="usis-calendar-popover__year-block" data-year={year}>
                      <div className="usis-calendar-popover__year-label">{year}</div>
                      <div className="usis-calendar-popover__months-grid">
                        {monthShort.map((month, monthIndex) => {
                          const monthDate = new Date(year, monthIndex, 1);
                          const blocked = Boolean(
                            (minMonthStart && monthEnd(monthDate) < minMonthStart) ||
                              (maxMonthEnd && monthStart(monthDate) > monthStart(maxMonthEnd))
                          );
                          const selectedMonth =
                            viewDate.getFullYear() === year && viewDate.getMonth() === monthIndex;
                          return (
                            <button
                              key={`${year}-${month}`}
                              type="button"
                              disabled={blocked}
                              className={[
                                'usis-calendar-popover__month-chip',
                                selectedMonth ? 'is-selected' : '',
                              ].join(' ')}
                              onClick={() => {
                                setViewDate(clampViewDate(new Date(year, monthIndex, 1)));
                                setIsMonthPickerOpen(false);
                              }}
                            >
                              {month}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="usis-calendar-popover__weekdays">
                    {WEEK_DAYS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="usis-calendar-popover__grid">
                    {calendarDays.map((item, index) => {
                      const itemValue = formatDateValue(item.date);
                      const selected = itemValue === value;
                      const isToday = itemValue === todayValue;
                      const isDisabled = isDisabledDate(item.date);
                      return (
                        <button
                          key={`${itemValue}-${index}`}
                          type="button"
                          onClick={() => selectDate(item.date)}
                          disabled={isDisabled}
                          className={[
                            'usis-calendar-popover__day',
                            item.outside ? 'is-outside' : '',
                            selected ? 'is-selected' : '',
                            isToday ? 'is-today' : '',
                          ].join(' ')}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="usis-calendar-popover__actions">
                <button type="button" onClick={() => onChange('')}>
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayValue);
                    setViewDate(today);
                  }}
                >
                  Today
                </button>
              </div>
              </div>,
            document.body,
          ) : null}
        </div>
      </label>
    </div>
  );
}
