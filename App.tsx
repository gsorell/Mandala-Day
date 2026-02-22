import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/context/AppContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { SessionPlayerScreen } from './src/screens/SessionPlayerScreen';
import { SessionCompleteScreen } from './src/screens/SessionCompleteScreen';
import { MandalaCompleteScreen } from './src/screens/MandalaCompleteScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ScheduleSettingsScreen } from './src/screens/ScheduleSettingsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SimpleTimerScreen } from './src/screens/SimpleTimerScreen';
import { TheViewScreen } from './src/screens/TheViewScreen';
import { VipassanaScreen } from './src/screens/VipassanaScreen';
import { ChildrensSleepScreen } from './src/screens/ChildrensSleepScreen';
import { BodySeaVoyageScreen } from './src/screens/BodySeaVoyageScreen';
import { StarryNightScreen } from './src/screens/StarryNightScreen';
import { RootStackParamList, MainTabParamList } from './src/types';
import { colors, typography, spacing } from './src/utils/theme';
import { getSessionById } from './src/data/sessions';
import {
  areNotificationsAvailable,
  scheduleAllSessionNotifications,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from './src/services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

const BeginPracticeButton: React.FC<{ onPress: () => void; sessionTitle?: string }> = ({ onPress, sessionTitle }) => {
  return (
    <View style={styles.beginButtonPressable}>
      <TouchableOpacity style={styles.beginButtonPill} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.beginButtonText}>{sessionTitle ?? 'Begin Practice'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const CustomTabBar: React.FC<any> = ({ state, descriptors, navigation, navigationRef }) => {
  const { getNextDueSession } = useApp();
  const nextSession = getNextDueSession();
  const sessionTemplate = nextSession ? getSessionById(nextSession.templateId) : undefined;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (navigationRef) {
      navigationRef.current = navigation;
    }
  }, [navigation, navigationRef]);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {nextSession && (
        <BeginPracticeButton
          onPress={() => navigation.navigate('SessionPlayer', { instanceId: nextSession.id })}
          sessionTitle={sessionTemplate?.title}
        />
      )}
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabBarItemCustom}
            >
              <TabIcon label={label} focused={isFocused} />
              <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textTertiary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => {
  const iconSize = 24;
  const color = focused ? colors.primary : colors.textTertiary;
  
  // Use Ionicons instead of Unicode characters for consistent sizing
  let iconName: keyof typeof Ionicons.glyphMap = 'radio-button-on';
  if (label === 'History') {
    iconName = 'calendar-outline';
  } else if (label === 'Settings') {
    iconName = 'settings-sharp';
  }
  
  return (
    <Ionicons 
      name={iconName} 
      size={iconSize} 
      color={color}
    />
  );
};

const MainTabs: React.FC = () => {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.current) {
        const state = navigationRef.current.getState();
        const currentRoute = state.routes[state.index].name;
        
        if (currentRoute === 'History' || currentRoute === 'Settings') {
          navigationRef.current.navigate('Today');
          return true;
        }
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} navigationRef={navigationRef} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
      }}
      tabBarPosition="bottom"
      initialRouteName="Today"
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Today" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="History" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { appSettings, isLoading, todayInstances, userSchedule } = useApp();
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);

  // Notification scheduling state to prevent race conditions and duplicates
  const schedulingLock = useRef<boolean>(false);
  const schedulingVersion = useRef<number>(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScheduledHash = useRef<string>('');

  // Set up notifications (only on native platforms)
  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip notifications on web

    // Clear any pending debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce scheduling to batch rapid state changes (e.g., during app startup)
    debounceTimer.current = setTimeout(async () => {
      // Increment version to track this scheduling attempt
      const currentVersion = ++schedulingVersion.current;

      console.log(`[Notifications v${currentVersion}] Setting up notifications...`);
      console.log(`[Notifications v${currentVersion}] appSettings.notificationsEnabled:`, appSettings?.notificationsEnabled);
      console.log(`[Notifications v${currentVersion}] todayInstances.length:`, todayInstances.length);
      console.log(`[Notifications v${currentVersion}] userSchedule exists:`, !!userSchedule);

      // Check if all conditions are met
      if (!appSettings?.notificationsEnabled || !userSchedule || todayInstances.length === 0) {
        console.log(`[Notifications v${currentVersion}] Conditions not met, skipping`);
        return;
      }

      // Create a hash of the notification-relevant data to detect actual changes
      // Only include scheduledAt times and enabled status - ignore status changes like COMPLETED
      const instancesHash = todayInstances
        .filter(i => userSchedule.enabledSessions[i.templateId] !== false)
        .map(i => `${i.templateId}:${i.scheduledAt}`)
        .sort()
        .join('|');
      const scheduleHash = `${instancesHash}::${JSON.stringify(userSchedule.quietHours)}`;

      // Skip if nothing has actually changed
      if (scheduleHash === lastScheduledHash.current) {
        console.log(`[Notifications v${currentVersion}] Schedule unchanged, skipping re-schedule`);
        return;
      }

      // Check if another scheduling operation is in progress
      if (schedulingLock.current) {
        console.log(`[Notifications v${currentVersion}] Scheduling already in progress, will retry`);
        // Schedule a retry after a short delay
        debounceTimer.current = setTimeout(() => {
          // Force a re-trigger by invalidating the hash
          lastScheduledHash.current = '';
        }, 500);
        return;
      }

      const available = await areNotificationsAvailable();
      console.log(`[Notifications v${currentVersion}] Notifications available:`, available);

      if (!available) {
        console.log(`[Notifications v${currentVersion}] Notifications not available`);
        return;
      }

      // Check if this version is still current (no newer scheduling attempt started)
      if (currentVersion !== schedulingVersion.current) {
        console.log(`[Notifications v${currentVersion}] Outdated version, aborting (current: ${schedulingVersion.current})`);
        return;
      }

      // Acquire lock
      schedulingLock.current = true;

      try {
        console.log(`[Notifications v${currentVersion}] All conditions met, scheduling notifications...`);
        await scheduleAllSessionNotifications(todayInstances, userSchedule);

        // Update the hash only after successful scheduling
        lastScheduledHash.current = scheduleHash;

        // Log pending notifications for debugging
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`[Notifications v${currentVersion}] Pending notifications count:`, pending.length);
      } catch (error) {
        console.error(`[Notifications v${currentVersion}] Error scheduling:`, error);
      } finally {
        // Release lock
        schedulingLock.current = false;
      }
    }, 300); // 300ms debounce to batch rapid changes

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [appSettings?.notificationsEnabled, todayInstances, userSchedule]);

  // Handle notification responses (only on native platforms)
  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip notifications on web

    notificationListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as { instanceId?: string };
      if (data.instanceId && navigationRef.current) {
        navigationRef.current.navigate('SessionPlayer', { instanceId: data.instanceId });
      }
    });

    return () => {
      if (notificationListener.current) {
        removeNotificationSubscription(notificationListener.current);
      }
    };
  }, []);

  // Handle hardware back button for stack screens
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigationRef.current) return false;

      const state = navigationRef.current.getRootState();
      if (!state) return false;

      const currentRoute = state.routes[state.index];

      // If we're on a stack screen (not Main), go back
      if (currentRoute.name !== 'Main' && currentRoute.name !== 'Onboarding') {
        navigationRef.current.goBack();
        return true;
      }

      return false; // Let the tab navigator handle it
    });

    return () => backHandler.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing your mandala...</Text>
      </View>
    );
  }

  const showOnboarding = !appSettings?.hasCompletedOnboarding;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {showOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="SessionPlayer"
              component={SessionPlayerScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="ScheduleSettings"
              component={ScheduleSettingsScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="SimpleTimer"
              component={SimpleTimerScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="TheView"
              component={TheViewScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="Vipassana"
              component={VipassanaScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="ChildrensSleep"
              component={ChildrensSleepScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="BodySeaVoyage"
              component={BodySeaVoyageScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="StarryNight"
              component={StarryNightScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="SessionComplete"
              component={SessionCompleteScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="MandalaComplete"
              component={MandalaCompleteScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.md,
  },
  tabBarContainer: {
    backgroundColor: colors.ritualSurface,
    borderTopColor: colors.charcoal,
    borderTopWidth: 1,
  },
  beginButtonPressable: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  beginButtonPill: {
    backgroundColor: colors.agedBrass,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.fontWeights.medium as any,
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    height: 78,
    paddingTop: 12,
    paddingBottom: 15,
    backgroundColor: colors.ritualSurface,
  },
  tabBarItemCustom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5,
  },
  tabLabel: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
    marginBottom: 0,
  },
  tabIcon: {
    fontSize: 22,
  },
});
