'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx } from 'clsx';
import BadgeDisplay from '@/components/certifications/BadgeDisplay';

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  participant1: {
    id: string;
    nom_complet: string;
    prenom: string;
    badge_certification: string;
  };
  participant2: {
    id: string;
    nom_complet: string;
    prenom: string;
    badge_certification: string;
  };
  listing?: {
    id: string;
    titre: string;
    photo_principale_url: string;
  };
  unread_count: number;
  date_dernier_message: string;
  statut: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const otherParticipant = conversation.participant2; // Would normally compare to current user
        const isSelected = conversation.id === selectedId;
        const hasUnread = conversation.unread_count > 0;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={clsx(
              'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
              isSelected && 'bg-primary-50 hover:bg-primary-50'
            )}
          >
            <div className="flex gap-3">
              {/* Avatar / Listing image */}
              <div className="flex-shrink-0">
                {conversation.listing?.photo_principale_url ? (
                  <img
                    src={conversation.listing.photo_principale_url}
                    alt={conversation.listing.titre}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-lg">
                      {otherParticipant.prenom.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={clsx(
                        'font-medium truncate',
                        hasUnread ? 'text-gray-900' : 'text-gray-700'
                      )}
                    >
                      {otherParticipant.nom_complet}
                    </span>
                    <BadgeDisplay
                      badge={otherParticipant.badge_certification}
                      size="sm"
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatRelativeTime(conversation.date_dernier_message)}
                  </span>
                </div>

                {/* Listing title */}
                {conversation.listing && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {conversation.listing.titre}
                  </p>
                )}

                {/* Unread indicator */}
                {hasUnread && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary-500 text-white text-xs font-medium">
                      {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                    </span>
                    <span className="text-xs text-primary-600 font-medium">
                      message{conversation.unread_count > 1 ? 's' : ''} non lu
                      {conversation.unread_count > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (diffInHours < 48) {
      return 'Hier';
    }

    if (diffInHours < 168) {
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}
