// Headless playback service for react-native-track-player.
// Wires the lock-screen / Control Center remote commands straight to the
// player, so they work even when the app's UI is not running. These calls
// deliberately bypass AudioService — the app learns what happened from the
// Event.PlaybackState listener in audio.ts, which treats the native player as
// the source of truth for play/pause. Don't add UI or app-state logic here.
const TrackPlayer = require('react-native-track-player').default;
const { Event } = require('react-native-track-player');

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
};
