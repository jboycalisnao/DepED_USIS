export type ClinicDisposition = 'Returned to Class' | 'Sent Home' | 'Referred to Hospital' | 'For Follow-up';
export type ClinicSex = 'Female' | 'Male';

export type ClinicQueueEntry = {
  id: string;
  learnerLrn: string;
  learnerName: string;
  sex: ClinicSex;
  age: string;
  gradeSection: string;
  concern: string;
  referredBy: string;
  queuedAt: string;
};

export type ClinicVisitRecord = {
  id: string;
  visitCode: string;
  learnerLrn: string;
  learnerName: string;
  sex: ClinicSex;
  age: string;
  gradeSection: string;
  concern: string;
  referredBy: string;
  bloodPressure: string;
  temperatureC: string;
  pulseBpm: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  heightCm: string;
  weightKg: string;
  notes: string;
  actionTaken: string;
  disposition: ClinicDisposition;
  followUpDate: string;
  assessedAt: string;
};

export type ClinicVisitInput = {
  queueId: string;
  bloodPressure: string;
  temperatureC: string;
  pulseBpm: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  heightCm: string;
  weightKg: string;
  notes: string;
  actionTaken: string;
  disposition: ClinicDisposition;
  followUpDate: string;
};

export type ClinicRegistryFilter = {
  query: string;
  disposition: 'All' | ClinicDisposition;
};
