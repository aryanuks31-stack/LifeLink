import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#e74c3c',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: { height: 62, paddingBottom: 6 },
          tabBarLabelStyle: { fontSize: 12 },
          tabBarIcon: ({ color, size }) => {
            let name: React.ComponentProps<typeof Ionicons>['name'] = 'ellipse';

            // route.name matches the filename (without extension)
            switch (route.name) {
              case 'index':
                name = 'home-outline';
                break;
              case 'sos':
                name = 'warning-outline';
                break;
              case 'beds':
                name = 'medkit-outline';
                break;
              case 'medicines':
                name = 'medkit-outline';
                break;
              default:
                name = 'ellipse-outline';
            }

            return <Ionicons name={name} size={size} color={color} />;
          },
        })}
      >
        {/* Explicit entries help with ordering and custom titles */}
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="sos" options={{ title: 'SOS' }} />
        <Tabs.Screen name="beds" options={{ title: 'Hospitals' }} />
        <Tabs.Screen name="medicines" options={{ title: 'Medicines' }} />
        {/* Detail route — hidden from the tab bar, reachable via navigation */}
        <Tabs.Screen name="hospital-detail" options={{ href: null }} />
      </Tabs>
    </SafeAreaProvider>
  );
}
