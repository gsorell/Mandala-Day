import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
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
} from '../services/storage';
import { DEFAULT_GRACE_WINDOW } from '../utils/theme';

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
        
        const { generateDailyInstances, saveDailyInstances, getDailyInstances } = await import('../services/storage');
        let instances = await getDailyInstances(today);
        
        // Check if instances' scheduledAt times are actually for today
        if (instances.length > 0) {
          const firstScheduledDate = format(new Date(instances[0].scheduledAt), 'yyyy-MM-dd');
          if (firstScheduledDate !== today) {
            // Generate fresh instances for today
            instances = generateDailyInstances(today, schedule);
            await saveDailyInstances(today, instances);
          }
        }
        
        setTodayInstances(instances);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Update session statuses based on time
  useEffect(() => {
    const updateStatuses = async () => {
      if (!userSchedule) return;

      const now = new Date();
      let hasChanges = false;

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

        // Find the previous session's scheduled time
        let previousSessionTime: Date | null = null;
        if (index > 0) {
          previousSessionTime = new Date(sortedInstances[index - 1].scheduledAt);
        }

        // UPCOMING: Before scheduled time (and after previous session if exists)
        if (now < scheduledTime) {
          if (instance.status !== SessionStatus.UPCOMING) {
            hasChanges = true;
            return { ...instance, status: SessionStatus.UPCOMING };
          }
        }
        // DUE: At or after scheduled time, before grace period ends
        else if (now >= scheduledTime && now < graceEnd) {
          if (instance.status !== SessionStatus.DUE) {
            hasChanges = true;
            return { ...instance, status: SessionStatus.DUE };
          }
        }
        // MISSED (Passed): After grace period and not completed
        else if (now >= graceEnd) {
          if (instance.status !== SessionStatus.MISSED) {
            hasChanges = true;
            logEvent({
              timestamp: new Date().toISOString(),
              eventType: EventType.MISS,
              instanceId: instance.id,
            });
          }
          return { ...instance, status: SessionStatus.MISSED };
        }
        
        return instance;
      });

      if (hasChanges) {
        setTodayInstances(updatedInstances);
        const today = format(new Date(), 'yyyy-MM-dd');
        for (const instance of updatedInstances) {
          await updateSessionInstance(instance);
        }
      }
    };

    const interval = setInterval(updateStatuses, 60000); // Check every minute
    updateStatuses(); // Run immediately

    return () => clearInterval(interval);
  }, [todayInstances, userSchedule]);

  const refreshTodayInstances = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const instances = await getDailyInstances(today);
    setTodayInstances(instances);
  }, []);

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
