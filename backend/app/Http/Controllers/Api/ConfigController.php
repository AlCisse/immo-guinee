<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    /**
     * Get WebSocket (Reverb) configuration for authenticated clients.
     * This endpoint requires authentication to prevent exposing keys publicly.
     */
    public function websocket(Request $request): JsonResponse
    {
        // Only authenticated users can get WebSocket config
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'key' => config('broadcasting.connections.reverb.key'),
                'host' => config('broadcasting.connections.reverb.options.host'),
                'port' => config('broadcasting.connections.reverb.options.port'),
                'scheme' => config('broadcasting.connections.reverb.options.scheme'),
                'app_id' => config('broadcasting.connections.reverb.app_id'),
            ],
        ]);
    }
}
