import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  size?: number;
  showSingleCheck?: boolean; // For sent status, show single check instead of clock
}

export function MessageStatusIndicator({
  status,
  size = 16,
  showSingleCheck = true,
}: MessageStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <Ionicons
            name="time-outline"
            size={size}
            color="#9CA3AF"
          />
        );
      case 'sent':
        return showSingleCheck ? (
          <Ionicons
            name="checkmark"
            size={size}
            color="#9CA3AF"
          />
        ) : (
          <Ionicons
            name="time-outline"
            size={size}
            color="#9CA3AF"
          />
        );
      case 'delivered':
        return (
          <View style={styles.doubleCheck}>
            <Ionicons
              name="checkmark"
              size={size}
              color="#9CA3AF"
              style={styles.checkFirst}
            />
            <Ionicons
              name="checkmark"
              size={size}
              color="#9CA3AF"
              style={styles.checkSecond}
            />
          </View>
        );
      case 'read':
        return (
          <View style={styles.doubleCheck}>
            <Ionicons
              name="checkmark"
              size={size}
              color="#3B82F6"
              style={styles.checkFirst}
            />
            <Ionicons
              name="checkmark"
              size={size}
              color="#3B82F6"
              style={styles.checkSecond}
            />
          </View>
        );
      case 'failed':
        return (
          <Ionicons
            name="alert-circle"
            size={size}
            color="#EF4444"
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {getStatusIcon()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkFirst: {
    marginRight: -8,
  },
  checkSecond: {
    marginLeft: 0,
  },
});

export default MessageStatusIndicator;
