import type {
  AttendanceSmsRecipientState,
  AttendanceSmsSettings,
  AttendanceType,
  Learner,
} from '../../../types';
import type { SmsQueueRequest } from '../hooks/useSmsNotificationQueue';
import { formatSmsIsoTimestamp, renderSmsMessageTemplate } from '../utils/smsMessageTemplate';
import { normalizePhilippineMobileNumber } from './skySmsNotification';

const normalize = (value: unknown) => String(value ?? '').trim();

const resolveAttendanceSmsAction = (type: AttendanceType) => {
  if (type === 'AM_IN' || type === 'PM_IN') return 'entry';
  if (type === 'AM_OUT' || type === 'PM_OUT') return 'exit';
  return null;
};

const resolveLearnerSmsContact = (learner: Learner) =>
  normalizePhilippineMobileNumber(
    normalize(
      learner.guardian_contact_number ||
        learner.guardian_contact ||
        learner.guardianContact ||
        learner.parent_contact_number ||
        learner.parent_contact ||
        learner.parentContact,
    ),
  );

export const buildAttendanceSmsRequest = (
  learner: Learner,
  type: AttendanceType,
  eventTime: Date,
  smsSettings: AttendanceSmsSettings,
  smsRecipientState: AttendanceSmsRecipientState,
): SmsQueueRequest | null => {
  if (!smsSettings.apiKey.trim() || !smsSettings.messageTemplate.trim()) return null;
  if (!smsRecipientState.enabledLearnerIds.includes(learner.id)) return null;

  const action = resolveAttendanceSmsAction(type);
  if (!action) return null;

  const phoneNumber = resolveLearnerSmsContact(learner);
  if (!phoneNumber) return null;

  const formattedEventTime = formatSmsIsoTimestamp(eventTime);
  const message = renderSmsMessageTemplate(smsSettings.messageTemplate, learner, formattedEventTime, action);
  if (!message || message.length > 160) return null;

  const learnerName =
    `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim() ||
    'Unnamed learner';

  return {
    learnerId: learner.id,
    learnerName,
    phoneNumber,
    message,
    apiKey: smsSettings.apiKey,
  };
};
