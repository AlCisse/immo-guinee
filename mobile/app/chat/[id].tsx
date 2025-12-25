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

// Stable empty array to avoid creating new references in selectors
const EMPTY_MESSAGES: LocalMessage[] = [];

export default function ChatScreen() {
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

  // Typing timeout ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      Alert.alert('Erreur', error.message || 'Impossible de demarrer l\'enregistrement');
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

      // Reload messages
      const msgResponse = await api.messaging.getMessages(conversationId);
      setMessages(msgResponse.data?.data || []);
    } catch (error: any) {
      if (__DEV__) console.error('Error sending voice:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le message vocal');
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
      Alert.alert('Erreur', error.message || 'Impossible de selectionner l\'image');
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
      Alert.alert('Erreur', error.message || 'Impossible de selectionner la video');
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
      Alert.alert('Erreur', error.message || 'Impossible de prendre la photo');
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

      // Reload messages
      const msgResponse = await api.messaging.getMessages(conversationId);
      setMessages(msgResponse.data?.data || []);
    } catch (error: any) {
      if (__DEV__) console.error('Error sending media:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le media');
    } finally {
      setIsSendingMedia(false);
    }
  }, [selectedMedia, conversationId, user]);

  // Load decrypted media URI for display
  const loadMediaUri = useCallback(async (mediaId: string) => {
    if (mediaUris[mediaId]) return; // Already loaded

    const uri = await getMediaForDisplay(mediaId);
    if (uri) {
      setMediaUris((prev) => ({ ...prev, [mediaId]: uri }));
    }
  }, [mediaUris]);

  // Handle audio playback
  const handlePlayAudio = useCallback(async (messageId: string, mediaUrl: string) => {
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

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: mediaUrl },
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
      Alert.alert('Erreur', 'Impossible de lire le message vocal');
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
            setMessages(fetchedMessages);
            setMessagesInStore(existing.id, fetchedMessages);
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
          setMessages(fetchedMessages);
          setMessagesInStore(params.id, fetchedMessages);
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
    if (storeMessages.length > 0) {
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
        setMessages(fetchedMessages);
        setMessagesInStore(conversationId, fetchedMessages);
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
          Alert.alert('Erreur', 'Impossible de demarrer la conversation');
          return;
        }

        setMessage('');

        // Reload messages after creating conversation with first message
        const msgResponse = await api.messaging.getMessages(convId);
        setMessages(msgResponse.data?.data || []);
        return; // Don't send message again - it was included in startConversation
      }

      if (!convId) {
        Alert.alert('Erreur', 'Conversation non trouvee');
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
      setMessages(msgResponse.data?.data || []);

    } catch (error: any) {
      if (__DEV__) console.error('Error sending message:', error);
      Alert.alert('Erreur', error.response?.data?.message || "Impossible d'envoyer le message");
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

  // Render voice message bubble
  const renderVoiceMessage = (item: Message, isMe: boolean) => {
    const isPlaying = playingMessageId === item.id;
    const progress = audioDuration > 0 && isPlaying ? (audioPosition / audioDuration) * 100 : 0;

    return (
      <TouchableOpacity
        style={[
          styles.voiceMessageContainer,
          isMe ? styles.voiceMessageMe : styles.voiceMessageOther,
        ]}
        onPress={() => item.media_url && handlePlayAudio(item.id, item.media_url)}
        activeOpacity={0.7}
      >
        <View style={styles.voicePlayButton}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={isMe ? '#fff' : lightTheme.colors.primary}
          />
        </View>
        <View style={styles.voiceWaveContainer}>
          <View style={styles.voiceWaveBackground}>
            <View style={[styles.voiceWaveProgress, { width: `${progress}%` }]} />
          </View>
          <Text style={[styles.voiceDuration, isMe && styles.voiceDurationMe]}>
            {isPlaying ? formatDuration(audioPosition) : 'Message vocal'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    const isVoice = item.type_message === 'VOCAL';

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
          ]}
        >
          {isVoice && item.media_url ? (
            renderVoiceMessage(item, isMe)
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
                  {params.ownerName || 'Proprietaire'}
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
                <Text style={styles.emptyText}>Envoyez votre premier message</Text>
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

        {/* Recording UI overlay */}
        {isRecordingVoice && (
          <View style={styles.recordingOverlay}>
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
              <Text style={styles.recordingText}>Enregistrement en cours...</Text>
            </View>
            <View style={styles.recordingActions}>
              <TouchableOpacity style={styles.recordingCancelButton} onPress={handleCancelRecording}>
                <Ionicons name="close" size={24} color={Colors.error[500]} />
                <Text style={styles.recordingCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recordingStopButton} onPress={handleStopRecording}>
                <Ionicons name="send" size={24} color="#fff" />
                <Text style={styles.recordingStopText}>Envoyer</Text>
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
                  <Text style={styles.mediaPreviewVideoText}>Video</Text>
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
                    <Text style={styles.mediaPreviewSendText}>Envoyer</Text>
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
                <Text style={styles.mediaPickerTitle}>Partager un media</Text>
                <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
                  <Ionicons name="close" size={24} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>
              <View style={styles.mediaPickerOptions}>
                <TouchableOpacity style={styles.mediaPickerOption} onPress={handleTakePhoto}>
                  <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.primary[100] }]}>
                    <Ionicons name="camera" size={28} color={lightTheme.colors.primary} />
                  </View>
                  <Text style={styles.mediaPickerOptionText}>Prendre une photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaPickerOption} onPress={handlePickImage}>
                  <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.success[100] }]}>
                    <Ionicons name="image" size={28} color={Colors.success[600]} />
                  </View>
                  <Text style={styles.mediaPickerOptionText}>Galerie d'images</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaPickerOption} onPress={handlePickVideo}>
                  <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.warning[100] }]}>
                    <Ionicons name="videocam" size={28} color={Colors.warning[600]} />
                  </View>
                  <Text style={styles.mediaPickerOptionText}>Galerie de videos</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Input area */}
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
              placeholder="Votre message..."
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
    paddingVertical: 12,
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
  // Recording overlay
  recordingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
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
});
