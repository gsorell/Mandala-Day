import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserSchedule,
  AppSettings,
  DailySessionInstance,
  EventLog,
  SessionStatus,
} from '../types';
import { DEFAULT_SESSIONS } from '../data/sessions';
import {
  STORAGE_KEYS,
  DEFAULT_SCHEDULE_TIMES,
  DEFAULT_SNOOZE_OPTIONS,
  DEFAULT_GRACE_WINDOW,
} from '../utils/theme';
import { format, parseISO, isToday, startOfDay, addMinutes } from 'date-fns';

// Simple mutex to prevent race conditions when updating daily instances
let instancesLock: Promise<void> = Promise.resolve();

const withInstancesLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  // Wait for any pending operation to complete
  const previousLock = instancesLock;
  let releaseLock: () => void;
  instancesLock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;
  try {
    return await fn();
  } finally {
    releaseLock!();
  }
};

// Default user schedule
const getDefaultUserSchedule = (): UserSchedule => ({
  sessionTimes: { ...DEFAULT_SCHEDULE_TIMES },
  enabledSessions: DEFAULT_SESSIONS.reduce(
    (acc, session) => ({ ...acc, [session.id]: true }),
    {} as Record<string, boolean>
  ),
  quietHours: {
    start: '22:00',
    end: '07:00',
    enabled: false,
  },
  snoozeOptionsMin: DEFAULT_SNOOZE_OPTIONS,
  graceWindowMin: DEFAULT_GRACE_WINDOW,
});

// Default app settings
const getDefaultAppSettings = (): AppSettings => ({
  hasCompletedOnboarding: false,
  notificationsEnabled: true,
  weekendScheduleEnabled: false,
});

// User Schedule
export const getUserSchedule = async (): Promise<UserSchedule> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_SCHEDULE);
    if (data) {
      return { ...getDefaultUserSchedule(), ...JSON.parse(data) };
    }
    return getDefaultUserSchedule();
  } catch (error) {
    console.error('Error loading user schedule:', error);
    return getDefaultUserSchedule();
  }
};

export const saveUserSchedule = async (schedule: UserSchedule): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SCHEDULE, JSON.stringify(schedule));
  } catch (error) {
    console.error('Error saving user schedule:', error);
  }
};

// App Settings
export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (data) {
      return { ...getDefaultAppSettings(), ...JSON.parse(data) };
    }
    return getDefaultAppSettings();
  } catch (error) {
    console.error('Error loading app settings:', error);
    return getDefaultAppSettings();
  }
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving app settings:', error);
  }
};

// Daily Session Instances - read only, does not auto-generate
export const getDailyInstancesRaw = async (
  date: string
): Promise<DailySessionInstance[] | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_INSTANCES);
    const allInstances: Record<string, DailySessionInstance[]> = data
      ? JSON.parse(data)
      : {};

    return allInstances[date] || null;
  } catch (error) {
    console.error('Error loading daily instances:', error);
    return null;
  }
};

// Daily Session Instances - auto-generates if not found
export const getDailyInstances = async (
  date: string
): Promise<DailySessionInstance[]> => {
  try {
    const existing = await getDailyInstancesRaw(date);
    if (existing) {
      return existing;
    }

    // Generate instances for this date if they don't exist
    const schedule = await getUserSchedule();
    const instances = generateDailyInstances(date, schedule);
    await saveDailyInstances(date, instances);
    return instances;
  } catch (error) {
    console.error('Error loading daily instances:', error);
    return [];
  }
};

// Internal save function without lock (used by updateSessionInstance which has its own lock)
const saveDailyInstancesInternal = async (
  date: string,
  instances: DailySessionInstance[]
): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_INSTANCES);
    const allInstances: Record<string, DailySessionInstance[]> = data
      ? JSON.parse(data)
      : {};

    allInstances[date] = instances;

    // Clean up old instances (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = format(thirtyDaysAgo, 'yyyy-MM-dd');

    Object.keys(allInstances).forEach((key) => {
      if (key < cutoffDate) {
        delete allInstances[key];
      }
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.DAILY_INSTANCES,
      JSON.stringify(allInstances)
    );
  } catch (error) {
    console.error('Error saving daily instances:', error);
  }
};

export const saveDailyInstances = async (
  date: string,
  instances: DailySessionInstance[]
): Promise<void> => {
  return withInstancesLock(() => saveDailyInstancesInternal(date, instances));
};

export const updateSessionInstance = async (
  instance: DailySessionInstance
): Promise<void> => {
  return withInstancesLock(async () => {
    try {
      // Use raw read to avoid auto-generation which could cause race conditions
      const instances = await getDailyInstancesRaw(instance.date);
      if (!instances) {
        console.error('No instances found for date:', instance.date);
        return;
      }
      const index = instances.findIndex((i) => i.id === instance.id);
      if (index !== -1) {
        instances[index] = instance;
        // Use internal save to avoid deadlock (we already hold the lock)
        await saveDailyInstancesInternal(instance.date, instances);
      }
    } catch (error) {
      console.error('Error updating session instance:', error);
    }
  });
};

// Generate daily instances based on schedule
export const generateDailyInstances = (
  date: string,
  schedule: UserSchedule
): DailySessionInstance[] => {
  const instances: DailySessionInstance[] = [];

  DEFAULT_SESSIONS.forEach((session) => {
    if (schedule.enabledSessions[session.id]) {
      const time = schedule.sessionTimes[session.id] || session.defaultTime;
      const [hours, minutes] = time.split(':').map(Number);

      // Parse the date string properly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0);

      instances.push({
        id: `${date}_${session.id}`,
        date,
        templateId: session.id,
        scheduledAt: scheduledAt.toISOString(),
        status: SessionStatus.UPCOMING,
        snoozeCount: 0,
      });
    }
  });

  return instances.sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
};

// Event Log
export const logEvent = async (event: Omit<EventLog, 'id'>): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENT_LOG);
    const logs: EventLog[] = data ? JSON.parse(data) : [];

    const newEvent: EventLog = {
      ...event,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    logs.push(newEvent);

    // Keep only last 1000 events
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.EVENT_LOG, JSON.stringify(logs));
  } catch (error) {
    console.error('Error logging event:', error);
  }
};

export const getEventLogs = async (limit = 100): Promise<EventLog[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENT_LOG);
    const logs: EventLog[] = data ? JSON.parse(data) : [];
    return logs.slice(-limit);
  } catch (error) {
    console.error('Error getting event logs:', error);
    return [];
  }
};

// Extra Practice Minutes (Simple Timer, Vipassana, etc.)
// Stored as { "YYYY-MM-DD": number } for each day
export const getExtraPracticeMinutes = async (date: string): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXTRA_PRACTICE_MINUTES);
    const allMinutes: Record<string, number> = data ? JSON.parse(data) : {};
    return allMinutes[date] || 0;
  } catch (error) {
    console.error('Error getting extra practice minutes:', error);
    return 0;
  }
};

export const addExtraPracticeMinutes = async (date: string, minutes: number): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXTRA_PRACTICE_MINUTES);
    const allMinutes: Record<string, number> = data ? JSON.parse(data) : {};

    allMinutes[date] = (allMinutes[date] || 0) + minutes;

    // Clean up old entries (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = format(thirtyDaysAgo, 'yyyy-MM-dd');

    Object.keys(allMinutes).forEach((key) => {
      if (key < cutoffDate) {
        delete allMinutes[key];
      }
    });

    await AsyncStorage.setItem(STORAGE_KEYS.EXTRA_PRACTICE_MINUTES, JSON.stringify(allMinutes));
  } catch (error) {
    console.error('Error adding extra practice minutes:', error);
  }
};

// Clear all data (for testing/reset)
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_SCHEDULE,
      STORAGE_KEYS.APP_SETTINGS,
      STORAGE_KEYS.DAILY_INSTANCES,
      STORAGE_KEYS.EVENT_LOG,
      STORAGE_KEYS.EXTRA_PRACTICE_MINUTES,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};
