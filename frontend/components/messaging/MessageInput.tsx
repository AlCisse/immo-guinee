'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { apiClient } from '@/lib/api/client';

interface MessageInputProps {
  conversationId: string;
}

type MessageType = 'TEXTE' | 'VOCAL' | 'PHOTO';

interface SendMessageData {
  type_message: MessageType;
  contenu_texte?: string;
  fichier?: File;
}

// Send message API call
async function sendMessage(conversationId: string, data: SendMessageData) {
  const formData = new FormData();
  formData.append('type_message', data.type_message);

  if (data.contenu_texte) {
    formData.append('contenu_texte', data.contenu_texte);
  }

  if (data.fichier) {
    formData.append('fichier', data.fichier);
  }

  const response = await apiClient.post(`/messaging/${conversationId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (data: SendMessageData) => sendMessage(conversationId, data),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Handle text message submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedMessage = message.trim();

      if (!trimmedMessage || sendMutation.isPending) return;

      sendMutation.mutate({
        type_message: 'TEXTE',
        contenu_texte: trimmedMessage,
      });
    },
    [message, sendMutation]
  );

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Seules les images sont acceptées');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('La taille maximale est de 10 Mo');
      return;
    }

    sendMutation.mutate({
      type_message: 'PHOTO',
      fichier: file,
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle voice recording start
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // TODO: Implement actual recording logic with MediaRecorder
      console.log('Recording started', stream);
    } catch (err) {
      console.error('Could not start recording:', err);
      alert('Impossible d\'accéder au microphone');
    }
  };

  // Handle voice recording stop
  const stopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    // TODO: Send the recorded audio
    console.log('Recording stopped, duration:', recordingDuration);
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Common emoji list
  const commonEmojis = ['😀', '😂', '😊', '❤️', '👍', '🙏', '🏠', '✨', '🎉', '👋'];

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* Voice recording UI */}
      {isRecording ? (
        <div className="flex items-center gap-4">
          <button
            onClick={stopRecording}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" strokeWidth="2" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-gray-600">Enregistrement...</span>
            <span className="text-gray-400">{formatDuration(recordingDuration)}</span>
          </div>

          <button
            onClick={stopRecording}
            className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Joindre une image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Écrivez un message..."
              rows={1}
              className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-2 pr-10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />

            {/* Emoji button */}
            <div className="absolute right-2 bottom-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Simple emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setMessage((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Voice / Send button */}
          {message.trim() ? (
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className={clsx(
                'p-2 rounded-full text-white',
                sendMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-500 hover:bg-primary-600'
              )}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Enregistrer un message vocal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          )}
        </form>
      )}

      {/* Character limit warning */}
      {message.length > 1800 && (
        <p className="mt-1 text-xs text-yellow-600">
          {2000 - message.length} caractères restants
        </p>
      )}
    </div>
  );
}
