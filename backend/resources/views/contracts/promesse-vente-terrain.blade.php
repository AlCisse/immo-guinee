<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Promesse de Vente - Terrain</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #22c55e; padding-bottom: 20px; }
        .logo { font-size: 24pt; font-weight: bold; color: #22c55e; }
        .logo span { color: #ef4444; }
        .title { font-size: 18pt; font-weight: bold; margin: 15px 0; color: #1f2937; }
        .subtitle { font-size: 12pt; color: #6b7280; }
        .reference { font-size: 10pt; color: #9ca3af; margin-top: 10px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 13pt; font-weight: bold; color: #22c55e; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
        .party { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
        .party-title { font-weight: bold; color: #374151; margin-bottom: 8px; }
        .party-info { font-size: 10pt; }
        .terrain { background-color: #fef2f2; padding: 15px; border-radius: 5px; border-left: 4px solid #ef4444; }
        .terrain-warning { background-color: #fef3c7; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 10pt; }
        .financial { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .financial-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #d1d5db; }
        .financial-row:last-child { border-bottom: none; font-weight: bold; }
        .clauses { font-size: 10pt; text-align: justify; }
        .clause { margin-bottom: 15px; }
        .clause-title { font-weight: bold; margin-bottom: 5px; }
        .signatures { margin-top: 40px; page-break-inside: avoid; }
        .signature-row { display: flex; justify-content: space-between; }
        .signature-box { width: 45%; border: 1px solid #d1d5db; padding: 20px; border-radius: 5px; min-height: 120px; }
        .signature-label { font-weight: bold; font-size: 10pt; margin-bottom: 10px; }
        .signature-date { font-size: 9pt; color: #6b7280; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #6b7280; text-align: center; }
        .legal-notice { background-color: #f3f4f6; padding: 10px; font-size: 9pt; margin-top: 20px; border-radius: 5px; }
        .important-notice { background-color: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Immo<span>Guinée</span></div>
        <div class="title">PROMESSE DE VENTE</div>
        <div class="subtitle">Terrain Nu</div>
        <div class="reference">Référence: {{ $reference }} | Généré le {{ $generated_at }}</div>
    </div>

    <div class="important-notice">
        <strong>AVERTISSEMENT IMPORTANT:</strong> Cette promesse de vente ne vaut pas transfert de propriété. Le transfert définitif interviendra uniquement après signature de l'acte authentique devant notaire et enregistrement au service des Domaines de Guinée.
    </div>

    <div class="section">
        <div class="section-title">PARTIES CONTRACTANTES</div>

        <div class="party">
            <div class="party-title">LE PROMETTANT (Vendeur)</div>
            <div class="party-info">
                <strong>Nom complet:</strong> {{ $landlord->nom ?? 'N/A' }} {{ $landlord->prenom ?? '' }}<br>
                <strong>CNI/Passeport:</strong> {{ $data['vendeur_cni'] ?? 'N/A' }}<br>
                <strong>Téléphone:</strong> {{ $landlord->telephone ?? 'N/A' }}<br>
                <strong>Domicile:</strong> {{ $landlord->adresse ?? 'Conakry, Guinée' }}
            </div>
        </div>

        <div class="party">
            <div class="party-title">LE BÉNÉFICIAIRE (Acquéreur)</div>
            <div class="party-info">
                <strong>Nom complet:</strong> {{ $tenant->nom ?? 'N/A' }} {{ $tenant->prenom ?? '' }}<br>
                <strong>CNI/Passeport:</strong> {{ $data['acquereur_cni'] ?? 'N/A' }}<br>
                <strong>Téléphone:</strong> {{ $tenant->telephone ?? 'N/A' }}<br>
                <strong>Domicile:</strong> {{ $tenant->adresse ?? 'Conakry, Guinée' }}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DÉSIGNATION DU TERRAIN</div>
        <div class="terrain">
            <strong>Localisation:</strong> {{ $listing->adresse ?? 'N/A' }}<br>
            <strong>Quartier/Village:</strong> {{ $listing->quartier ?? 'N/A' }}, {{ $listing->commune ?? '' }}<br>
            <strong>Préfecture:</strong> {{ $data['prefecture'] ?? 'Conakry' }}<br>
            <strong>Superficie totale:</strong> {{ $listing->superficie ?? 'N/A' }} m²<br>
            <strong>Référence cadastrale:</strong> {{ $data['reference_cadastrale'] ?? 'À vérifier' }}<br>
            <strong>N° Titre Foncier:</strong> {{ $data['titre_foncier'] ?? 'À vérifier' }}

            <div class="terrain-warning">
                <strong>Vérification ImmoGuinée:</strong> {{ $data['verification_statut'] ?? 'En cours de vérification' }}<br>
                <em>La plateforme recommande une vérification du titre foncier auprès des services des Domaines avant tout paiement.</em>
            </div>
        </div>
    </div>

    <!-- Proprietaire du terrain et détails de l'annonce -->
    @if(isset($proprietaire) && $proprietaire)
    <div class="section">
        <div class="section-title">PROPRIÉTAIRE DU TERRAIN ET DÉTAILS DE L'ANNONCE</div>
        <div class="party" style="background-color: #f0fdf4; border-left: 4px solid #22c55e;">
            <div class="party-title" style="color: #22c55e;">Propriétaire enregistré sur ImmoGuinée</div>
            <div class="party-info">
                <strong>Nom complet:</strong> {{ $proprietaire->nom_complet ?? ($proprietaire->nom ?? 'N/A') }} {{ $proprietaire->prenom ?? '' }}<br>
                <strong>Téléphone:</strong> {{ $proprietaire->telephone ?? 'N/A' }}<br>
                <strong>Email:</strong> {{ $proprietaire->email ?? 'N/A' }}<br>
                <strong>Adresse:</strong> {{ $proprietaire->adresse ?? 'Conakry, Guinée' }}<br>
                @if($proprietaire->badge)
                <strong>Badge ImmoGuinée:</strong> {{ $proprietaire->badge }}<br>
                @endif
                @if($proprietaire->numero_cni)
                <strong>CNI:</strong> {{ $proprietaire->numero_cni }}
                @endif
            </div>
        </div>
        <!-- Détails de l'annonce -->
        <div class="party" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; margin-top: 10px;">
            <div class="party-title" style="color: #f59e0b;">{{ $listing->titre ?? 'Terrain à vendre' }}</div>
            <div class="party-info">
                <strong>Type de bien:</strong> {{ ucfirst($listing->type_bien ?? 'Terrain') }}<br>
                @if($listing->description)
                <strong>Description:</strong> {{ Str::limit($listing->description, 200) }}<br>
                @endif
                <strong>Transaction:</strong> {{ $listing->type_transaction ?? 'VENTE' }}<br>
                @if($listing->prix ?? $data['prix_vente'] ?? null)
                <strong>Prix de vente:</strong> {{ number_format($listing->prix ?? $data['prix_vente'] ?? 0, 0, ',', ' ') }} GNF
                @endif
            </div>
        </div>
    </div>
    @endif

    <div class="section">
        <div class="section-title">CONDITIONS DE VENTE</div>
        <div class="financial">
            <div class="financial-row">
                <span>Prix de vente convenu:</span>
                <span>{{ number_format($data['prix_vente'] ?? $listing->prix ?? 0, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Acompte versé ce jour (10%):</span>
                <span>{{ number_format(($data['prix_vente'] ?? $listing->prix ?? 0) * 0.1, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Solde à verser:</span>
                <span>{{ number_format(($data['prix_vente'] ?? $listing->prix ?? 0) * 0.9, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Commission ImmoGuinée (1%):</span>
                <span>{{ number_format(($data['prix_vente'] ?? $listing->prix ?? 0) * 0.01, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Frais de notaire (estimés):</span>
                <span>À la charge de l'acquéreur</span>
            </div>
        </div>
        <p><strong>Délai de réalisation:</strong> {{ $data['delai_realisation'] ?? '90' }} jours à compter de la signature</p>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <div class="section-title">CONDITIONS SUSPENSIVES ET PARTICULIÈRES</div>
        <div class="clauses">
            <div class="clause">
                <div class="clause-title">Article 1 - Conditions suspensives</div>
                La présente promesse est consentie sous les conditions suspensives suivantes:<br>
                - Vérification du titre foncier par les services compétents<br>
                - Absence d'hypothèques ou de servitudes non déclarées<br>
                - Obtention des autorisations administratives nécessaires
            </div>

            <div class="clause">
                <div class="clause-title">Article 2 - Garanties du vendeur</div>
                Le promettant déclare être le propriétaire légitime et exclusif du terrain, libre de toute charge, hypothèque, servitude non apparente, et de tout litige en cours.
            </div>

            <div class="clause">
                <div class="clause-title">Article 3 - Origine de propriété</div>
                Le promettant s'engage à fournir tous les documents relatifs à l'origine de propriété du terrain, notamment le titre foncier, les attestations de non-litige, et tout acte antérieur.
            </div>

            <div class="clause">
                <div class="clause-title">Article 4 - Dédit et clause pénale</div>
                En cas de renonciation par le bénéficiaire, l'acompte versé restera acquis au promettant. En cas de refus de vendre par le promettant, celui-ci devra restituer le double de l'acompte.
            </div>

            <div class="clause">
                <div class="clause-title">Article 5 - Acte authentique</div>
                Les parties s'engagent à signer l'acte authentique de vente devant notaire dans le délai convenu. Les frais d'acte et d'enregistrement sont à la charge exclusive de l'acquéreur.
            </div>

            <div class="clause">
                <div class="clause-title">Article 6 - Droit de rétractation</div>
                Conformément aux dispositions ImmoGuinée, l'acquéreur bénéficie d'un délai de rétractation de 48 heures. Passé ce délai, l'acompte devient non remboursable sauf motif légitime.
            </div>
        </div>
    </div>

    <div class="legal-notice">
        <strong>Base légale:</strong> Loi L/2016/037/AN portant Code Civil de Guinée, Ordonnance portant régime foncier et domanial de la République de Guinée, et réglementation des services des Domaines.
    </div>

    <div class="signatures">
        <div class="section-title">SIGNATURES</div>
        <p style="margin-bottom: 15px; font-size: 10pt;">Les parties reconnaissent avoir lu et compris l'ensemble des clauses ci-dessus.</p>
        <div class="signature-row">
            <div class="signature-box">
                <div class="signature-label">LE PROMETTANT (Vendeur)</div>
                @if(isset($contract->date_signature_proprietaire))
                <div class="signature-date">Signé le {{ \Carbon\Carbon::parse($contract->date_signature_proprietaire)->format('d/m/Y à H:i') }}</div>
                @else
                <div class="signature-date">En attente de signature</div>
                @endif
            </div>
            <div class="signature-box">
                <div class="signature-label">LE BÉNÉFICIAIRE (Acquéreur)</div>
                @if(isset($contract->date_signature_locataire))
                <div class="signature-date">Signé le {{ \Carbon\Carbon::parse($contract->date_signature_locataire)->format('d/m/Y à H:i') }}</div>
                @else
                <div class="signature-date">En attente de signature</div>
                @endif
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée</strong> - Transactions foncières sécurisées</p>
        <p>Référence: {{ $reference }}</p>
    </div>
</body>
</html>
