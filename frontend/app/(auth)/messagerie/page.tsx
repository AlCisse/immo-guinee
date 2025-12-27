'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Search,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Play,
  Pause,
  MoreVertical,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Clock,
  Smile,
  Image as ImageIcon,
  X,
  ArrowLeft,
  Circle,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

// Types
interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'image';
  voiceDuration?: number;
  imageUrl?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
  property?: {
    id: string;
    title: string;
    image: string;
  };
  lastMessage: {
    content: string;
    timestamp: Date;
    isRead: boolean;
  };
  unreadCount: number;
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    participant: {
      id: 'user1',
      name: 'Mamadou Diallo',
      avatar: '/images/avatars/user1.jpg',
      isOnline: true,
    },
    property: {
      id: 'prop1',
      title: 'Villa moderne à Kipé',
      image: '/images/properties/villa1.jpg',
    },
    lastMessage: {
      content: 'Bonjour, est-ce que la villa est toujours disponible ?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isRead: false,
    },
    unreadCount: 2,
  },
  {
    id: '2',
    participant: {
      id: 'user2',
      name: 'Fatoumata Barry',
      avatar: '/images/avatars/user2.jpg',
      isOnline: false,
      lastSeen: new Date(Date.now() - 30 * 60 * 1000),
    },
    property: {
      id: 'prop2',
      title: 'Appartement 3 pièces Ratoma',
      image: '/images/properties/apt1.jpg',
    },
    lastMessage: {
      content: 'Message vocal',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: true,
    },
    unreadCount: 0,
  },
  {
    id: '3',
    participant: {
      id: 'user3',
      name: 'Ibrahima Sow',
      avatar: '/images/avatars/user3.jpg',
      isOnline: true,
    },
    lastMessage: {
      content: 'Merci pour les informations !',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isRead: true,
    },
    unreadCount: 0,
  },
  {
    id: '4',
    participant: {
      id: 'user4',
      name: 'Aissatou Camara',
      avatar: '/images/avatars/user4.jpg',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    property: {
      id: 'prop3',
      title: 'Bureau commercial Kaloum',
      image: '/images/properties/office1.jpg',
    },
    lastMessage: {
      content: 'Je suis intéressée par une visite',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isRead: true,
    },
    unreadCount: 0,
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'user1',
    content: 'Bonjour ! Je suis intéressé par votre villa à Kipé.',
    type: 'text',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    status: 'read',
  },
  {
    id: '2',
    senderId: 'me',
    content: 'Bonjour Mamadou ! Oui, la villa est toujours disponible. Elle fait 250m² avec 4 chambres.',
    type: 'text',
    timestamp: new Date(Date.now() - 55 * 60 * 1000),
    status: 'read',
  },
  {
    id: '3',
    senderId: 'user1',
    content: '',
    type: 'voice',
    voiceDuration: 15,
    timestamp: new Date(Date.now() - 50 * 60 * 1000),
    status: 'read',
  },
  {
    id: '4',
    senderId: 'me',
    content: 'Oui bien sûr ! Je peux vous la faire visiter demain si vous êtes disponible.',
    type: 'text',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: 'read',
  },
  {
    id: '5',
    senderId: 'user1',
    content: 'Parfait ! À quelle heure ?',
    type: 'text',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    status: 'read',
  },
  {
    id: '6',
    senderId: 'user1',
    content: 'Bonjour, est-ce que la villa est toujours disponible ?',
    type: 'text',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'delivered',
  },
];

// Voice Message Component
function VoiceMessage({ duration, isMine }: { duration: number; isMine: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + (100 / (duration * 10));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`p-2 rounded-full transition-colors ${
          isMine
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-primary-100 dark:bg-primary-500/20 hover:bg-primary-200 dark:hover:bg-primary-500/30'
        }`}
      >
        {isPlaying ? (
          <Pause className={`w-4 h-4 ${isMine ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
        ) : (
          <Play className={`w-4 h-4 ${isMine ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
        )}
      </button>

      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${isMine ? 'bg-white/30' : 'bg-neutral-200 dark:bg-neutral-600'}`}>
          <motion.div
            className={`h-full ${isMine ? 'bg-white' : 'bg-primary-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
          {formatDuration(duration)}
        </p>
      </div>
    </div>
  );
}

// Message Status Icon
function MessageStatus({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sending':
      return <Clock className="w-3.5 h-3.5 text-white/50" />;
    case 'sent':
      return <Check className="w-3.5 h-3.5 text-white/70" />;
    case 'delivered':
      return <CheckCheck className="w-3.5 h-3.5 text-white/70" />;
    case 'read':
      return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;
  }
}

// Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(date: Date, t: (key: string, params?: Record<string, any>) => string): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return t('messages.online');
  if (minutes < 60) return t('messages.time.minutesAgo', { count: minutes });
  if (hours < 24) return t('messages.time.hoursAgo', { count: hours });
  if (days === 1) return t('messages.time.yesterday');
  return date.toLocaleDateString('fr-FR');
}

export default function MessagingPage() {
  const { t } = useTranslations();
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      content: newMessage,
      type: 'text',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Simulate message sent
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: 'sent' } : m))
      );
    }, 500);

    // Simulate message delivered
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: 'delivered' } : m))
      );
    }, 1500);
  };

  const handleSendVoice = () => {
    if (recordingTime < 1) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      content: '',
      type: 'voice',
      voiceDuration: recordingTime,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages([...messages, message]);
    setIsRecording(false);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: 'delivered' } : m))
      );
    }, 1000);
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.property?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-80px)] flex bg-neutral-50 dark:bg-dark-bg">
      {/* Conversations List */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full md:w-96 bg-white dark:bg-dark-card border-r border-neutral-200 dark:border-dark-border flex flex-col ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-dark-border">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
            {t('messages.title')}
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder={t('messages.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-dark-bg border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <motion.button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              whileHover={{ backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
              className={`w-full p-4 flex items-start gap-3 border-b border-neutral-100 dark:border-dark-border transition-colors text-left ${
                selectedConversation?.id === conv.id
                  ? 'bg-primary-50 dark:bg-primary-500/10'
                  : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {conv.participant.name.charAt(0)}
                </div>
                {conv.participant.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success-500 border-2 border-white dark:border-dark-card rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                    {conv.participant.name}
                  </h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                    {formatLastSeen(conv.lastMessage.timestamp, t)}
                  </span>
                </div>

                {conv.property && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 truncate mb-1">
                    {conv.property.title}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                    {conv.lastMessage.content}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 ml-2 w-5 h-5 bg-primary-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col ${
          !showMobileChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border flex items-center gap-4">
              <button
                onClick={() => setShowMobileChat(false)}
                className="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </button>

              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {selectedConversation.participant.name.charAt(0)}
                </div>
                {selectedConversation.participant.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white dark:border-dark-card rounded-full" />
                )}
              </div>

              <div className="flex-1">
                <h2 className="font-semibold text-neutral-900 dark:text-white">
                  {selectedConversation.participant.name}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedConversation.participant.isOnline
                    ? t('messages.online')
                    : `${t('messages.lastSeen')} ${formatLastSeen(selectedConversation.participant.lastSeen || new Date(), t)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                </button>
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors">
                  <Video className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                </button>
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors">
                  <Info className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                </button>
              </div>
            </div>

            {/* Property Context */}
            {selectedConversation.property && (
              <div className="px-4 py-2 bg-primary-50 dark:bg-primary-500/10 border-b border-primary-100 dark:border-primary-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-neutral-200 dark:bg-dark-bg overflow-hidden relative">
                    <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-600/20" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {selectedConversation.property.title}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">
                      {t('messages.linkedToProperty')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-dark-bg">
              {messages.map((message, index) => {
                const isMine = message.senderId === 'me';
                const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId === 'me');

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
                          {selectedConversation.participant.name.charAt(0)}
                        </div>
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? 'bg-primary-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-dark-card text-neutral-900 dark:text-white rounded-bl-md shadow-soft'
                      }`}
                    >
                      {message.type === 'voice' ? (
                        <VoiceMessage duration={message.voiceDuration || 0} isMine={isMine} />
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}

                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? '' : 'text-neutral-400'}`}>
                        <span className={`text-xs ${isMine ? 'text-white/70' : 'text-neutral-400'}`}>
                          {formatTime(message.timestamp)}
                        </span>
                        {isMine && <MessageStatus status={message.status} />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border">
              <AnimatePresence mode="wait">
                {isRecording ? (
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-4"
                  >
                    <button
                      onClick={() => setIsRecording(false)}
                      className="p-3 bg-error-100 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="flex-1 flex items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-3 h-3 bg-error-500 rounded-full"
                      />
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </span>
                      <div className="flex-1 h-8 bg-neutral-100 dark:bg-dark-bg rounded-lg overflow-hidden">
                        <motion.div
                          className="h-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center"
                          animate={{ width: ['0%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <div className="flex gap-0.5">
                            {[...Array(20)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1 bg-primary-500 rounded-full"
                                animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    <button
                      onClick={handleSendVoice}
                      className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3"
                  >
                    <button className="p-2.5 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full transition-colors">
                      <Smile className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                    <button className="p-2.5 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full transition-colors">
                      <Paperclip className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                    <button className="p-2.5 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full transition-colors">
                      <ImageIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={t('messages.typeMessage')}
                      className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-dark-bg border-0 rounded-full text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />

                    {newMessage.trim() ? (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={handleSendMessage}
                        className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    ) : (
                      <button
                        onClick={() => setIsRecording(true)}
                        className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-500/10 rounded-full flex items-center justify-center">
                <Send className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                {t('messages.yourMessages')}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-sm">
                {t('messages.selectConversation')}
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
