import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface ReplyPreviewProps {
  senderName: string;
  messagePreview: string;
  messageType: 'TEXT' | 'VOCAL' | 'PHOTO';
  onClear?: () => void;
  isInline?: boolean; // For showing in message bubble
  isSelf?: boolean; // If the replied message was from current user
}

export function ReplyPreview({
  senderName,
  messagePreview,
  messageType,
  onClear,
  isInline = false,
  isSelf = false,
}: ReplyPreviewProps) {
  const getMessageTypeIcon = () => {
    switch (messageType) {
      case 'VOCAL':
        return <Ionicons name="mic" size={14} color={Colors.neutral[500]} />;
      case 'PHOTO':
        return <Ionicons name="image" size={14} color={Colors.neutral[500]} />;
      default:
        return null;
    }
  };

  const getPreviewText = () => {
    switch (messageType) {
      case 'VOCAL':
        return 'Message vocal';
      case 'PHOTO':
        return 'Photo';
      default:
        return messagePreview || 'Message';
    }
  };

  if (isInline) {
    return (
      <View style={[styles.inlineContainer, isSelf && styles.inlineSelf]}>
        <View style={[styles.inlineBar, isSelf && styles.inlineBarSelf]} />
        <View style={styles.inlineContent}>
          <Text style={[styles.inlineSender, isSelf && styles.inlineSenderSelf]} numberOfLines={1}>
            {senderName}
          </Text>
          <View style={styles.inlinePreview}>
            {getMessageTypeIcon()}
            <Text style={styles.inlineText} numberOfLines={1}>
              {getPreviewText()}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bar} />
      <View style={styles.content}>
        <Text style={styles.sender} numberOfLines={1}>
          {isSelf ? 'Vous' : senderName}
        </Text>
        <View style={styles.preview}>
          {getMessageTypeIcon()}
          <Text style={styles.previewText} numberOfLines={1}>
            {getPreviewText()}
          </Text>
        </View>
      </View>
      {onClear && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close" size={20} color={Colors.neutral[500]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  bar: {
    width: 3,
    height: '100%',
    minHeight: 32,
    backgroundColor: Colors.accent[500],
    borderRadius: 2,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  sender: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent[500],
    marginBottom: 2,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Inline styles (for message bubble)
  inlineContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  inlineSelf: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  inlineBar: {
    width: 2,
    height: '100%',
    minHeight: 24,
    backgroundColor: Colors.accent[500],
    borderRadius: 1,
    marginRight: 8,
  },
  inlineBarSelf: {
    backgroundColor: Colors.text.inverse,
  },
  inlineContent: {
    flex: 1,
  },
  inlineSender: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent[500],
    marginBottom: 1,
  },
  inlineSenderSelf: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  inlinePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineText: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
});

export default ReplyPreview;