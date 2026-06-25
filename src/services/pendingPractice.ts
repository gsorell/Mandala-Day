// A transient, in-memory hand-off used when onboarding wants to drop the user
// straight into a practice. Completing onboarding swaps the entire navigator
// tree (the onboarding stack is replaced by the main stack), so we can't simply
// navigate across that boundary. Instead, onboarding records the intended route
// here, and the Today screen consumes it once after the main tree mounts.
//
// Deliberately not persisted: if the app is killed before the practice runs, the
// intent should evaporate rather than ambush the user on next launch.
//
// Limited to the param-less practice screens so the consumer can navigate
// without supplying route params.
export type PracticeRoute =
  | 'SimpleTimer'
  | 'Pranayama'
  | 'SquareBreathing'
  | 'Vipassana'
  | 'Vision'
  | 'DirectInquiry'
  | 'ChildrensSleep'
  | 'BodySeaVoyage'
  | 'StarryNight';

let pendingRoute: PracticeRoute | null = null;

export const setPendingPractice = (route: PracticeRoute): void => {
  pendingRoute = route;
};

export const consumePendingPractice = (): PracticeRoute | null => {
  const route = pendingRoute;
  pendingRoute = null;
  return route;
};
