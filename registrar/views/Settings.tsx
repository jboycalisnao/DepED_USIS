import React from 'react';
import AcademicClassifications from '../components/settings/AcademicClassifications';
import AcademicCycles from '../components/settings/AcademicCycles';
import DocumentSignatorySettings from '../components/settings/DocumentSignatorySettings';
import EnrollmentEmailSettings from '../components/settings/EnrollmentEmailSettings';
import EnrollmentPortalControls from '../components/settings/EnrollmentPortalControls';
import EnrollmentSchoolYearSettings from '../components/settings/EnrollmentSchoolYearSettings';
import GradeLevelManagement from '../components/settings/GradeLevelManagement';

const Settings: React.FC = () => {
  return (
    <div className="registrar-settings-page">
      <section className="registrar-settings-page__panel">
        <header className="registrar-settings-page__header">
          <div className="registrar-settings-page__bar" aria-hidden="true" />
          <div>
            <h3>Academic Configuration</h3>
            <p>Define the operational scope of your institution.</p>
          </div>
        </header>

        <div className="registrar-settings-page__stack">
          <AcademicCycles />
          <hr />
          <GradeLevelManagement />
          <hr />
          <AcademicClassifications />
          <hr />
          <EnrollmentSchoolYearSettings />
          <hr />
          <DocumentSignatorySettings />
          <hr />
          <EnrollmentPortalControls />
          <hr />
          <EnrollmentEmailSettings />
        </div>
      </section>
    </div>
  );
};

export default Settings;
