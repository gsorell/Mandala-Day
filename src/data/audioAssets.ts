import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

// Audio files for meditation sessions
// Using require for bundling, then resolving to URI for playback

const audioRequires: Record<string, number> = {
  session1_waking_view: require('../../assets/audio/waking-the-view.mp3'),
  session2_embodying_presence: require('../../assets/audio/embodying-presence.mp3'),
  session3_compassion_activation: require('../../assets/audio/compassion-activation.mp3'),
  session4_cutting_through: require('../../assets/audio/cutting-through.mp3'),
  session5_integration_motion: require('../../assets/audio/integration-motion.mp3'),
  session6_dissolution_rest: require('../../assets/audio/dissolution-rest.mp3'),
  gong: require('../../assets/audio/gong.mp3'),
};

// Helper to get audio file for a session
// Returns the require() result which expo-av can use
export const getSessionAudioFile = (sessionId: string): number | undefined => {
  return audioRequires[sessionId];
};

// For web, we need to resolve the asset URI
export const getSessionAudioUri = async (sessionId: string): Promise<string | undefined> => {
  const audioRequire = audioRequires[sessionId];
  if (!audioRequire) return undefined;

  if (Platform.OS === 'web') {
    // On web, Asset.fromModule returns an object with a uri
    const asset = Asset.fromModule(audioRequire);
    await asset.downloadAsync();
    return asset.uri;
  }

  // On native, we can use the require directly
  return undefined;
};

// Get the gong sound effect
export const getGongSound = (): number => {
  return audioRequires.gong;
};

export const getGongUri = async (): Promise<string | undefined> => {
  const gongRequire = audioRequires.gong;
  if (Platform.OS === 'web') {
    const asset = Asset.fromModule(gongRequire);
    await asset.downloadAsync();
    return asset.uri;
  }
  return undefined;
};
