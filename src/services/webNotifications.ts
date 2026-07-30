// Web Notifications Service for PWA
// Handles notification permissions and scheduling for web/PWA
// Uses Service Worker for background notification delivery

import { DailySessionInstance, UserSchedule } from '../types';
import { getSessionById } from '../data/sessions';
import { TEACHINGS, teachingIndexForDate } from '../data/teachings';
import { parseISO } from 'date-fns';

const NOTIFICATION_CHECK_INTERVAL = 60000; // Check every minute
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_web_notifications';

// Days of teachings to queue. Mirrors TEACHING_QUEUE_DAYS in notifications.ts.
const TEACHING_QUEUE_DAYS = 14;

interface ScheduledNotification {
  id: string;
  kind: 'session' | 'teaching';
  instanceId?: string; // sessions only
  templateId?: string; // sessions only
  teachingIndex?: number; // teachings only
  title: string;
  body: string;
  scheduledTime: number; // timestamp
  shown: boolean;
}

// Shared quiet-hours test. Handles windows that span midnight (e.g. 22:00–07:00).
const isInQuietHours = (time: Date, quietHours: UserSchedule['quietHours']): boolean => {
  if (!quietHours.enabled) return false;

  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);

  const atMin = time.getHours() * 60 + time.getMinutes();
  const startInMin = startHour * 60 + startMin;
  const endInMin = endHour * 60 + endMin;

  return startInMin > endInMin
    ? atMin >= startInMin || atMin <= endInMin
    : atMin >= startInMin && atMin <= endInMin;
};

// Send notifications to service worker for background delivery
const sendNotificationsToServiceWorker = async (notifications: ScheduledNotification[]): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[WebNotifications] Service Worker not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        notifications: notifications,
      });
      console.log('[WebNotifications] Sent', notifications.length, 'notifications to Service Worker');
      return true;
    }
  } catch (error) {
    console.error('[WebNotifications] Error sending to Service Worker:', error);
  }
  return false;
};

// Cancel all notifications in service worker
const cancelServiceWorkerNotifications = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'CANCEL_NOTIFICATIONS',
      });
      console.log('[WebNotifications] Cancelled Service Worker notifications');
    }
  } catch (error) {
    console.error('[WebNotifications] Error cancelling SW notifications:', error);
  }
};

// Trigger a manual check in the service worker
export const triggerServiceWorkerCheck = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'CHECK_NOTIFICATIONS',
      });
    }
  } catch (error) {
    console.error('[WebNotifications] Error triggering SW check:', error);
  }
};

// Check if web notifications are supported
export const areWebNotificationsSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission => {
  if (!areWebNotificationsSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

// Request notification permission
export const requestWebNotificationPermission = async (): Promise<boolean> => {
  if (!areWebNotificationsSupported()) {
    console.warn('Web notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Save scheduled notifications to localStorage
const saveScheduledNotifications = (notifications: ScheduledNotification[]): void => {
  try {
    localStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving scheduled notifications:', error);
  }
};

// Load scheduled notifications from localStorage
const loadScheduledNotifications = (): ScheduledNotification[] => {
  try {
    const data = localStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading scheduled notifications:', error);
  }
  return [];
};

// Clear all scheduled notifications
export const clearWebNotifications = async (): Promise<void> => {
  try {
    localStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
    await cancelServiceWorkerNotifications();
  } catch (error) {
    console.error('[WebNotifications] Error clearing notifications:', error);
  }
};

// Schedule notification for a session
const scheduleWebNotification = (
  instance: DailySessionInstance,
  schedule: UserSchedule
): ScheduledNotification | null => {
  const session = getSessionById(instance.templateId);
  if (!session) return null;

  const scheduledTime = parseISO(instance.scheduledAt);
  const now = new Date();

  // Don't schedule if time has already passed
  if (scheduledTime <= now) {
    return null;
  }

  // Check quiet hours
  if (isInQuietHours(scheduledTime, schedule.quietHours)) {
    console.log(`Notification for ${session.title} skipped - in quiet hours`);
    return null;
  }

  return {
    id: `${instance.id}_${scheduledTime.getTime()}`,
    kind: 'session',
    instanceId: instance.id,
    templateId: instance.templateId,
    title: session.title,
    body: session.shortPrompt,
    scheduledTime: scheduledTime.getTime(),
    shown: false,
  };
};

// Build the queued daily teachings. Returned rather than sent on their own: the
// service worker's SCHEDULE_NOTIFICATIONS replaces the whole stored list, so
// teachings and sessions have to go over in one batch or the second call wipes the
// first.
const buildTeachingNotifications = (schedule: UserSchedule): ScheduledNotification[] => {
  if (!schedule.dailyTeaching.enabled) return [];

  const [hour, minute] = schedule.dailyTeaching.time.split(':').map(Number);
  const now = new Date();
  const notifications: ScheduledNotification[] = [];

  for (let dayOffset = 0; dayOffset < TEACHING_QUEUE_DAYS; dayOffset++) {
    const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);

    if (fireAt <= now) continue;
    if (isInQuietHours(fireAt, schedule.quietHours)) continue;

    const teachingIndex = teachingIndexForDate(fireAt);
    const teaching = TEACHINGS[teachingIndex];
    notifications.push({
      id: `teaching_${fireAt.getTime()}`,
      kind: 'teaching',
      teachingIndex,
      title: teaching.source,
      body: teaching.teaching,
      scheduledTime: fireAt.getTime(),
      shown: false,
    });
  }

  return notifications;
};

// Schedule all notifications for today's sessions
export const scheduleAllWebNotifications = async (
  instances: DailySessionInstance[],
  schedule: UserSchedule
): Promise<void> => {
  if (!areWebNotificationsSupported()) {
    console.warn('[WebNotifications] Web notifications not supported');
    return;
  }

  if (getNotificationPermission() !== 'granted') {
    console.warn('[WebNotifications] Notification permission not granted');
    return;
  }

  console.log(`[WebNotifications] Scheduling notifications for ${instances.length} sessions...`);

  const notifications: ScheduledNotification[] = [];

  for (const instance of instances) {
    const notification = scheduleWebNotification(instance, schedule);
    if (notification) {
      notifications.push(notification);
    }
  }

  // Daily teachings go in the same batch — see buildTeachingNotifications.
  const teachings = buildTeachingNotifications(schedule);
  notifications.push(...teachings);

  // Save to localStorage as fallback
  saveScheduledNotifications(notifications);

  // Send to Service Worker for background delivery
  const sentToSW = await sendNotificationsToServiceWorker(notifications);

  console.log(
    `[WebNotifications] Scheduled ${notifications.length} notifications ` +
      `(${teachings.length} teachings, SW: ${sentToSW})`
  );
};

// Show a notification
const showNotification = async (notification: ScheduledNotification): Promise<void> => {
  if (!areWebNotificationsSupported()) return;

  try {
    // Try to use service worker if available
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id,
        requireInteraction: false,
        silent: notification.kind === 'teaching',
        data: { kind: notification.kind, teachingIndex: notification.teachingIndex },
      });
    } else {
      // Fallback to regular notification
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
        tag: notification.id,
      });
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

// Check for due notifications and show them
const checkAndShowNotifications = async (): Promise<void> => {
  if (getNotificationPermission() !== 'granted') return;

  const notifications = loadScheduledNotifications();
  const now = Date.now();
  let hasChanges = false;

  for (const notification of notifications) {
    if (notification.shown || notification.scheduledTime > now) continue;

    // A teaching is only worth showing on its own day. Later in the day is fine —
    // you get it whenever you next look — but yesterday's teaching should not
    // surface if the tab was closed overnight.
    if (notification.kind === 'teaching') {
      const scheduledDay = new Date(notification.scheduledTime).toDateString();
      if (scheduledDay !== new Date(now).toDateString()) {
        notification.shown = true;
        hasChanges = true;
        continue;
      }
    }

    await showNotification(notification);
    notification.shown = true;
    hasChanges = true;
    console.log(`Showed notification: ${notification.title}`);
  }

  if (hasChanges) {
    saveScheduledNotifications(notifications);
  }

  // Clean up old notifications (older than 24 hours)
  const cutoff = now - 24 * 60 * 60 * 1000;
  const filteredNotifications = notifications.filter(n => n.scheduledTime > cutoff);
  if (filteredNotifications.length !== notifications.length) {
    saveScheduledNotifications(filteredNotifications);
  }
};

// Start checking for notifications periodically
let checkInterval: NodeJS.Timeout | null = null;

export const startWebNotificationCheck = (): void => {
  if (checkInterval) return; // Already started

  console.log('Starting web notification check...');
  
  // Check immediately
  checkAndShowNotifications();

  // Then check every minute
  checkInterval = setInterval(() => {
    checkAndShowNotifications();
  }, NOTIFICATION_CHECK_INTERVAL);
};

export const stopWebNotificationCheck = (): void => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('Stopped web notification check');
  }
};

// Get count of pending notifications
export const getPendingWebNotificationsCount = (): number => {
  const notifications = loadScheduledNotifications();
  const now = Date.now();
  return notifications.filter(n => !n.shown && n.scheduledTime > now).length;
};
