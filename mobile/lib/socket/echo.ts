import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { tokenManager, api } from '@/lib/api/client';
import { AppState, AppStateStatus } from 'react-native';

// Make Pusher available globally for Laravel Echo
(global as any).Pusher = Pusher;

// Default Reverb configuration (host/port/scheme from env, key fetched from API)
interface ReverbConfig {
  key: string;
  host: string;
  port: number;
  scheme: string;
}

let reverbConfig: ReverbConfig | null = null;

/**
 * Fetch Reverb configuration from backend API
 * This keeps the Reverb key secure on the server side
 */
async function fetchReverbConfig(): Promise<ReverbConfig | null> {
  // Return cached config if available
  if (reverbConfig) {
    return reverbConfig;
  }

  try {
    const response = await api.config.websocket();
    if (response.data?.success && response.data?.data) {
      const { key, host, port, scheme } = response.data.data;
      reverbConfig = {
        key,
        host: host || process.env.EXPO_PUBLIC_REVERB_HOST || 'immoguinee.com',
        port: port || 443,
        scheme: scheme || 'https',
      };
      if (__DEV__) console.log('✅ [Echo] WebSocket config fetched from API');
      return reverbConfig;
    }
    return null;
  } catch (error) {
    if (__DEV__) console.error('[Echo] Failed to fetch WebSocket config:', error);
    return null;
  }
}

/**
 * Clear cached Reverb config (call on logout)
 */
export function clearReverbConfig(): void {
  reverbConfig = null;
}

let echoInstance: Echo<'reverb'> | null = null;
let connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

/**
 * Initialize Laravel Echo with Reverb WebSocket server
 */
export async function initializeEcho(): Promise<Echo<'reverb'> | null> {
  if (echoInstance) {
    return echoInstance;
  }

  const token = await tokenManager.getToken();
  if (!token) {
    return null;
  }

  // Fetch Reverb config from backend API (secure)
  const config = await fetchReverbConfig();
  if (!config) {
    if (__DEV__) console.error('[Echo] Cannot initialize: config not available');
    return null;
  }

  try {
    connectionState = 'connecting';

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: config.key,
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: config.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `https://${config.host}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
      // Pusher configuration
      cluster: 'mt1',
      disableStats: true,
    });

    // Setup connection event handlers
    setupConnectionHandlers();

    connectionState = 'connected';
    reconnectAttempts = 0;

    if (__DEV__) console.log('✅ [Echo] WebSocket initialized');

    return echoInstance;
  } catch (error) {
    connectionState = 'error';
    if (__DEV__) console.error('[Echo] Failed to initialize:', error);
    return null;
  }
}

/**
 * Setup connection event handlers for reconnection logic
 */
function setupConnectionHandlers(): void {
  if (!echoInstance) return;

  const pusher = (echoInstance as any).connector?.pusher;
  if (!pusher) return;

  pusher.connection.bind('connected', () => {
    connectionState = 'connected';
    reconnectAttempts = 0;
  });

  pusher.connection.bind('connecting', () => {
    connectionState = 'connecting';
  });

  pusher.connection.bind('disconnected', () => {
    connectionState = 'disconnected';
    scheduleReconnect();
  });

  pusher.connection.bind('error', (error: any) => {
    connectionState = 'error';
    // Only log critical errors, not normal disconnections (code 1006)
    if (__DEV__ && error?.data?.code !== 1006) {
      console.warn('[Echo] Connection error:', error?.data?.message || error?.message || 'Unknown');
    }
    scheduleReconnect();
  });

  // Handle app state changes (foreground/background)
  AppState.addEventListener('change', handleAppStateChange);
}

/**
 * Handle app state changes for connection management
 */
function handleAppStateChange(nextAppState: AppStateStatus): void {
  if (nextAppState === 'active') {
    // App came to foreground - reconnect if needed
    if (connectionState !== 'connected' && echoInstance) {
      const pusher = (echoInstance as any).connector?.pusher;
      if (pusher) {
        pusher.connect();
      }
    }
  } else if (nextAppState === 'background') {
    // App went to background
    // The connection will be restored when app comes back
  }
}

/**
 * Schedule reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return;
  }

  const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
  reconnectAttempts++;

  setTimeout(async () => {
    if (connectionState !== 'connected') {
      await reconnect();
    }
  }, delay);
}

/**
 * Reconnect to WebSocket server
 */
async function reconnect(): Promise<void> {
  if (connectionState === 'connecting') return;

  // Get fresh token
  const token = await tokenManager.getToken();
  if (!token) return;

  // Update auth headers with fresh token
  if (echoInstance) {
    (echoInstance as any).options.auth.headers.Authorization = `Bearer ${token}`;
    const pusher = (echoInstance as any).connector?.pusher;
    if (pusher) {
      connectionState = 'connecting';
      pusher.connect();
    }
  }
}

/**
 * Get the Echo instance
 */
export function getEcho(): Echo<'reverb'> | null {
  return echoInstance;
}

/**
 * Get current connection state
 */
export function getConnectionState(): string {
  return connectionState;
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return connectionState === 'connected';
}

/**
 * Disconnect and cleanup
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
  connectionState = 'disconnected';
  reconnectAttempts = 0;
  // Clear cached config on disconnect (security: don't keep key in memory)
  clearReverbConfig();
}

/**
 * Subscribe to a private conversation channel
 */
export function subscribeToConversation(
  conversationId: string,
  callbacks: {
    onMessage?: (message: any) => void;
    onTyping?: (data: { userId: string; isTyping: boolean }) => void;
    onRead?: (data: { messageId: string; readBy: string; readAt: string }) => void;
    onDelivered?: (data: { messageId: string }) => void;
  }
) {
  const echo = getEcho();
  if (!echo) {
    return null;
  }

  const channelName = `conversation.${conversationId}`;
  const channel = echo.private(channelName);

  // Debug: log channel subscription success/failure
  if (__DEV__) {
    const pusherChannel = (channel as any).subscription;
    if (pusherChannel) {
      pusherChannel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ [Echo] Subscribed to:', channelName);
      });
      pusherChannel.bind('pusher:subscription_error', (error: any) => {
        console.error('❌ [Echo] Subscription error:', channelName, error);
      });
    }
  }

  // Listen for new messages
  if (callbacks.onMessage) {
    // Laravel Reverb uses dot-prefixed event names for custom broadcastAs()
    channel.listen('.NewMessageEvent', (event: any) => {
      if (__DEV__) console.log('📩 [Echo] Message received');
      callbacks.onMessage!(event.message || event);
    });
  }

  // Listen for typing indicators
  if (callbacks.onTyping) {
    channel.listenForWhisper('typing', (data: any) => {
      callbacks.onTyping!(data);
    });
  }

  // Listen for read receipts
  if (callbacks.onRead) {
    channel.listen('MessageReadEvent', (event: any) => {
      callbacks.onRead!(event);
    });
  }

  // Listen for delivery confirmations
  if (callbacks.onDelivered) {
    channel.listen('MessageDeliveredEvent', (event: any) => {
      callbacks.onDelivered!(event);
    });
  }

  return channel;
}

/**
 * Unsubscribe from a conversation channel
 */
export function unsubscribeFromConversation(conversationId: string): void {
  const echo = getEcho();
  if (echo) {
    echo.leave(`conversation.${conversationId}`);
  }
}

/**
 * Subscribe to user's personal notification channel
 */
export function subscribeToUserChannel(
  userId: string,
  callbacks: {
    onNotification?: (notification: any) => void;
    onOnlineStatusChange?: (data: { userId: string; isOnline: boolean }) => void;
  }
) {
  const echo = getEcho();
  if (!echo) return null;

  const channel = echo.private(`user.${userId}`);

  if (callbacks.onNotification) {
    channel.listen('NotificationEvent', (event: any) => {
      callbacks.onNotification!(event);
    });
  }

  if (callbacks.onOnlineStatusChange) {
    channel.listen('UserOnlineStatusEvent', (event: any) => {
      callbacks.onOnlineStatusChange!(event);
    });
  }

  return channel;
}

/**
 * Subscribe to presence channel for online users
 */
export function subscribeToPresence(callbacks: {
  onHere?: (users: any[]) => void;
  onJoining?: (user: any) => void;
  onLeaving?: (user: any) => void;
}) {
  const echo = getEcho();
  if (!echo) return null;

  const channel = echo.join('presence-users');

  if (callbacks.onHere) {
    channel.here((users: any[]) => {
      callbacks.onHere!(users);
    });
  }

  if (callbacks.onJoining) {
    channel.joining((user: any) => {
      callbacks.onJoining!(user);
    });
  }

  if (callbacks.onLeaving) {
    channel.leaving((user: any) => {
      callbacks.onLeaving!(user);
    });
  }

  return channel;
}

/**
 * Send a typing indicator whisper
 */
export function sendTypingIndicator(conversationId: string, isTyping: boolean): void {
  const echo = getEcho();
  if (!echo) return;

  const channel = echo.private(`conversation.${conversationId}`);
  channel.whisper('typing', { isTyping });
}
