// Session status enum
export enum SessionStatus {
  UPCOMING = 'UPCOMING',
  DUE = 'DUE',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  MISSED = 'MISSED',
}

// Practice types for categorization
export enum PracticeType {
  SHAMATHA = 'SHAMATHA',
  BODY_AWARENESS = 'BODY_AWARENESS',
  COMPASSION = 'COMPASSION',
  DIRECT_AWARENESS = 'DIRECT_AWARENESS',
  MOVEMENT = 'MOVEMENT',
  DISSOLUTION = 'DISSOLUTION',
}

// Event types for logging
export enum EventType {
  START = 'START',
  COMPLETE = 'COMPLETE',
  SKIP = 'SKIP',
  SNOOZE = 'SNOOZE',
  MISS = 'MISS',
}

// Session template - the canonical practice definition
export interface SessionTemplate {
  id: string;
  order: number;
  title: string;
  practiceType: PracticeType;
  defaultTime: string; // "HH:mm" format
  shortPrompt: string;
  durationSec: number;
  scriptText: string;
  tags: string[];
  dedication?: string;
  shareMessage?: string; // Custom message for sharing after completion
  audioFile?: number; // require() asset for pre-recorded audio (replaces TTS)
}

// User's schedule preferences
export interface UserSchedule {
  sessionTimes: Record<string, string>; // sessionId -> "HH:mm"
  enabledSessions: Record<string, boolean>;
  quietHours: {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
    enabled: boolean;
  };
  snoozeOptionsMin: number[];
  graceWindowMin: number;
}

// A specific instance of a session for a given day
export interface DailySessionInstance {
  id: string; // "YYYY-MM-DD_sessionId"
  date: string; // "YYYY-MM-DD"
  templateId: string;
  scheduledAt: string; // ISO datetime
  status: SessionStatus;
  startedAt?: string; // ISO datetime
  endedAt?: string; // ISO datetime
  snoozeCount: number;
}

// Event log entry for analytics
export interface EventLog {
  id: string;
  timestamp: string; // ISO datetime
  eventType: EventType;
  instanceId: string;
  metadata?: Record<string, unknown>;
}

// App settings
export interface AppSettings {
  hasCompletedOnboarding: boolean;
  notificationsEnabled: boolean;
  weekendScheduleEnabled: boolean;
  weekendSchedule?: Partial<UserSchedule>;
}

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  SessionPlayer: { instanceId: string };
  SessionComplete: { instanceId: string; sessionTitle: string; dedication?: string; shareMessage?: string; completedAt?: string };
  MandalaComplete: { date: string };
  Settings: undefined;
  ScheduleSettings: undefined;
  History: undefined;
  SimpleTimer: undefined;
  TheView: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  History: undefined;
  Settings: undefined;
};
