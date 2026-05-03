import type { PublicEnrollmentResponse } from './types';

const STORAGE_KEY = 'registrar_public_enrollment_responses';

export const getPublicEnrollmentResponses = (): PublicEnrollmentResponse[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const savePublicEnrollmentResponse = (response: PublicEnrollmentResponse) => {
  const responses = getPublicEnrollmentResponses();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([response, ...responses]));
};
