// Web Notifications Service for PWA
// Handles notification permissions and scheduling for web/PWA

import { DailySessionInstance, UserSchedule } from '../types';
import { getSessionById } from '../data/sessions';
import { parseISO } from 'date-fns';

const NOTIFICATION_CHECK_INTERVAL = 60000; // Check every minute
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_web_notifications';

interface ScheduledNotification {
  id: string;
  instanceId: string;
  templateId: string;
  title: string;
  body: string;
  scheduledTime: number; // timestamp
  shown: boolean;
}

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
export const clearWebNotifications = (): void => {
  try {
    localStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
  } catch (error) {
    console.error('Error clearing notifications:', error);
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
  if (schedule.quietHours.enabled) {
    const [quietStartHour, quietStartMin] = schedule.quietHours.start.split(':').map(Number);
    const [quietEndHour, quietEndMin] = schedule.quietHours.end.split(':').map(Number);

    const scheduledHour = scheduledTime.getHours();
    const scheduledMin = scheduledTime.getMinutes();
    const scheduledTimeInMin = scheduledHour * 60 + scheduledMin;
    const quietStartInMin = quietStartHour * 60 + quietStartMin;
    const quietEndInMin = quietEndHour * 60 + quietEndMin;

    let isInQuietHours = false;
    
    // Handle quiet hours that span across midnight
    if (quietStartInMin > quietEndInMin) {
      isInQuietHours = scheduledTimeInMin >= quietStartInMin || scheduledTimeInMin <= quietEndInMin;
    } else {
      isInQuietHours = scheduledTimeInMin >= quietStartInMin && scheduledTimeInMin <= quietEndInMin;
    }

    if (isInQuietHours) {
      console.log(`Notification for ${session.title} skipped - in quiet hours`);
      return null;
    }
  }

  return {
    id: `${instance.id}_${scheduledTime.getTime()}`,
    instanceId: instance.id,
    templateId: instance.templateId,
    title: session.title,
    body: session.shortPrompt,
    scheduledTime: scheduledTime.getTime(),
    shown: false,
  };
};

// Schedule all notifications for today's sessions
export const scheduleAllWebNotifications = (
  instances: DailySessionInstance[],
  schedule: UserSchedule
): void => {
  if (!areWebNotificationsSupported()) {
    console.warn('Web notifications not supported');
    return;
  }

  if (getNotificationPermission() !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  console.log(`Scheduling web notifications for ${instances.length} sessions...`);

  const notifications: ScheduledNotification[] = [];
  
  for (const instance of instances) {
    const notification = scheduleWebNotification(instance, schedule);
    if (notification) {
      notifications.push(notification);
    }
  }

  saveScheduledNotifications(notifications);
  console.log(`Scheduled ${notifications.length} web notifications`);
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
    if (!notification.shown && notification.scheduledTime <= now) {
      await showNotification(notification);
      notification.shown = true;
      hasChanges = true;
      console.log(`Showed notification: ${notification.title}`);
    }
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
