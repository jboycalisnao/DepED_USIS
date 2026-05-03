export type ApplicationFormState = {
  learnerLastName: string;
  learnerFirstName: string;
  learnerMiddleName: string;
  incomingGradeLevel: string;
  selectedProgramTrack: string;
  guardianName: string;
  guardianContact: string;
  email: string;
};

export const initialFormState: ApplicationFormState = {
  learnerLastName: '',
  learnerFirstName: '',
  learnerMiddleName: '',
  incomingGradeLevel: '',
  selectedProgramTrack: '',
  guardianName: '',
  guardianContact: '',
  email: '',
};
