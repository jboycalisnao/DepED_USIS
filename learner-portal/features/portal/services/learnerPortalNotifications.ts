import { supabase } from '@deped-usis/shared-supabase';

const TABLE_NAME = 'ia_learner_portal_notifications';
const READ_STATE_PREFIX = 'usis:learner-portal:notification-read:';
const READ_STATE_EVENT = 'learner-portal-notification-read-state-changed';

const toText = (value: unknown) => String(value || '').trim();

export type LearnerPortalNotificationRecord = {
  id: string;
  notificationKey: string;
  title: string;
  message: string;
  isActive: boolean;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type LearnerPortalNotificationReadTarget = Pick<LearnerPortalNotificationRecord, 'id' | 'notificationKey' | 'updatedAt'>;

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;

const buildReadStateKey = (notification: LearnerPortalNotificationReadTarget) => {
  const notificationKey = toText(notification.notificationKey);
  const notificationId = toText(notification.id);
  const updatedAt = toText(notification.updatedAt) || 'current';
  return `${READ_STATE_PREFIX}${notificationKey || notificationId}:${notificationId}:${updatedAt}`;
};

const readStateKeyExists = (notification: LearnerPortalNotificationReadTarget) => {
  if (!hasWindow()) return false;
  return Boolean(window.localStorage.getItem(buildReadStateKey(notification)));
};

const writeReadState = (notification: LearnerPortalNotificationReadTarget, readAt: number) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(buildReadStateKey(notification), String(readAt));
};

const removeReadState = (notification: LearnerPortalNotificationReadTarget) => {
  if (!hasWindow()) return;
  window.localStorage.removeItem(buildReadStateKey(notification));
};

const dispatchReadStateChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(READ_STATE_EVENT));
};

const mapRow = (row: any): LearnerPortalNotificationRecord => ({
  id: toText(row?.id),
  notificationKey: toText(row?.notification_key),
  title: toText(row?.title),
  message: toText(row?.message),
  isActive: Boolean(row?.is_active),
  isPinned: Boolean(row?.is_pinned),
  sortOrder: Number(row?.sort_order || 0),
  createdAt: toText(row?.created_at),
  updatedAt: toText(row?.updated_at),
});

export async function loadLearnerPortalNotifications() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,notification_key,title,message,is_active,is_pinned,sort_order,created_at,updated_at')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load learner portal notifications.');
  return (data || []).map(mapRow);
}

export function isLearnerPortalNotificationRead(notification: LearnerPortalNotificationReadTarget) {
  return readStateKeyExists(notification);
}

export function setLearnerPortalNotificationReadState(notification: LearnerPortalNotificationReadTarget, isRead: boolean) {
  if (!hasWindow()) return;
  if (isRead) {
    writeReadState(notification, Date.now());
  } else {
    removeReadState(notification);
  }
  dispatchReadStateChange();
}

export function markLearnerPortalNotificationsAsRead(notifications: LearnerPortalNotificationReadTarget[]) {
  if (!hasWindow()) return;
  let changed = false;
  notifications.forEach((notification) => {
    if (!readStateKeyExists(notification)) {
      writeReadState(notification, Date.now());
      changed = true;
    }
  });
  if (changed) dispatchReadStateChange();
}

export function getLearnerPortalNotificationReadCount(notifications: LearnerPortalNotificationReadTarget[]) {
  return notifications.filter((notification) => isLearnerPortalNotificationRead(notification)).length;
}

export function subscribeLearnerPortalNotificationReadStateChange(handler: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(READ_STATE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(READ_STATE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
