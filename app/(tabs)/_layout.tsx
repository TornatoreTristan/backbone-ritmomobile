import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useMobotStatus } from '@/hooks/use-mobot-status';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { currentOrganization, isTechnician, isStaff, isPartner } = useOrganization();
  // Même condition que `OrganizationGate` : un compte sans rôle `partner` ne voit
  // pas d'onglets qui lui répondraient « non disponible pour votre profil ».
  const isPartnerLike = isPartner && !isTechnician && !isStaff;
  const canAskMobot = isTechnician || isStaff;
  const mobotStatus = useMobotStatus(canAskMobot);
  const canUseMobot = canAskMobot && Boolean(mobotStatus);

  // Masquer un onglet (`href: null`) ne quitte pas l'écran déjà affiché : après un
  // changement d'organisation ou de rôle, on ramène l'utilisateur à l'accueil.
  const router = useRouter();
  const segments = useSegments() as string[];
  const section = segments[0] === '(tabs)' ? segments[1] : undefined;
  const isDetail = segments[0] === '(tabs)' && segments.length > 2 && segments[2] !== 'index';
  const organizationId = currentOrganization?.id ?? null;
  const previousOrganizationId = useRef(organizationId);
  const organizationChangedRef = useRef(false);
  const isMobotResolved = mobotStatus !== undefined;
  const inTabs = segments[0] === '(tabs)';

  useEffect(() => {
    if (previousOrganizationId.current !== null && previousOrganizationId.current !== organizationId) {
      organizationChangedRef.current = true;
    }
    previousOrganizationId.current = organizationId;
    // Le changement se fait depuis une modale : on attend le retour dans les
    // onglets pour juger l'écran réellement affiché.
    if (!organizationId || !inTabs) return;
    const organizationChanged = organizationChangedRef.current;
    organizationChangedRef.current = false;
    if (!section) return;

    const technicianOnly = section === 'planning' || section === 'interventions';
    const partnerOnly = section === 'invoices' || section === 'networks' || section === 'advisor';
    const forbidden =
      (technicianOnly && !isTechnician) ||
      (partnerOnly && !isPartnerLike) ||
      (section === 'assistant' && isMobotResolved && !canUseMobot);
    // Une fiche (dossier, intervention) appartient à l'organisation précédente.
    const staleDetail = organizationChanged && (section === 'folders' || isDetail);

    if (forbidden || staleDetail) router.replace('/');
  }, [
    organizationId,
    inTabs,
    section,
    isDetail,
    isTechnician,
    isPartnerLike,
    canUseMobot,
    isMobotResolved,
    router,
  ]);

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
        name="assistant"
        options={{
          title: 'Mobot',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="sparkles" color={color} />,
          href: canUseMobot ? '/assistant' : null,
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
