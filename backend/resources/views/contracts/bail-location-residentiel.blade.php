<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Contrat de Bail - {{ $reference }}</title>
    <style>
        @page {
            margin: 15mm 12mm 15mm 12mm;
            size: A4;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #1e3a5f;
            background: #fff;
        }
        /* Header moderne */
        .header {
            background: #1e3a5f;
            color: white;
            padding: 12px 20px;
            margin: -15mm -12mm 15px -12mm;
            border-bottom: 4px solid #f97316;
        }
        .header-table {
            width: 100%;
        }
        .header-table td {
            vertical-align: middle;
        }
        .logo {
            font-size: 22pt;
            font-weight: bold;
        }
        .logo-immo { color: #fff; }
        .logo-guinee { color: #f97316; }
        .logo-sub {
            font-size: 7pt;
            color: #93c5fd;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .header-right {
            text-align: right;
        }
        .contract-type {
            font-size: 8pt;
            color: #93c5fd;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .contract-ref {
            font-size: 12pt;
            font-weight: bold;
            color: #f97316;
        }
        .contract-date {
            font-size: 7pt;
            color: #bfdbfe;
        }
        /* Titre du document */
        .doc-title {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f97316;
        }
        .doc-title h1 {
            font-size: 14pt;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        }
        .doc-title .subtitle {
            font-size: 8pt;
            color: #6b7280;
            margin-top: 3px;
        }
        /* Sections */
        .section {
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 10pt;
            font-weight: bold;
            color: #1e3a5f;
            padding: 6px 10px;
            background: linear-gradient(90deg, #fff7ed 0%, #fff 100%);
            border-left: 3px solid #f97316;
            margin-bottom: 8px;
        }
        /* Parties - Layout Table */
        .parties-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
        }
        .parties-table td {
            width: 50%;
            vertical-align: top;
        }
        .party-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
        }
        .party-header {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 6px;
        }
        .party-icon {
            display: inline-block;
            width: 24px;
            height: 24px;
            background: #1e3a5f;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            color: white;
            font-weight: bold;
            font-size: 10pt;
            vertical-align: middle;
            margin-right: 6px;
        }
        .party-icon.tenant { background: #f97316; }
        .party-name {
            font-weight: bold;
            color: #1e3a5f;
            font-size: 9pt;
            vertical-align: middle;
        }
        .party-role {
            font-size: 7pt;
            color: #6b7280;
            margin-left: 30px;
        }
        .party-info {
            font-size: 8pt;
            line-height: 1.6;
        }
        .party-info strong {
            color: #4b5563;
            display: inline-block;
            width: 70px;
        }
        /* Bien immobilier - Style moderne */
        .property-box {
            background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
            color: white;
            border-radius: 6px;
            padding: 12px;
        }
        .property-table {
            width: 100%;
        }
        .property-table td {
            vertical-align: top;
            padding: 3px 10px 3px 0;
        }
        .prop-label {
            font-size: 7pt;
            color: #93c5fd;
            text-transform: uppercase;
        }
        .prop-value {
            font-size: 9pt;
            font-weight: 500;
        }
        /* Durée - Cards style */
        .duration-table {
            width: 100%;
            background: #f8fafc;
            border-radius: 6px;
            border-collapse: collapse;
        }
        .duration-table td {
            text-align: center;
            padding: 10px 8px;
            border-right: 1px solid #e2e8f0;
        }
        .duration-table td:last-child {
            border-right: none;
        }
        .dur-value {
            font-size: 12pt;
            font-weight: bold;
            color: #f97316;
        }
        .dur-label {
            font-size: 7pt;
            color: #6b7280;
            text-transform: uppercase;
            margin-top: 2px;
        }
        /* Tableau financier */
        .fin-table {
            width: 100%;
            border-collapse: collapse;
        }
        .fin-table th {
            background: #1e3a5f;
            color: white;
            padding: 8px 10px;
            text-align: left;
            font-size: 8pt;
            font-weight: 600;
        }
        .fin-table th:last-child {
            text-align: right;
        }
        .fin-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 8pt;
        }
        .fin-table tr:nth-child(even) {
            background: #f8fafc;
        }
        .fin-table .amount {
            text-align: right;
            font-weight: 600;
            color: #1e3a5f;
        }
        .fin-table .total-row {
            background: #f97316 !important;
            color: white;
        }
        .fin-table .total-row td {
            font-weight: bold;
            font-size: 9pt;
            border: none;
        }
        .fin-table .total-row .amount {
            color: white;
        }
        /* Clauses compactes */
        .clauses {
            font-size: 8pt;
            text-align: justify;
            column-count: 2;
            column-gap: 15px;
        }
        .clause {
            margin-bottom: 8px;
            break-inside: avoid;
        }
        .clause-title {
            font-weight: bold;
            color: #1e3a5f;
            font-size: 8pt;
        }
        .clause-text {
            color: #4b5563;
        }
        /* Legal notice */
        .legal-notice {
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
            padding: 8px 10px;
            font-size: 7pt;
            margin: 12px 0;
            page-break-inside: avoid;
        }
        .legal-notice strong { color: #92400e; }
        /* Signatures */
        .signatures-section {
            margin-top: 15px;
            page-break-inside: avoid;
        }
        .sig-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 10px 0;
        }
        .sig-table td {
            width: 50%;
            vertical-align: top;
        }
        .sig-box {
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            min-height: 100px;
        }
        .sig-box.signed {
            border-color: #22c55e;
            background: #f0fdf4;
        }
        .sig-header {
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 6px;
        }
        .sig-label {
            font-weight: bold;
            font-size: 8pt;
            color: #1e3a5f;
        }
        .sig-status {
            float: right;
            font-size: 7pt;
            padding: 2px 6px;
            border-radius: 8px;
            background: #fef3c7;
            color: #92400e;
        }
        .sig-status.signed {
            background: #dcfce7;
            color: #166534;
        }
        .sig-mention {
            font-size: 7pt;
            color: #6b7280;
            font-style: italic;
        }
        .sig-details {
            font-size: 7pt;
            color: #6b7280;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #e2e8f0;
        }
        /* Footer */
        .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 7pt;
            color: #6b7280;
        }
        .footer-logo {
            font-size: 10pt;
            font-weight: bold;
        }
        .footer-logo .immo { color: #1e3a5f; }
        .footer-logo .guinee { color: #f97316; }
        .footer-hash {
            font-size: 6pt;
            color: #9ca3af;
            font-family: monospace;
            background: #f8fafc;
            padding: 4px 8px;
            border-radius: 3px;
            margin-top: 5px;
            display: inline-block;
        }
        /* Badge de statut en haut à droite */
        .status-badge {
            position: absolute;
            top: 60px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: bold;
        }
        .status-badge.pending {
            background: #f59e0b;
        }
        .status-badge.draft {
            background: #6b7280;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <div class="logo"><span class="logo-immo">Immo</span><span class="logo-guinee">Guinee</span></div>
                    <div class="logo-sub">Plateforme immobiliere de confiance</div>
                </td>
                <td class="header-right">
                    <div class="contract-type">Contrat de bail</div>
                    <div class="contract-ref">{{ $reference }}</div>
                    <div class="contract-date">Genere le {{ $generated_at }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Titre -->
    <div class="doc-title">
        <h1>Contrat de Location Residentielle</h1>
        <div class="subtitle">Bail d'habitation - Republique de Guinee</div>
    </div>

    <!-- Parties contractantes -->
    <div class="section">
        <div class="section-title">PARTIES CONTRACTANTES</div>
        <table class="parties-table">
            <tr>
                <td>
                    <div class="party-box">
                        <div class="party-header">
                            <span class="party-icon">B</span>
                            <span class="party-name">{{ $landlord->nom_complet ?? ($landlord->nom ?? 'N/A') }}</span>
                            <div class="party-role">Bailleur (Proprietaire)</div>
                        </div>
                        <div class="party-info">
                            <strong>Tel:</strong> {{ $landlord->telephone ?? 'N/A' }}<br>
                            <strong>Email:</strong> {{ $landlord->email ?? 'N/A' }}<br>
                            <strong>Adresse:</strong> {{ $landlord->adresse ?? 'Conakry, Guinee' }}<br>
                            <strong>CNI:</strong> {{ $data['landlord_id_number'] ?? 'A completer' }}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="party-box">
                        <div class="party-header">
                            <span class="party-icon tenant">L</span>
                            <span class="party-name">{{ $tenant->nom_complet ?? ($tenant->nom ?? 'N/A') }}</span>
                            <div class="party-role">Preneur (Locataire)</div>
                        </div>
                        <div class="party-info">
                            <strong>Tel:</strong> {{ $tenant->telephone ?? 'N/A' }}<br>
                            <strong>Email:</strong> {{ $tenant->email ?? 'N/A' }}<br>
                            <strong>Adresse:</strong> {{ $tenant->adresse ?? 'Conakry, Guinee' }}<br>
                            <strong>CNI:</strong> {{ $data['tenant_id_number'] ?? 'A completer' }}
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Bien immobilier -->
    <div class="section">
        <div class="section-title">DESIGNATION DU BIEN IMMOBILIER</div>
        <div class="property-box">
            <table class="property-table">
                <tr>
                    <td style="width: 50%;">
                        <div class="prop-label">Type de bien</div>
                        <div class="prop-value">{{ ucfirst($listing->type_propriete ?? $listing->type_bien ?? 'Appartement') }}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="prop-label">Chambres</div>
                        <div class="prop-value">{{ $listing->nombre_chambres ?? $listing->chambres ?? 'N/A' }}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="prop-label">Salles de bain</div>
                        <div class="prop-value">{{ $listing->nombre_salles_bain ?? $listing->salles_bain ?? 'N/A' }}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="prop-label">Adresse complete</div>
                        <div class="prop-value">{{ $listing->adresse ?? $listing->quartier ?? 'N/A' }}, {{ $listing->commune ?? 'Conakry' }}</div>
                    </td>
                    <td>
                        <div class="prop-label">Superficie</div>
                        <div class="prop-value">{{ $listing->surface_m2 ?? $listing->superficie ?? 'N/A' }} m²</div>
                    </td>
                    <td>
                        <div class="prop-label">Reference</div>
                        <div class="prop-value" style="font-size: 7pt;">{{ substr($listing->id ?? 'N/A', 0, 18) }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Proprietaire du bien et details de l'annonce -->
    @if($proprietaire)
    <div class="section">
        <div class="section-title">PROPRIETAIRE DU BIEN ET DETAILS DE L'ANNONCE</div>
        <div class="party-box" style="background: #f0fdf4; border: 1px solid #22c55e;">
            <div class="party-header">
                <span class="party-icon" style="background: #22c55e;">P</span>
                <span class="party-name">{{ $proprietaire->nom_complet ?? ($proprietaire->nom ?? 'N/A') }} {{ $proprietaire->prenom ?? '' }}</span>
                <div class="party-role">Proprietaire du bien (annonceur)</div>
            </div>
            <div class="party-info">
                <strong>Tel:</strong> {{ $proprietaire->telephone ?? 'N/A' }}<br>
                <strong>Email:</strong> {{ $proprietaire->email ?? 'N/A' }}<br>
                <strong>Adresse:</strong> {{ $proprietaire->adresse ?? 'Conakry, Guinee' }}<br>
                @if($proprietaire->badge)
                <strong>Badge:</strong> {{ $proprietaire->badge }}<br>
                @endif
                @if($proprietaire->numero_cni)
                <strong>CNI:</strong> {{ $proprietaire->numero_cni }}<br>
                @endif
            </div>
        </div>
        <!-- Details de l'annonce -->
        <div class="party-box" style="background: #fffbeb; border: 1px solid #f59e0b; margin-top: 8px;">
            <div class="party-header" style="border-bottom: 1px solid #fcd34d; padding-bottom: 6px; margin-bottom: 6px;">
                <span class="party-icon" style="background: #f59e0b;">A</span>
                <span class="party-name">{{ $listing->titre ?? 'Annonce immobiliere' }}</span>
                <div class="party-role">Details de l'annonce</div>
            </div>
            <div class="party-info">
                <strong>Type de bien:</strong> {{ ucfirst($listing->type_bien ?? $listing->type_propriete ?? 'N/A') }}<br>
                @if($listing->description)
                <strong>Description:</strong> {{ Str::limit($listing->description, 200) }}<br>
                @endif
                <strong>Transaction:</strong> {{ $listing->type_transaction ?? 'LOCATION' }}<br>
                @if($listing->loyer_mensuel)
                <strong>Loyer mensuel:</strong> {{ number_format($listing->loyer_mensuel, 0, ',', ' ') }} GNF<br>
                @endif
                @if($listing->caution)
                <strong>Caution:</strong> {{ number_format($listing->caution, 0, ',', ' ') }} GNF<br>
                @endif
                @if($listing->avance)
                <strong>Avance:</strong> {{ number_format($listing->avance, 0, ',', ' ') }} GNF
                @endif
            </div>
        </div>
    </div>
    @endif

    <!-- Durée du bail -->
    <div class="section">
        <div class="section-title">DUREE DU BAIL</div>
        <table class="duration-table">
            <tr>
                <td style="width: 25%;">
                    <div class="dur-value">{{ \Carbon\Carbon::parse($contract->date_debut ?? now())->format('d/m/Y') }}</div>
                    <div class="dur-label">Date de debut</div>
                </td>
                <td style="width: 25%;">
                    <div class="dur-value">{{ \Carbon\Carbon::parse($contract->date_fin ?? now()->addYear())->format('d/m/Y') }}</div>
                    <div class="dur-label">Date de fin</div>
                </td>
                <td style="width: 25%;">
                    <div class="dur-value">{{ $contract->duree_mois ?? 12 }}</div>
                    <div class="dur-label">Duree (mois)</div>
                </td>
                <td style="width: 25%;">
                    <div class="dur-value">3</div>
                    <div class="dur-label">Preavis (mois)</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Conditions financières -->
    <div class="section">
        <div class="section-title">CONDITIONS FINANCIERES</div>
        <table class="fin-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Montant (GNF)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Loyer mensuel</td>
                    <td class="amount">{{ number_format($contract->loyer_mensuel ?? 0, 0, ',', ' ') }}</td>
                </tr>
                <tr>
                    <td>Depot de garantie (caution - {{ $data['caution_mois'] ?? 2 }} mois)</td>
                    <td class="amount">{{ number_format($contract->caution ?? (($contract->loyer_mensuel ?? 0) * ($data['caution_mois'] ?? 2)), 0, ',', ' ') }}</td>
                </tr>
                <tr>
                    <td>Avance sur loyer ({{ $data['avance_mois'] ?? 1 }} mois)</td>
                    <td class="amount">{{ number_format(($contract->loyer_mensuel ?? 0) * ($data['avance_mois'] ?? 1), 0, ',', ' ') }}</td>
                </tr>
                <tr>
                    <td>Frais de service ImmoGuinee (50%)</td>
                    <td class="amount">{{ number_format(($contract->loyer_mensuel ?? 0) * 0.5, 0, ',', ' ') }}</td>
                </tr>
                <tr class="total-row">
                    <td>TOTAL A PAYER A LA SIGNATURE</td>
                    <td class="amount">{{ number_format(
                        ($contract->caution ?? (($contract->loyer_mensuel ?? 0) * ($data['caution_mois'] ?? 2))) +
                        (($contract->loyer_mensuel ?? 0) * ($data['avance_mois'] ?? 1)) +
                        (($contract->loyer_mensuel ?? 0) * 0.5),
                        0, ',', ' '
                    ) }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Clauses (en 2 colonnes pour gagner de l'espace) -->
    <div class="section">
        <div class="section-title">CLAUSES ET CONDITIONS GENERALES</div>
        <div class="clauses">
            <div class="clause">
                <span class="clause-title">Art. 1 - Objet:</span>
                <span class="clause-text">Location du bien decrit ci-dessus pour usage exclusif d'habitation principale.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 2 - Paiement:</span>
                <span class="clause-text">Loyer payable d'avance le 5 de chaque mois. Penalite de 2%/mois en cas de retard (+15j). Paiement via Mobile Money ou virement.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 3 - Caution:</span>
                <span class="clause-text">Restitution dans les 30 jours suivant la remise des cles, deduction faite des reparations locatives.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 4 - Charges:</span>
                <span class="clause-text">Eau, electricite et services a la charge du preneur. Entretien courant du bien obligatoire.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 5 - Travaux:</span>
                <span class="clause-text">Toute modification necessite l'accord ecrit prealable du bailleur.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 6 - Sous-location:</span>
                <span class="clause-text">Interdite sauf accord ecrit du bailleur.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 7 - Resiliation:</span>
                <span class="clause-text">Preavis de 3 mois requis. Indemnite due en cas de non-respect.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 8 - Etat des lieux:</span>
                <span class="clause-text">Etabli contradictoirement a l'entree et a la sortie.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 9 - Retractation:</span>
                <span class="clause-text">Delai de 48h a compter de la signature electronique.</span>
            </div>
            <div class="clause">
                <span class="clause-title">Art. 10 - Litiges:</span>
                <span class="clause-text">Mediation ImmoGuinee prioritaire, puis tribunaux de Conakry.</span>
            </div>
        </div>
    </div>

    <!-- Mention légale -->
    <div class="legal-notice">
        <strong>Conformite legale:</strong> Contrat etabli conformement a la Loi L/2016/037/AN du 28 juillet 2016 (Code Civil de Guinee) et l'Acte Uniforme OHADA relatif au Droit Commercial General.
    </div>

    <!-- Signatures -->
    <div class="signatures-section">
        <div class="section-title">SIGNATURES DES PARTIES</div>
        <p style="margin-bottom: 10px; font-size: 7pt; color: #6b7280;">Fait en deux exemplaires originaux. Chaque partie reconnait avoir recu un exemplaire.</p>
        <table class="sig-table">
            <tr>
                <td>
                    <div class="sig-box {{ isset($contract->bailleur_signed_at) ? 'signed' : '' }}">
                        <div class="sig-header">
                            <span class="sig-label">LE BAILLEUR</span>
                            <span class="sig-status {{ isset($contract->bailleur_signed_at) ? 'signed' : '' }}">
                                {{ isset($contract->bailleur_signed_at) ? 'Signe' : 'En attente' }}
                            </span>
                        </div>
                        <div class="sig-mention">"Lu et approuve, bon pour accord"</div>
                        @if(isset($contract->bailleur_signed_at))
                        <div class="sig-details">
                            Signe le {{ \Carbon\Carbon::parse($contract->bailleur_signed_at)->format('d/m/Y a H:i') }}<br>
                            OTP: Valide | IP: {{ $contract->bailleur_signature_ip ?? 'N/A' }}
                        </div>
                        @endif
                    </div>
                </td>
                <td>
                    <div class="sig-box {{ isset($contract->locataire_signed_at) ? 'signed' : '' }}">
                        <div class="sig-header">
                            <span class="sig-label">LE PRENEUR</span>
                            <span class="sig-status {{ isset($contract->locataire_signed_at) ? 'signed' : '' }}">
                                {{ isset($contract->locataire_signed_at) ? 'Signe' : 'En attente' }}
                            </span>
                        </div>
                        <div class="sig-mention">"Lu et approuve, bon pour accord"</div>
                        @if(isset($contract->locataire_signed_at))
                        <div class="sig-details">
                            Signe le {{ \Carbon\Carbon::parse($contract->locataire_signed_at)->format('d/m/Y a H:i') }}<br>
                            OTP: Valide | IP: {{ $contract->locataire_signature_ip ?? 'N/A' }}
                        </div>
                        @endif
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-logo"><span class="immo">Immo</span><span class="guinee">Guinee</span></div>
        <div>support@immoguinee.com | +224 XXX XXX XXX | www.immoguinee.com</div>
        <div>Document genere automatiquement - Ref: {{ $reference }}</div>
        @if(isset($contract->pdf_hash))
        <div class="footer-hash">SHA-256: {{ substr($contract->pdf_hash, 0, 32) }}...</div>
        @endif
    </div>
</body>
</html>
