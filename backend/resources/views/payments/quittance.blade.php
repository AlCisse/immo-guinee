<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quittance de Paiement - {{ $numero_quittance }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        .logo span {
            color: #10b981;
        }
        .document-title {
            font-size: 20px;
            font-weight: bold;
            margin-top: 10px;
            color: #1f2937;
        }
        .quittance-number {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2563eb;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .info-grid {
            display: table;
            width: 100%;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            width: 40%;
            padding: 5px 0;
            color: #6b7280;
        }
        .info-value {
            display: table-cell;
            padding: 5px 0;
            font-weight: 500;
        }
        .parties-container {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .party-box {
            display: table-cell;
            width: 48%;
            padding: 15px;
            background-color: #f9fafb;
            border-radius: 5px;
            vertical-align: top;
        }
        .party-box:first-child {
            margin-right: 4%;
        }
        .party-title {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .party-name {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
        }
        .amounts-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .amounts-table th,
        .amounts-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .amounts-table th {
            background-color: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }
        .amounts-table td:last-child,
        .amounts-table th:last-child {
            text-align: right;
        }
        .total-row {
            background-color: #2563eb;
            color: white;
        }
        .total-row td {
            font-weight: bold;
            font-size: 14px;
            border-bottom: none;
        }
        .amount-words {
            margin-top: 15px;
            padding: 10px;
            background-color: #fef3c7;
            border-radius: 5px;
            font-style: italic;
        }
        .payment-method {
            margin-top: 20px;
            padding: 15px;
            background-color: #ecfdf5;
            border-radius: 5px;
            border-left: 4px solid #10b981;
        }
        .stamp-area {
            margin-top: 30px;
            display: table;
            width: 100%;
        }
        .stamp-box {
            display: table-cell;
            width: 48%;
            text-align: center;
            padding: 20px;
            border: 1px dashed #d1d5db;
            border-radius: 5px;
        }
        .stamp-box:first-child {
            margin-right: 4%;
        }
        .stamp-label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
        }
        .verified-stamp {
            display: inline-block;
            padding: 10px 20px;
            border: 3px solid #10b981;
            border-radius: 5px;
            color: #10b981;
            font-weight: bold;
            transform: rotate(-5deg);
            margin-top: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
        }
        .legal-notice {
            margin-top: 20px;
            padding: 10px;
            background-color: #f3f4f6;
            border-radius: 5px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Immo<span>Guinée</span></div>
        <div class="document-title">QUITTANCE DE PAIEMENT</div>
        <div class="quittance-number">N° {{ $numero_quittance }}</div>
    </div>

    <div class="section">
        <div class="info-grid">
            <div class="info-row">
                <span class="info-label">Date d'émission:</span>
                <span class="info-value">{{ $generated_at }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Référence contrat:</span>
                <span class="info-value">{{ $contract->reference ?? 'N/A' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Période concernée:</span>
                <span class="info-value">
                    @if(isset($contract->date_debut) && isset($contract->date_fin))
                        {{ \Carbon\Carbon::parse($contract->date_debut)->format('d/m/Y') }} - {{ \Carbon\Carbon::parse($contract->date_fin)->format('d/m/Y') }}
                    @else
                        N/A
                    @endif
                </span>
            </div>
        </div>
    </div>

    <div class="parties-container">
        <div class="party-box">
            <div class="party-title">Payeur (Locataire)</div>
            <div class="party-name">{{ $payer->nom_complet ?? 'N/A' }}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">
                Tél: {{ $payer->telephone ?? 'N/A' }}
            </div>
        </div>
        <div class="party-box">
            <div class="party-title">Bénéficiaire (Propriétaire)</div>
            <div class="party-name">{{ $beneficiary->nom_complet ?? 'N/A' }}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">
                Tél: {{ $beneficiary->telephone ?? 'N/A' }}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Détail du paiement</div>
        <table class="amounts-table">
            <thead>
                <tr>
                    <th>Désignation</th>
                    <th>Montant (GNF)</th>
                </tr>
            </thead>
            <tbody>
                @if(isset($payment->montant_loyer) && $payment->montant_loyer > 0)
                <tr>
                    <td>Loyer / Avance</td>
                    <td>{{ number_format($payment->montant_loyer, 0, ',', ' ') }}</td>
                </tr>
                @endif
                @if(isset($payment->montant_caution) && $payment->montant_caution > 0)
                <tr>
                    <td>Caution (Dépôt de garantie)</td>
                    <td>{{ number_format($payment->montant_caution, 0, ',', ' ') }}</td>
                </tr>
                @endif
                @if(isset($payment->montant_frais_service) && $payment->montant_frais_service > 0)
                <tr>
                    <td>Commission plateforme</td>
                    <td>{{ number_format($payment->montant_frais_service, 0, ',', ' ') }}</td>
                </tr>
                @endif
                <tr class="total-row">
                    <td>TOTAL</td>
                    <td>{{ number_format($payment->montant_total ?? ($payment->montant_gnf ?? 0), 0, ',', ' ') }} GNF</td>
                </tr>
            </tbody>
        </table>

        <div class="amount-words">
            <strong>Arrêtée la présente quittance à la somme de:</strong><br>
            {{ $montant_en_lettres }}
        </div>
    </div>

    <div class="payment-method">
        <strong>Mode de paiement:</strong>
        @switch($payment->methode_paiement ?? 'N/A')
            @case('orange_money')
                Orange Money
                @break
            @case('mtn_momo')
                MTN Mobile Money
                @break
            @case('especes')
                Espèces
                @break
            @case('virement')
                Virement bancaire
                @break
            @default
                {{ $payment->methode_paiement ?? 'N/A' }}
        @endswitch
        <br>
        <strong>Référence de transaction:</strong> {{ $payment->reference_paiement ?? $payment->reference_externe ?? 'N/A' }}
    </div>

    <div class="stamp-area">
        <div class="stamp-box">
            <div class="stamp-label">Cachet du propriétaire</div>
            <div class="verified-stamp">PAYÉ</div>
        </div>
        <div class="stamp-box">
            <div class="stamp-label">Validation ImmoGuinée</div>
            <div style="margin-top: 10px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <div style="font-size: 10px; color: #10b981; margin-top: 5px;">Vérifié électroniquement</div>
        </div>
    </div>

    <div class="legal-notice">
        <strong>Mentions légales:</strong>
        Cette quittance atteste du paiement reçu et libère le locataire de son obligation pour la période concernée.
        Conformément à la loi guinéenne L/2016/037/AN sur les transactions immobilières.
        Document généré électroniquement - valeur légale équivalente à l'original.
    </div>

    <div class="footer">
        <p>ImmoGuinée - Plateforme immobilière de confiance en Guinée</p>
        <p>Document généré le {{ $generated_at }} | Référence: {{ $numero_quittance }}</p>
        <p style="margin-top: 5px;">
            Ce document est conservé de manière sécurisée pendant 10 ans conformément à la réglementation.
        </p>
    </div>
</body>
</html>
