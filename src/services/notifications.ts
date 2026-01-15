import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { parseISO } from 'date-fns';
import { DailySessionInstance, UserSchedule } from '../types';
import { getSessionById } from '../data/sessions';

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
  }

  return true;
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
  if (schedule.quietHours.enabled) {
    const [quietStartHour, quietStartMin] = schedule.quietHours.start.split(':').map(Number);
    const [quietEndHour, quietEndMin] = schedule.quietHours.end.split(':').map(Number);

    const scheduledHour = scheduledTime.getHours();
    const scheduledMin = scheduledTime.getMinutes();

    const isInQuietHours =
      (scheduledHour > quietStartHour ||
        (scheduledHour === quietStartHour && scheduledMin >= quietStartMin)) ||
      (scheduledHour < quietEndHour ||
        (scheduledHour === quietEndHour && scheduledMin <= quietEndMin));

    if (isInQuietHours) {
      return null;
    }
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: session.title,
        body: session.shortPrompt,
        data: { instanceId: instance.id, templateId: instance.templateId },
        sound: true,
        categoryIdentifier: 'session',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledTime,
      },
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
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
  // Cancel existing notifications first
  await cancelAllNotifications();

  // Schedule new notifications
  for (const instance of instances) {
    await scheduleSessionNotification(instance, schedule);
  }
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
