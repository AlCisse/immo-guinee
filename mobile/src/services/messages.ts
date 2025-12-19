import api from './api';
import { Conversation, Message, PaginatedResponse } from '../types';

// Get all conversations
export const getConversations = async (page: number = 1): Promise<PaginatedResponse<Conversation>> => {
  const response = await api.get<PaginatedResponse<Conversation>>('/conversations', {
    params: { page },
  });
  return response.data;
};

// Get single conversation
export const getConversation = async (id: string): Promise<Conversation> => {
  const response = await api.get<{ data: Conversation }>(`/conversations/${id}`);
  return response.data.data;
};

// Get messages in conversation
export const getMessages = async (
  conversationId: string,
  page: number = 1
): Promise<PaginatedResponse<Message>> => {
  const response = await api.get<PaginatedResponse<Message>>(
    `/conversations/${conversationId}/messages`,
    { params: { page } }
  );
  return response.data;
};

// Send message
export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Message> => {
  const response = await api.post<{ data: Message }>(
    `/conversations/${conversationId}/messages`,
    { content }
  );
  return response.data.data;
};

// Start new conversation about a listing
export const startConversation = async (
  listingId: string,
  message: string
): Promise<Conversation> => {
  const response = await api.post<{ data: Conversation }>('/conversations', {
    listing_id: listingId,
    message,
  });
  return response.data.data;
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  await api.post(`/conversations/${conversationId}/read`);
};

// Get unread count
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<{ data: { count: number } }>('/conversations/unread-count');
  return response.data.data.count;
};
