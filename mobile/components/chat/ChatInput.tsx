import { memo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';

interface ChatInputProps {
  message: string;
  onMessageChange: (text: string) => void;
  onSend: () => void;
  onAttachmentPress: () => void;
  onMicPress: () => void;
  onBlur: () => void;
  isSending: boolean;
  isRecording: boolean;
  isSendingMedia: boolean;
  canRecord: boolean;
}

export const ChatInput = memo(function ChatInput({
  message,
  onMessageChange,
  onSend,
  onAttachmentPress,
  onMicPress,
  onBlur,
  isSending,
  isRecording,
  isSendingMedia,
  canRecord,
}: ChatInputProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={styles.attachmentButton}
          onPress={onAttachmentPress}
          disabled={isRecording || isSendingMedia}
        >
          <Ionicons name="attach" size={24} color={lightTheme.colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={t('chat.yourMessage')}
          placeholderTextColor={Colors.neutral[400]}
          value={message}
          onChangeText={onMessageChange}
          onBlur={onBlur}
          multiline
          maxLength={1000}
          editable={!isRecording}
        />

        {message.trim() ? (
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={onMicPress}
            disabled={isRecording || isSendingMedia || !canRecord}
          >
            <Ionicons
              name="mic"
              size={22}
              color={isRecording ? '#fff' : lightTheme.colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  attachmentButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.background.secondary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.secondary[800],
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: Colors.error[500],
  },
});

export default ChatInput;
