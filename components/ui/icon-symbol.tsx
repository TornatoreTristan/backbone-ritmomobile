// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<
  Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * `satisfies` (et non `as`) : `IconSymbolName` se limite aux icônes réellement
 * mappées, donc un nom oublié ici est une erreur de compilation au lieu d'une
 * icône vide sur Android.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  calendar: 'calendar-today',
  'folder.fill': 'folder',
  'wrench.fill': 'build',
  'doc.text.fill': 'description',
  'person.2.fill': 'group',
  headphones: 'headset',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  magnifyingglass: 'search',
  'location.fill': 'navigation',
  'phone.fill': 'phone',
  sparkles: 'auto-awesome',
  'arrow.up': 'arrow-upward',
  'stop.fill': 'stop',
  trash: 'delete-outline',
  'square.and.pencil': 'edit-square',
  'clock.arrow.circlepath': 'history',
  'hand.thumbsup': 'thumb-up-off-alt',
  'hand.thumbsup.fill': 'thumb-up',
  'hand.thumbsdown': 'thumb-down-off-alt',
  'hand.thumbsdown.fill': 'thumb-down',
} as const satisfies IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
