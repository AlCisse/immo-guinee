import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceRecorder } from './VoiceRecorder';

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendVoice: (uri: string, duration: number) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  primaryColor?: string;
}

type InputMode = 'text' | 'voice';

export function MessageInput({
  onSendText,
  onSendVoice,
  onTyping,
  placeholder = 'Message...',
  disabled = false,
  primaryColor = '#10B981',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const micButtonScale = useRef(new Animated.Value(1)).current;

  // Handle text change with typing indicator
  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);

      // Send typing indicator
      if (onTyping) {
        onTyping(true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      }
    },
    [onTyping]
  );

  // Send text message
  const handleSendText = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);

    setIsSending(true);
    setText('');
    Keyboard.dismiss();

    try {
      await onSendText(trimmedText);
    } catch (error) {
      if (__DEV__) console.error('Error sending text message:', error);
      // Restore text on error
      setText(trimmedText);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message. Veuillez réessayer.');
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSendText, onTyping]);

  // Handle voice recording complete
  const handleRecordingComplete = useCallback(
    async (uri: string, duration: number) => {
      setInputMode('text');
      setIsSending(true);

      try {
        await onSendVoice(uri, duration);
      } catch (error) {
        if (__DEV__) console.error('Error sending voice message:', error);
        Alert.alert('Erreur', 'Impossible d\'envoyer le message vocal. Veuillez réessayer.');
      } finally {
        setIsSending(false);
      }
    },
    [onSendVoice]
  );

  // Cancel voice recording
  const handleCancelRecording = useCallback(() => {
    setInputMode('text');
  }, []);

  // Start voice recording
  const startVoiceRecording = useCallback(() => {
    if (disabled || isSending) return;

    // Dismiss keyboard
    Keyboard.dismiss();

    // Animate button
    Animated.sequence([
      Animated.timing(micButtonScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(micButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setInputMode('voice');
  }, [disabled, isSending]);

  // Render voice recorder mode
  if (inputMode === 'voice') {
    return (
      <View style={styles.voiceRecorderContainer}>
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          onCancel={handleCancelRecording}
          primaryColor={primaryColor}
        />
      </View>
    );
  }

  // Determine if we should show send or mic button
  const showSendButton = text.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Text input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={text}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={2000}
          editable={!disabled && !isSending}
          returnKeyType="default"
          blurOnSubmit={false}
        />
      </View>

      {/* Action button (Send or Mic) */}
      {showSendButton ? (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.sendButton,
            { backgroundColor: primaryColor },
            (disabled || isSending) && styles.disabledButton,
          ]}
          onPress={handleSendText}
          disabled={disabled || isSending}
        >
          {isSending ? (
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      ) : (
        <Animated.View style={{ transform: [{ scale: micButtonScale }] }}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.micButton,
              (disabled || isSending) && styles.disabledButton,
            ]}
            onPress={startVoiceRecording}
            disabled={disabled || isSending}
          >
            <Ionicons name="mic" size={22} color={primaryColor} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    ...Platform.select({
      ios: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    }),
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micButton: {
    backgroundColor: '#F3F4F6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  voiceRecorderContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default MessageInput;
