// Audio files for meditation sessions
// Add new audio files here as you upload them

export const sessionAudioFiles: Record<string, number> = {
  session1_waking_view: require('../../assets/audio/waking-the-view.mp3'),
  session2_embodying_presence: require('../../assets/audio/embodying-presence.mp3'),
  session3_compassion_activation: require('../../assets/audio/compassion-activation.mp3'),
  session4_cutting_through: require('../../assets/audio/cutting-through.mp3'),
  session5_integration_motion: require('../../assets/audio/integration-motion.mp3'),
  session6_dissolution_rest: require('../../assets/audio/dissolution-rest.mp3'),
};

// Helper to get audio file for a session
export const getSessionAudioFile = (sessionId: string): number | undefined => {
  return sessionAudioFiles[sessionId];
};
