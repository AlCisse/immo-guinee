<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use Illuminate\Http\JsonResponse;

class CommissionController extends Controller
{
    /**
     * Get all active commissions for display
     */
    public function index(): JsonResponse
    {
        $commissions = Commission::where('is_active', true)
            ->orderBy('type_transaction')
            ->get()
            ->keyBy('type_transaction');

        return response()->json([
            'success' => true,
            'data' => $commissions,
        ]);
    }

    /**
     * Get commission by transaction type
     */
    public function show(string $type): JsonResponse
    {
        $commission = Commission::where('type_transaction', $type)
            ->where('is_active', true)
            ->first();

        if (!$commission) {
            return response()->json([
                'success' => false,
                'message' => 'Commission non trouvee',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $commission,
        ]);
    }
}
