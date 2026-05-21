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
  const todayInstancesRef = useRef<DailySessionInstance[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    todayInstancesRef.current = todayInstances;
  }, [todayInstances]);

  // Reconcile session statuses against the current time. Idempotent: instances
  // already at the correct status pass through unchanged with no side effects.
  // Persists every transition and logs MISS once on the UPCOMING/DUE → MISSED edge.
  const reconcileInstanceStatuses = useCallback(
    async (
      instances: DailySessionInstance[],
      schedule: UserSchedule | null
    ): Promise<DailySessionInstance[]> => {
      if (instances.length === 0 || !schedule) return instances;

      const now = new Date();
      const graceWindowMs =
        (schedule.graceWindowMin || DEFAULT_GRACE_WINDOW) * 60 * 1000;
      const changedById = new Map<string, DailySessionInstance>();

      for (const instance of instances) {
        if (
          instance.status === SessionStatus.COMPLETED ||
          instance.status === SessionStatus.SKIPPED
        ) {
          continue;
        }

        const scheduledTime = new Date(instance.scheduledAt);
        const graceEnd = new Date(scheduledTime.getTime() + graceWindowMs);

        let newStatus = instance.status;
        if (now < scheduledTime) {
          newStatus = SessionStatus.UPCOMING;
        } else if (now < graceEnd) {
          newStatus = SessionStatus.DUE;
        } else {
          newStatus = SessionStatus.MISSED;
        }

        if (newStatus !== instance.status) {
          const updated = { ...instance, status: newStatus };
          changedById.set(instance.id, updated);

          if (newStatus === SessionStatus.MISSED) {
            await logEvent({
              timestamp: new Date().toISOString(),
              eventType: EventType.MISS,
              instanceId: instance.id,
            });
          }
          await updateSessionInstance(updated);
        }
      }

      if (changedById.size === 0) return instances;
      return instances.map((i) => changedById.get(i.id) ?? i);
    },
    []
  );

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

    // Reconcile statuses against the current wall clock so callers (cold start,
    // foreground return, day-change check, focus refresh) never surface stale
    // UPCOMING labels for sessions whose grace window has already passed.
    return reconcileInstanceStatuses(instances, schedule);
  }, [reconcileInstanceStatuses]);

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

  // Listen for app state changes (foreground/background) and refresh data
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // When app comes to foreground, always refresh to sync with storage
      // This picks up any completions from other app instances (e.g., PWA vs Chrome)
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const today = format(new Date(), 'yyyy-MM-dd');
        currentDateRef.current = today;
        const instances = await loadInstancesForDate(today, userSchedule);
        setTodayInstances(instances);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadInstancesForDate, userSchedule]);

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
        // Send to service worker for background delivery, keep polling as fallback
        void scheduleAllWebNotifications(todayInstances, userSchedule);
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

  // Periodic status refresh for users who leave the app open. Cold start,
  // foreground return, and focus refresh all reconcile through
  // loadInstancesForDate, so this only catches in-session transitions.
  useEffect(() => {
    if (isLoading || !userSchedule) return;

    const tick = async () => {
      const current = todayInstancesRef.current;
      if (current.length === 0) return;
      const updated = await reconcileInstanceStatuses(current, userSchedule);
      if (updated !== current) {
        const updatedById = new Map(updated.map((i) => [i.id, i]));
        setTodayInstances((prev) => prev.map((i) => updatedById.get(i.id) ?? i));
      }
    };

    const interval = setInterval(tick, 60000);
    tick();

    return () => clearInterval(interval);
  }, [isLoading, userSchedule, reconcileInstanceStatuses]);

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

      // Don't update status here - keep the current status
      // Only log the start event
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
      if (!instance) {
        return;
      }

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
    if (todayInstances.length === 0) return undefined;

    const now = new Date();

    // Sort instances by scheduled time ascending
    const sorted = [...todayInstances].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    // Determine which session's time window we're currently in.
    // Each session owns the window from 1 hour before its scheduled time
    // up to 1 hour before the next session's scheduled time.
    // The first session's window starts at midnight; the last runs until midnight.
    // Default to the last session and walk forward until we find the right window.
    let windowIndex = sorted.length - 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const nextWindowOpen = new Date(
        new Date(sorted[i + 1].scheduledAt).getTime() - 60 * 60 * 1000
      );
      if (now < nextWindowOpen) {
        windowIndex = i;
        break;
      }
    }

    // From the active window's session onward, return the first actionable session
    for (let i = windowIndex; i < sorted.length; i++) {
      const instance = sorted[i];
      if (
        instance.status !== SessionStatus.COMPLETED &&
        instance.status !== SessionStatus.SKIPPED &&
        instance.status !== SessionStatus.MISSED
      ) {
        return instance;
      }
    }

    return undefined;
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
