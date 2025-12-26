import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
  icon?: string;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.notifications.list();
      return response.data?.data || { notifications: [], unread_count: 0 };
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // Show error state if API fails
  if (error && !isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Notifications',
            headerStyle: { backgroundColor: Colors.background.primary },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Connexion impossible</Text>
          <Text style={styles.emptyText}>Verifiez votre connexion internet</Text>
          <TouchableOpacity
            style={{ marginTop: 20, padding: 12, backgroundColor: lightTheme.colors.primary, borderRadius: 8 }}
            onPress={() => refetch()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      Alert.alert('Succes', 'Toutes les notifications ont ete marquees comme lues');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.notifications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Test push notification via API
  const sendTestNotification = async () => {
    try {
      const response = await api.notifications.sendTest();
      if (response.data?.success) {
        Alert.alert('Succes!', `Push notification envoyee! (${response.data.tokens_count} token(s))`);
        refetch(); // Refresh to show new in-app notification
      } else {
        Alert.alert('Erreur', response.data?.message || 'Echec de l\'envoi');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur de connexion';
      Alert.alert('Erreur', message);

      // Fallback to local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Local 🏠',
          body: 'Notification locale (push non disponible)',
          data: { type: 'test' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Messages
      case 'new_message':
      case 'message_received':
        return { name: 'chatbubble', color: Colors.success[500] };

      // Listings
      case 'listing_created':
      case 'listing_approved':
        return { name: 'home', color: Colors.success[500] };
      case 'listing_rejected':
        return { name: 'home-outline', color: Colors.error[500] };

      // Visits
      case 'visit_requested':
        return { name: 'calendar-outline', color: Colors.warning[500] };
      case 'visit_confirmed':
        return { name: 'calendar', color: Colors.success[500] };
      case 'visit_cancelled':
        return { name: 'calendar-outline', color: Colors.error[500] };
      case 'visit_reminder':
        return { name: 'alarm', color: Colors.warning[500] };

      // Contracts
      case 'contract_created':
        return { name: 'document-text-outline', color: lightTheme.colors.primary };
      case 'contract_signed':
        return { name: 'document-text', color: Colors.success[500] };
      case 'contract_cancelled':
        return { name: 'document-text-outline', color: Colors.error[500] };

      // Payments
      case 'payment_received':
        return { name: 'card', color: Colors.success[500] };
      case 'payment_reminder':
        return { name: 'card-outline', color: Colors.warning[500] };

      // Ratings
      case 'rating_received':
        return { name: 'star', color: Colors.warning[500] };

      // Disputes
      case 'dispute_opened':
        return { name: 'warning', color: Colors.error[500] };
      case 'dispute_resolved':
        return { name: 'checkmark-circle', color: Colors.success[500] };

      // Certifications
      case 'certification_approved':
        return { name: 'shield-checkmark', color: Colors.success[500] };
      case 'certification_rejected':
        return { name: 'shield-outline', color: Colors.error[500] };

      // System
      case 'system':
        return { name: 'information-circle', color: lightTheme.colors.primary };
      case 'welcome':
        return { name: 'person-add', color: lightTheme.colors.primary };
      case 'test':
        return { name: 'flask', color: Colors.warning[500] };

      default:
        return { name: 'notifications', color: Colors.neutral[500] };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      markAsReadMutation.mutate(notification.id);
    }

    // Parse data if it's a string
    let data = notification.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }

    // Debug log
    if (__DEV__) {
      console.log('[Notification] Type:', notification.type, 'Data:', JSON.stringify(data));
    }

    // Navigate based on action_url first (if provided)
    if (notification.action_url) {
      router.push(notification.action_url as any);
      return;
    }

    // Navigate based on data fields - check conversation_id first
    const conversationId = data?.conversation_id;
    if (conversationId) {
      console.log('[Notification] Navigating to chat:', conversationId);
      router.push(`/chat/${conversationId}` as any);
      return;
    }

    // For message types without conversation_id, go to messages tab
    if (notification.type === 'new_message' || notification.type === 'message_received') {
      console.log('[Notification] No conversation_id, going to messages tab');
      router.push('/(tabs)/messages' as any);
      return;
    }

    // Navigate based on notification type
    switch (notification.type) {
      // Messages
      case 'new_message':
      case 'message_received':
        if (data?.conversation_id) {
          router.push(`/chat/${data.conversation_id}` as any);
        } else {
          router.push('/(tabs)/messages' as any);
        }
        break;

      // Listings
      case 'listing_created':
      case 'listing_approved':
      case 'listing_rejected':
        if (data?.listing_id) {
          router.push(`/listing/${data.listing_id}` as any);
        } else {
          router.push('/my-listings' as any);
        }
        break;

      // Visits
      case 'visit_requested':
      case 'visit_confirmed':
      case 'visit_cancelled':
      case 'visit_reminder':
        router.push('/my-visits' as any);
        break;

      // Contracts
      case 'contract_created':
      case 'contract_signed':
      case 'contract_cancelled':
        if (data?.contract_id) {
          router.push(`/contract/${data.contract_id}` as any);
        } else {
          router.push('/my-contracts' as any);
        }
        break;

      // Payments
      case 'payment_received':
      case 'payment_reminder':
        router.push('/my-contracts' as any);
        break;

      // Certifications
      case 'certification_approved':
      case 'certification_rejected':
        router.push('/settings' as any);
        break;

      // Fallback: use data fields
      default:
        if (data?.listing_id) {
          router.push(`/listing/${data.listing_id}` as any);
        } else if (data?.visit_id) {
          router.push('/my-visits' as any);
        } else if (data?.contract_id) {
          router.push('/my-contracts' as any);
        }
        // For system/welcome/test notifications, just mark as read (no navigation)
        break;
    }
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert(
      'Supprimer',
      'Supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    const isUnread = !item.read_at;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.notificationItemUnread]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeleteNotification(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
          headerRight: () => unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => markAllAsReadMutation.mutate()}
              style={styles.markAllButton}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
              ) : (
                <Text style={styles.markAllText}>Tout lire</Text>
              )}
            </TouchableOpacity>
          ) : null,
        }}
      />

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={lightTheme.colors.primary}
                colors={[lightTheme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={64} color={Colors.neutral[300]} />
                <Text style={styles.emptyTitle}>Aucune notification</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez pas encore de notifications
                </Text>
              </View>
            }
          />
        )}

        {/* DEV: Test notification button */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={sendTestNotification}
            activeOpacity={0.8}
          >
            <Ionicons name="flask-outline" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Test Notif</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  markAllButton: {
    padding: 8,
    marginRight: -8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationItemUnread: {
    backgroundColor: lightTheme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: lightTheme.colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: lightTheme.colors.primary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },
  testButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning[500],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
