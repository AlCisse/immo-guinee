<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Certificat d'Assurance</title>
    <style>
        @page { margin: 2cm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11pt; line-height: 1.6; color: #000; }
        .header { text-align: center; margin-bottom: 30px; background-color: #2c5282; color: white; padding: 30px; }
        .header h1 { margin: 0; font-size: 20pt; }
        .police-number { font-size: 14pt; margin-top: 10px; font-weight: bold; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
        .section-title { font-weight: bold; font-size: 12pt; margin-bottom: 10px; color: #2c5282; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table th, table td { border: 1px solid #333; padding: 10px; }
        table th { background-color: #2c5282; color: white; }
        .coverage-list { margin-left: 20px; }
        .coverage-list li { margin: 5px 0; }
        .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #666; border-top: 2px solid #2c5282; padding-top: 20px; }
        .stamp { position: absolute; top: 100px; right: 50px; width: 150px; height: 150px; border: 3px solid #2c5282; border-radius: 50%; text-align: center; padding-top: 55px; font-weight: bold; color: #2c5282; transform: rotate(-15deg); }
    </style>
</head>
<body>
    <div class="stamp">CERTIFIÉ<br>VALIDE</div>

    <div class="header">
        <h1>CERTIFICAT D'ASSURANCE</h1>
        <div class="police-number">Police N° {{ $insurance->numero_police }}</div>
    </div>

    <div class="section">
        <div class="section-title">Assuré</div>
        <p><strong>Nom:</strong> {{ $assure->nom_complet }}</p>
        <p><strong>Téléphone:</strong> {{ $assure->telephone }}</p>
        <p><strong>Adresse:</strong> {{ $assure->adresse }}</p>
    </div>

    <div class="section">
        <div class="section-title">Type d'Assurance</div>
        <p><strong>{{ $insurance->type_assurance === 'SEJOUR_SEREIN' ? 'Séjour Serein (Locataire)' : 'Loyer Garanti (Propriétaire)' }}</strong></p>
    </div>

    <div class="section">
        <div class="section-title">Période de Couverture</div>
        <table>
            <tr>
                <th>Date de souscription</th>
                <td>{{ $insurance->date_souscription->format('d/m/Y') }}</td>
            </tr>
            <tr>
                <th>Date d'expiration</th>
                <td>{{ $insurance->date_expiration->format('d/m/Y') }}</td>
            </tr>
            <tr>
                <th>Prime mensuelle</th>
                <td>{{ number_format($insurance->prime_mensuelle_gnf, 0, ',', ' ') }} GNF</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Couvertures</div>
        <ul class="coverage-list">
            @foreach($insurance->couvertures as $key => $value)
                @if($value)
                    <li>✓ {{ ucfirst(str_replace('_', ' ', $key)) }}</li>
                @endif
            @endforeach
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Plafonds d'Indemnisation</div>
        <table>
            @foreach($insurance->plafonds as $key => $montant)
            <tr>
                <th>{{ ucfirst(str_replace('_', ' ', $key)) }}</th>
                <td>{{ is_numeric($montant) ? number_format($montant, 0, ',', ' ') . ' GNF' : $montant }}</td>
            </tr>
            @endforeach
        </table>
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée - Service d'Assurance Immobilière</strong></p>
        <p>Ce certificat atteste que l'assuré bénéficie d'une couverture d'assurance valide.</p>
        <p>Pour toute réclamation: assurance@immoguinee.gn | +224 XXX XXX XXX</p>
        <p style="margin-top: 15px;">Document généré le {{ now()->format('d/m/Y à H:i') }}</p>
    </div>
</body>
</html>
