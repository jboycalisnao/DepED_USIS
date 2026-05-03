import { SearchableSelect } from './SearchableSelect';
import { checkboxOptions, gradeOptions, radioOptions, selectOptions } from '../data/formCatalog';

export function ChoiceCatalog() {
  return (
    <div className="form-grid">
      <div className="catalog-panel">
        <p className="catalog-panel__eyebrow">Searchable dropdown fields</p>
        <SearchableSelect
          label="School assignment"
          options={selectOptions}
          placeholder="Search or choose a school"
          initialValue="Leon National High School"
        />
        <SearchableSelect
          label="Grade level"
          options={gradeOptions}
          placeholder="Search or choose a grade level"
          initialValue="Grade 10"
        />
      </div>

      <div className="catalog-panel">
        <p className="catalog-panel__eyebrow">Radio group</p>
        <fieldset className="choice-group">
          <legend>Document request status</legend>
          {radioOptions.map((option) => (
            <label key={option} className="choice-row">
              <input
                type="radio"
                name="request-status"
                value={option}
                defaultChecked={option === 'Pending review'}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="choice-group choice-group--horizontal">
          <legend>Request priority</legend>
          {['Low', 'Medium', 'High'].map((option) => (
            <label key={option} className="choice-row">
              <input
                type="radio"
                name="request-priority"
                value={option}
                defaultChecked={option === 'Medium'}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="catalog-panel">
        <p className="catalog-panel__eyebrow">Checkbox group</p>
        <fieldset className="choice-group">
          <legend>Enrollment checklist</legend>
          {checkboxOptions.map((option, index) => (
            <label key={option} className="choice-row">
              <input type="checkbox" defaultChecked={index < 2} />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="catalog-panel">
        <p className="catalog-panel__eyebrow">Switch and file</p>
        <label className="switch-row">
          <span>Enable SMS notification</span>
          <span className="switch">
            <input type="checkbox" defaultChecked />
            <span className="switch__track" />
          </span>
        </label>
        <label className="catalog-label file-upload">
          <span>Attachment upload</span>
          <input type="file" />
          <span className="file-upload__surface">
            <span className="file-upload__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 16V5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 9.5L12 5l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 18.5h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="file-upload__text">
              <strong>Choose file</strong>
              <span>Upload supporting document or image</span>
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
