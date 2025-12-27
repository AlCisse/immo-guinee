import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Message } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';
import {
  useMessagingConnection,
  useConversationRealtime,
  useTypingIndicator,
} from '@/lib/hooks/useMessagingRealtime';
import { useMessagingStore, LocalMessage } from '@/lib/stores/messagingStore';

// Media imports
import {
  pickImage,
  pickVideo,
  takePhoto,
  recordVideo as recordVideoFromCamera,
  formatFileSize,
  PickedMedia,
} from '@/lib/media';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording as checkIsRecording,
  formatVoiceDuration,
  meteringToAmplitude,
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
import { useScreenProtection } from '@/lib/security';

// Stable empty array to avoid creating new references in selectors
const EMPTY_MESSAGES: LocalMessage[] = [];

/**
 * Mark sender's own E2E messages as ready (they always have local media)
 * For messages from others, don't set localMediaReady - download on-demand when played
 */
async function enrichMessagesWithLocalMediaStatus(
  messages: Message[],
  currentUserId: string | undefined
): Promise<Message[]> {
  // Only mark sender's own messages as ready
  // Don't check isMediaAvailable - it's unreliable and causes loading state issues
  return messages.map((msg) => {
    if (msg.encrypted_media_id && msg.sender_id === currentUserId) {
      return { ...msg, localMediaReady: true };
    }
    // For messages from others, leave localMediaReady undefined (not false)
    // This way the UI shows play button, and download happens on-demand
    return msg;
  });
}

export default function ChatScreen() {
  // Prevent screenshots on this sensitive screen
  useScreenProtection();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{
    id: string;
    listingId?: string;
    listingTitle?: string;
    listingPhoto?: string;
    listingLocation?: string;
    listingPrice?: string;
    ownerName?: string;
    ownerPhoto?: string;
  }>();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Audio playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioPosition, setAudioPosition] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

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

  // Real-time WebSocket connection
  const { isConnected: wsConnected } = useMessagingConnection();

  // Real-time conversation subscription
  const { sendTypingIndicator } = useConversationRealtime(conversationId);

  // Get messages from store (updated in real-time)
  // Use stable empty array reference to avoid infinite loop
  const storeMessages = useMessagingStore((state) =>
    conversationId ? (state.messages[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES
  );
  const addMessageToStore = useMessagingStore((state) => state.addMessage);
  const setMessagesInStore = useMessagingStore((state) => state.setMessages);

  // Typing indicator
  const { isTyping: otherUserTyping, typingText } = useTypingIndicator(conversationId || '');

  // Force re-render key based on localMediaReady changes
  const messagesRenderKey = messages
    .filter((m: any) => m.encrypted_media_id)
    .map((m: any) => `${m.id}:${m.localMediaReady ? 1 : 0}`)
    .join(',');

  // Typing timeout ref
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup audio, recording, and typing timeout on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Cancel any ongoing recording
      if (checkIsRecording()) {
        cancelRecording();
      }
    };
  }, []);

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
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!isRecordingVoice || !conversationId || !user) return;

    try {
      setIsRecordingVoice(false);
      setRecordingState(null);
      setIsSendingMedia(true);

      const recording = await stopRecording();

      // Send encrypted voice message
      const result = await sendVoiceRecording(recording, conversationId, user.id);

      // Send message with encryption key via API
      await api.messaging.sendMessage(conversationId, {
        type_message: 'VOCAL',
        contenu: `[Message vocal - ${formatVoiceDuration(recording.duration)}]`,
        encrypted_media_id: result.mediaId,
        encryption_key: result.encryptionKey,
      } as any);

      // Reload messages with local media status
      const msgResponse = await api.messaging.getMessages(conversationId);
      const enriched = await enrichMessagesWithLocalMediaStatus(msgResponse.data?.data || [], user?.id);
      setMessages(enriched);
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error sending voice:', error);
        if (error.response?.data) {
          console.error('Server response:', JSON.stringify(error.response.data, null, 2));
        }
      }
      Alert.alert(t('common.error'), error.response?.data?.error || error.message || t('chat.errors.sendVoice'));
    } finally {
      setIsSendingMedia(false);
    }
  }, [isRecordingVoice, conversationId, user]);

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
  }, []);

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
  }, []);

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
  }, []);

  const handleSendMedia = useCallback(async () => {
    if (!selectedMedia || !conversationId || !user) return;

    try {
      setIsSendingMedia(true);

      // Send encrypted media
      const result = await sendPickedMedia(selectedMedia, conversationId, user.id);

      // Send message with encryption key via API
      const messageType = result.mediaType === 'VIDEO' ? 'VIDEO' : 'PHOTO';
      await api.messaging.sendMessage(conversationId, {
        type_message: messageType,
        contenu: `[${messageType === 'VIDEO' ? 'Video' : 'Image'} - ${formatFileSize(result.originalSize)}]`,
        encrypted_media_id: result.mediaId,
        encryption_key: result.encryptionKey,
      } as any);

      setSelectedMedia(null);

      // Reload messages with local media status
      const msgResponse = await api.messaging.getMessages(conversationId);
      const enriched = await enrichMessagesWithLocalMediaStatus(msgResponse.data?.data || [], user?.id);
      setMessages(enriched);
    } catch (error: any) {
      if (__DEV__) console.error('Error sending media:', error);
      Alert.alert(t('common.error'), error.message || t('chat.errors.sendMedia'));
    } finally {
      setIsSendingMedia(false);
    }
  }, [selectedMedia, conversationId, user]);

  // Load decrypted media URI for display
  const loadMediaUri = useCallback(async (mediaId: string) => {
    if (mediaUris[mediaId]) return mediaUris[mediaId]; // Already loaded

    const uri = await getMediaForDisplay(mediaId);
    if (uri) {
      setMediaUris((prev) => ({ ...prev, [mediaId]: uri }));
      return uri;
    }
    return null;
  }, [mediaUris]);

  // Handle photo/video press - download if needed and show fullscreen
  const handleMediaPress = useCallback(async (message: Message, mediaType: 'image' | 'video') => {
    const mediaId = message.encrypted_media_id;
    if (!mediaId) return;

    if (__DEV__) {
      console.log('[Media] handleMediaPress called:', {
        messageId: message.id,
        mediaId,
        mediaType,
        type_message: message.type_message,
      });
    }

    // Check if already cached
    if (mediaUris[mediaId]) {
      setFullscreenMedia({ uri: mediaUris[mediaId], type: mediaType });
      return;
    }

    // Check if already downloading
    if (downloadingMedia.has(mediaId)) return;

    try {
      setDownloadingMedia((prev) => new Set(prev).add(mediaId));

      // Check if we have the media locally
      const hasLocal = await isMediaAvailable(mediaId);
      if (__DEV__) console.log('[Media] Has local media:', hasLocal, 'Has encryption_key:', !!message.encryption_key);

      if (!hasLocal) {
        // Get encryption key from message or from pending keys storage
        let encryptionKey = message.encryption_key;

        if (!encryptionKey) {
          const pendingKeyData = await getPendingKey(mediaId);
          if (pendingKeyData) {
            encryptionKey = pendingKeyData.encryptionKey;
            if (__DEV__) console.log('[Media] Found pending key for:', mediaId);
          }
        }

        if (encryptionKey) {
          if (__DEV__) console.log('[Media] Downloading encrypted media...');
          await receiveEncryptedMedia({
            mediaId,
            encryptionKey,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
          });
          if (__DEV__) console.log('[Media] Download complete');
          await deletePendingKey(mediaId);
        } else {
          if (__DEV__) console.log('[Media] No local media and no encryption_key - cannot download');
          Alert.alert(t('common.error'), t('chat.errors.mediaUnavailable'));
          return;
        }
      }

      // Get decrypted URI and show fullscreen
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
  }, [mediaUris, downloadingMedia]);

  // Handle audio playback (supports both regular and encrypted media)
  const handlePlayAudio = useCallback(async (message: Message) => {
    const messageId = message.id;

    if (__DEV__) {
      console.log('[Audio] handlePlayAudio called:', {
        messageId,
        encrypted_media_id: message.encrypted_media_id,
        media_url: message.media_url,
        type_message: message.type_message,
      });
    }

    try {
      // If same message is playing, pause it
      if (playingMessageId === messageId && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setPlayingMessageId(null);
          return;
        }
      }

      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Get the audio URI (encrypted or regular)
      let audioUri: string | null = null;

      if (message.encrypted_media_id) {
        // E2E encrypted media - need to decrypt first
        if (__DEV__) console.log('[Audio] Getting decrypted media for:', message.encrypted_media_id);

        // Check if we have the media locally, if not download it
        const hasLocal = await isMediaAvailable(message.encrypted_media_id);
        if (__DEV__) console.log('[Audio] Has local media:', hasLocal, 'Has encryption_key:', !!message.encryption_key);

        if (!hasLocal) {
          // Get encryption key from message or from pending keys storage
          let encryptionKey = message.encryption_key;

          if (!encryptionKey) {
            // Check for pending key (stored when message was received via WebSocket)
            const pendingKeyData = await getPendingKey(message.encrypted_media_id);
            if (pendingKeyData) {
              encryptionKey = pendingKeyData.encryptionKey;
              if (__DEV__) console.log('[Audio] Found pending key for:', message.encrypted_media_id);
            }
          }

          if (encryptionKey) {
            if (__DEV__) console.log('[Audio] Downloading encrypted media...');
            try {
              await receiveEncryptedMedia({
                mediaId: message.encrypted_media_id,
                encryptionKey,
                conversationId: message.conversation_id,
                senderId: message.sender_id,
              });
              if (__DEV__) console.log('[Audio] Download complete');
              // Delete pending key after successful download
              await deletePendingKey(message.encrypted_media_id);
            } catch (downloadError) {
              if (__DEV__) console.error('[Audio] Download failed:', downloadError);
            }
          } else {
            if (__DEV__) console.log('[Audio] No local media and no encryption_key - cannot download');
          }
        }

        // Get decrypted URI
        audioUri = await getMediaForDisplay(message.encrypted_media_id);
        if (__DEV__) console.log('[Audio] Decrypted URI:', audioUri);
      } else if (message.media_url) {
        // Regular media URL
        audioUri = message.media_url;
      }

      if (!audioUri) {
        if (__DEV__) console.log('[Audio] No audio URI available');
        Alert.alert(t('common.error'), t('chat.errors.mediaUnavailable'));
        return;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setAudioPosition(status.positionMillis || 0);
            setAudioDuration(status.durationMillis || 0);
            if (status.didJustFinish) {
              setPlayingMessageId(null);
              setAudioPosition(0);
            }
          }
        }
      );

      soundRef.current = sound;
      setPlayingMessageId(messageId);
    } catch (error) {
      if (__DEV__) console.error('Error playing audio:', error);
      Alert.alert(t('common.error'), t('chat.errors.playVoice'));
    }
  }, [playingMessageId]);

  // Determine if we have a conversation ID or a listing ID
  const listingId = params.listingId || params.id;
  const isNewConversation = !!params.listingId;

  // Load existing conversation or check for one
  useEffect(() => {
    const loadConversation = async () => {
      try {
        if (isNewConversation) {
          // Coming from listing - check if conversation exists
          const response = await api.messaging.conversations();
          // Laravel Resource returns { data: [...] }, not { data: { conversations: [...] } }
          const conversations = response.data?.data || [];
          const existing = conversations.find((c: any) => c.listing_id === listingId);

          if (existing) {
            setConversationId(existing.id);
            // Load messages (this marks them as read on the backend)
            const msgResponse = await api.messaging.getMessages(existing.id);
            const fetchedMessages = msgResponse.data?.data || [];

            // Check local media availability for E2E messages
            const enrichedMessages = await enrichMessagesWithLocalMediaStatus(fetchedMessages, user?.id);

            if (__DEV__) {
              const vocalMessages = enrichedMessages.filter((m: any) => m.type_message === 'VOCAL');
              console.log('[Chat] Loaded messages, VOCAL:', vocalMessages.map((m: any) => ({
                id: m.id,
                encrypted_media_id: m.encrypted_media_id,
                localMediaReady: m.localMediaReady,
              })));
            }
            setMessages(enrichedMessages);
            setMessagesInStore(existing.id, enrichedMessages);
            // Refresh unread count since messages were marked as read
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
          }
          // If no existing conversation, we'll create one on first message
        } else {
          // Coming from messages list - we have a conversation ID
          setConversationId(params.id);
          // Load messages (this marks them as read on the backend)
          const msgResponse = await api.messaging.getMessages(params.id);
          const fetchedMessages = msgResponse.data?.data || [];

          // Check local media availability for E2E messages
          const enrichedMessages = await enrichMessagesWithLocalMediaStatus(fetchedMessages, user?.id);

          if (__DEV__) {
            const vocalMessages = enrichedMessages.filter((m: any) => m.type_message === 'VOCAL');
            console.log('[Chat] Loaded messages from list, VOCAL:', vocalMessages.map((m: any) => ({
              id: m.id,
              encrypted_media_id: m.encrypted_media_id,
              localMediaReady: m.localMediaReady,
            })));
          }
          setMessages(enrichedMessages);
          setMessagesInStore(params.id, enrichedMessages);
          // Refresh unread count since messages were marked as read
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        }
      } catch (error) {
        if (__DEV__) console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [params.id, listingId, isNewConversation, queryClient]);

  // Sync store messages with local state (for real-time updates)
  useEffect(() => {
    if (storeMessages.length > 0 || messages.length > 0) {
      // Always sync to capture both new messages and updates (like localMediaReady)
      if (__DEV__) {
        // Log when localMediaReady changes
        const e2eMessages = storeMessages.filter((m: any) => m.encrypted_media_id);
        if (e2eMessages.length > 0) {
          console.log('[Chat] Store sync - E2E messages:', e2eMessages.map((m: any) => ({
            id: m.id?.substring(0, 8),
            localMediaReady: m.localMediaReady,
          })));
        }
      }
      setMessages(storeMessages);
    }
  }, [storeMessages]);

  // Fallback polling only when WebSocket is disconnected
  useEffect(() => {
    if (!conversationId || wsConnected) return;

    // Only poll if WebSocket is not connected
    const interval = setInterval(async () => {
      try {
        const response = await api.messaging.getMessages(conversationId);
        const fetchedMessages = response.data?.data || [];
        // Enrich with local media status
        const enriched = await enrichMessagesWithLocalMediaStatus(fetchedMessages, user?.id);
        setMessages(enriched);
        setMessagesInStore(conversationId, enriched);
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      } catch (error) {
        // Silent fail for polling
      }
    }, 10000); // Poll less frequently as fallback

    return () => clearInterval(interval);
  }, [conversationId, wsConnected, queryClient, setMessagesInStore]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    setIsSending(true);
    try {
      let convId = conversationId;

      // Create conversation if it doesn't exist (message is sent via startConversation)
      if (!convId && listingId) {
        const response = await api.messaging.startConversation({
          listing_id: listingId,
          message: trimmedMessage, // Message is sent here, not separately
        });
        convId = response.data?.data?.conversation?.id;
        setConversationId(convId);

        if (!convId) {
          Alert.alert(t('common.error'), t('chat.errors.startConversation'));
          return;
        }

        setMessage('');

        // Reload messages after creating conversation with first message
        const msgResponse = await api.messaging.getMessages(convId);
        const enriched = await enrichMessagesWithLocalMediaStatus(msgResponse.data?.data || [], user?.id);
        setMessages(enriched);
        return; // Don't send message again - it was included in startConversation
      }

      if (!convId) {
        Alert.alert(t('common.error'), t('chat.errors.conversationNotFound'));
        return;
      }

      // Send message to existing conversation
      await api.messaging.sendMessage(convId, {
        type_message: 'TEXT',
        contenu: trimmedMessage,
      });

      setMessage('');

      // Reload messages
      const msgResponse = await api.messaging.getMessages(convId);
      const enriched = await enrichMessagesWithLocalMediaStatus(msgResponse.data?.data || [], user?.id);
      setMessages(enriched);

    } catch (error: any) {
      if (__DEV__) console.error('Error sending message:', error);
      Alert.alert(t('common.error'), error.response?.data?.message || t('chat.errors.sendMessage'));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration for audio
  const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render photo message bubble
  const renderPhotoMessage = (item: Message & { localMediaReady?: boolean }, isMe: boolean) => {
    const mediaId = item.encrypted_media_id;
    const isDownloading = mediaId ? downloadingMedia.has(mediaId) : false;
    const cachedUri = mediaId ? mediaUris[mediaId] : null;
    const isE2EFromOther = !isMe && !!mediaId && !item.media_url;

    return (
      <TouchableOpacity
        style={styles.encryptedImageContainer}
        onPress={() => handleMediaPress(item, 'image')}
        activeOpacity={0.8}
        disabled={isDownloading}
      >
        {cachedUri ? (
          <Image source={{ uri: cachedUri }} style={styles.encryptedImage} />
        ) : isDownloading ? (
          <View style={styles.encryptedMediaLoading}>
            <ActivityIndicator size="small" color={lightTheme.colors.primary} />
            <Text style={styles.encryptedMediaLoadingText}>{t('chat.downloading')}</Text>
          </View>
        ) : (
          <View style={styles.encryptedMediaLoading}>
            <Ionicons name="image-outline" size={32} color={Colors.neutral[400]} />
            <Text style={styles.encryptedMediaLoadingText}>
              {isE2EFromOther ? t('chat.tapToView') : t('chat.encryptedImage')}
            </Text>
          </View>
        )}
        <View style={styles.e2eBadge}>
          <Ionicons name="lock-closed" size={10} color={Colors.neutral[400]} />
          <Text style={styles.e2eBadgeText}>{t('chat.encryptedE2E')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render video message bubble
  const renderVideoMessage = (item: Message & { localMediaReady?: boolean }, isMe: boolean) => {
    const mediaId = item.encrypted_media_id;
    const isDownloading = mediaId ? downloadingMedia.has(mediaId) : false;
    const cachedUri = mediaId ? mediaUris[mediaId] : null;
    const isE2EFromOther = !isMe && !!mediaId && !item.media_url;

    return (
      <TouchableOpacity
        style={styles.encryptedVideoContainer}
        onPress={() => handleMediaPress(item, 'video')}
        activeOpacity={0.8}
        disabled={isDownloading}
      >
        {cachedUri ? (
          <>
            <Image source={{ uri: cachedUri }} style={styles.encryptedImage} />
            <View style={styles.encryptedVideoIcon}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
            </View>
          </>
        ) : isDownloading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={[styles.encryptedMediaLoadingText, { color: '#fff' }]}>{t('chat.downloading')}</Text>
          </>
        ) : (
          <>
            <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.encryptedMediaLoadingText, { color: 'rgba(255,255,255,0.8)' }]}>
              {isE2EFromOther ? t('chat.tapToView') : t('chat.encryptedVideo')}
            </Text>
          </>
        )}
        <View style={[styles.e2eBadge, { marginTop: 8 }]}>
          <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.6)" />
          <Text style={[styles.e2eBadgeText, { color: 'rgba(255,255,255,0.6)' }]}>{t('chat.encryptedE2E')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render voice message bubble
  const renderVoiceMessage = (item: Message & { localMediaReady?: boolean }, isMe: boolean) => {
    const isPlaying = playingMessageId === item.id;
    const progress = audioDuration > 0 && isPlaying ? (audioPosition / audioDuration) * 100 : 0;
    const hasAudio = !!(item.media_url || item.encrypted_media_id);

    // For E2E encrypted messages from others that were just received via WebSocket
    // and are still downloading, show loading. Otherwise, show play button.
    // The download happens on-demand when user clicks play if not already downloaded.
    const isE2EFromOther = !isMe && !!item.encrypted_media_id && !item.media_url;
    // Only show downloading for messages explicitly marked as not ready (new WebSocket messages)
    // For messages loaded from API, assume they're ready and download on-demand if needed
    const isDownloading = isE2EFromOther && item.localMediaReady === false;

    return (
      <TouchableOpacity
        style={[
          styles.voiceMessageContainer,
          isMe ? styles.voiceMessageMe : styles.voiceMessageOther,
        ]}
        onPress={() => hasAudio && !isDownloading && handlePlayAudio(item)}
        activeOpacity={0.7}
        disabled={!hasAudio || isDownloading}
      >
        <View style={styles.voicePlayButton}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={lightTheme.colors.primary} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={isMe ? '#fff' : lightTheme.colors.primary}
            />
          )}
        </View>
        <View style={styles.voiceWaveContainer}>
          <View style={styles.voiceWaveBackground}>
            <View style={[styles.voiceWaveProgress, { width: `${progress}%` }]} />
          </View>
          <Text style={[styles.voiceDuration, isMe && styles.voiceDurationMe]}>
            {isDownloading ? t('chat.downloading') : isPlaying ? formatDuration(audioPosition) : t('messages.voiceMessage')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    const isVoice = item.type_message === 'VOCAL';
    const isPhoto = item.type_message === 'PHOTO';
    const isVideo = item.type_message === 'VIDEO';
    const isMediaMessage = isVoice || isPhoto || isVideo;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.messageContainerMe : styles.messageContainerOther,
        ]}
      >
        {!isMe && (
          <View style={styles.avatarSmall}>
            {params.ownerPhoto ? (
              <Image source={{ uri: params.ownerPhoto }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarSmallText}>
                {params.ownerName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
            isVoice && styles.messageBubbleVoice,
            (isPhoto || isVideo) && styles.encryptedMediaBubble,
          ]}
        >
          {isVoice && (item.media_url || item.encrypted_media_id) ? (
            renderVoiceMessage(item, isMe)
          ) : isPhoto && item.encrypted_media_id ? (
            renderPhotoMessage(item, isMe)
          ) : isVideo && item.encrypted_media_id ? (
            renderVideoMessage(item, isMe)
          ) : (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.messageTextMe : styles.messageTextOther,
              ]}
            >
              {item.contenu}
            </Text>
          )}
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.messageTimeMe : styles.messageTimeOther,
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <View style={styles.headerAvatar}>
                {params.ownerPhoto ? (
                  <Image source={{ uri: params.ownerPhoto }} style={styles.headerAvatarImage} />
                ) : (
                  <Text style={styles.headerAvatarText}>
                    {params.ownerName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              <View>
                <Text style={styles.headerName} numberOfLines={1}>
                  {params.ownerName || t('chat.owner')}
                </Text>
                {params.listingTitle && (
                  <Text style={styles.headerListing} numberOfLines={1}>
                    {params.listingTitle}
                  </Text>
                )}
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/listing/${listingId}` as any)}
              style={styles.headerRightButton}
            >
              <Ionicons name="home-outline" size={22} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messagesRenderKey}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: false });
              }
            }}
            ListHeaderComponent={
              params.listingTitle && messages.length === 0 ? (
                <View style={styles.listingCard}>
                  <View style={styles.listingCardContent}>
                    {params.listingPhoto ? (
                      <Image source={{ uri: params.listingPhoto }} style={styles.listingCardImage} />
                    ) : (
                      <View style={[styles.listingCardImage, styles.listingCardImagePlaceholder]}>
                        <Ionicons name="home-outline" size={24} color={Colors.neutral[400]} />
                      </View>
                    )}
                    <View style={styles.listingCardInfo}>
                      <Text style={styles.listingCardTitle} numberOfLines={2}>
                        {params.listingTitle}
                      </Text>
                      <Text style={styles.listingCardLocation}>{params.listingLocation}</Text>
                      <Text style={styles.listingCardPrice}>{params.listingPrice}</Text>
                    </View>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.neutral[300]} />
                <Text style={styles.emptyText}>{t('chat.sendFirstMessage')}</Text>
              </View>
            }
          />
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>{typingText}</Text>
          </View>
        )}

        {/* Recording UI - replaces input when recording */}
        {isRecordingVoice && (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingContent}>
              <Animated.View
                style={[
                  styles.recordingPulse,
                  { transform: [{ scale: recordingAnimValue }] },
                ]}
              >
                <View style={styles.recordingDot} />
              </Animated.View>
              <Text style={styles.recordingDuration}>
                {recordingState ? formatVoiceDuration(Math.floor(recordingState.durationMs / 1000)) : '0:00'}
              </Text>
              <Text style={styles.recordingText}>{t('chat.recording')}</Text>
            </View>
            <View style={styles.recordingActions}>
              <TouchableOpacity style={styles.recordingCancelButton} onPress={handleCancelRecording}>
                <Ionicons name="close" size={24} color={Colors.error[500]} />
                <Text style={styles.recordingCancelText}>{t('chat.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recordingStopButton} onPress={handleStopRecording}>
                <Ionicons name="send" size={24} color="#fff" />
                <Text style={styles.recordingStopText}>{t('chat.send')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Media preview modal */}
        {selectedMedia && (
          <View style={styles.mediaPreviewOverlay}>
            <View style={styles.mediaPreviewContent}>
              <TouchableOpacity
                style={styles.mediaPreviewClose}
                onPress={() => setSelectedMedia(null)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              {selectedMedia.type === 'image' ? (
                <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreviewImage} />
              ) : (
                <View style={styles.mediaPreviewVideo}>
                  <Ionicons name="videocam" size={48} color="#fff" />
                  <Text style={styles.mediaPreviewVideoText}>{t('chat.video')}</Text>
                </View>
              )}
              <View style={styles.mediaPreviewInfo}>
                <Text style={styles.mediaPreviewSize}>
                  {formatFileSize(selectedMedia.fileSize)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.mediaPreviewSend, isSendingMedia && styles.mediaPreviewSendDisabled]}
                onPress={handleSendMedia}
                disabled={isSendingMedia}
              >
                {isSendingMedia ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.mediaPreviewSendText}>{t('chat.send')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Media picker modal */}
        <Modal
          visible={showMediaPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMediaPicker(false)}
        >
          <Pressable style={styles.mediaPickerOverlay} onPress={() => setShowMediaPicker(false)}>
            <View style={styles.mediaPickerContent}>
              <View style={styles.mediaPickerHeader}>
                <Text style={styles.mediaPickerTitle}>{t('chat.shareMedia')}</Text>
                <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
                  <Ionicons name="close" size={24} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>
              <View style={styles.mediaPickerOptions}>
                <TouchableOpacity style={styles.mediaPickerOption} onPress={handleTakePhoto}>
                  <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.primary[100] }]}>
                    <Ionicons name="camera" size={28} color={lightTheme.colors.primary} />
                  </View>
                  <Text style={styles.mediaPickerOptionText}>{t('chat.takePhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaPickerOption} onPress={handlePickImage}>
                  <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.success[100] }]}>
                    <Ionicons name="image" size={28} color={Colors.success[600]} />
                  </View>
                  <Text style={styles.mediaPickerOptionText}>{t('chat.imageGallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaPickerOption} onPress={handlePickVideo}>
                  <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.warning[100] }]}>
                    <Ionicons name="videocam" size={28} color={Colors.warning[600]} />
                  </View>
                  <Text style={styles.mediaPickerOptionText}>{t('chat.videoGallery')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Fullscreen media viewer modal */}
        <Modal
          visible={!!fullscreenMedia}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenMedia(null)}
        >
          <View style={styles.fullscreenMediaOverlay}>
            <TouchableOpacity
              style={styles.fullscreenMediaClose}
              onPress={() => setFullscreenMedia(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {fullscreenMedia?.type === 'image' ? (
              <Image
                source={{ uri: fullscreenMedia.uri }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : fullscreenMedia?.type === 'video' ? (
              <View style={styles.fullscreenVideoContainer}>
                <Ionicons name="videocam" size={64} color="rgba(255,255,255,0.5)" />
                <Text style={styles.fullscreenVideoText}>
                  {t('chat.videoPlaybackUnavailable')}
                </Text>
                <Text style={styles.fullscreenVideoSubtext}>
                  {t('chat.openWithExternalApp')}
                </Text>
              </View>
            ) : null}
            <View style={styles.fullscreenMediaBadge}>
              <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.fullscreenMediaBadgeText}>{t('chat.e2eEncryption')}</Text>
            </View>
          </View>
        </Modal>

        {/* Input area - hidden during recording */}
        {!isRecordingVoice && (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {/* Attachment button */}
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => setShowMediaPicker(true)}
              disabled={isRecordingVoice || isSendingMedia}
            >
              <Ionicons name="attach" size={24} color={lightTheme.colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={t('chat.yourMessage')}
              placeholderTextColor={Colors.neutral[400]}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                // Send typing indicator
                if (text.length > 0 && conversationId) {
                  sendTypingIndicator(true);
                  // Clear previous timeout
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  // Stop typing after 2 seconds of no input
                  typingTimeoutRef.current = setTimeout(() => {
                    sendTypingIndicator(false);
                  }, 2000);
                }
              }}
              onBlur={() => {
                if (conversationId) {
                  sendTypingIndicator(false);
                }
              }}
              multiline
              maxLength={1000}
              editable={!isRecordingVoice}
            />

            {/* Show microphone or send button */}
            {message.trim() ? (
              <TouchableOpacity
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={handleSend}
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
                style={[styles.micButton, isRecordingVoice && styles.micButtonRecording]}
                onPress={handleStartRecording}
                disabled={isRecordingVoice || isSendingMedia || !conversationId}
              >
                <Ionicons name="mic" size={22} color={isRecordingVoice ? '#fff' : lightTheme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
    maxWidth: 180,
  },
  headerListing: {
    fontSize: 12,
    color: lightTheme.colors.primary,
    maxWidth: 180,
  },
  headerBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerRightButton: {
    padding: 8,
    marginRight: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageContainerMe: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    alignSelf: 'flex-start',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarSmallText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  messageBubbleMe: {
    backgroundColor: lightTheme.colors.primary,
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTextOther: {
    color: Colors.secondary[800],
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  messageTimeOther: {
    color: Colors.neutral[400],
  },
  listingCard: {
    marginBottom: 20,
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingCardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  listingCardImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listingCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  listingCardLocation: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  listingCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: lightTheme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.neutral[400],
  },
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
  // Voice message styles
  messageBubbleVoice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
  },
  voiceMessageMe: {},
  voiceMessageOther: {},
  voicePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceWaveContainer: {
    flex: 1,
  },
  voiceWaveBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  voiceWaveProgress: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  voiceDurationMe: {
    color: 'rgba(255,255,255,0.8)',
  },
  // Typing indicator styles
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral[400],
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  typingText: {
    fontSize: 13,
    color: Colors.neutral[500],
    fontStyle: 'italic',
  },
  // Attachment button
  attachmentButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Microphone button
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
  // Recording container (replaces input when recording)
  recordingContainer: {
    backgroundColor: Colors.background.primary,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  recordingContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingPulse: {
    marginBottom: 12,
  },
  recordingDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.error[500],
  },
  recordingDuration: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  recordingText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  recordingCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  recordingCancelText: {
    fontSize: 16,
    color: Colors.error[500],
    fontWeight: '500',
  },
  recordingStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  recordingStopText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Media picker modal
  mediaPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  mediaPickerContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  mediaPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  mediaPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  mediaPickerOptions: {
    paddingTop: 16,
  },
  mediaPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  mediaPickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mediaPickerOptionText: {
    fontSize: 16,
    color: Colors.secondary[800],
  },
  // Media preview overlay
  mediaPreviewOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  mediaPreviewContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mediaPreviewImage: {
    width: '90%',
    height: '60%',
    borderRadius: 12,
    resizeMode: 'contain',
  },
  mediaPreviewVideo: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewVideoText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 16,
  },
  mediaPreviewInfo: {
    marginTop: 16,
  },
  mediaPreviewSize: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  mediaPreviewSend: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    gap: 8,
  },
  mediaPreviewSendDisabled: {
    opacity: 0.6,
  },
  mediaPreviewSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // E2E encrypted media in messages
  encryptedMediaBubble: {
    minWidth: 200,
  },
  encryptedImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  encryptedImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  encryptedVideoContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  encryptedVideoIcon: {
    position: 'absolute',
  },
  encryptedMediaLoading: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    marginBottom: 4,
  },
  encryptedMediaLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.neutral[500],
  },
  e2eBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  e2eBadgeText: {
    fontSize: 10,
    color: Colors.neutral[400],
  },
  // Fullscreen media viewer
  fullscreenMediaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMediaClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  fullscreenVideoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fullscreenVideoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  fullscreenVideoSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
  fullscreenMediaBadge: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  fullscreenMediaBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});
