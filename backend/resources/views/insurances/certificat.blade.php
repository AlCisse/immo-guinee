<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificat d'Assurance - {{ $numero_police }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #1a1a1a;
            background: #fff;
        }

        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 15mm;
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1a56db;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1a56db;
        }

        .logo-subtitle {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }

        .certificate-type {
            text-align: right;
        }

        .certificate-badge {
            display: inline-block;
            padding: 8px 16px;
            background: {{ $type_assurance === 'SEJOUR_SEREIN' ? '#10b981' : '#f59e0b' }};
            color: #fff;
            font-weight: bold;
            font-size: 12px;
            border-radius: 4px;
        }

        .certificate-number {
            margin-top: 8px;
            font-size: 10px;
            color: #666;
        }

        /* Title */
        .title {
            text-align: center;
            margin: 25px 0;
        }

        .title h1 {
            font-size: 22px;
            color: #1a1a1a;
            margin-bottom: 5px;
        }

        .title p {
            color: #666;
            font-size: 11px;
        }

        /* Sections */
        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #1a56db;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }

        /* Info Grid */
        .info-grid {
            display: table;
            width: 100%;
        }

        .info-row {
            display: table-row;
        }

        .info-label {
            display: table-cell;
            padding: 6px 10px 6px 0;
            color: #666;
            width: 40%;
            font-size: 10px;
        }

        .info-value {
            display: table-cell;
            padding: 6px 0;
            font-weight: 500;
            font-size: 10px;
        }

        /* Two Column Layout */
        .two-columns {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }

        .column {
            display: table-cell;
            width: 48%;
            vertical-align: top;
        }

        .column:first-child {
            padding-right: 20px;
        }

        /* Coverage Table */
        .coverage-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .coverage-table th,
        .coverage-table td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            text-align: left;
            font-size: 10px;
        }

        .coverage-table th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }

        .coverage-table .active {
            color: #10b981;
        }

        .coverage-table .inactive {
            color: #9ca3af;
        }

        /* Premium Box */
        .premium-box {
            background: #f0f9ff;
            border: 2px solid #1a56db;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }

        .premium-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
        }

        .premium-amount {
            font-size: 20px;
            font-weight: bold;
            color: #1a56db;
        }

        .premium-period {
            font-size: 9px;
            color: #666;
        }

        /* Terms */
        .terms {
            background: #f9fafb;
            border-radius: 4px;
            padding: 12px;
            margin-top: 15px;
        }

        .terms-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 8px;
        }

        .terms-list {
            list-style: none;
            padding: 0;
        }

        .terms-list li {
            font-size: 9px;
            color: #4b5563;
            padding: 3px 0;
            padding-left: 12px;
            position: relative;
        }

        .terms-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #1a56db;
        }

        /* Footer */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
        }

        .contact-info {
            display: table;
            width: 100%;
            font-size: 9px;
            color: #666;
        }

        .contact-item {
            display: table-cell;
            width: 50%;
        }

        .contact-item strong {
            color: #374151;
        }

        .validity {
            text-align: center;
            margin-top: 20px;
            padding: 10px;
            background: #fef3c7;
            border-radius: 4px;
        }

        .validity-text {
            font-size: 10px;
            color: #92400e;
        }

        .signature-section {
            margin-top: 30px;
            display: table;
            width: 100%;
        }

        .signature-box {
            display: table-cell;
            width: 50%;
            text-align: center;
        }

        .signature-line {
            border-top: 1px solid #374151;
            width: 150px;
            margin: 30px auto 5px;
        }

        .signature-label {
            font-size: 9px;
            color: #666;
        }

        /* QR Code placeholder */
        .qr-section {
            text-align: center;
            margin-top: 20px;
        }

        .qr-placeholder {
            width: 80px;
            height: 80px;
            border: 1px solid #e5e7eb;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #9ca3af;
        }

        .qr-label {
            font-size: 8px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <div class="logo">ImmoGuinée</div>
                <div class="logo-subtitle">La confiance d'abord</div>
            </div>
            <div class="certificate-type">
                <div class="certificate-badge">{{ $type_assurance_label }}</div>
                <div class="certificate-number">N° {{ $numero_police }}</div>
            </div>
        </div>

        <!-- Title -->
        <div class="title">
            <h1>CERTIFICAT D'ASSURANCE</h1>
            <p>Émis le {{ $date_emission }}</p>
        </div>

        <!-- Two Column Info -->
        <div class="two-columns">
            <!-- Insured Person -->
            <div class="column">
                <div class="section">
                    <div class="section-title">ASSURÉ</div>
                    <div class="info-grid">
                        <div class="info-row">
                            <span class="info-label">Nom complet</span>
                            <span class="info-value">{{ $assure_nom }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Téléphone</span>
                            <span class="info-value">{{ $assure_telephone }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email</span>
                            <span class="info-value">{{ $assure_email }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Property -->
            <div class="column">
                <div class="section">
                    <div class="section-title">BIEN ASSURÉ</div>
                    <div class="info-grid">
                        <div class="info-row">
                            <span class="info-label">Type</span>
                            <span class="info-value">{{ $bien_type }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Adresse</span>
                            <span class="info-value">{{ $bien_adresse }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Quartier</span>
                            <span class="info-value">{{ $bien_quartier }}, {{ $bien_ville }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contract Info -->
        <div class="section">
            <div class="section-title">DÉTAILS DU CONTRAT</div>
            <div class="info-grid">
                <div class="info-row">
                    <span class="info-label">Référence contrat de location</span>
                    <span class="info-value">{{ $contrat_reference }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Loyer mensuel</span>
                    <span class="info-value">{{ $loyer_mensuel }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date de souscription</span>
                    <span class="info-value">{{ $date_souscription }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date d'expiration</span>
                    <span class="info-value">{{ $date_expiration }}</span>
                </div>
            </div>
        </div>

        <!-- Premium Box -->
        <div class="premium-box">
            <div class="premium-label">Prime mensuelle</div>
            <div class="premium-amount">{{ $prime_mensuelle }}</div>
            <div class="premium-period">({{ $prime_annuelle }} / an)</div>
        </div>

        <!-- Coverages -->
        <div class="section">
            <div class="section-title">GARANTIES COUVERTES</div>
            <table class="coverage-table">
                <thead>
                    <tr>
                        <th>Garantie</th>
                        <th>Description</th>
                        <th>Plafond</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($couvertures as $couverture)
                    <tr>
                        <td><strong>{{ $couverture['nom'] }}</strong></td>
                        <td>{{ $couverture['description'] }}</td>
                        <td>{{ $couverture['plafond'] }}</td>
                        <td class="{{ $couverture['actif'] ? 'active' : 'inactive' }}">
                            {{ $couverture['actif'] ? '✓ Actif' : '✗ Non inclus' }}
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Terms -->
        <div class="terms">
            <div class="terms-title">CONDITIONS GÉNÉRALES</div>
            <ul class="terms-list">
                @foreach($conditions as $condition)
                <li>{{ $condition }}</li>
                @endforeach
            </ul>
        </div>

        <!-- Validity Notice -->
        <div class="validity">
            <div class="validity-text">
                <strong>Ce certificat est valable du {{ $date_souscription }} au {{ $date_expiration }}</strong>
            </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Pour ImmoGuinée</div>
            </div>
            <div class="signature-box">
                <div class="qr-section">
                    <div class="qr-placeholder">[QR Code]</div>
                    <div class="qr-label">Scanner pour vérifier</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="contact-info">
                <div class="contact-item">
                    <strong>Urgence sinistres:</strong> {{ $numero_urgence }}
                </div>
                <div class="contact-item">
                    <strong>Email:</strong> {{ $email_sinistres }}
                </div>
            </div>
        </div>
    </div>
</body>
</html>
