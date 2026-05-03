export const textFieldCatalog = [
  { label: 'Learner ID', type: 'text', value: '2026-00124', tabIndex: 1 },
  { label: 'Email address', type: 'email', value: 'learner@deped.gov.ph', tabIndex: 2 },
  {
    label: 'Password',
    type: 'password',
    value: 'securepass123',
    tabIndex: 3,
    passwordToggleTabIndex: 4,
  },
  { label: 'Mobile number', type: 'tel', value: '09171234567', tabIndex: 5 },
  { label: 'Search records', type: 'search', value: 'Grade 10 - Rizal', tabIndex: 6 },
  { label: 'Birth date', type: 'date', value: '2008-09-14', tabIndex: 7 },
  { label: 'Class start time', type: 'time', value: '08:00', tabIndex: 8 },
  { label: 'Number of copies', type: 'number', value: '3', tabIndex: 9 },
];

export const selectOptions = [
  'Leon National High School',
  'Alimodian National Comprehensive High School',
  'Cabatuan National Comprehensive High School',
];

export const gradeOptions = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];

export const radioOptions = ['Pending review', 'Approved', 'For revision'];

export const checkboxOptions = [
  'Birth certificate attached',
  'Report card verified',
  'Parent consent received',
];
