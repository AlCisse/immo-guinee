import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface FallbackProps {
  error: Error | null;
  onRetry: () => void;
  errorInfo?: ErrorInfo | null;
}

/**
 * R8 — UI d'erreur de marque, réutilisée à la fois par AppErrorBoundary (erreurs
 * runtime attrapées via getDerivedStateFromError) et par l'ErrorBoundary exporté
 * pour expo-router (erreurs de rendu de route, props { error, retry }). Source
 * unique pour ne pas diverger entre les deux chemins d'erreur.
 */
export function ErrorFallback({ error, onRetry, errorInfo }: FallbackProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="warning-outline" size={64} color={Colors.error[500]} />

        <Text style={styles.title}>Oups ! Une erreur s'est produite</Text>

        <Text style={styles.message}>
          Nous sommes désolés, quelque chose s'est mal passé. Veuillez réessayer ou redémarrer
          l'application.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={20} color={Colors.text.inverse} />
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>

        {__DEV__ && error && (
          <ScrollView style={styles.errorDetails}>
            <Text style={styles.errorTitle}>Détails de l'erreur (dev):</Text>
            <Text style={styles.errorText}>{error.toString()}</Text>
            {errorInfo && (
              <Text style={styles.stackTrace}>{errorInfo.componentStack}</Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // TODO: Send to error reporting service (Sentry, etc.)
    // reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetails: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    maxHeight: 200,
    width: '100%',
  },
  errorTitle: {
    color: Colors.error[400],
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
  stackTrace: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 8,
    fontFamily: 'SpaceMono',
  },
});

export default AppErrorBoundary;