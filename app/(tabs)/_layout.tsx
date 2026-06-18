import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { isTechnician, isStaff } = useOrganization();
  const isPartnerLike = !isTechnician && !isStaff;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: palette.primary,
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
          title: isTechnician ? 'Aujourd’hui' : 'Dossiers',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name={isTechnician ? 'calendar' : 'folder.fill'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="interventions/index"
        options={{
          title: 'Interventions',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="wrench.fill" color={color} />,
          href: isTechnician ? '/interventions' : null,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
          href: isTechnician ? '/planning' : null,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Factures',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="doc.text.fill" color={color} />,
          href: isPartnerLike ? '/invoices' : null,
        }}
      />
      <Tabs.Screen
        name="networks"
        options={{
          title: 'Réseaux',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} />,
          href: isPartnerLike ? '/networks' : null,
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: 'Conseiller',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="headphones" color={color} />,
          href: isPartnerLike ? '/advisor' : null,
        }}
      />
      <Tabs.Screen
        name="folders/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="folders/activities"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="interventions/[id]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
