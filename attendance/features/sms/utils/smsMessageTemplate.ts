import type { AttendanceSmsTestModeAction, Learner } from '../../../types';

const pad = (value: number) => String(value).padStart(2, '0');

export const formatSmsIsoTimestamp = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const normalize = (value: unknown) => String(value ?? '').trim();

const resolveGenderTerm = (gender: string | null | undefined) => {
  const normalized = normalize(gender).toLowerCase();
  if (normalized === 'm' || normalized === 'male' || normalized.startsWith('male')) return 'son';
  if (normalized === 'f' || normalized === 'female' || normalized.startsWith('female')) return 'daughter';
  return 'child';
};

export const resolveSmsActionText = (value: AttendanceSmsTestModeAction) => (value === 'exit' ? 'exited' : 'entered');

export const renderSmsMessageTemplate = (
  template: string,
  learner: Learner,
  eventTime: string,
  action: AttendanceSmsTestModeAction,
) => {
  const normalizedTemplate = normalize(template).replaceAll('entered/exited', '{action}');
  return normalizedTemplate
    .replaceAll('{time}', eventTime || formatSmsIsoTimestamp())
    .replaceAll('{action}', resolveSmsActionText(action))
    .replaceAll('{gender_term}', resolveGenderTerm(learner.gender))
    .replaceAll('{learner_name}', `${learner.first_name || ''} ${learner.last_name || ''}`.trim() || 'your learner')
    .replaceAll('{school}', 'Leon NHS');
};
