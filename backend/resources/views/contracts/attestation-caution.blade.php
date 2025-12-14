<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attestation de Dépôt de Caution</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; padding: 30px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #22c55e; padding-bottom: 20px; }
        .logo { font-size: 28pt; font-weight: bold; color: #22c55e; }
        .logo span { color: #ef4444; }
        .title { font-size: 20pt; font-weight: bold; margin: 20px 0; color: #1f2937; text-transform: uppercase; }
        .reference { font-size: 10pt; color: #9ca3af; margin-top: 10px; }
        .attestation-box { border: 2px solid #22c55e; border-radius: 10px; padding: 30px; margin: 30px 0; background-color: #f0fdf4; }
        .attestation-intro { font-size: 12pt; text-align: center; margin-bottom: 25px; font-style: italic; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 13pt; font-weight: bold; color: #22c55e; margin-bottom: 15px; }
        .info-grid { display: table; width: 100%; }
        .info-row { display: table-row; }
        .info-label { display: table-cell; padding: 8px 15px 8px 0; font-weight: bold; width: 40%; color: #374151; }
        .info-value { display: table-cell; padding: 8px 0; }
        .amount-highlight { background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
        .amount-label { font-size: 12pt; color: #6b7280; margin-bottom: 5px; }
        .amount-value { font-size: 24pt; font-weight: bold; color: #1f2937; }
        .amount-words { font-size: 10pt; font-style: italic; color: #6b7280; margin-top: 5px; }
        .conditions { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; }
        .condition-item { padding: 8px 0; padding-left: 20px; position: relative; }
        .condition-item::before { content: "•"; position: absolute; left: 0; color: #22c55e; font-weight: bold; }
        .signature-section { margin-top: 40px; }
        .signature-row { display: flex; justify-content: space-between; margin-top: 20px; }
        .signature-box { width: 45%; text-align: center; }
        .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
        .signature-label { font-size: 10pt; color: #6b7280; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #6b7280; text-align: center; }
        .stamp-area { border: 1px dashed #9ca3af; width: 120px; height: 120px; margin: 20px auto; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 9pt; }
        .legal-text { font-size: 9pt; text-align: justify; margin-top: 20px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Immo<span>Guinée</span></div>
        <div class="title">Attestation de Dépôt de Caution</div>
        <div class="reference">N° {{ $reference }} | Émise le {{ $generated_at }}</div>
    </div>

    <div class="attestation-box">
        <div class="attestation-intro">
            La plateforme ImmoGuinée atteste par la présente avoir reçu le dépôt de garantie ci-après décrit, dans le cadre d'un contrat de location.
        </div>

        <div class="section">
            <div class="section-title">Identité du Locataire (Déposant)</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Nom complet:</div>
                    <div class="info-value">{{ $tenant->nom ?? 'N/A' }} {{ $tenant->prenom ?? '' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Téléphone:</div>
                    <div class="info-value">{{ $tenant->telephone ?? 'N/A' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">{{ $tenant->email ?? 'N/A' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">CNI/Passeport:</div>
                    <div class="info-value">{{ $data['deposant_cni'] ?? 'N/A' }}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Identité du Propriétaire (Bénéficiaire)</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Nom complet:</div>
                    <div class="info-value">{{ $landlord->nom ?? 'N/A' }} {{ $landlord->prenom ?? '' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Téléphone:</div>
                    <div class="info-value">{{ $landlord->telephone ?? 'N/A' }}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Bien Concerné</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Type:</div>
                    <div class="info-value">{{ ucfirst($listing->type_bien ?? 'Appartement') }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Adresse:</div>
                    <div class="info-value">{{ $listing->adresse ?? 'N/A' }}, {{ $listing->quartier ?? '' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Référence contrat:</div>
                    <div class="info-value">{{ $contract->reference ?? 'N/A' }}</div>
                </div>
                @if(isset($proprietaire) && $proprietaire)
                <div class="info-row">
                    <div class="info-label">Propriétaire du bien:</div>
                    <div class="info-value">{{ $proprietaire->nom_complet ?? ($proprietaire->nom ?? 'N/A') }} {{ $proprietaire->prenom ?? '' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Tél. propriétaire:</div>
                    <div class="info-value">{{ $proprietaire->telephone ?? 'N/A' }}</div>
                </div>
                @endif
            </div>
        </div>

        <div class="amount-highlight">
            <div class="amount-label">Montant de la caution déposée</div>
            <div class="amount-value">{{ number_format($data['montant_caution'] ?? 0, 0, ',', ' ') }} GNF</div>
            <div class="amount-words">
                ({{ $data['montant_en_lettres'] ?? 'Montant en lettres' }})
            </div>
        </div>

        <div class="section">
            <div class="section-title">Détails du Dépôt</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Date du dépôt:</div>
                    <div class="info-value">{{ \Carbon\Carbon::parse($data['date_depot'] ?? now())->format('d/m/Y') }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Mode de paiement:</div>
                    <div class="info-value">{{ $data['mode_paiement'] ?? 'Mobile Money' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Référence transaction:</div>
                    <div class="info-value">{{ $data['reference_transaction'] ?? 'N/A' }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Nombre de mois:</div>
                    <div class="info-value">{{ $data['nombre_mois'] ?? 1 }} mois de loyer</div>
                </div>
            </div>
        </div>
    </div>

    <div class="conditions">
        <div class="section-title">Conditions de Restitution</div>
        <div class="condition-item">La caution sera conservée en séquestre par ImmoGuinée pendant toute la durée du bail.</div>
        <div class="condition-item">La restitution interviendra dans un délai maximum de 30 jours après la remise des clés et l'état des lieux de sortie.</div>
        <div class="condition-item">Des déductions pourront être opérées pour couvrir les éventuelles dégradations constatées lors de l'état des lieux de sortie.</div>
        <div class="condition-item">Les loyers impayés et charges non réglées seront également déduits du montant de la caution.</div>
        <div class="condition-item">La caution ne peut en aucun cas être utilisée comme paiement du dernier mois de loyer.</div>
    </div>

    <div class="signature-section">
        <div class="section-title">Certification</div>
        <p style="text-align: center; margin-bottom: 20px;">
            Fait à Conakry, le {{ now()->format('d/m/Y') }}
        </p>

        <div class="signature-row">
            <div class="signature-box">
                <div class="stamp-area">Cachet ImmoGuinée</div>
                <div class="signature-line">
                    <div class="signature-label">Pour ImmoGuinée SARL</div>
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    <div class="signature-label">Signature du Déposant</div>
                </div>
            </div>
        </div>
    </div>

    <div class="legal-text">
        <strong>Mentions légales:</strong> Cette attestation est délivrée conformément aux dispositions du Code Civil guinéen relatives au dépôt de garantie dans les contrats de location. Elle fait foi jusqu'à preuve du contraire. ImmoGuinée s'engage à conserver cette somme en séquestre et à la restituer conformément aux conditions du bail et à la réglementation en vigueur.
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée</strong> - Plateforme immobilière de confiance</p>
        <p>Document officiel - Conserver précieusement</p>
        <p>Contact: support@immoguinee.com | +224 XXX XXX XXX</p>
        @if(isset($contract->hash_sha256))
        <p style="font-size: 8pt; margin-top: 10px;">Empreinte numérique: {{ substr($contract->hash_sha256, 0, 32) }}...</p>
        @endif
    </div>
</body>
</html>
