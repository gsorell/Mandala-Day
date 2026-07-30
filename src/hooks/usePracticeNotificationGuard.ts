import { useEffect } from 'react';
import { clearNotificationsForPractice } from '../services/notifications';

/**
 * Keeps session reminders from landing on someone who is already sitting.
 *
 * Call this from any practice screen, passing its playing state and length in
 * minutes. The moment playback starts, any session reminder due to fire before the
 * practice ends is settled: the one for this very session is cancelled, the rest are
 * deferred.
 *
 * It has to happen at *start*, not at delivery, because the notification handler in
 * `notifications.ts` only runs while the app is foregrounded — and sitting with the
 * screen dark is the normal case. Deciding up front is what makes the guard survive
 * the screen going off.
 *
 * `instanceId` applies only to the six scheduled sessions (SessionPlayer). Extras
 * omit it, which simply means none of the pending reminders is treated as "the one
 * for this practice" — they all get deferred.
 */
export const usePracticeNotificationGuard = (
  isPlaying: boolean,
  durationMin: number,
  instanceId?: string
): void => {
  useEffect(() => {
    if (!isPlaying) return;
    void clearNotificationsForPractice(durationMin, instanceId);
  }, [isPlaying, durationMin, instanceId]);
};
