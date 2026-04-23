const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Disables per-density splits in the Android App Bundle so every device gets
 * every drawable-* folder. Metro only emits require()'d JS image assets into
 * drawable-mdpi, and Play's default density splitting strips mdpi from higher-
 * density splits — which made mandala-logo.png / mandala-icon-display.png
 * render blank on some Pixels (e.g. Pixel 9 got xxhdpi split with no mdpi
 * fallback). Costs ~2 MB per install.
 */
const withAndroidBundleDensity = (config) => {
  return withAppBuildGradle(config, (config) => {
    const marker = 'density { enableSplit = false }';
    if (config.modResults.contents.includes(marker)) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /(androidResources \{[^}]*\})/,
      `$1\n    bundle {\n        ${marker}\n    }`
    );
    return config;
  });
};

module.exports = withAndroidBundleDensity;
