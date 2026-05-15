import * as Sentry from '@sentry/react-native';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ThemedView style={styles.container}>
        <View style={styles.inner}>
          <ThemedText type="h2" style={styles.title}>
            Une erreur est survenue
          </ThemedText>
          <ThemedText type="muted" style={styles.body}>
            L&apos;application a rencontré un problème inattendu. Vous pouvez réessayer.
          </ThemedText>
          <Button onPress={this.reset} full>
            Réessayer
          </Button>
        </View>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inner: {
    width: '100%',
    maxWidth: 360,
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
});
