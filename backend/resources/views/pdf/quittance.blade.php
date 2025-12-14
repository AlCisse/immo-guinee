<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quittance de Loyer</title>
    <style>
        @page { margin: 2cm; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border: 2px solid #333;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header h1 {
            margin: 0;
            font-size: 20pt;
            font-weight: bold;
            color: #2c5282;
        }
        .quittance-number {
            font-size: 11pt;
            color: #666;
            margin-top: 10px;
        }
        .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
        }
        .section-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
            color: #2c5282;
            text-transform: uppercase;
        }
        .info-row {
            margin: 5px 0;
            padding: 5px;
        }
        .info-label {
            font-weight: bold;
            display: inline-block;
            width: 200px;
        }
        .amount-box {
            background-color: #e6f2ff;
            border: 2px solid #2c5282;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .amount-box .label {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .amount-box .amount {
            font-size: 24pt;
            font-weight: bold;
            color: #2c5282;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        table th, table td {
            border: 1px solid #333;
            padding: 10px;
            text-align: left;
        }
        table th {
            background-color: #2c5282;
            color: white;
            font-weight: bold;
        }
        .signature-section {
            margin-top: 40px;
            text-align: right;
        }
        .signature-box {
            display: inline-block;
            text-align: center;
            padding: 20px;
            border: 1px solid #333;
            min-width: 250px;
        }
        .signature-line {
            margin-top: 50px;
            border-top: 2px solid #000;
            padding-top: 10px;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 9pt;
            color: #666;
        }
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80pt;
            color: rgba(0, 0, 0, 0.05);
            z-index: -1;
        }
    </style>
</head>
<body>
    <div class="watermark">PAYÉ</div>

    <div class="header">
        <h1>QUITTANCE DE LOYER</h1>
        <div class="quittance-number">N° {{ $payment->numero_transaction }}</div>
        <div class="quittance-number">Date d'émission: {{ now()->format('d/m/Y') }}</div>
    </div>

    <div class="section">
        <div class="section-title">Informations du Bailleur</div>
        <div class="info-row">
            <span class="info-label">Nom complet:</span>
            {{ $bailleur->nom_complet }}
        </div>
        <div class="info-row">
            <span class="info-label">Adresse:</span>
            {{ $bailleur->adresse }}
        </div>
        <div class="info-row">
            <span class="info-label">Téléphone:</span>
            {{ $bailleur->telephone }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Informations du Locataire</div>
        <div class="info-row">
            <span class="info-label">Nom complet:</span>
            {{ $locataire->nom_complet }}
        </div>
        <div class="info-row">
            <span class="info-label">Adresse:</span>
            {{ $locataire->adresse }}
        </div>
        <div class="info-row">
            <span class="info-label">Téléphone:</span>
            {{ $locataire->telephone }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Bien Loué</div>
        <div class="info-row">
            <span class="info-label">Adresse:</span>
            {{ $listing->adresse }}
        </div>
        <div class="info-row">
            <span class="info-label">Type:</span>
            {{ $listing->type_propriete }}
        </div>
        <div class="info-row">
            <span class="info-label">Commune:</span>
            {{ $listing->commune }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Détail du Paiement</div>

        <table>
            <thead>
                <tr>
                    <th>Période</th>
                    <th>Montant (GNF)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $payment->periode_debut->format('F Y') }} - {{ $payment->periode_fin->format('F Y') }}</td>
                    <td>{{ number_format($payment->montant_principal_gnf, 0, ',', ' ') }}</td>
                </tr>
                @if($payment->commission_plateforme_gnf > 0)
                <tr>
                    <td>Commission plateforme</td>
                    <td>{{ number_format($payment->commission_plateforme_gnf, 0, ',', ' ') }}</td>
                </tr>
                @endif
            </tbody>
        </table>

        <div class="amount-box">
            <div class="label">MONTANT TOTAL PAYÉ</div>
            <div class="amount">{{ number_format($payment->montant_total_gnf, 0, ',', ' ') }} GNF</div>
        </div>

        <div class="info-row">
            <span class="info-label">Méthode de paiement:</span>
            {{ $payment->methode_paiement }}
        </div>
        <div class="info-row">
            <span class="info-label">Date de paiement:</span>
            {{ $payment->date_confirmation->format('d/m/Y à H:i') }}
        </div>
        <div class="info-row">
            <span class="info-label">Numéro de transaction:</span>
            {{ $payment->numero_transaction }}
        </div>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <p><strong>Le Bailleur</strong></p>
            <div class="signature-line">
                {{ $bailleur->nom_complet }}
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée - Plateforme de gestion immobilière</strong></p>
        <p>Document généré le {{ now()->format('d/m/Y à H:i') }}</p>
        <p>Ce document constitue un reçu officiel de paiement et peut être utilisé à des fins fiscales.</p>
        <p style="margin-top: 10px; font-style: italic;">
            Pour toute réclamation: support@immoguinee.gn | +224 XXX XXX XXX
        </p>
    </div>
</body>
</html>
