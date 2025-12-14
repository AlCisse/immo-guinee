'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Search,
  Send,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  MoreVertical,
  ChevronLeft,
  Check,
  CheckCheck,
  X,
  Home,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

// Types
interface Message {
  id: string;
  sender_id: string;
  contenu: string;
  type_message: 'TEXT' | 'VOCAL' | 'PHOTO' | 'SYSTEM';
  media_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    nom_complet: string;
  };
}

interface Conversation {
  id: string;
  subject: string;
  last_message_at: string;
  unread_count: number;
  initiator: {
    id: string;
    nom_complet: string;
  };
  participant: {
    id: string;
    nom_complet: string;
  };
  listing?: {
    id: string;
    titre: string;
    loyer_mensuel: string;
    photo_principale?: string;
  };
  last_message?: {
    contenu: string;
    type_message: string;
    created_at: string;
  };
}

// Format time
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const formatLastSeen = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'A l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
};

// Format price
const formatPrice = (price: string | number) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return 'Prix non defini';
  return new Intl.NumberFormat('fr-GN').format(num) + ' GNF';
};

// Message Status
function MessageStatus({ isRead }: { isRead: boolean }) {
  return isRead ? (
    <CheckCheck className="w-4 h-4 text-blue-300" />
  ) : (
    <Check className="w-4 h-4 text-white/70" />
  );
}

// Voice message component
function VoiceMessage({ url, isMine }: { url: string; isMine: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      console.error('Audio load error:', audioElement.error?.message, 'URL:', url);
      setError(true);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(true);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no valid URL
  // Accept: /storage/messages/xxx.mp4 or http://localhost:9000/immog-messages/xxx.mp4
  const isValidUrl = url &&
    url.length > 20 &&
    (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.wav') || url.endsWith('.mp3')) &&
    (url.startsWith('/storage/') || url.includes('immog-messages'));

  if (!isValidUrl) {
    return (
      <div className={`flex items-center gap-2 text-sm ${isMine ? 'text-white/70' : 'text-neutral-400'}`}>
        <Mic className="w-4 h-4" />
        <span>Message vocal</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm ${isMine ? 'text-white/70' : 'text-neutral-400'}`}>
        <Mic className="w-4 h-4" />
        <span>Audio non disponible</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {/* Use video element for better MP4/AAC compatibility across browsers */}
      <video
        ref={audioRef}
        src={url}
        preload="metadata"
        playsInline
        style={{ display: 'none' }}
      />
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-primary-100 hover:bg-primary-200 dark:bg-primary-500/20'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <Loader2 className={`w-5 h-5 animate-spin ${isMine ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
        ) : isPlaying ? (
          <Pause className={`w-5 h-5 ${isMine ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
        ) : (
          <Play className={`w-5 h-5 ${isMine ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
        )}
      </button>
      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${isMine ? 'bg-white/30' : 'bg-neutral-200 dark:bg-dark-border'}`}>
          <div
            className={`h-full transition-all ${isMine ? 'bg-white' : 'bg-primary-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-xs mt-1 block ${isMine ? 'text-white/70' : 'text-neutral-400'}`}>
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification tone
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1); // C#6

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Ignore audio errors
    }
  }, []);

  // Fetch conversations with real-time polling
  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await api.messaging.conversations();
      return response.data;
    },
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Fetch messages for selected conversation with real-time polling
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const response = await api.messaging.getMessages(selectedConversation.id);
      return response.data;
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000, // Poll every 2 seconds for faster updates
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) throw new Error('No conversation selected');
      return api.messaging.sendMessage(selectedConversation.id, {
        type_message: 'TEXT',
        contenu: content,
      });
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi du message');
    },
  });

  // Send voice message mutation
  const sendVoiceMutation = useMutation({
    mutationFn: async (audioFile: File) => {
      if (!selectedConversation) throw new Error('No conversation selected');
      return api.messaging.sendMessage(selectedConversation.id, {
        type_message: 'VOCAL',
        fichier: audioFile,
      });
    },
    onSuccess: () => {
      setAudioBlob(null);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Message vocal envoye');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi du message vocal');
    },
  });

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best supported audio format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Audio blob size:', audioBlob.size);
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with timeslice to get data every 1 second
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Impossible d\'acceder au microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  const sendVoiceMessage = useCallback(() => {
    if (audioBlob) {
      // Use the blob's mime type and appropriate extension
      const mimeType = audioBlob.type || 'audio/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
      const file = new File([audioBlob], `voice_message.${extension}`, { type: mimeType });
      console.log('Sending voice file:', file.name, file.size, 'bytes', file.type);
      sendVoiceMutation.mutate(file);
    }
  }, [audioBlob, sendVoiceMutation]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Extract conversations array
  const conversations: Conversation[] = conversationsData?.data || conversationsData || [];
  const messages: Message[] = messagesData?.data || messagesData || [];

  // Detect new messages and play notification sound
  useEffect(() => {
    if (messages.length > 0) {
      const currentCount = messages.length;
      const lastMessage = messages[messages.length - 1];

      // Check if there's a new message from someone else
      if (currentCount > lastMessageCountRef.current && lastMessageCountRef.current > 0) {
        if (lastMessage.sender_id !== user?.id) {
          playNotificationSound();
        }
      }

      lastMessageCountRef.current = currentCount;
    }
  }, [messages, user?.id, playNotificationSound]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
  };

  // Get the other participant (not current user)
  const getOtherParticipant = (conv: Conversation) => {
    if (!user) return conv.participant;
    return conv.initiator.id === user.id ? conv.participant : conv.initiator;
  };

  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherParticipant(conv);
    return (
      other.nom_complet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.listing?.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="h-[calc(100vh-136px)] md:h-[calc(100vh-64px)] flex bg-neutral-50 dark:bg-dark-bg">
      {/* Conversations List */}
      <div
        className={`w-full md:w-96 bg-white dark:bg-dark-card border-r border-neutral-100 dark:border-neutral-800 flex flex-col ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
            Messages
          </h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-full text-sm border border-neutral-200/50 dark:border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:text-white placeholder-neutral-400"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const otherParticipant = getOtherParticipant(conv);
              return (
                <motion.button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 flex gap-3 border-b border-neutral-50 dark:border-neutral-800/50 text-left transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-primary-50 dark:bg-primary-500/10'
                      : 'hover:bg-neutral-50 dark:hover:bg-dark-bg'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-semibold">
                      {otherParticipant.nom_complet?.charAt(0) || '?'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                        {otherParticipant.nom_complet}
                      </h3>
                      <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                        {formatLastSeen(conv.last_message_at)}
                      </span>
                    </div>

                    {conv.listing && (
                      <div className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 mb-1">
                        <Home className="w-3 h-3" />
                        <span className="truncate">{conv.listing.titre}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-500 truncate flex items-center gap-1">
                        {conv.last_message?.type_message === 'VOCAL' && <Mic className="w-3 h-3" />}
                        {conv.last_message?.contenu || conv.subject || 'Nouvelle conversation'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-dark-bg rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-neutral-500 text-center">
                {searchQuery ? 'Aucune conversation trouvee' : 'Aucune conversation'}
              </p>
              <p className="text-sm text-neutral-400 text-center mt-2">
                Contactez un proprietaire pour demarrer une conversation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 bg-white dark:bg-dark-card border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <button
                onClick={() => setShowMobileChat(false)}
                className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full"
              >
                <ChevronLeft className="w-6 h-6 text-neutral-700 dark:text-white" />
              </button>

              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {getOtherParticipant(selectedConversation).nom_complet?.charAt(0) || '?'}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-neutral-900 dark:text-white truncate">
                  {getOtherParticipant(selectedConversation).nom_complet}
                </h2>
                <p className="text-xs text-neutral-500">
                  {selectedConversation.subject || 'Conversation'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full">
                  <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                </button>
              </div>
            </div>

            {/* Property Context */}
            {selectedConversation.listing && (
              <Link href={`/bien/${selectedConversation.listing.id}`}>
                <div className="px-4 py-3 bg-primary-50 dark:bg-primary-500/10 border-b border-primary-100 dark:border-primary-500/20 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-700 dark:to-primary-800 flex items-center justify-center">
                    <Home className="w-6 h-6 text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      {selectedConversation.listing.titre}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">
                      {formatPrice(selectedConversation.listing.loyer_mensuel)}/mois
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-dark-bg">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((message, index) => {
                  const isMine = message.sender_id === user?.id;
                  const showAvatar = !isMine && (index === 0 || messages[index - 1].sender_id === user?.id);

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                            {getOtherParticipant(selectedConversation).nom_complet?.charAt(0) || '?'}
                          </div>
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          isMine
                            ? 'bg-primary-500 text-white rounded-br-sm'
                            : 'bg-white dark:bg-dark-card text-neutral-900 dark:text-white rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {message.type_message === 'VOCAL' && message.media_url ? (
                          <VoiceMessage url={message.media_url} isMine={isMine} />
                        ) : (
                          <p className="text-[15px] leading-relaxed">{message.contenu}</p>
                        )}

                        <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMine ? '' : 'text-neutral-400'}`}>
                          <span className={`text-[11px] ${isMine ? 'text-white/70' : 'text-neutral-400'}`}>
                            {formatTime(message.created_at)}
                          </span>
                          {isMine && <MessageStatus isRead={message.is_read} />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="w-12 h-12 text-neutral-300 mb-3" />
                  <p className="text-neutral-500">Aucun message</p>
                  <p className="text-sm text-neutral-400">Envoyez le premier message!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-dark-card border-t border-neutral-100 dark:border-neutral-800">
              <AnimatePresence mode="wait">
                {isRecording ? (
                  /* Recording UI */
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3"
                  >
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={cancelRecording}
                      className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>

                    <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 rounded-full">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-3 h-3 bg-red-500 rounded-full"
                      />
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {formatRecordingTime(recordingTime)}
                      </span>
                      <div className="flex-1 flex items-center gap-1">
                        {[...Array(20)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                            className="w-1 bg-red-400 rounded-full"
                          />
                        ))}
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={stopRecording}
                      className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </motion.button>
                  </motion.div>
                ) : audioBlob ? (
                  /* Audio preview UI */
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3"
                  >
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={cancelRecording}
                      className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>

                    <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-primary-50 dark:bg-primary-500/10 rounded-full">
                      <Mic className="w-5 h-5 text-primary-500" />
                      <span className="text-primary-600 dark:text-primary-400 font-medium">
                        Message vocal pret
                      </span>
                      <span className="text-sm text-primary-500">
                        {formatRecordingTime(recordingTime)}
                      </span>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={sendVoiceMessage}
                      disabled={sendVoiceMutation.isPending}
                      className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50"
                    >
                      {sendVoiceMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </motion.button>
                  </motion.div>
                ) : (
                  /* Normal input UI */
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 flex items-center bg-neutral-50 dark:bg-neutral-800/50 rounded-full border border-neutral-200/50 dark:border-neutral-700/50">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Ecrivez un message..."
                        className="flex-1 px-5 py-3 bg-transparent focus:outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
                        disabled={sendMessageMutation.isPending}
                      />
                    </div>

                    {newMessage.trim() ? (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={sendMessage}
                        disabled={sendMessageMutation.isPending}
                        className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </motion.button>
                    ) : (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={startRecording}
                        className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 shadow-sm"
                      >
                        <Mic className="w-5 h-5" />
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
            <div className="text-center px-4">
              <div className="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center">
                <Send className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Vos messages
              </h2>
              <p className="text-neutral-500 max-w-sm">
                Selectionnez une conversation pour discuter avec un proprietaire ou une agence.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
