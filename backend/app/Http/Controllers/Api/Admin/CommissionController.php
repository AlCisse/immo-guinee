<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommissionController extends Controller
{
    /**
     * Display a listing of commissions.
     */
    public function index(): JsonResponse
    {
        $commissions = Commission::orderBy('type_transaction')->get();

        return response()->json([
            'success' => true,
            'data' => $commissions,
        ]);
    }

    /**
     * Update the specified commission.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $commission = Commission::findOrFail($id);

        $validated = $request->validate([
            'taux_pourcentage' => 'nullable|numeric|min:0|max:100',
            'mois' => 'nullable|integer|min:0|max:12',
            'description' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $commission->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Commission mise a jour avec succes',
            'data' => $commission,
        ]);
    }
}
