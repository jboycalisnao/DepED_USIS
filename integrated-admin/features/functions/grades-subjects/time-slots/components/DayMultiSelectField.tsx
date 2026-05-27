import { useMemo, useState } from 'react';

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Props = {
  disabled?: boolean;
  onChange: (value: string[]) => void;
  required?: boolean;
  value: string[];
};

export function DayMultiSelectField({ disabled, onChange, required, value }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => dayOptions.filter((day) => value.includes(day)), [value]);
  const displayValue = selected.length ? selected.join(', ') : '';

  return (
    <div className={`floating-field ia-day-multiselect${open ? ' is-open' : ''}`}>
      <div className="floating-field__control ia-day-multiselect__control">
        <input
          value={displayValue}
          placeholder=" "
          readOnly
          data-has-value={selected.length > 0 ? 'true' : undefined}
          onClick={() => { if (!disabled) setOpen((current) => !current); }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setOpen((current) => !current);
            }
            if (event.key === 'Escape') setOpen(false);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Days"
          required={required}
          disabled={disabled}
        />
        <span className="ia-day-multiselect__floating-label">Days</span>
        <button type="button" className="ia-day-multiselect__toggle" onClick={() => { if (!disabled) setOpen((current) => !current); }} disabled={disabled} aria-label="Toggle day options">
          <span className="material-symbols-outlined ia-day-multiselect__toggle-icon">{open ? 'expand_less' : 'expand_more'}</span>
        </button>
        {open ? (
          <div className="ia-day-multiselect__menu" role="listbox" aria-label="Select days" aria-multiselectable="true">
            {dayOptions.map((day) => {
              const checked = value.includes(day);
              return (
                <label key={day} className="ia-day-multiselect__option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onChange([...value, day]);
                      } else {
                        onChange(value.filter((item) => item !== day));
                      }
                    }}
                  />
                  <span className="ia-day-multiselect__option-label">{day}</span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
