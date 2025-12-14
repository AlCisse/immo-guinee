<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rating extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id',
        'evaluateur_id',
        'evalue_id',
        'note',
        'commentaire',
        'note_communication',
        'note_ponctualite',
        'note_proprete',
        'note_respect_contrat',
        'reponse',
    ];

    protected function casts(): array
    {
        return [
            'note' => 'integer',
            'note_communication' => 'integer',
            'note_ponctualite' => 'integer',
            'note_proprete' => 'integer',
            'note_respect_contrat' => 'integer',
            'helpful_count' => 'integer',
            'is_published' => 'boolean',
            'is_flagged' => 'boolean',
            'reponse_at' => 'datetime',
        ];
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    public function evaluateur()
    {
        return $this->belongsTo(User::class, 'evaluateur_id');
    }

    public function evalue()
    {
        return $this->belongsTo(User::class, 'evalue_id');
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeWithMinRating($query, int $minRating)
    {
        return $query->where('note', '>=', $minRating);
    }

    public function getAverageDetailedRating(): float
    {
        $ratings = [
            $this->note_communication,
            $this->note_ponctualite,
            $this->note_proprete,
            $this->note_respect_contrat,
        ];

        $validRatings = array_filter($ratings, fn($r) => !is_null($r));

        return count($validRatings) > 0
            ? array_sum($validRatings) / count($validRatings)
            : 0;
    }

    /**
     * Boot method to update user's average rating.
     */
    protected static function boot()
    {
        parent::boot();

        static::created(function ($rating) {
            // Update evaluated user's average rating
            $user = $rating->evalue;
            $avgRating = $user->ratingsReceived()
                ->where('is_published', true)
                ->avg('note');

            $user->update(['avg_rating' => round($avgRating, 2)]);
        });
    }
}
