import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Conversation } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';

export default function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 24 : 16;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await api.messaging.conversations();
      // Laravel Resource returns { data: [...] } directly
      return response.data?.data || [];
    },
    enabled: isAuthenticated,
  });

  const conversations = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.authRequired}>
          <View style={styles.authIconContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={lightTheme.colors.primary} />
          </View>
          <Text style={styles.authTitle}>Connectez-vous</Text>
          <Text style={styles.authText}>
            Connectez-vous pour voir vos messages
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.authButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderConversation = ({ item }: { item: any }) => {
    // Backend returns initiator and participant, not participants array
    const otherParticipant = item.initiator?.id === user?.id ? item.participant : item.initiator;
    const listing = item.listing;
    const lastMessage = item.last_message;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          item.unread_count > 0 && styles.conversationItemUnread,
        ]}
        onPress={() => {
          // Pass conversation ID (not listing ID) - chat screen will handle it
          router.push(`/chat/${item.id}?ownerName=${encodeURIComponent(otherParticipant?.nom_complet || 'Utilisateur')}&ownerPhoto=${encodeURIComponent(otherParticipant?.photo_profil || '')}&listingTitle=${encodeURIComponent(listing?.titre || '')}` as any);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {otherParticipant?.photo_profil ? (
            <Image
              source={{ uri: otherParticipant.photo_profil }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {otherParticipant?.nom_complet?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.participantName,
              item.unread_count > 0 && styles.participantNameUnread,
            ]} numberOfLines={1}>
              {otherParticipant?.nom_complet || 'Utilisateur'}
            </Text>
            {lastMessage && (
              <Text style={styles.messageTime}>{formatDate(lastMessage.created_at)}</Text>
            )}
          </View>
          {listing && (
            <View style={styles.listingRow}>
              <Ionicons name="home-outline" size={12} color={lightTheme.colors.primary} />
              <Text style={styles.listingTitle} numberOfLines={1}>
                {listing.titre}
              </Text>
            </View>
          )}
          {lastMessage && (
            <Text
              style={[
                styles.lastMessage,
                item.unread_count > 0 && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {lastMessage.type_message === 'VOCAL' ? '🎤 Message vocal' : lastMessage.contenu}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        {conversations.length > 0 && (
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCount}>{conversations.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
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
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.emptyText}>
                Contactez un proprietaire pour demarrer une conversation
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/search')}
                activeOpacity={0.8}
              >
                <Ionicons name="search-outline" size={18} color="#fff" />
                <Text style={styles.browseButtonText}>Parcourir les annonces</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.secondary[800],
    letterSpacing: -0.5,
  },
  headerCountBadge: {
    backgroundColor: lightTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    paddingVertical: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  conversationItemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: lightTheme.colors.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
    flex: 1,
  },
  participantNameUnread: {
    fontWeight: '700',
  },
  messageTime: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginLeft: 8,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.neutral[500],
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: Colors.secondary[800],
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  emptyText: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  browseButton: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 14,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  authText: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  authButton: {
    marginTop: 28,
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 14,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
