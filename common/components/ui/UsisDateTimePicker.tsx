import { useEffect, useMemo, useRef, useState } from 'react';

interface UsisDateTimePickerProps {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  max?: string;
  min?: string;
  mode?: 'date' | 'time' | 'datetime-local';
  onChange: (value: string) => void;
  showLabel?: boolean;
  step?: number;
  value: string;
}

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  showLabel = false,
  step,
  value,
}: UsisDateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const monthYearPanelRef = useRef<HTMLDivElement>(null);
  const hasValue = Boolean(value?.trim());
  const fieldLabel = label || ariaLabel;
  const iconName = mode === 'time' ? 'schedule' : 'calendar_today';
  const useCustomCalendar = mode === 'date';
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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

  const selectDate = (date: Date) => {
    if (isDisabledDate(date)) return;
    onChange(formatDateValue(date));
    setIsOpen(false);
  };

  const today = new Date();
  const todayValue = formatDateValue(today);
  const activeMonthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

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
        <div className="floating-field__control usis-date-time-picker__control">
          <input
            aria-label={ariaLabel}
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            max={max}
            min={min}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => {
              if (useCustomCalendar && !disabled) {
                const baseline = selectedDate || today;
                setViewDate(clampViewDate(new Date(baseline.getFullYear(), baseline.getMonth(), 1)));
                setIsOpen(true);
              }
            }}
            placeholder=" "
            ref={inputRef}
            step={step}
            type={mode}
            value={value}
          />
          <label className="usis-date-time-picker__floating-label">{fieldLabel}</label>
          <button
            type="button"
            className="usis-date-time-picker__trigger"
            onClick={openPicker}
            aria-label={`Open ${fieldLabel}`}
            disabled={disabled}
          >
            <i className="material-symbols-outlined usis-date-time-picker__icon" aria-hidden="true">
              {iconName}
            </i>
          </button>

          {useCustomCalendar && isOpen ? (
            <div className="usis-calendar-popover" role="dialog" aria-label={`${fieldLabel} calendar`}>
              <div className="usis-calendar-popover__header">
                <button
                  type="button"
                  className="usis-calendar-popover__nav"
                  onClick={() => setViewDate((prev) => clampViewDate(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))}
                  aria-label="Previous month"
                  disabled={!canGoPrev}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  className="usis-calendar-popover__month-toggle"
                  onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                >
                  {activeMonthLabel}
                  <span className="material-symbols-outlined">
                    {isMonthPickerOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                  </span>
                </button>
                <button
                  type="button"
                  className="usis-calendar-popover__nav"
                  onClick={() => setViewDate((prev) => clampViewDate(new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))}
                  aria-label="Next month"
                  disabled={!canGoNext}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
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
            </div>
          ) : null}
        </div>
      </label>
    </div>
  );
}
