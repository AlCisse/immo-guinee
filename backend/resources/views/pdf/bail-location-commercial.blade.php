<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Bail Commercial</title>
    <style>
        @page { margin: 2cm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11pt; line-height: 1.6; color: #000; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .header h1 { margin: 0; font-size: 18pt; font-weight: bold; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; font-size: 13pt; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
        .party { margin-left: 20px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table th, table td { border: 1px solid #333; padding: 8px; }
        .signature-section { margin-top: 50px; display: table; width: 100%; }
        .signature-box { display: table-cell; width: 45%; text-align: center; padding: 20px; }
        .signature-line { margin-top: 60px; border-top: 1px solid #000; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>BAIL DE LOCATION À USAGE COMMERCIAL</h1>
        <div>Contrat N° {{ $contract->numero_contrat }}</div>
        <div>Date: {{ $contract->date_debut->format('d/m/Y') }}</div>
    </div>

    <div class="section">
        <div class="section-title">PARTIES CONTRACTANTES</div>
        <div class="party">
            <strong>LE BAILLEUR:</strong> {{ $bailleur->nom_complet }}<br>
            Badge: {{ $bailleur->badge_certification }}
        </div>
        <div class="party">
            <strong>LE LOCATAIRE:</strong> {{ $locataire->nom_complet }}<br>
            Badge: {{ $locataire->badge_certification }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">LOCAL COMMERCIAL</div>
        <p><strong>{{ $listing->adresse }}</strong> - {{ $listing->commune }}</p>
        <p>Type: {{ $listing->type_propriete }} | Surface: {{ $listing->superficie_m2 }} m²</p>
    </div>

    <div class="section">
        <div class="section-title">CONDITIONS FINANCIÈRES</div>
        <table>
            <tr><th>Loyer mensuel</th><td>{{ number_format($contract->donnees_personnalisees['montant_loyer_gnf'], 0, ',', ' ') }} GNF</td></tr>
            <tr><th>Durée</th><td>{{ $contract->date_debut->diffInMonths($contract->date_fin) }} mois</td></tr>
        </table>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <strong>LE BAILLEUR</strong>
            <div class="signature-line">{{ $bailleur->nom_complet }}</div>
        </div>
        <div class="signature-box">
            <strong>LE LOCATAIRE</strong>
            <div class="signature-line">{{ $locataire->nom_complet }}</div>
        </div>
    </div>
</body>
</html>
