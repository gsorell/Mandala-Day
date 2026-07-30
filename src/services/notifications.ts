import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { parseISO } from 'date-fns';
import { DailySessionInstance, UserSchedule } from '../types';
import { getSessionById } from '../data/sessions';
import { TEACHINGS, teachingIndexForDate } from '../data/teachings';

// How many days of teachings to keep queued. Each day is its own one-shot trigger
// because a repeating DAILY trigger can only carry fixed content, and the teaching
// changes every day. iOS caps pending notifications at 64 per app; sessions use up
// to 6/day, so 14 leaves plenty of room and still covers someone who does not open
// the app for two weeks.
const TEACHING_QUEUE_DAYS = 14;

// Every notification we schedule carries a `kind` so it can be cancelled without
// disturbing the other kind. Untagged notifications predate this and are treated
// as sessions.
type NotificationKind = 'session' | 'teaching';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Check if notifications are available
export const areNotificationsAvailable = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sessions', {
      name: 'Session Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B5B95',
    });

    // Delete old cached channel (Android caches channel settings permanently)
    try {
      await Notifications.deleteNotificationChannelAsync('timer-gong');
    } catch (_) {
      // Channel may not exist, ignore
    }

    // Timer completion channel with gong sound
    // Uses alarm audio attributes so Android treats it like an alarm (bypasses Doze)
    await Notifications.setNotificationChannelAsync('timer-gong-v2', {
      name: 'Timer Completion',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B5B95',
      sound: 'gong.mp3',
      bypassDnd: true,
      enableVibrate: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // Daily teaching gets its own channel, deliberately quieter than 'sessions':
    // DEFAULT importance, no vibration, no sound. A teaching asks nothing of you,
    // so it should not buzz a pocket — and a separate channel lets it be tuned in
    // system settings without touching session reminders.
    await Notifications.setNotificationChannelAsync('teachings', {
      name: 'Daily Teaching',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: false,
      lightColor: '#C49040',
    });
  }

  return true;
};

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

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// Schedule notification for a session
export const scheduleSessionNotification = async (
  instance: DailySessionInstance,
  schedule: UserSchedule
): Promise<string | null> => {
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

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: session.title,
        body: session.shortPrompt,
        data: { kind: 'session', instanceId: instance.id, templateId: instance.templateId },
        sound: true,
        categoryIdentifier: 'session',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledTime,
      },
    });

    console.log(`Scheduled notification for "${session.title}" at ${scheduledTime.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Cancel all scheduled notifications, of every kind
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Cancel only the notifications of one kind, leaving the other kind pending.
// Rescheduling sessions must not wipe the queued teachings (and vice versa), which
// is what a blanket cancelAllScheduledNotificationsAsync() would do.
export const cancelNotificationsByKind = async (kind: NotificationKind): Promise<void> => {
  const pending = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of pending) {
    const data = notification.content.data as { kind?: NotificationKind } | undefined;
    // Untagged notifications were scheduled before `kind` existed; they are sessions.
    const notificationKind = data?.kind ?? 'session';
    if (notificationKind === kind) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
};

// Cancel specific notification
export const cancelNotification = async (identifier: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(identifier);
};

// Schedule notifications for all today's sessions
export const scheduleAllSessionNotifications = async (
  instances: DailySessionInstance[],
  schedule: UserSchedule
): Promise<void> => {
  console.log(`Scheduling notifications for ${instances.length} sessions...`);

  // Cancel existing *session* notifications only — queued teachings stay put.
  await cancelNotificationsByKind('session');
  console.log('Cancelled existing session notifications');

  let scheduledCount = 0;
  // Schedule new notifications
  for (const instance of instances) {
    const identifier = await scheduleSessionNotification(instance, schedule);
    if (identifier) {
      scheduledCount++;
    }
  }
  
  console.log(`Successfully scheduled ${scheduledCount} notifications`);
};

// Queue the next TEACHING_QUEUE_DAYS days of daily teachings, one trigger per day.
// Safe to call repeatedly: it clears the existing teaching queue first, so opening
// the app simply tops the window back up.
export const scheduleTeachingNotifications = async (schedule: UserSchedule): Promise<void> => {
  await cancelNotificationsByKind('teaching');

  if (!schedule.dailyTeaching.enabled) {
    console.log('Daily teaching disabled - nothing queued');
    return;
  }

  const [hour, minute] = schedule.dailyTeaching.time.split(':').map(Number);
  const now = new Date();
  let queued = 0;

  for (let dayOffset = 0; dayOffset < TEACHING_QUEUE_DAYS; dayOffset++) {
    const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);

    if (fireAt <= now) continue;
    if (isInQuietHours(fireAt, schedule.quietHours)) continue;

    const index = teachingIndexForDate(fireAt);
    const teaching = TEACHINGS[index];

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          // Source as the title, teaching as the body: the teaching is the content,
          // and a long title would be clipped to one line in the collapsed shade.
          title: teaching.source,
          body: teaching.teaching,
          data: { kind: 'teaching', index },
          // Deliberately silent. The teaching is there when you next look at the
          // phone; it does not interrupt to announce itself.
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: 'teachings',
        },
      });
      queued++;
    } catch (error) {
      console.error('Error scheduling teaching notification:', error);
    }
  }

  console.log(`Queued ${queued} daily teachings from ${schedule.dailyTeaching.time}`);
};

// Get all pending notifications
export const getPendingNotifications = async () => {
  return Notifications.getAllScheduledNotificationsAsync();
};

// Set up notification response listener
export const addNotificationResponseListener = (
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};

// Set up notification received listener
export const addNotificationReceivedListener = (
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription => {
  return Notifications.addNotificationReceivedListener(handler);
};

// Remove subscription
export const removeNotificationSubscription = (subscription: Notifications.Subscription): void => {
  subscription.remove();
};
