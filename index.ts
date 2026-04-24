import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Register the track-player headless service before the root component so the
// OS can bind lock-screen / Control Center commands to our playback. Web uses
// MediaSession via the existing expo-av path — skip on web.
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TrackPlayer = require('react-native-track-player').default;
  TrackPlayer.registerPlaybackService(() => require('./src/services/playback-service'));
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
