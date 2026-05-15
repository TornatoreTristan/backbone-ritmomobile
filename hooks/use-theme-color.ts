import { Colors, type ColorTokenName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorTokenName,
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors[theme][colorName];
}

export function useColors() {
  const theme = useColorScheme() ?? 'light';
  return Colors[theme];
}

export function useScheme(): 'light' | 'dark' {
  return useColorScheme() ?? 'light';
}
