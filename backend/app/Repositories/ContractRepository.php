<?php

namespace App\Repositories;

use App\Models\Contract;
use App\Models\User;
use App\Models\Listing;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class ContractRepository
{
    /**
     * Find contract by ID
     *
     * @param string $id
     * @return Contract|null
     */
    public function findById(string $id): ?Contract
    {
        return Contract::with(['listing', 'proprietaire', 'locataire'])->find($id);
    }

    /**
     * Create a new contract
     *
     * @param array $data
     * @return Contract
     */
    public function create(array $data): Contract
    {
        return Contract::create($data);
    }

    /**
     * Update contract
     *
     * @param Contract $contract
     * @param array $data
     * @return Contract
     */
    public function update(Contract $contract, array $data): Contract
    {
        $contract->update($data);
        return $contract->fresh();
    }

    /**
     * Delete contract
     *
     * @param Contract $contract
     * @return bool
     */
    public function delete(Contract $contract): bool
    {
        return $contract->delete();
    }

    /**
     * Get contracts by user (as owner or tenant)
     *
     * @param User $user
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByUser(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return Contract::where('proprietaire_id', $user->id)
            ->orWhere('locataire_id', $user->id)
            ->with(['listing', 'proprietaire', 'locataire'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get contracts as owner
     *
     * @param User $user
     * @return Collection
     */
    public function getAsOwner(User $user): Collection
    {
        return Contract::where('proprietaire_id', $user->id)
            ->with(['listing', 'locataire'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get contracts as tenant
     *
     * @param User $user
     * @return Collection
     */
    public function getAsTenant(User $user): Collection
    {
        return Contract::where('locataire_id', $user->id)
            ->with(['listing', 'proprietaire'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get contracts by listing
     *
     * @param Listing $listing
     * @return Collection
     */
    public function getByListing(Listing $listing): Collection
    {
        return Contract::where('listing_id', $listing->id)
            ->with(['proprietaire', 'locataire'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get contracts by status
     *
     * @param string $status
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getByStatus(string $status, int $perPage = 15): LengthAwarePaginator
    {
        return Contract::where('statut', $status)
            ->with(['listing', 'proprietaire', 'locataire'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Add signature to contract
     *
     * @param Contract $contract
     * @param User $user
     * @param string $signatureHash
     * @return Contract
     */
    public function addSignature(Contract $contract, User $user, string $signatureHash): Contract
    {
        $contract->signatures()->create([
            'user_id' => $user->id,
            'signature_hash' => $signatureHash,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        // Check if all parties have signed
        if ($this->isFullySigned($contract)) {
            $contract->statut = 'signe';
            $contract->date_signature_complete = now();
            $contract->save();
        }

        return $contract->fresh();
    }

    /**
     * Check if contract is fully signed
     *
     * @param Contract $contract
     * @return bool
     */
    public function isFullySigned(Contract $contract): bool
    {
        $signatures = $contract->signatures()->pluck('user_id')->toArray();

        return in_array($contract->proprietaire_id, $signatures)
            && in_array($contract->locataire_id, $signatures);
    }

    /**
     * Lock contract (make immutable)
     *
     * @param Contract $contract
     * @return Contract
     */
    public function lockContract(Contract $contract): Contract
    {
        $contract->is_locked = true;
        $contract->locked_at = now();
        $contract->save();
        return $contract;
    }

    /**
     * Cancel contract (within retraction period)
     *
     * @param Contract $contract
     * @param string $reason
     * @return Contract
     */
    public function cancel(Contract $contract, string $reason = null): Contract
    {
        $contract->statut = 'annule';
        $contract->cancellation_reason = $reason;
        $contract->cancelled_at = now();
        $contract->save();
        return $contract;
    }

    /**
     * Check if contract can be cancelled (within 48h retraction period)
     *
     * @param Contract $contract
     * @return bool
     */
    public function canBeCancelled(Contract $contract): bool
    {
        if (!$contract->date_signature_complete) {
            return false;
        }

        return $contract->date_signature_complete->addHours(48)->isFuture();
    }

    /**
     * Activate contract (after retraction period)
     *
     * @param Contract $contract
     * @return Contract
     */
    public function activate(Contract $contract): Contract
    {
        $contract->statut = 'actif';
        $contract->date_debut = now();
        $contract->save();
        return $contract;
    }

    /**
     * Terminate contract
     *
     * @param Contract $contract
     * @return Contract
     */
    public function terminate(Contract $contract): Contract
    {
        $contract->statut = 'termine';
        $contract->date_fin = now();
        $contract->save();
        return $contract;
    }

    /**
     * Get contracts in retraction period
     *
     * @return Collection
     */
    public function getContractsInRetractionPeriod(): Collection
    {
        return Contract::where('statut', 'signe')
            ->whereNotNull('date_signature_complete')
            ->where('date_signature_complete', '>', now()->subHours(48))
            ->get();
    }

    /**
     * Get contracts ready for activation
     *
     * @return Collection
     */
    public function getContractsReadyForActivation(): Collection
    {
        return Contract::where('statut', 'signe')
            ->whereNotNull('date_signature_complete')
            ->where('date_signature_complete', '<=', now()->subHours(48))
            ->get();
    }

    /**
     * Get expired contracts
     *
     * @return Collection
     */
    public function getExpiredContracts(): Collection
    {
        return Contract::where('statut', 'actif')
            ->whereNotNull('date_fin_prevue')
            ->where('date_fin_prevue', '<', now())
            ->get();
    }

    /**
     * Renew contract
     *
     * @param Contract $oldContract
     * @param array $newData
     * @return Contract
     */
    public function renew(Contract $oldContract, array $newData = []): Contract
    {
        // Terminate old contract
        $this->terminate($oldContract);

        // Create new contract with updated data
        $contractData = array_merge([
            'type_contrat' => $oldContract->type_contrat,
            'listing_id' => $oldContract->listing_id,
            'proprietaire_id' => $oldContract->proprietaire_id,
            'locataire_id' => $oldContract->locataire_id,
            'montant_loyer' => $oldContract->montant_loyer,
            'montant_caution' => $oldContract->montant_caution,
            'duree_mois' => $oldContract->duree_mois,
            'conditions_specifiques' => $oldContract->conditions_specifiques,
        ], $newData);

        return $this->create($contractData);
    }

    /**
     * Get contract statistics
     *
     * @return array
     */
    public function getStatistics(): array
    {
        return [
            'total' => Contract::count(),
            'en_attente' => Contract::where('statut', 'brouillon')->count(),
            'signes' => Contract::where('statut', 'signe')->count(),
            'actifs' => Contract::where('statut', 'actif')->count(),
            'termines' => Contract::where('statut', 'termine')->count(),
            'annules' => Contract::where('statut', 'annule')->count(),
        ];
    }

    /**
     * Store PDF file path
     *
     * @param Contract $contract
     * @param string $pdfPath
     * @return Contract
     */
    public function storePdfPath(Contract $contract, string $pdfPath): Contract
    {
        $contract->pdf_path = $pdfPath;
        $contract->save();
        return $contract;
    }

    /**
     * Generate contract reference number
     *
     * @return string
     */
    public function generateReference(): string
    {
        $prefix = 'IMMOG';
        $year = date('Y');
        $month = date('m');
        $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 6));

        return "{$prefix}-{$year}{$month}-{$random}";
    }

    /**
     * Get contracts for a specific user
     *
     * @param string $userId
     * @param string|null $role 'proprietaire' or 'locataire'
     * @return Collection
     */
    public function getUserContracts(string $userId, ?string $role = null): Collection
    {
        $query = Contract::with(['listing', 'bailleur', 'locataire']);

        if ($role === 'proprietaire' || $role === 'bailleur') {
            $query->where('bailleur_id', $userId);
        } elseif ($role === 'locataire') {
            $query->where('locataire_id', $userId);
        } else {
            $query->where(function ($q) use ($userId) {
                $q->where('bailleur_id', $userId)
                  ->orWhere('locataire_id', $userId);
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Get all contracts (for admin)
     *
     * @param string|null $statut
     * @return Collection
     */
    public function getAllContracts(?string $statut = null): Collection
    {
        $query = Contract::with(['listing', 'proprietaire', 'locataire']);

        if ($statut) {
            $query->where('statut', $statut);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Check if contract can be retracted (within 48h period)
     *
     * @param string $id
     * @return bool
     */
    public function canRetract(string $id): bool
    {
        $contract = $this->findById($id);

        if (!$contract) {
            return false;
        }

        // If not fully signed, cannot retract
        if (!$contract->date_signature_proprietaire || !$contract->date_signature_locataire) {
            return false;
        }

        // Get the later of the two signatures
        $lastSignature = max(
            $contract->date_signature_proprietaire,
            $contract->date_signature_locataire
        );

        // Can retract within 48 hours of last signature
        return now()->diffInHours($lastSignature) < 48;
    }
}
