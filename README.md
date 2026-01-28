# Mandala-Day
A daily mandala of six guided meditations. Short, precise practices that orient awareness, ground the body, open the heart.

## Testing Android Notifications

**IMPORTANT**: Notification sounds do NOT work in debug builds when the phone is locked.

### Why Debug Builds Fail
- Debug builds load assets from Metro dev server (localhost:8081)
- When the phone is locked/sleeping, the Android notification system cannot access Metro
- Notifications fire correctly but sound files fail to load
- Result: Only vibration, no sound

### How to Test Notification Sounds
Always use **release builds** to test notification sounds:

```powershell
# Build and install release APK
cd android
.\gradlew.bat assembleRelease
.\gradlew.bat installRelease
cd ..
```

### What Works in Release Builds
- All assets are embedded in the APK
- Notification system can access raw resources directly
- Sounds play correctly even when phone is locked
- No Metro dev server required
