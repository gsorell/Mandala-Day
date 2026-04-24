// Headless playback service for react-native-track-player.
// Runs in a separate JS context from the main app — only wires lock-screen /
// Control Center remote commands so they work even when the main context is
// frozen. UI-sync handlers live in audio.ts on the main context.
const TrackPlayer = require('react-native-track-player').default;
const { Event } = require('react-native-track-player');

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
};
