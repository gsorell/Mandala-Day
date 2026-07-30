import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { format, parseISO } from 'date-fns';
import { DailySessionInstance, UserSchedule } from '../types';
import { getSessionById } from '../data/sessions';
import { TEACHINGS, teachingIndexForDate } from '../data/teachings';
import { getDailyInstances, getUserSchedule } from './storage';

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

// ── Active practice ────────────────────────────────────────────────────────
//
// Nobody should be interrupted mid-practice by a reminder to practice. Tracking
// that lives at module scope rather than in React context because the handler
// below is registered at import time, outside the tree, and has to read the
// answer synchronously.
//
// `instanceId` is present only for scheduled mandala sessions (SessionPlayer
// passes it); the extras and timers set just the route.

type ActivePractice = {
  route: string;
  instanceId?: string;
};

let activePractice: ActivePractice | null = null;

export const setActivePractice = (practice: ActivePractice | null): void => {
  activePractice = practice;
};

export const getActivePractice = (): ActivePractice | null => activePractice;

// Routes that are not a practice: chrome, review screens, settings. Anything not
// listed here counts as a practice, so a newly added meditation screen defaults
// to being protected rather than to interrupting.
const NON_PRACTICE_ROUTES = new Set([
  'Main',
  'Onboarding',
  'Settings',
  'ScheduleSettings',
  'History',
  'Journal',
  'DailyTeaching',
  'SessionComplete',
  'MandalaComplete',
  // TheView and Firekeeper are reading screens - no audio, nothing to interrupt.
  'TheView',
  'Firekeeper',
]);

export const isPracticeRoute = (routeName: string | undefined): boolean =>
  !!routeName && !NON_PRACTICE_ROUTES.has(routeName);

const SHOW = {
  shouldShowAlert: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
  shouldShowBanner: true,
  shouldShowList: true,
};

// Suppressed entirely — no banner, no sound, not even a row in the shade.
const DROP = {
  shouldShowAlert: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
  shouldShowBanner: false,
  shouldShowList: false,
};

// Kept in the shade but never thrown over what someone is doing.
const QUIET = { ...SHOW, shouldShowAlert: false, shouldPlaySound: false, shouldShowBanner: false };

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as
      | { kind?: NotificationKind; instanceId?: string }
      | undefined;
    const active = activePractice;

    if (!active) return SHOW;

    // A teaching asks nothing and keeps all day, so it just waits in the shade.
    if (data?.kind === 'teaching') return QUIET;

    // The reminder for the very session being sat: it has served its purpose.
    if (data?.instanceId && data.instanceId === active.instanceId) {
      console.log(`Dropping reminder for ${data.instanceId} - already sitting it`);
      return DROP;
    }

    // A different session came due mid-practice. Push it out rather than lose it.
    if (data?.instanceId) {
      await deferSessionNotification(data.instanceId);
    }
    return DROP;
  },
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

// Re-schedule a session reminder that landed mid-practice, or drop it if pushing it
// out would carry it past the point of being useful.
//
// Deferring by one snooze step rather than to a computed practice end-time means it
// works for open-ended sitting too: if the practice is still running when the
// reminder comes back, it simply defers again. The grace window terminates the loop
// — once the session would be MISSED anyway, the reminder is dropped.
export const deferSessionNotification = async (
  instanceId: string,
  deferUntil?: Date
): Promise<void> => {
  try {
    const [schedule, instances] = await Promise.all([
      getUserSchedule(),
      getDailyInstances(format(new Date(), 'yyyy-MM-dd')),
    ]);

    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) return;

    const session = getSessionById(instance.templateId);
    if (!session) return;

    const deferMin = schedule.snoozeOptionsMin[0] ?? 5;
    const nextAt = deferUntil ?? new Date(Date.now() + deferMin * 60_000);
    const staleAfter = new Date(
      parseISO(instance.scheduledAt).getTime() + schedule.graceWindowMin * 60_000
    );

    if (nextAt > staleAfter) {
      console.log(`Not deferring ${instanceId} - past its ${schedule.graceWindowMin}min grace window`);
      return;
    }

    if (isInQuietHours(nextAt, schedule.quietHours)) {
      console.log(`Not deferring ${instanceId} - would land in quiet hours`);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: session.title,
        body: session.shortPrompt,
        data: { kind: 'session', instanceId: instance.id, templateId: instance.templateId },
        sound: true,
        categoryIdentifier: 'session',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextAt,
      },
    });

    console.log(`Deferred ${instanceId} to ${nextAt.toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error deferring session notification:', error);
  }
};

// Clear the runway before a practice starts.
//
// The handler above only runs while the app is foregrounded — if someone sits with
// the screen off, the OS delivers straight to the shade and we never get a say. So
// the decision is made up front instead, while we still can: any session reminder
// due to fire before this practice ends is dealt with now.
//
// `instanceId` is the session being sat, if it is one of the scheduled six; its own
// reminder is cancelled outright rather than deferred. Everything else is pushed to
// just after the practice ends.
export const clearNotificationsForPractice = async (
  durationMin: number,
  instanceId?: string
): Promise<void> => {
  try {
    const endsAt = new Date(Date.now() + durationMin * 60_000);
    const resumeAt = new Date(endsAt.getTime() + 60_000); // a minute to come back
    const pending = await Notifications.getAllScheduledNotificationsAsync();

    let dismissed = 0;
    let deferred = 0;

    for (const notification of pending) {
      const data = notification.content.data as
        | { kind?: NotificationKind; instanceId?: string }
        | undefined;
      if ((data?.kind ?? 'session') !== 'session' || !data?.instanceId) continue;

      // Only those landing inside the practice window are our business.
      const trigger = notification.trigger as { date?: number | string } | null;
      const fireAt = trigger?.date ? new Date(trigger.date) : null;
      if (!fireAt || fireAt > endsAt) continue;

      await Notifications.cancelScheduledNotificationAsync(notification.identifier);

      if (data.instanceId === instanceId) {
        dismissed++;
      } else {
        await deferSessionNotification(data.instanceId, resumeAt);
        deferred++;
      }
    }

    if (dismissed || deferred) {
      console.log(`Practice runway cleared: ${dismissed} dismissed, ${deferred} deferred`);
    }
  } catch (error) {
    console.error('Error clearing notifications for practice:', error);
  }
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
