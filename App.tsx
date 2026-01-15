import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AppProvider, useApp } from './src/context/AppContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { SessionPlayerScreen } from './src/screens/SessionPlayerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ScheduleSettingsScreen } from './src/screens/ScheduleSettingsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RootStackParamList, MainTabParamList } from './src/types';
import { colors, typography, spacing } from './src/utils/theme';
import {
  areNotificationsAvailable,
  scheduleAllSessionNotifications,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from './src/services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => (
  <Text
    style={[
      styles.tabIcon,
      { color: focused ? colors.primary : colors.textMuted },
    ]}
  >
    {label === 'Today' ? '◉' : label === 'History' ? '◷' : '⚙'}
  </Text>
);

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
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
      const available = await areNotificationsAvailable();
      if (available && appSettings?.notificationsEnabled && userSchedule && todayInstances.length > 0) {
        await scheduleAllSessionNotifications(todayInstances, userSchedule);
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
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: typography.fontSizes.xs,
  },
  tabIcon: {
    fontSize: 24,
  },
});
