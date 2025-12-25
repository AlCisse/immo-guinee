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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Message } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

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
            setMessages(msgResponse.data?.data || []);
            // Refresh unread count since messages were marked as read
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
          }
          // If no existing conversation, we'll create one on first message
        } else {
          // Coming from messages list - we have a conversation ID
          setConversationId(params.id);
          // Load messages (this marks them as read on the backend)
          const msgResponse = await api.messaging.getMessages(params.id);
          setMessages(msgResponse.data?.data || []);
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

  // Poll for new messages
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.messaging.getMessages(conversationId);
        setMessages(response.data?.data || []);
        // Refresh unread count (marks messages as read on backend)
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      } catch (error) {
        // Silent fail for polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, queryClient]);

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

        {/* Input area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Votre message..."
              placeholderTextColor={Colors.neutral[400]}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!message.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
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
});
