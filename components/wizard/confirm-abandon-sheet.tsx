import { Alert } from 'react-native';

export function showAbandonConfirm(onConfirm: () => void) {
  Alert.alert(
    'Abandonner le devis ?',
    'Vos saisies seront perdues.',
    [
      {
        text: 'Continuer le devis',
        style: 'cancel',
      },
      {
        text: 'Abandonner',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true },
  );
}
