const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to add foregroundServiceType to RNBackgroundActionsTask service
 * Required for Android 14+ (SDK 34+)
 */
const withBackgroundActionsService = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Find or create the service entry for RNBackgroundActionsTask
    if (!application.service) {
      application.service = [];
    }

    // Check if the service already exists
    const existingService = application.service.find(
      (s) => s.$['android:name'] === 'com.asterinet.react.bgactions.RNBackgroundActionsTask'
    );

    if (existingService) {
      // Update existing service
      existingService.$['android:foregroundServiceType'] = 'mediaPlayback';
    } else {
      // Add new service entry
      application.service.push({
        $: {
          'android:name': 'com.asterinet.react.bgactions.RNBackgroundActionsTask',
          'android:foregroundServiceType': 'mediaPlayback',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
};

module.exports = withBackgroundActionsService;
