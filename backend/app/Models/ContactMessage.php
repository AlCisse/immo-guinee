<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContactMessage extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'nom',
        'email',
        'telephone',
        'sujet',
        'message',
        'statut',
        'reponse',
        'repondu_par',
        'repondu_at',
    ];

    protected function casts(): array
    {
        return [
            'repondu_at' => 'datetime',
        ];
    }

    // ==================== RELATIONSHIPS ====================

    /**
     * L'utilisateur qui a envoyé le message (si connecté)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * L'admin qui a répondu
     */
    public function reponduPar()
    {
        return $this->belongsTo(User::class, 'repondu_par');
    }

    // ==================== SCOPES ====================

    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'EN_ATTENTE');
    }

    public function scopeTraite($query)
    {
        return $query->where('statut', 'TRAITE');
    }

    public function scopeNonLu($query)
    {
        return $query->where('statut', 'EN_ATTENTE');
    }
}
