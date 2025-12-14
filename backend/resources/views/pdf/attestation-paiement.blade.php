<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Attestation de Paiement</title>
    <style>
        @page { margin: 2cm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11pt; line-height: 1.6; color: #000; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 24pt; font-weight: bold; color: #2c5282; }
        .header h1 { margin: 20px 0; font-size: 18pt; font-weight: bold; text-decoration: underline; }
        .section { margin-bottom: 25px; }
        .info-box { border: 2px solid #2c5282; padding: 20px; margin: 20px 0; background-color: #f0f4f8; }
        .amount-highlight { text-align: center; font-size: 20pt; font-weight: bold; color: #2c5282; margin: 30px 0; padding: 20px; border: 3px double #2c5282; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table th, table td { border: 1px solid #333; padding: 10px; text-align: left; }
        table th { background-color: #2c5282; color: white; }
        .footer { margin-top: 60px; text-align: center; font-size: 9pt; color: #666; }
        .stamp { position: absolute; top: 150px; right: 80px; width: 120px; height: 120px; border: 3px solid #4caf50; border-radius: 50%; text-align: center; padding-top: 45px; font-weight: bold; color: #4caf50; transform: rotate(15deg); }
    </style>
</head>
<body>
    <div class="stamp">PAYÉ<br>✓</div>

    <div class="header">
        <div class="logo">ImmoGuinée</div>
        <h1>ATTESTATION DE PAIEMENT</h1>
        <p>N° {{ $payment->numero_transaction }}</p>
    </div>

    <div class="section">
        <p>Je soussigné(e), <strong>{{ $bailleur->nom_complet }}</strong>, atteste par la présente avoir reçu de <strong>{{ $locataire->nom_complet }}</strong> la somme de:</p>

        <div class="amount-highlight">
            {{ number_format($payment->montant_total_gnf, 0, ',', ' ') }} GNF
        </div>

        <p style="text-align: center; font-style: italic;">
            ({{ \NumberFormatter::create('fr_FR', \NumberFormatter::SPELLOUT)->format($payment->montant_total_gnf) }} francs guinéens)
        </p>
    </div>

    <div class="info-box">
        <p><strong>Au titre de:</strong> Paiement de loyer</p>
        <p><strong>Période couverte:</strong> {{ $payment->periode_debut->format('d/m/Y') }} au {{ $payment->periode_fin->format('d/m/Y') }}</p>
        <p><strong>Bien concerné:</strong> {{ $listing->adresse }}, {{ $listing->commune }}</p>
    </div>

    <div class="section">
        <div class="section-title" style="font-weight: bold; margin-bottom: 10px;">Détails du Paiement:</div>
        <table>
            <tr>
                <th>Date de paiement</th>
                <td>{{ $payment->date_confirmation->format('d/m/Y à H:i') }}</td>
            </tr>
            <tr>
                <th>Méthode de paiement</th>
                <td>{{ $payment->methode_paiement }}</td>
            </tr>
            <tr>
                <th>Numéro de transaction</th>
                <td>{{ $payment->numero_transaction }}</td>
            </tr>
            <tr>
                <th>Statut</th>
                <td><strong style="color: #4caf50;">{{ $payment->statut }}</strong></td>
            </tr>
        </table>
    </div>

    <div style="margin-top: 80px; text-align: right;">
        <p>Fait à Conakry, le {{ now()->format('d/m/Y') }}</p>
        <p style="margin-top: 60px;">
            <strong>Signature du Bailleur</strong><br>
            <span style="border-top: 1px solid #000; display: inline-block; width: 200px; margin-top: 20px;">
                {{ $bailleur->nom_complet }}
            </span>
        </p>
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée - Plateforme de gestion immobilière</strong></p>
        <p>Cette attestation certifie le paiement effectué via la plateforme ImmoGuinée</p>
        <p>Document généré automatiquement le {{ now()->format('d/m/Y à H:i') }}</p>
        <p style="margin-top: 10px; font-style: italic;">
            Pour vérification: www.immoguinee.gn/verify/{{ $payment->numero_transaction }}
        </p>
    </div>
</body>
</html>
