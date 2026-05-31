import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';

type BaseFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal';
  maxLength?: number;
  pattern?: string;
  type?: string;
  disabled?: boolean;
};

export function TextField({ label, value, onChange, required = false, inputMode, maxLength, pattern, type = 'text', disabled = false }: BaseFieldProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " required={required} inputMode={inputMode} maxLength={maxLength} pattern={pattern} type={type} disabled={disabled} />
        <span>{label}</span>
      </div>
    </label>
  );
}

export function DateField({ label, value, onChange, required = false, disabled = false }: BaseFieldProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " required={required} disabled={disabled} />
        <span>{label}</span>
      </div>
    </label>
  );
}

type SelectFieldProps = BaseFieldProps & { options: Array<{ value: string; label: string }> | string[] };
export function SelectField({ label, value, onChange, options, disabled = false }: SelectFieldProps) {
  const normalizedOptions = typeof options[0] === 'string' ? (options as string[]).map((option) => ({ value: option, label: option })) : (options as Array<{ value: string; label: string }>);
  return (
    <UsisSearchableSelect
      ariaLabel={label}
      label={label}
      floatingLabel
      showLabel={false}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={normalizedOptions}
      forceInlineMenu
    />
  );
}
