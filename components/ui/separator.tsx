import { useColors } from '@/hooks/use-theme-color';
import { StyleSheet, View, type ViewProps } from 'react-native';

export interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ orientation = 'horizontal', style, ...rest }: SeparatorProps) {
  const colors = useColors();
  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        { backgroundColor: colors.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  vertical: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
