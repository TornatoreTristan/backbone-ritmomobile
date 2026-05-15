import type { ViewStyle } from 'react-native';

export const MAX_CONTENT_WIDTH = 640;

export const centeredContent: ViewStyle = {
  width: '100%',
  maxWidth: MAX_CONTENT_WIDTH,
  alignSelf: 'center',
};
