import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

function reportFailure(message: string) {
  Alert.alert('Ouverture impossible', message);
}

/** Ouvre un lien externe (mailto:, tel:, https:) sans laisser de promesse rejetée. */
export function openExternalUrl(url: string): void {
  Linking.openURL(url).catch(() => {
    reportFailure("Aucune application n'est disponible pour ouvrir ce lien sur cet appareil.");
  });
}

/** Ouvre un document (URL signée) dans le navigateur intégré. */
export function openDocumentUrl(url: string): void {
  WebBrowser.openBrowserAsync(url).catch(() => {
    reportFailure("Le document n'a pas pu être ouvert. Réessayez dans un instant.");
  });
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
