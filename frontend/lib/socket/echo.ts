import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

// Initialize Pusher globally for Laravel Echo
if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
}

// Echo configuration for real-time events
const echoConfig = {
  broadcaster: 'pusher' as const,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'eu',
  wsHost: process.env.NEXT_PUBLIC_WEBSOCKET_HOST || 'localhost',
  wsPort: parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_PORT || '6001', 10),
  wssPort: parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_PORT || '6001', 10),
  forceTLS: process.env.NODE_ENV === 'production',
  encrypted: true,
  disableStats: true,
  enabledTransports: ['ws', 'wss'] as ('ws' | 'wss')[],
  authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
};

let echoInstance: Echo | null = null;

/**
 * Get or create the Echo instance
 * Uses singleton pattern to ensure single connection
 */
export function getEcho(): Echo | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!echoInstance) {
    echoInstance = new Echo(echoConfig);
    window.Echo = echoInstance;
  }

  return echoInstance;
}

/**
 * Subscribe to a private channel with authentication
 */
export function subscribeToPrivateChannel(channelName: string) {
  const echo = getEcho();
  if (!echo) return null;

  return echo.private(channelName);
}

/**
 * Subscribe to a public channel
 */
export function subscribeToChannel(channelName: string) {
  const echo = getEcho();
  if (!echo) return null;

  return echo.channel(channelName);
}

/**
 * Subscribe to a presence channel for user awareness
 */
export function subscribeToPresenceChannel(channelName: string) {
  const echo = getEcho();
  if (!echo) return null;

  return echo.join(channelName);
}

/**
 * Leave a channel
 */
export function leaveChannel(channelName: string) {
  const echo = getEcho();
  if (!echo) return;

  echo.leave(channelName);
}

/**
 * Disconnect from all channels
 */
export function disconnect() {
  const echo = getEcho();
  if (!echo) return;

  echo.disconnect();
  echoInstance = null;
}

// Channel name generators for consistency
export const channels = {
  // User-specific private channel for notifications
  userNotifications: (userId: string) => `user.${userId}`,

  // Conversation channel for real-time messaging
  conversation: (conversationId: string) => `conversation.${conversationId}`,

  // Listing channel for bid updates
  listing: (listingId: string) => `listing.${listingId}`,

  // Contract channel for status updates
  contract: (contractId: string) => `contract.${contractId}`,

  // Payment channel for transaction updates
  payment: (paymentId: string) => `payment.${paymentId}`,
};

// Event types for type safety
export const events = {
  // Messaging events
  NEW_MESSAGE: '.new.message',
  MESSAGE_READ: '.message.read',
  TYPING: '.typing',

  // Payment events
  PAYMENT_STATUS_UPDATED: '.payment.status.updated',
  PAYMENT_CONFIRMED: '.payment.confirmed',
  PAYMENT_FAILED: '.payment.failed',

  // Contract events
  CONTRACT_STATUS_UPDATED: '.contract.status.updated',
  CONTRACT_SIGNED: '.contract.signed',

  // Listing events
  LISTING_UPDATED: '.listing.updated',
  NEW_BID: '.new.bid',

  // General notifications
  NOTIFICATION: '.notification',
};

export default getEcho;
