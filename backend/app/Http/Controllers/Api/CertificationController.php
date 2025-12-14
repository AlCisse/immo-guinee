<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\CertificationDocument;
use App\Services\CertificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CertificationController extends Controller
{
    public function __construct(
        private CertificationService $certificationService
    ) {
    }

    /**
     * Upload certification document (CNI, Titre Foncier, Passeport)
     * FR-054
     */
    public function upload(Request $request)
    {
        $this->authorize('upload', CertificationDocument::class);

        $validated = $request->validate([
            'type_document' => 'required|in:CNI,TITRE_FONCIER,PASSEPORT',
            'fichier' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB max
        ]);

        // Upload to S3/MinIO
        $path = $request->file('fichier')->store('certifications', 's3');

        // Create document record
        $document = CertificationDocument::create([
            'utilisateur_id' => auth()->id(),
            'type_document' => $validated['type_document'],
            'fichier_url' => Storage::disk('s3')->url($path),
            'statut_verification' => 'EN_ATTENTE',
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully. Awaiting verification.',
            'document' => $document,
        ], 201);
    }

    /**
     * Verify document (Admin only)
     * FR-054
     */
    public function verify(Request $request, CertificationDocument $document)
    {
        $this->authorize('verify', $document);

        $validated = $request->validate([
            'approved' => 'required|boolean',
            'comment' => 'nullable|string|max:500',
        ]);

        $this->certificationService->verifyDocument(
            $document,
            $validated['approved'],
            $validated['comment'] ?? null
        );

        return response()->json([
            'message' => 'Document verification completed',
            'document' => $document->fresh(),
        ]);
    }

    /**
     * Get my certification status and badge progression
     * FR-057
     */
    public function my(Request $request)
    {
        $user = $request->user()->load('certifications');
        $progression = $this->certificationService->getBadgeProgression($user);

        return response()->json([
            'user' => new UserResource($user),
            'certifications' => $user->certifications,
            'badge_progression' => $progression,
        ]);
    }

    /**
     * Get user's documents
     */
    public function index(Request $request)
    {
        $documents = CertificationDocument::where('utilisateur_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Delete document (if not verified)
     */
    public function destroy(CertificationDocument $document)
    {
        $this->authorize('delete', $document);

        // Delete from S3
        $path = str_replace(Storage::disk('s3')->url(''), '', $document->fichier_url);
        Storage::disk('s3')->delete($path);

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }
}
