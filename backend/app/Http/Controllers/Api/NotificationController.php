<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get user's notifications
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->titre,
                    'message' => $notification->message,
                    'data' => $notification->data,
                    'action_url' => $notification->action_url,
                    'icon' => $notification->icon,
                    'read_at' => $notification->read_at,
                    'created_at' => $notification->created_at,
                ];
            });

        $unreadCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $unreadCount,
                'total' => $notifications->count(),
            ],
        ]);
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification non trouvee',
            ], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marquee comme lue',
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Toutes les notifications marquees comme lues',
        ]);
    }

    /**
     * Delete a notification
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification non trouvee',
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification supprimee',
        ]);
    }

    /**
     * Send test push notification (authenticated user only)
     */
    public function sendTest(Request $request, ExpoPushService $pushService): JsonResponse
    {
        $user = $request->user();

        if (empty($user->push_tokens)) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun token push enregistre. Ouvrez l\'app sur un appareil physique.',
                'tokens_count' => 0,
            ], 400);
        }

        $sent = $pushService->send(
            $user,
            'Test Notification 🏠',
            'Ceci est une notification de test depuis ImmoGuinee!',
            ['type' => 'test'],
            'general'
        );

        // Also create in-app notification
        Notification::create([
            'user_id' => $user->id,
            'type' => 'test',
            'titre' => 'Test Notification',
            'message' => 'Notification de test envoyee avec succes!',
            'data' => ['sent_at' => now()->toISOString()],
        ]);

        return response()->json([
            'success' => $sent,
            'message' => $sent ? 'Notification push envoyee!' : 'Echec de l\'envoi',
            'tokens_count' => count($user->push_tokens),
        ]);
    }
}
