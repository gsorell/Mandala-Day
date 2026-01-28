# Mandala Day App - Visual Asset Requirements

## App Description
Mandala Day is a meditation and mindfulness app featuring a golden mandala design on a deep navy background. The visual identity is elegant, spiritual, and calming.

## Brand Style
- **Primary Background Color:** #0b0817 (deep navy/near-black)
- **Accent Colors:** Gold, brass, and warm metallic tones
- **Design Style:** Ornate golden mandala with intricate geometric patterns, circular symmetry, featuring a central glowing orb surrounded by decorative flourishes, lotus-like shapes, and concentric circular borders
- **Mood:** Spiritual, luxurious, meditative, timeless

---

## Required Assets

### 1. icon.png
- **Size:** 1024×1024 pixels
- **Format:** PNG (no transparency)
- **Purpose:** iOS App Store icon and Play Store listing
- **Design Notes:**
  - The mandala can extend to the edges of the canvas
  - Full bleed design - no padding required
  - Should look good as a square with slightly rounded corners
  - Background should be solid #0b0817

### 2. adaptive-icon.png
- **Size:** 1024×1024 pixels
- **Format:** PNG with transparent or #0b0817 background
- **Purpose:** Android home screen icon (adaptive) and current splash screen
- **Design Notes:**
  - **CRITICAL:** The mandala must fit within the center 66% of the canvas (approximately 680×680 pixel area centered)
  - The outer 17% on all sides must be empty/background color only
  - Android applies various shaped masks (circle, squircle, rounded square) that will crop the outer edges
  - If any part of the mandala extends beyond the safe zone, it will be cut off on some devices

### 3. favicon.png
- **Size:** 48×48 pixels
- **Format:** PNG (transparency optional)
- **Purpose:** Web browser tab icon
- **Design Notes:**
  - Extremely small - needs to be recognizable at tiny size
  - Consider using only the central golden orb/sphere element
  - Or a highly simplified mandala silhouette
  - Fine details will not be visible - prioritize shape recognition

### 4. splash.png (Optional but Recommended)
- **Size:** 1284×2778 pixels (portrait orientation)
- **Format:** PNG
- **Purpose:** High-quality splash/loading screen shown when app launches
- **Design Notes:**
  - Full screen portrait image
  - Background: solid #0b0817
  - Mandala centered vertically and horizontally
  - Mandala should be approximately 800-1000px wide
  - Generous padding around the mandala
  - This is the first thing users see - should feel premium and polished

---

## Current Mandala Reference
The existing mandala design features:
- A central glowing golden sphere/orb
- Concentric circular borders with intricate golden filigree
- Four-fold symmetry with lotus petal shapes at cardinal points
- Square geometric frame rotated 45° within the circle
- Ornate scrollwork and floral patterns throughout
- Deep navy (#0b0817) background with golden/brass metallic elements

---

## File Delivery
Please provide all assets as separate PNG files with the exact filenames listed above. All files should be placed in the `/assets` folder of the project.
