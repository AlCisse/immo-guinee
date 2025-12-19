<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DisputeResource;
use App\Models\Dispute;
use App\Helpers\FileSecurityHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DisputeController extends Controller
{
    /**
     * Get user's disputes
     */
    public function index(Request $request)
    {
        $userId = auth()->id();

        $disputes = Dispute::where('demandeur_id', $userId)
            ->orWhere('defendeur_id', $userId)
            ->with(['demandeur', 'defendeur', 'mediateur', 'transaction'])
            ->orderBy('date_ouverture', 'desc')
            ->paginate(20);

        return DisputeResource::collection($disputes);
    }

    /**
     * Create dispute
     * FR-072
     */
    public function store(Request $request)
    {
        $this->authorize('create', Dispute::class);

        $validated = $request->validate([
            'transaction_id' => 'required|uuid|exists:transactions,id',
            'defendeur_id' => 'required|uuid|exists:users,id',
            'type_litige' => 'required|in:IMPAYE,DEGATS,EXPULSION_ABUSIVE,CAUTION_NON_REMBOURSEE,AUTRE',
            'description' => 'required|string|min:200|max:2000',
            'preuves.*' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        DB::beginTransaction();
        try {
            // Upload proofs with security validation
            $preuves = [];
            if ($request->hasFile('preuves')) {
                foreach ($request->file('preuves') as $file) {
                    // Security validation with magic bytes and PDF scan
                    $securityCheck = FileSecurityHelper::validateFile($file, 'document', 5120);
                    if (!$securityCheck['valid']) {
                        DB::rollBack();
                        return response()->json([
                            'error' => $securityCheck['error'],
                            'file' => $file->getClientOriginalName(),
                        ], 422);
                    }

                    // Generate secure filename
                    $filename = FileSecurityHelper::generateSecureFilename($file);
                    $path = $file->storeAs('disputes', $filename, 's3');

                    $preuves[] = [
                        'type' => str_contains($file->getMimeType(), 'image') ? 'photo' : 'document',
                        'url' => Storage::disk('s3')->url($path),
                        'nom_fichier' => $file->getClientOriginalName(),
                    ];
                }
            }

            $dispute = Dispute::create([
                'reference' => 'LIT-' . strtoupper(substr(uniqid(), -4)),
                'transaction_id' => $validated['transaction_id'],
                'demandeur_id' => auth()->id(),
                'defendeur_id' => $validated['defendeur_id'],
                'type_litige' => $validated['type_litige'],
                'description' => $validated['description'],
                'preuves_urls' => $preuves,
                'statut' => 'OUVERT',
                'date_ouverture' => now(),
            ]);

            // Increment dispute count for both parties
            DB::table('users')->whereIn('id', [auth()->id(), $validated['defendeur_id']])
                ->increment('nombre_litiges');

            DB::commit();

            return new DisputeResource($dispute->load(['demandeur', 'defendeur']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create dispute'], 500);
        }
    }

    /**
     * Assign mediator (Admin only)
     * FR-073
     */
    public function assignMediator(Request $request, Dispute $dispute)
    {
        $this->authorize('assignMediator', $dispute);

        $validated = $request->validate([
            'mediateur_id' => 'required|uuid|exists:users,id',
        ]);

        $dispute->update([
            'mediateur_assigne_id' => $validated['mediateur_id'],
            'statut' => 'EN_COURS',
            'date_assignation_mediateur' => now(),
        ]);

        return response()->json(['message' => 'Mediator assigned successfully']);
    }

    /**
     * Resolve dispute
     * FR-074
     */
    public function resolve(Request $request, Dispute $dispute)
    {
        $this->authorize('resolve', $dispute);

        $validated = $request->validate([
            'issue' => 'required|in:amiable,compensation,echec',
            'montant_compensation_gnf' => 'required_if:issue,compensation|nullable|integer|min:0',
            'accord_parties' => 'required|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $statut = match ($validated['issue']) {
            'amiable' => 'RESOLU_AMIABLE',
            'compensation' => 'RESOLU_COMPENSATION',
            'echec' => 'ECHOUE_ESCALADE',
        };

        $dispute->update([
            'statut' => $statut,
            'resolution' => $validated,
            'date_resolution' => now(),
        ]);

        return response()->json(['message' => 'Dispute resolved']);
    }

    /**
     * View dispute details
     */
    public function show(Dispute $dispute)
    {
        $this->authorize('view', $dispute);

        return new DisputeResource($dispute->load([
            'demandeur',
            'defendeur',
            'mediateur',
            'transaction',
        ]));
    }
}
