import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { Colors } from './constants/colors';
import { api } from './lib/api';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import LibraryScreen from './screens/LibraryScreen';
import StudioScreen from './screens/StudioScreen';
import CopilotScreen from './screens/CopilotScreen';
import CampaignsScreen from './screens/CampaignsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <Text style={styles.logoText}>NeonAd AI</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={setUser} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background, borderBottomColor: Colors.border, borderBottomWidth: 1 },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            paddingBottom: 6,
            paddingTop: 6,
            height: 62,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.tabInactive,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          options={{ title: 'الرئيسية', tabBarLabel: 'الرئيسية', tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }}
        >
          {() => <DashboardScreen user={user} />}
        </Tab.Screen>

        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: 'المكتبة', tabBarLabel: 'المكتبة', tabBarIcon: ({ color }) => <TabIcon icon="🎨" color={color} /> }}
        />

        <Tab.Screen
          name="Studio"
          component={StudioScreen}
          options={{ title: 'الاستوديو', tabBarLabel: 'الاستوديو', tabBarIcon: ({ color }) => <TabIcon icon="✨" color={color} /> }}
        />

        <Tab.Screen
          name="Copilot"
          component={CopilotScreen}
          options={{ title: 'المساعد الذكي', tabBarLabel: 'المساعد', tabBarIcon: ({ color }) => <TabIcon icon="🤖" color={color} /> }}
        />

        <Tab.Screen
          name="Campaigns"
          component={CampaignsScreen}
          options={{ title: 'الحملات', tabBarLabel: 'الحملات', tabBarIcon: ({ color }) => <TabIcon icon="📱" color={color} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === Colors.primary ? 1 : 0.5 }}>{icon}</Text>;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 36 },
  logoText: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
});
