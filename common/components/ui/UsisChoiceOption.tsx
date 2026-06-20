type Props = {
  checked: boolean;
  className?: string;
  controlType: 'checkbox' | 'radio';
  description?: string;
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (checked: boolean) => void;
  stacked?: boolean;
  value?: string;
};

export function UsisChoiceOption({
  checked,
  className = '',
  controlType,
  description,
  disabled = false,
  label,
  name,
  onChange,
  stacked = false,
  value,
}: Props) {
  const optionClassName = [
    'registry-choice-option',
    stacked ? 'registry-choice-option--stacked' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={optionClassName}>
      <input
        checked={checked}
        disabled={disabled}
        name={name}
        onChange={(event) => onChange(event.target.checked)}
        type={controlType}
        value={value}
      />
      <span className="registry-choice-option__text">
        <span className="registry-choice-option__label">{label}</span>
        {description ? <span className="registry-choice-option__description">{description}</span> : null}
      </span>
    </label>
  );
}
