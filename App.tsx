import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { RootStackParamList, MainTabParamList } from './src/types';
import { colors, typography, spacing, borderRadius } from './src/utils/theme';
import {
  areNotificationsAvailable,
  scheduleAllSessionNotifications,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from './src/services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

const CustomTabBar: React.FC<any> = ({ state, descriptors, navigation, navigationRef }) => {
  const { getNextDueSession } = useApp();
  const nextSession = getNextDueSession();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (navigationRef) {
      navigationRef.current = navigation;
    }
  }, [navigation, navigationRef]);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {nextSession && (
        <TouchableOpacity
          style={styles.nextSessionButtonFooter}
          onPress={() => navigation.navigate('SessionPlayer', { instanceId: nextSession.id })}
        >
          <Text style={styles.nextSessionLabelFooter}>Start Next Session</Text>
        </TouchableOpacity>
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
  const iconName = label === 'Today' ? 'today' : label === 'History' ? 'time' : 'settings-sharp';
  
  return (
    <Ionicons 
      name={iconName as any} 
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

  // Set up notifications (only on native platforms)
  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip notifications on web

    const setupNotifications = async () => {
      console.log('Setting up notifications...');
      console.log('appSettings.notificationsEnabled:', appSettings?.notificationsEnabled);
      console.log('todayInstances.length:', todayInstances.length);
      console.log('userSchedule exists:', !!userSchedule);
      
      const available = await areNotificationsAvailable();
      console.log('Notifications available:', available);
      
      if (available && appSettings?.notificationsEnabled && userSchedule && todayInstances.length > 0) {
        console.log('All conditions met, scheduling notifications...');
        await scheduleAllSessionNotifications(todayInstances, userSchedule);
        
        // Log pending notifications for debugging
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        console.log('Pending notifications count:', pending.length);
      } else {
        console.log('Notification conditions not met');
      }
    };

    setupNotifications();
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
                animation: 'fade',
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
    <AppProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AppProvider>
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
  nextSessionButtonFooter: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  nextSessionLabelFooter: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    paddingTop: 8,
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
