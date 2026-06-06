import { useColors } from '@/hooks/use-theme-color';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type DockKey = 'infos' | 'activites' | 'mail' | 'historique';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ITEMS: { key: DockKey; icon: IoniconName; label: string }[] = [
  { key: 'infos', icon: 'home', label: 'Informations' },
  { key: 'activites', icon: 'reader-outline', label: 'Activités' },
  { key: 'mail', icon: 'mail-outline', label: 'Mail' },
  { key: 'historique', icon: 'time-outline', label: 'Historique' },
];

/**
 * Dock flottant du contexte dossier (staff) : Informations / Activités / Mail /
 * Historique. Rendu sur la page dossier et l'écran de fil, il reste visible en
 * permanence — l'item actif est mis en avant dans un cercle clair.
 */
export function FolderDock({
  active,
  onSelect,
}: {
  active: DockKey;
  onSelect: (key: DockKey) => void;
}) {
  const colors = useColors();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: colors.foreground }]}>
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              style={styles.item}>
              <View style={[styles.iconWrap, isActive && { backgroundColor: colors.background }]}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={isActive ? colors.foreground : colors.background}
                  style={isActive ? undefined : styles.inactiveIcon}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  item: {
    padding: 2,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIcon: {
    opacity: 0.65,
  },
});
