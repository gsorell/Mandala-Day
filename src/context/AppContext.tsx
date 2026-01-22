import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { format } from 'date-fns';
import {
  UserSchedule,
  AppSettings,
  DailySessionInstance,
  SessionStatus,
  EventType,
} from '../types';
import {
  getUserSchedule,
  saveUserSchedule,
  getAppSettings,
  saveAppSettings,
  getDailyInstances,
  updateSessionInstance,
  logEvent,
  generateDailyInstances,
  saveDailyInstances,
} from '../services/storage';
import { DEFAULT_GRACE_WINDOW } from '../utils/theme';
import {
  scheduleAllWebNotifications,
  startWebNotificationCheck,
  stopWebNotificationCheck,
  areWebNotificationsSupported,
  getNotificationPermission,
} from '../services/webNotifications';

interface AppContextType {
  // State
  userSchedule: UserSchedule | null;
  appSettings: AppSettings | null;
  todayInstances: DailySessionInstance[];
  isLoading: boolean;

  // Actions
  updateUserSchedule: (schedule: Partial<UserSchedule>) => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshTodayInstances: () => Promise<void>;
  startSession: (instanceId: string) => Promise<void>;
  completeSession: (instanceId: string) => Promise<void>;
  skipSession: (instanceId: string) => Promise<void>;
  snoozeSession: (instanceId: string, minutes: number) => Promise<void>;
  getNextDueSession: () => DailySessionInstance | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userSchedule, setUserSchedule] = useState<UserSchedule | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [todayInstances, setTodayInstances] = useState<DailySessionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentDateRef = useRef<string>(format(new Date(), 'yyyy-MM-dd'));
  const appState = useRef(AppState.currentState);

  // Helper function to load/generate instances for a given date
  const loadInstancesForDate = useCallback(async (date: string, schedule: UserSchedule | null) => {
    let instances = await getDailyInstances(date);

    // Check if instances exist and are for the correct date
    // Use the stored date field instead of parsing scheduledAt to avoid timezone issues
    if (instances.length > 0) {
      const firstInstanceDate = instances[0].date;
      if (firstInstanceDate !== date) {
        console.log('Date mismatch - stored:', firstInstanceDate, 'requested:', date);
        // Generate fresh instances for the date
        if (schedule) {
          instances = generateDailyInstances(date, schedule);
          await saveDailyInstances(date, instances);
        }
      }
    } else if (schedule) {
      // No instances found, generate new ones
      instances = generateDailyInstances(date, schedule);
      await saveDailyInstances(date, instances);
    }

    return instances;
  }, []);

  // Check if date has changed and refresh if needed
  const checkAndRefreshForNewDay = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (currentDateRef.current !== today) {
      console.log('Day changed from', currentDateRef.current, 'to', today);
      currentDateRef.current = today;
      const instances = await loadInstancesForDate(today, userSchedule);
      setTodayInstances(instances);
    }
  }, [userSchedule, loadInstancesForDate]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [schedule, settings] = await Promise.all([
          getUserSchedule(),
          getAppSettings(),
        ]);
        setUserSchedule(schedule);
        setAppSettings(settings);

        const today = format(new Date(), 'yyyy-MM-dd');
        currentDateRef.current = today;

        const instances = await loadInstancesForDate(today, schedule);
        setTodayInstances(instances);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadInstancesForDate]);

  // Listen for app state changes (foreground/background) and check for day change
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // When app comes to foreground, check if day changed
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkAndRefreshForNewDay();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndRefreshForNewDay]);

  // Periodic check for day change (every minute, along with status updates)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshForNewDay();
    }, 60000);

    return () => clearInterval(interval);
  }, [checkAndRefreshForNewDay]);

  // Schedule web notifications when on web platform
  useEffect(() => {
    if (Platform.OS === 'web' && appSettings?.notificationsEnabled && userSchedule && todayInstances.length > 0) {
      // Check if notifications are supported and permission is granted
      if (areWebNotificationsSupported() && getNotificationPermission() === 'granted') {
        scheduleAllWebNotifications(todayInstances, userSchedule);
        startWebNotificationCheck();
      }
    }

    // Cleanup notification checker
    return () => {
      if (Platform.OS === 'web') {
        stopWebNotificationCheck();
      }
    };
  }, [todayInstances, userSchedule, appSettings?.notificationsEnabled]);

  // Update session statuses based on time
  useEffect(() => {
    // Don't run until initial data is loaded
    if (isLoading || !userSchedule || todayInstances.length === 0) return;

    const updateStatuses = async () => {
      const now = new Date();
      const changedInstances: DailySessionInstance[] = [];

      // Sort instances by scheduled time to find previous session
      const sortedInstances = [...todayInstances].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );

      const updatedInstances = sortedInstances.map((instance, index) => {
        // Skip completed and skipped sessions - they don't change
        if (
          instance.status === SessionStatus.COMPLETED ||
          instance.status === SessionStatus.SKIPPED
        ) {
          return instance;
        }

        const scheduledTime = new Date(instance.scheduledAt);
        const graceEnd = new Date(
          scheduledTime.getTime() +
            (userSchedule.graceWindowMin || DEFAULT_GRACE_WINDOW) * 60 * 1000
        );

        let newStatus = instance.status;

        // UPCOMING: Before scheduled time
        if (now < scheduledTime) {
          newStatus = SessionStatus.UPCOMING;
        }
        // DUE: At or after scheduled time, before grace period ends
        else if (now >= scheduledTime && now < graceEnd) {
          newStatus = SessionStatus.DUE;
        }
        // MISSED (Passed): After grace period and not completed
        else if (now >= graceEnd) {
          newStatus = SessionStatus.MISSED;
        }

        // Only track as changed if status actually changed
        if (newStatus !== instance.status) {
          const updatedInstance = { ...instance, status: newStatus };
          changedInstances.push(updatedInstance);

          // Log miss event
          if (newStatus === SessionStatus.MISSED) {
            logEvent({
              timestamp: new Date().toISOString(),
              eventType: EventType.MISS,
              instanceId: instance.id,
            });
          }

          return updatedInstance;
        }

        return instance;
      });

      // Only update state and storage if there were actual changes
      if (changedInstances.length > 0) {
        setTodayInstances(updatedInstances);
        // Only save the instances that actually changed
        for (const instance of changedInstances) {
          await updateSessionInstance(instance);
        }
      }
    };

    const interval = setInterval(updateStatuses, 60000); // Check every minute
    updateStatuses(); // Run immediately

    return () => clearInterval(interval);
  }, [isLoading, todayInstances, userSchedule]);

  const refreshTodayInstances = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    currentDateRef.current = today;
    const instances = await loadInstancesForDate(today, userSchedule);
    setTodayInstances(instances);
  }, [userSchedule, loadInstancesForDate]);

  const updateUserScheduleAction = useCallback(
    async (schedule: Partial<UserSchedule>) => {
      if (!userSchedule) return;
      const newSchedule = { ...userSchedule, ...schedule };
      setUserSchedule(newSchedule);
      await saveUserSchedule(newSchedule);
      
      // Refresh today's instances to reflect the new schedule
      await refreshTodayInstances();
    },
    [userSchedule, refreshTodayInstances]
  );

  const updateAppSettingsAction = useCallback(
    async (settings: Partial<AppSettings>) => {
      if (!appSettings) return;
      const newSettings = { ...appSettings, ...settings };
      setAppSettings(newSettings);
      await saveAppSettings(newSettings);
    },
    [appSettings]
  );

  const startSession = useCallback(
    async (instanceId: string) => {
      const instance = todayInstances.find((i) => i.id === instanceId);
      if (!instance) return;

      // Don't change status if already completed - allow reviewing completed sessions
      if (instance.status === SessionStatus.COMPLETED) {
        return;
      }

      const updatedInstance: DailySessionInstance = {
        ...instance,
        status: SessionStatus.DUE,
        startedAt: new Date().toISOString(),
      };

      setTodayInstances((prev) =>
        prev.map((i) => (i.id === instanceId ? updatedInstance : i))
      );
      await updateSessionInstance(updatedInstance);
      await logEvent({
        timestamp: new Date().toISOString(),
        eventType: EventType.START,
        instanceId,
      });
    },
    [todayInstances]
  );

  const completeSession = useCallback(
    async (instanceId: string) => {
      const instance = todayInstances.find((i) => i.id === instanceId);
      if (!instance) return;

      const updatedInstance: DailySessionInstance = {
        ...instance,
        status: SessionStatus.COMPLETED,
        endedAt: new Date().toISOString(),
      };

      setTodayInstances((prev) =>
        prev.map((i) => (i.id === instanceId ? updatedInstance : i))
      );
      await updateSessionInstance(updatedInstance);
      await logEvent({
        timestamp: new Date().toISOString(),
        eventType: EventType.COMPLETE,
        instanceId,
      });
    },
    [todayInstances]
  );

  const skipSession = useCallback(
    async (instanceId: string) => {
      const instance = todayInstances.find((i) => i.id === instanceId);
      if (!instance) return;

      const updatedInstance: DailySessionInstance = {
        ...instance,
        status: SessionStatus.SKIPPED,
      };

      setTodayInstances((prev) =>
        prev.map((i) => (i.id === instanceId ? updatedInstance : i))
      );
      await updateSessionInstance(updatedInstance);
      await logEvent({
        timestamp: new Date().toISOString(),
        eventType: EventType.SKIP,
        instanceId,
      });
    },
    [todayInstances]
  );

  const snoozeSession = useCallback(
    async (instanceId: string, minutes: number) => {
      const instance = todayInstances.find((i) => i.id === instanceId);
      if (!instance) return;

      const newScheduledAt = new Date(
        new Date().getTime() + minutes * 60 * 1000
      ).toISOString();

      const updatedInstance: DailySessionInstance = {
        ...instance,
        scheduledAt: newScheduledAt,
        status: SessionStatus.UPCOMING,
        snoozeCount: instance.snoozeCount + 1,
      };

      setTodayInstances((prev) =>
        prev.map((i) => (i.id === instanceId ? updatedInstance : i))
      );
      await updateSessionInstance(updatedInstance);
      await logEvent({
        timestamp: new Date().toISOString(),
        eventType: EventType.SNOOZE,
        instanceId,
        metadata: { minutes },
      });
    },
    [todayInstances]
  );

  const getNextDueSession = useCallback(() => {
    const now = new Date();
    
    // First, try to find a DUE or UPCOMING session
    const nextSession = todayInstances.find((instance) => 
      instance.status === SessionStatus.DUE ||
      instance.status === SessionStatus.UPCOMING
    );
    
    if (nextSession) {
      return nextSession;
    }
    
    // If no upcoming/due session, check for recently missed sessions (within 1 hour)
    const missedWithinOneHour = todayInstances.find((instance) => {
      if (instance.status === SessionStatus.MISSED) {
        const scheduledTime = new Date(instance.scheduledAt);
        const timeSinceMissed = now.getTime() - scheduledTime.getTime();
        return timeSinceMissed < 60 * 60 * 1000; // Within 1 hour
      }
      return false;
    });
    
    return missedWithinOneHour;
  }, [todayInstances]);

  return (
    <AppContext.Provider
      value={{
        userSchedule,
        appSettings,
        todayInstances,
        isLoading,
        updateUserSchedule: updateUserScheduleAction,
        updateAppSettings: updateAppSettingsAction,
        refreshTodayInstances,
        startSession,
        completeSession,
        skipSession,
        snoozeSession,
        getNextDueSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
