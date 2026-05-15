import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: palette.foreground,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dossiers',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Factures',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="networks"
        options={{
          title: 'Réseaux',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: 'Conseiller',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="headphones" color={color} />,
        }}
      />
      <Tabs.Screen
        name="folders/[id]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
