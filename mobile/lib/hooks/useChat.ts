import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, Animated } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer, AudioPlayer } from 'expo-audio';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Message } from '@/types';
import {
  useMessagingConnection,
  useConversationRealtime,
  useTypingIndicator,
} from '@/lib/hooks/useMessagingRealtime';
import { useMessagingStore, LocalMessage } from '@/lib/stores/messagingStore';
import {
  pickImage,
  pickVideo,
  takePhoto,
  formatFileSize,
  PickedMedia,
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording as checkIsRecording,
  formatVoiceDuration,
  RecordingState,
} from '@/lib/media';
import {
  sendPickedMedia,
  sendVoiceRecording,
  receiveEncryptedMedia,
  getMediaForDisplay,
  isMediaAvailable,
} from '@/lib/services';
import { getPendingKey, deletePendingKey } from '@/lib/storage';

// Stable empty array to avoid creating new references in selectors
const EMPTY_MESSAGES: LocalMessage[] = [];

/**
 * Mark sender's own E2E messages as ready (they always have local media)
 */
async function enrichMessagesWithLocalMediaStatus(
  messages: Message[],
  currentUserId: string | undefined
): Promise<Message[]> {
  return messages.map((msg) => {
    if (msg.encrypted_media_id && msg.sender_id === currentUserId) {
      return { ...msg, localMediaReady: true };
    }
    return msg;
  });
}

interface UseChatParams {
  id: string;
  listingId?: string;
}

export function useChat({ id, listingId: paramListingId }: UseChatParams) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Audio playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioPosition, setAudioPosition] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentAudioUri, setCurrentAudioUri] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(currentAudioUri || undefined);
  const audioPositionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState | null>(null);
  const recordingAnimValue = useRef(new Animated.Value(1)).current;

  // Media picker state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<PickedMedia | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // E2E media display state
  const [mediaUris, setMediaUris] = useState<Record<string, string>>({});
  const [downloadingMedia, setDownloadingMedia] = useState<Set<string>>(new Set());
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
  } | null>(null);

  // Typing timeout ref
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if we have a conversation ID or a listing ID
  const listingId = paramListingId || id;
  const isNewConversation = !!paramListingId;

  // Real-time WebSocket connection
  const { isConnected: wsConnected } = useMessagingConnection();

  // Real-time conversation subscription
  const { sendTypingIndicator } = useConversationRealtime(conversationId);

  // Get messages from store (updated in real-time)
  const storeMessages = useMessagingStore((state) =>
    conversationId ? (state.messages[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES
  );
  const setMessagesInStore = useMessagingStore((state) => state.setMessages);

  // Typing indicator
  const { isTyping: otherUserTyping, typingText } = useTypingIndicator(conversationId || '');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPositionIntervalRef.current) {
        clearInterval(audioPositionIntervalRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (checkIsRecording()) {
        cancelRecording();
      }
    };
  }, []);

  // Track audio player position
  useEffect(() => {
    if (audioPlayer && playingMessageId) {
      audioPositionIntervalRef.current = setInterval(() => {
        if (audioPlayer.playing) {
          setAudioPosition(audioPlayer.currentTime * 1000);
          if (audioPlayer.duration) {
            setAudioDuration(audioPlayer.duration * 1000);
          }
        } else if (audioPlayer.currentTime >= (audioPlayer.duration || 0) - 0.1) {
          // Playback finished
          setPlayingMessageId(null);
          setAudioPosition(0);
          setCurrentAudioUri(null);
        }
      }, 100);

      return () => {
        if (audioPositionIntervalRef.current) {
          clearInterval(audioPositionIntervalRef.current);
        }
      };
    }
  }, [audioPlayer, playingMessageId]);

  // Animate recording indicator
  useEffect(() => {
    if (isRecordingVoice) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimValue, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnimValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecordingVoice, recordingAnimValue]);

  // Handle voice recording
  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording((state) => {
        setRecordingState(state);
      });
      setIsRecordingVoice(true);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('chat.errors.startRecording'));
    }
  }, [t]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecordingVoice || !conversationId || !user) return;

    try {
      setIsRecordingVoice(false);
      setRecordingState(null);
      setIsSendingMedia(true);

      const recording = await stopRecording();
      const result = await sendVoiceRecording(recording, conversationId, user.id);

      await api.messaging.sendMessage(conversationId, {
        type_message: 'VOCAL',
        contenu: `[Message vocal - ${formatVoiceDuration(recording.duration)}]`,
        encrypted_media_id: result.mediaId,
        encryption_key: result.encryptionKey,
      } as any);

      const msgResponse = await api.messaging.getMessages(conversationId);
      const enriched = await enrichMessagesWithLocalMediaStatus(msgResponse.data?.data || [], user?.id);
      setMessages(enriched);
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error sending voice:', error);
      }
      Alert.alert(
        t('common.error'),
        error.response?.data?.error || error.message || t('chat.errors.sendVoice')
      );
    } finally {
      setIsSendingMedia(false);
    }
  }, [isRecordingVoice, conversationId, user, t]);

  const handleCancelRecording = useCallback(() => {
    cancelRecording();
    setIsRecordingVoice(false);
    setRecordingState(null);
  }, []);

  // Handle media picking
  const handlePickImage = useCallback(async () => {
    setShowMediaPicker(false);
    try {
      const media = await pickImage();
      if (media) {
        setSelectedMedia(media);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('chat.errors.selectImage'));
    }
  }, [t]);

  const handlePickVideo = useCallback(async () => {
    setShowMediaPicker(false);
    try {
      const media = await pickVideo();
      if (media) {
        setSelectedMedia(media);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('chat.errors.selectVideo'));
    }
  }, [t]);

  const handleTakePhoto = useCallback(async () => {
    setShowMediaPicker(false);
    try {
      const media = await takePhoto();
      if (media) {
        setSelectedMedia(media);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('chat.errors.takePhoto'));
    }
  }, [t]);

  const handleSendMedia = useCallback(async () => {
    if (!selectedMedia || !conversationId || !user) return;

    try {
      setIsSendingMedia(true);
      const result = await sendPickedMedia(selectedMedia, conversationId, user.id);
      const messageType = result.mediaType === 'VIDEO' ? 'VIDEO' : 'PHOTO';

      await api.messaging.sendMessage(conversationId, {
        type_message: messageType,
        contenu: `[${messageType === 'VIDEO' ? 'Video' : 'Image'} - ${formatFileSize(result.originalSize)}]`,
        encrypted_media_id: result.mediaId,
        encryption_key: result.encryptionKey,
      } as any);

      setSelectedMedia(null);

      const msgResponse = await api.messaging.getMessages(conversationId);
      const enriched = await enrichMessagesWithLocalMediaStatus(msgResponse.data?.data || [], user?.id);
      setMessages(enriched);
    } catch (error: any) {
      if (__DEV__) console.error('Error sending media:', error);
      Alert.alert(t('common.error'), error.message || t('chat.errors.sendMedia'));
    } finally {
      setIsSendingMedia(false);
    }
  }, [selectedMedia, conversationId, user, t]);

  // Handle photo/video press - download if needed and show fullscreen
  const handleMediaPress = useCallback(
    async (msg: Message, mediaType: 'image' | 'video') => {
      const mediaId = msg.encrypted_media_id;
      if (!mediaId) return;

      if (mediaUris[mediaId]) {
        setFullscreenMedia({ uri: mediaUris[mediaId], type: mediaType });
        return;
      }

      if (downloadingMedia.has(mediaId)) return;

      try {
        setDownloadingMedia((prev) => new Set(prev).add(mediaId));
        const hasLocal = await isMediaAvailable(mediaId);

        if (!hasLocal) {
          let encryptionKey = msg.encryption_key;

          if (!encryptionKey) {
            const pendingKeyData = await getPendingKey(mediaId);
            if (pendingKeyData) {
              encryptionKey = pendingKeyData.encryptionKey;
            }
          }

          if (encryptionKey) {
            await receiveEncryptedMedia({
              mediaId,
              encryptionKey,
              conversationId: msg.conversation_id,
              senderId: msg.sender_id,
            });
            await deletePendingKey(mediaId);
          } else {
            Alert.alert(t('common.error'), t('chat.errors.mediaUnavailable'));
            return;
          }
        }

        const uri = await getMediaForDisplay(mediaId);
        if (uri) {
          setMediaUris((prev) => ({ ...prev, [mediaId]: uri }));
          setFullscreenMedia({ uri, type: mediaType });
        } else {
          Alert.alert(t('common.error'), t('chat.errors.decryptMedia'));
        }
      } catch (error) {
        if (__DEV__) console.error('[Media] Error loading media:', error);
        Alert.alert(t('common.error'), t('chat.errors.loadMedia'));
      } finally {
        setDownloadingMedia((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
      }
    },
    [mediaUris, downloadingMedia, t]
  );

  // Handle audio playback
  const handlePlayAudio = useCallback(
    async (msg: Message) => {
      const messageId = msg.id;

      try {
        // If same message is playing, pause it
        if (playingMessageId === messageId && audioPlayer?.playing) {
          audioPlayer.pause();
          setPlayingMessageId(null);
          return;
        }

        // Stop current playback
        if (audioPlayer?.playing) {
          audioPlayer.pause();
        }

        let audioUri: string | null = null;

        if (msg.encrypted_media_id) {
          const hasLocal = await isMediaAvailable(msg.encrypted_media_id);

          if (!hasLocal) {
            let encryptionKey = msg.encryption_key;

            if (!encryptionKey) {
              const pendingKeyData = await getPendingKey(msg.encrypted_media_id);
              if (pendingKeyData) {
                encryptionKey = pendingKeyData.encryptionKey;
              }
            }

            if (encryptionKey) {
              try {
                await receiveEncryptedMedia({
                  mediaId: msg.encrypted_media_id,
                  encryptionKey,
                  conversationId: msg.conversation_id,
                  senderId: msg.sender_id,
                });
                await deletePendingKey(msg.encrypted_media_id);
              } catch (downloadError) {
                if (__DEV__) console.error('[Audio] Download failed:', downloadError);
              }
            }
          }

          audioUri = await getMediaForDisplay(msg.encrypted_media_id);
        } else if (msg.media_url) {
          audioUri = msg.media_url;
        }

        if (!audioUri) {
          Alert.alert(t('common.error'), t('chat.errors.mediaUnavailable'));
          return;
        }

        // Set the audio URI and let the useAudioPlayer hook handle it
        setCurrentAudioUri(audioUri);
        setPlayingMessageId(messageId);

        // Play after a short delay to ensure player is ready
        setTimeout(() => {
          if (audioPlayer) {
            audioPlayer.play();
          }
        }, 100);
      } catch (error) {
        if (__DEV__) console.error('Error playing audio:', error);
        Alert.alert(t('common.error'), t('chat.errors.playVoice'));
      }
    },
    [playingMessageId, t]
  );

  // Load existing conversation or check for one
  useEffect(() => {
    const loadConversation = async () => {
      try {
        if (isNewConversation) {
          const response = await api.messaging.conversations();
          const conversations = response.data?.data || [];
          const existing = conversations.find((c: any) => c.listing_id === listingId);

          if (existing) {
            setConversationId(existing.id);
            const msgResponse = await api.messaging.getMessages(existing.id);
            const fetchedMessages = msgResponse.data?.data || [];
            const enrichedMessages = await enrichMessagesWithLocalMediaStatus(
              fetchedMessages,
              user?.id
            );
            setMessages(enrichedMessages);
            setMessagesInStore(existing.id, enrichedMessages);
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
          }
        } else {
          setConversationId(id);
          const msgResponse = await api.messaging.getMessages(id);
          const fetchedMessages = msgResponse.data?.data || [];
          const enrichedMessages = await enrichMessagesWithLocalMediaStatus(
            fetchedMessages,
            user?.id
          );
          setMessages(enrichedMessages);
          setMessagesInStore(id, enrichedMessages);
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        }
      } catch (error) {
        if (__DEV__) console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [id, listingId, isNewConversation, queryClient, user?.id, setMessagesInStore]);

  // Sync store messages with local state
  useEffect(() => {
    if (storeMessages.length > 0 || messages.length > 0) {
      setMessages(storeMessages);
    }
  }, [storeMessages]);

  // Fallback polling when WebSocket is disconnected
  useEffect(() => {
    if (!conversationId || wsConnected) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.messaging.getMessages(conversationId);
        const fetchedMessages = response.data?.data || [];
        const enriched = await enrichMessagesWithLocalMediaStatus(fetchedMessages, user?.id);
        setMessages(enriched);
        setMessagesInStore(conversationId, enriched);
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      } catch {
        // Silent fail for polling
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [conversationId, wsConnected, queryClient, setMessagesInStore, user?.id]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    setIsSending(true);
    try {
      let convId = conversationId;

      if (!convId && listingId) {
        const response = await api.messaging.startConversation({
          listing_id: listingId,
          message: trimmedMessage,
        });
        convId = response.data?.data?.conversation?.id;
        setConversationId(convId);

        if (!convId) {
          Alert.alert(t('common.error'), t('chat.errors.startConversation'));
          return;
        }

        setMessage('');
        const msgResponse = await api.messaging.getMessages(convId);
        const enriched = await enrichMessagesWithLocalMediaStatus(
          msgResponse.data?.data || [],
          user?.id
        );
        setMessages(enriched);
        return;
      }

      if (!convId) {
        Alert.alert(t('common.error'), t('chat.errors.conversationNotFound'));
        return;
      }

      await api.messaging.sendMessage(convId, {
        type_message: 'TEXT',
        contenu: trimmedMessage,
      });

      setMessage('');
      const msgResponse = await api.messaging.getMessages(convId);
      const enriched = await enrichMessagesWithLocalMediaStatus(
        msgResponse.data?.data || [],
        user?.id
      );
      setMessages(enriched);
    } catch (error: any) {
      if (__DEV__) console.error('Error sending message:', error);
      Alert.alert(t('common.error'), error.response?.data?.message || t('chat.errors.sendMessage'));
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, conversationId, listingId, user?.id, t]);

  const handleMessageChange = useCallback(
    (text: string) => {
      setMessage(text);
      if (text.length > 0 && conversationId) {
        sendTypingIndicator(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(false);
        }, 2000);
      }
    },
    [conversationId, sendTypingIndicator]
  );

  const handleInputBlur = useCallback(() => {
    if (conversationId) {
      sendTypingIndicator(false);
    }
  }, [conversationId, sendTypingIndicator]);

  return {
    // State
    message,
    messages,
    conversationId,
    isLoading,
    isSending,
    playingMessageId,
    audioPosition,
    audioDuration,
    isRecordingVoice,
    recordingState,
    recordingAnimValue,
    showMediaPicker,
    selectedMedia,
    isSendingMedia,
    mediaUris,
    downloadingMedia,
    fullscreenMedia,
    wsConnected,
    otherUserTyping,
    typingText,
    listingId,

    // Actions
    setMessage,
    setShowMediaPicker,
    setSelectedMedia,
    setFullscreenMedia,
    handleSend,
    handleMessageChange,
    handleInputBlur,
    handleStartRecording,
    handleStopRecording,
    handleCancelRecording,
    handlePickImage,
    handlePickVideo,
    handleTakePhoto,
    handleSendMedia,
    handleMediaPress,
    handlePlayAudio,
  };
}

export default useChat;
