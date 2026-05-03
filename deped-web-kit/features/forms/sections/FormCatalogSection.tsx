import { SectionShell } from '@/components/ui/SectionShell';
import { CodeSample } from '@/components/ui/CodeSample';
import { ChoiceCatalog } from '../components/ChoiceCatalog';
import { FloatingFieldCatalog } from '../components/FloatingFieldCatalog';
import { FormCard } from '../components/FormCard';
import { PortalFormShowcase } from '../components/PortalFormShowcase';

const floatingFieldInputCode = `type FloatingFieldProps =
  | { label: string; helper?: string; as?: 'input'; type?: string; tabIndex?: number; passwordToggleTabIndex?: number }
  | { label: string; helper?: string; as: 'textarea'; rows?: number; tabIndex?: number };

export function FloatingField(props: FloatingFieldProps) {
  const { label, helper, ...controlProps } = props;

  return (
    <label className="floating-field">
      <div className="floating-field__control">
        {props.as === 'textarea' ? (
          <textarea {...controlProps} placeholder=" " />
        ) : (
          <input {...controlProps} placeholder=" " />
        )}
        <span>{label}</span>
      </div>
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}`;

const floatingTextCode = `<FloatingField
  label="Learner ID"
  type="text"
  defaultValue="2026-00124"
  tabIndex={1}
/>`;

const floatingEmailCode = `<FloatingField
  label="Email address"
  type="email"
  defaultValue="learner@deped.gov.ph"
  tabIndex={2}
/>`;

const floatingPasswordCode = `<FloatingField
  label="Password"
  type="password"
  defaultValue="securepass123"
  tabIndex={3}
  passwordToggleTabIndex={4}
/>`;

const floatingTelCode = `<FloatingField
  label="Mobile number"
  type="tel"
  defaultValue="09171234567"
  tabIndex={5}
/>`;

const floatingSearchCode = `<FloatingField
  label="Search records"
  type="search"
  defaultValue="Grade 10 - Rizal"
  tabIndex={6}
/>`;

const floatingDateCode = `<FloatingField
  label="Birth date"
  type="date"
  defaultValue="2008-09-14"
  tabIndex={7}
/>`;

const floatingTimeCode = `<FloatingField
  label="Class start time"
  type="time"
  defaultValue="08:00"
  tabIndex={8}
/>`;

const floatingNumberCode = `<FloatingField
  label="Number of copies"
  type="number"
  defaultValue="3"
  tabIndex={9}
/>`;

const floatingTextareaCode = `<FloatingField
  as="textarea"
  label="Remarks and observations"
  defaultValue="Use the field family consistently across DepED USIS transaction forms."
  rows={5}
  tabIndex={10}
/>`;

const searchableSelectCode = `export function SearchableSelect({
  label,
  options,
  placeholder,
}: {
  label: string;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="catalog-label">
      <span>{label}</span>
      <div className="searchable-select">
        <div className="searchable-select__field">
          <input type="text" placeholder={placeholder} />
          <button type="button">▾</button>
        </div>
        <div className="searchable-select__menu">
          {options.map((option) => (
            <button key={option} type="button" className="searchable-select__option">
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}`;

const choiceGroupCode = `<fieldset className="choice-group choice-group--horizontal">
  <legend>Request priority</legend>
  {['Low', 'Medium', 'High'].map((option) => (
    <label key={option} className="choice-row">
      <input type="radio" name="request-priority" value={option} />
      <span>{option}</span>
    </label>
  ))}
</fieldset>`;

const fileUploadCode = `<label className="catalog-label file-upload">
  <span>Attachment upload</span>
  <input type="file" />
  <span className="file-upload__surface">
    <span className="file-upload__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 16V5" />
        <path d="M7.5 9.5L12 5l4.5 4.5" />
        <path d="M5 18.5h14" />
      </svg>
    </span>
    <span className="file-upload__text">
      <strong>Choose file</strong>
      <span>Upload supporting document or image</span>
    </span>
  </span>
</label>`;

const portalFormCode = `export function PortalFormExample() {
  return (
    <form className="portal-catalog__form">
      <FloatingField label="Username" />
      <FloatingField label="Password" type="password" />
      <button type="button">Sign in</button>
    </form>
  );
}`;

export function FormCatalogSection() {
  return (
    <SectionShell
      eyebrow="Forms"
      title="Field catalog for DepED-Web-Kit forms"
      description="This page groups field families by operational use. Text inputs use floating labels so field context remains visible during data entry."
    >
      <div className="form-section">
        <FormCard
          title="Floating input family"
          description="Use these controls for text, search, password, contact, date, number, and textarea fields. Tab order is explicitly defined for keyboard-first DepEd USIS workflows."
        >
          <FloatingFieldCatalog />
          <CodeSample
            title="Floating field usage"
            tabs={[
              { label: 'Field component', code: floatingFieldInputCode },
              { label: 'Text input', code: floatingTextCode },
              { label: 'Email input', code: floatingEmailCode },
              { label: 'Password input', code: floatingPasswordCode },
              { label: 'Telephone input', code: floatingTelCode },
              { label: 'Search input', code: floatingSearchCode },
              { label: 'Date input', code: floatingDateCode },
              { label: 'Time input', code: floatingTimeCode },
              { label: 'Number input', code: floatingNumberCode },
              { label: 'Textarea', code: floatingTextareaCode },
            ]}
          />
        </FormCard>

        <FormCard
          title="Choice and upload family"
          description="Use searchable custom dropdowns, clear grouping, flat surfaces, and consistent label rhythm."
        >
          <ChoiceCatalog />
          <CodeSample
            title="Choice and upload usage"
            tabs={[
              { label: 'Searchable select', code: searchableSelectCode },
              { label: 'Choice group', code: choiceGroupCode, language: 'tsx' },
              { label: 'File upload', code: fileUploadCode, language: 'tsx' },
            ]}
          />
        </FormCard>

        <FormCard
          title="Portal login sample"
          description="Reference layout for login and gated access screens."
        >
          <PortalFormShowcase />
          <CodeSample title="Portal form usage" code={portalFormCode} />
        </FormCard>
      </div>
    </SectionShell>
  );
}
