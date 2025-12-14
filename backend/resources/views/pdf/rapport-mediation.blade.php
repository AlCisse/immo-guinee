<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport de Médiation</title>
    <style>
        @page { margin: 2cm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11pt; line-height: 1.6; color: #000; }
        .header { text-align: center; margin-bottom: 30px; border: 3px solid #d32f2f; padding: 20px; }
        .header h1 { margin: 0; font-size: 18pt; font-weight: bold; color: #d32f2f; }
        .confidential { color: #d32f2f; font-weight: bold; margin-top: 10px; }
        .section { margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #d32f2f; }
        .section-title { font-weight: bold; font-size: 12pt; margin-bottom: 10px; color: #d32f2f; }
        .party-info { margin: 10px 0; padding: 10px; background-color: white; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table th, table td { border: 1px solid #333; padding: 8px; }
        table th { background-color: #d32f2f; color: white; }
        .resolution { padding: 15px; background-color: #e8f5e9; border: 2px solid #4caf50; margin: 20px 0; }
        .signature-section { margin-top: 50px; }
        .signature-box { display: inline-block; width: 30%; text-align: center; margin: 10px; }
        .signature-line { margin-top: 40px; border-top: 1px solid #000; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RAPPORT DE MÉDIATION</h1>
        <div>Litige N° {{ $dispute->id }}</div>
        <div>Date: {{ now()->format('d/m/Y') }}</div>
        <div class="confidential">CONFIDENTIEL</div>
    </div>

    <div class="section">
        <div class="section-title">Informations du Litige</div>
        <table>
            <tr><th>Type de litige</th><td>{{ $dispute->type_litige }}</td></tr>
            <tr><th>Date d'ouverture</th><td>{{ $dispute->date_ouverture->format('d/m/Y') }}</td></tr>
            <tr><th>Montant réclamé</th><td>{{ number_format($dispute->montant_reclame_gnf ?? 0, 0, ',', ' ') }} GNF</td></tr>
            <tr><th>Statut</th><td>{{ $dispute->statut }}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Parties en Conflit</div>
        <div class="party-info">
            <strong>Demandeur:</strong> {{ $demandeur->nom_complet }}<br>
            <strong>Téléphone:</strong> {{ $demandeur->telephone }}
        </div>
        <div class="party-info">
            <strong>Défendeur:</strong> {{ $defendeur->nom_complet }}<br>
            <strong>Téléphone:</strong> {{ $defendeur->telephone }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Médiateur</div>
        <p><strong>{{ $mediateur->nom_complet }}</strong></p>
        <p>Badge: {{ $mediateur->badge_certification }}</p>
    </div>

    <div class="section">
        <div class="section-title">Description du Litige</div>
        <p>{{ $dispute->description }}</p>
    </div>

    @if($dispute->statut !== 'OUVERT')
    <div class="resolution">
        <div class="section-title">Résolution</div>
        <p><strong>Type de résolution:</strong> {{ $dispute->type_resolution ?? 'N/A' }}</p>
        <p><strong>Date de résolution:</strong> {{ $dispute->date_resolution?->format('d/m/Y') ?? 'N/A' }}</p>
        <p><strong>Détails:</strong> {{ $dispute->resolution_details ?? 'Aucun détail disponible' }}</p>

        @if(isset($dispute->montant_compensation_gnf) && $dispute->montant_compensation_gnf > 0)
        <p><strong>Compensation accordée:</strong> {{ number_format($dispute->montant_compensation_gnf, 0, ',', ' ') }} GNF</p>
        @endif
    </div>
    @endif

    <div class="signature-section">
        <div class="signature-box">
            <strong>Le Demandeur</strong>
            <div class="signature-line">{{ $demandeur->nom_complet }}</div>
        </div>
        <div class="signature-box">
            <strong>Le Défendeur</strong>
            <div class="signature-line">{{ $defendeur->nom_complet }}</div>
        </div>
        <div class="signature-box">
            <strong>Le Médiateur</strong>
            <div class="signature-line">{{ $mediateur->nom_complet }}</div>
        </div>
    </div>

    <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 20px;">
        <p>ImmoGuinée - Service de Médiation</p>
        <p>Document confidentiel généré le {{ now()->format('d/m/Y à H:i') }}</p>
    </div>
</body>
</html>
