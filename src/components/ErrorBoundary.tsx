import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  /** When true, renders a compact inline error instead of full-screen */
  inline?: boolean;
  /** Label shown on the error screen so you know which screen crashed */
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log — this will appear in EAS / Metro logs
    console.error(`[ErrorBoundary${this.props.screenName ? `:${this.props.screenName}` : ''}] Caught:`, error.message);
    console.error('[ErrorBoundary] Stack:', error.stack);
    console.error('[ErrorBoundary] Component Stack:', info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.inline) {
      return (
        <View style={styles.inline}>
          <Feather name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.inlineText}>Failed to load. </Text>
          <TouchableOpacity onPress={this.handleRestart}>
            <Text style={styles.inlineRetry}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Feather name="alert-triangle" size={52} color="#EF4444" />
        <Text style={styles.title}>Something went wrong</Text>
        {this.props.screenName && (
          <Text style={styles.screenName}>Screen: {this.props.screenName}</Text>
        )}
        <Text style={styles.subtitle}>
          The app ran into an unexpected error. Your data is safe.
        </Text>
        {__DEV__ && this.state.error && (
          <ScrollView style={styles.devBox} contentContainerStyle={{ padding: 12 }}>
            <Text style={styles.devText}>{this.state.error.message}</Text>
            <Text style={styles.devStack}>{this.state.error.stack}</Text>
          </ScrollView>
        )}
        <TouchableOpacity style={styles.btn} onPress={this.handleRestart}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginTop: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  screenName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  devBox: {
    maxHeight: 200,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  devText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 8,
  },
  devStack: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  btn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    margin: 16,
  },
  inlineText: {
    fontSize: 13,
    color: '#DC2626',
    marginLeft: 8,
  },
  inlineRetry: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
