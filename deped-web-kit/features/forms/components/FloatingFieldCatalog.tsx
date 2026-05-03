import { textFieldCatalog } from '../data/formCatalog';
import { FloatingField } from './FloatingField';

export function FloatingFieldCatalog() {
  return (
    <div className="floating-field-grid">
      {textFieldCatalog.map((field) => (
        <FloatingField
          key={field.label}
          label={field.label}
          type={field.type}
          defaultValue={field.value}
          tabIndex={field.tabIndex}
          passwordToggleTabIndex={field.passwordToggleTabIndex}
        />
      ))}
      <FloatingField
        as="textarea"
        label="Remarks and observations"
        defaultValue="Use the field family consistently across DepED USIS transaction forms."
        rows={5}
        tabIndex={10}
      />
    </div>
  );
}
